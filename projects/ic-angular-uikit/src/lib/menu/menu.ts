import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  Signal,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { UiIcon } from '../icon/icon';
import { UiSidebar } from '../layout/sidebar';
import { UI_MENU_HOST } from './menu-host';

/** Disposition d'un menu : liste verticale (colonne, tiroir) ou barre horizontale (en-tête). */
export type UiMenuOrientation = 'vertical' | 'horizontal';

/** Position d'un sous-menu flottant : sous son bouton ou à côté. `auto` choisit selon le contexte. */
export type UiSubmenuPlacement = 'auto' | 'below' | 'side';

const ITEM_SELECTOR = '.ui-menu-item, .ui-submenu__trigger';

/** Sous-menus par élément hôte (navigation clavier déléguée). */
const SUBMENUS = new WeakMap<Element, UiSubmenu>();

/** Popover ouvert (faux si l'API popover n'existe pas : vieux navigateur, environnement de test). */
function popoverOpen(panel: HTMLElement): boolean {
  try {
    return panel.matches(':popover-open');
  } catch {
    return false;
  }
}

/** L'élément est un popover utilisable. */
function canPopover(panel: HTMLElement): boolean {
  return panel.hasAttribute('popover') && typeof panel.showPopover === 'function';
}

const supportsAnchor = (): boolean => typeof CSS !== 'undefined' && !!CSS.supports?.('position-area: block-end');

/**
 * Menu de navigation (landmark `navigation`), vertical ou horizontal, sur plusieurs niveaux avec `ui-submenu`.
 *
 * - **Vertical** (colonne, tiroir) : les sous-menus se déplient sur place, en accordéon. Dans une `ui-sidebar`
 *   réduite en rail, seuls les icônes restent et les sous-menus s'ouvrent à côté de la colonne.
 * - **Horizontal** (en-tête, `ui-app-bar`) : le premier niveau s'ouvre sous l'élément, les niveaux suivants à côté.
 *   Dans une `ui-app-bar` repliée (petite largeur), le menu repasse en vertical.
 *
 * Clavier : flèches entre les éléments du niveau (gauche / droite en horizontal, haut / bas en vertical), Origine / Fin,
 * flèche vers le sous-menu pour l'ouvrir, flèche inverse ou Échap pour le refermer. La touche Tab parcourt les liens
 * normalement (motif « disclosure navigation » : pas de rôles `menu`, adaptés aux applications de bureau).
 *
 * @slot default - Éléments `uiMenuItem`, sous-menus `ui-submenu` et groupes `ui-menu-group`.
 * @cssprop --ui-menu-color - Couleur du texte des éléments (défaut : `--ui-color-text-muted`).
 * @cssprop --ui-menu-active-bg - Fond de l'élément courant (défaut : `--ui-color-primary-subtle`).
 * @cssprop --ui-menu-active-color - Texte de l'élément courant (défaut : `--ui-color-primary-text`).
 * @cssprop --ui-menu-indicator - Barre de l'élément courant (défaut : `--ui-color-primary`).
 * @category Navigation
 */
@Component({
  selector: 'ui-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-menu',
    '[class.ui-menu--vertical]': '!horizontal()',
    '[class.ui-menu--horizontal]': 'horizontal()',
    '[class.ui-menu--rail]': 'rail()',
    '[attr.role]': 'landmark() ? "navigation" : "group"',
    '[attr.aria-label]': 'ariaLabel()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `<ng-content />`,
  styles: `
    :host { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    :host(.ui-menu--horizontal) { flex-direction: row; flex-wrap: wrap; align-items: stretch; gap: var(--ui-space-1); }
  `,
})
export class UiMenu {
  /** Nom du menu pour les lecteurs d'écran (« Navigation principale »…). */
  readonly ariaLabel = input('Menu');
  /** Disposition : `vertical` (défaut) ou `horizontal`. */
  readonly orientation = input<UiMenuOrientation>('vertical');
  /** Ouvre aussi les sous-menus flottants au survol (le clic et le clavier fonctionnent toujours). */
  readonly openOnHover = input(false, { transform: booleanAttribute });
  /** Landmark `navigation`. Désactivez-le pour un menu d'actions ou s'il est déjà dans un `<nav>` (rôle `group`). */
  readonly landmark = input(true, { transform: booleanAttribute });

  private readonly sidebar = inject(UiSidebar, { optional: true });
  private readonly menuHost = inject(UI_MENU_HOST, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  /** Le menu est dans la zone de navigation d'une `ui-app-bar` (pas dans ses actions). */
  private readonly inCollapsibleNav = signal(false);

  /** Disposition appliquée (verticale dans une barre d'application repliée). */
  readonly effectiveOrientation = computed<UiMenuOrientation>(() =>
    this.inCollapsibleNav() && this.menuHost?.compact() ? 'vertical' : this.orientation(),
  );
  /** @internal */
  readonly horizontal = computed(() => this.effectiveOrientation() === 'horizontal');
  /** @internal Colonne réduite en rail : icônes seules, sous-menus à côté. */
  readonly rail = computed(() => !this.horizontal() && (this.sidebar?.isRail() ?? false));

  constructor() {
    if (this.menuHost) {
      afterNextRender(() => this.inCollapsibleNav.set(!!this.host.parentElement?.closest('.ui-app-bar__nav')));
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (handleMenuKeydown(event, this.host, this.horizontal(), true)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

/**
 * Groupe d'éléments de menu avec un titre. En rail, le titre laisse place à un séparateur.
 *
 * @slot default - Éléments `uiMenuItem` et sous-menus `ui-submenu`.
 */
@Component({
  selector: 'ui-menu-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'labelId',
    class: 'ui-menu-group',
    '[class.ui-menu-group--rail]': 'rail()',
  },
  template: `
    <span class="ui-menu-group__label" [id]="labelId">{{ label() }}</span>
    <ng-content />
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 2px; margin-top: var(--ui-space-3); }
    :host > .ui-menu-group__label {
      padding: var(--ui-space-1) var(--ui-space-3);
      font-size: var(--ui-font-size-xs);
      font-weight: var(--ui-font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ui-color-text-subtle);
      white-space: nowrap;
      overflow: hidden;
    }
    /* Rail : titre masqué visuellement (toujours nom du groupe), remplacé par un trait. */
    :host(.ui-menu-group--rail) > .ui-menu-group__label {
      height: 1px;
      margin: var(--ui-space-2) var(--ui-space-3);
      padding: 0;
      background: var(--ui-color-border);
      color: transparent;
    }
  `,
})
export class UiMenuGroup {
  /** Titre du groupe. */
  readonly label = input.required<string>();
  protected readonly labelId = uniqueId('ui-menu-group');
  private readonly menu = inject(UiMenu, { optional: true });
  private readonly submenu = inject(forwardSubmenu(), { optional: true });
  private readonly sidebar = inject(UiSidebar, { optional: true });
  protected readonly rail = computed(() => !this.submenu && (this.menu ? this.menu.rail() : (this.sidebar?.isRail() ?? false)));
}

/**
 * Sous-menu : un bouton qui déplie une liste d'éléments, imbricable sur autant de niveaux que nécessaire.
 *
 * Dans un `ui-menu` vertical, il se déplie sur place (et s'ouvre tout seul s'il contient la page courante) ;
 * dans un menu horizontal, un rail ou utilisé seul (bouton de menu dans une `ui-toolbar`), il s'ouvre en panneau
 * flottant (popover natif : couche supérieure, clic extérieur et Échap). Le bouton porte `aria-expanded` et indique
 * quand la page courante est dans le sous-menu.
 *
 * ```html
 * <ui-submenu label="Produits" icon="lucide:box">
 *   <a uiMenuItem routerLink="/produits/nouveautes">Nouveautés</a>
 *   <ui-submenu label="Catalogue">…</ui-submenu>
 * </ui-submenu>
 * ```
 *
 * @slot default - Éléments `uiMenuItem`, sous-menus `ui-submenu` et groupes `ui-menu-group`.
 * @slot [uiMenuBadge] - Compteur affiché sur le bouton du sous-menu.
 */
@Component({
  selector: 'ui-submenu',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-submenu',
    '[class.ui-submenu--inline]': '!flyout()',
    '[class.ui-submenu--flyout]': 'flyout()',
    '[class.ui-submenu--below]': 'flyout() && resolvedPlacement() === "below"',
    '[class.ui-submenu--side]': 'flyout() && resolvedPlacement() === "side"',
    '[class.ui-submenu--top]': 'isTop()',
    '[class.ui-submenu--rail]': 'rail()',
    '[class.ui-submenu--standalone]': 'standalone',
    '[class.ui-submenu--open]': 'expanded()',
    '[class.ui-submenu--current]': 'hasActive() && (flyout() || !expanded())',
    '(mouseenter)': 'onHover(true)',
    '(mouseleave)': 'onHover(false)',
    '(keydown)': 'onHostKeydown($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="ui-submenu__trigger"
      [id]="triggerId"
      [disabled]="disabled()"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      [attr.popovertarget]="flyout() ? panelId : null"
      [attr.title]="rail() ? label() : null"
      [style.anchor-name]="anchorName"
      (click)="onTriggerClick()"
    >
      @if (icon(); as name) {
        <ui-icon class="ui-submenu__icon" [name]="name" />
      } @else if (rail()) {
        <span class="ui-submenu__initial" aria-hidden="true">{{ label().charAt(0) }}</span>
      }
      <span class="ui-submenu__label">{{ label() }}</span>
      <span class="ui-submenu__badge"><ng-content select="[uiMenuBadge]" /></span>
      <svg class="ui-submenu__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
    <div
      #panel
      class="ui-submenu__panel"
      role="group"
      [id]="panelId"
      [class.ui-submenu__panel--flyout]="flyout()"
      [attr.aria-labelledby]="triggerId"
      [attr.popover]="flyout() ? 'auto' : null"
      [hidden]="!flyout() && !expanded()"
      [style.position-anchor]="anchorName"
      (toggle)="onToggle($event)"
      (keydown.escape)="onEscape($event)"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './submenu.css',
})
export class UiSubmenu {
  /** Libellé du bouton. */
  readonly label = input.required<string>();
  /** Icône (`préfixe:nom`, voir `provideUiIcons()`) : indispensable pour un affichage en rail lisible. */
  readonly icon = input<string>();
  /** Désactive le sous-menu. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Sous-menu ouvert (liaison bidirectionnelle `[(expanded)]`). */
  readonly expanded = model(false);
  /** Position du panneau flottant : `auto` (sous le bouton au premier niveau d'un menu horizontal, à côté sinon). */
  readonly placement = input<UiSubmenuPlacement>('auto');

  private readonly menu = inject(UiMenu, { optional: true });
  private readonly parent = inject(UiSubmenu, { optional: true, skipSelf: true });
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly triggerRef = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelRef = viewChild.required<ElementRef<HTMLElement>>('panel');

  protected readonly triggerId = uniqueId('ui-submenu');
  protected readonly panelId = `${this.triggerId}-panel`;
  protected readonly anchorName = `--${this.triggerId}`;
  /** Bouton de menu autonome (hors `ui-menu`) : apparence de bouton, clavier propre. */
  protected readonly standalone = !this.menu && !this.parent;
  /** Niveau d'imbrication (0 = premier niveau). */
  readonly depth: number = this.parent ? this.parent.depth + 1 : 0;
  /** Le sous-menu contient l'élément courant (`aria-current="page"`, `.is-active`, `active`). */
  readonly hasActive = signal(false);
  /** Dans une `ui-toolbar` verticale (panneau à côté plutôt que dessous). */
  private readonly inVerticalToolbar = signal(false);
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  private removeFallbackListeners: (() => void) | null = null;

  /** Panneau flottant (popover) plutôt que dépliage sur place. */
  readonly flyout: Signal<boolean> = computed((): boolean => {
    if (this.parent) return this.parent.flyout();
    return !this.menu || this.menu.horizontal() || this.menu.rail();
  });
  /** @internal Premier niveau d'un menu horizontal. */
  readonly isTop = computed(() => !this.parent && !!this.menu?.horizontal());
  protected readonly rail = computed(() => !this.parent && !!this.menu?.rail());
  /** @internal Position appliquée. */
  readonly resolvedPlacement = computed<'below' | 'side'>(() => {
    const wanted = this.placement();
    if (wanted !== 'auto') return wanted;
    if (this.parent) return 'side';
    if (this.menu) return this.menu.horizontal() ? 'below' : 'side';
    return this.inVerticalToolbar() ? 'side' : 'below';
  });

  constructor() {
    SUBMENUS.set(this.host, this);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.inVerticalToolbar.set(!!this.host.closest('[role="toolbar"][aria-orientation="vertical"]'));
      const panel = this.panelRef().nativeElement;
      const check = () =>
        this.hasActive.set(!!panel.querySelector('[aria-current="page"], .is-active, .ui-menu-item--active'));
      check();
      if (typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(check);
      observer.observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current', 'class'] });
      destroyRef.onDestroy(() => observer.disconnect());
    });
    destroyRef.onDestroy(() => {
      clearTimeout(this.hoverTimer);
      this.removeFallbackListeners?.();
    });

    // Dépliage sur place : s'ouvre quand il contient (ou vient à contenir) la page courante.
    let hadActive = false;
    effect(() => {
      const active = this.hasActive();
      if (active && !hadActive && !this.flyout()) untracked(() => this.expanded.set(true));
      hadActive = active;
    });

    // Changement de mode (barre repliée, rail…) : on repart fermé pour ne pas ouvrir un panneau flottant à l'improviste.
    let wasFlyout: boolean | undefined;
    effect(() => {
      const flyout = this.flyout();
      if (wasFlyout !== undefined && wasFlyout !== flyout) untracked(() => this.expanded.set(false));
      wasFlyout = flyout;
    });

    // `[(expanded)]` piloté de l'extérieur → état du popover.
    afterRenderEffect(() => {
      const wanted = this.expanded();
      if (!this.flyout()) return;
      untracked(() => {
        const panel = this.panelRef().nativeElement;
        if (!canPopover(panel)) return;
        const open = popoverOpen(panel);
        if (wanted && !open) panel.showPopover();
        else if (!wanted && open) panel.hidePopover();
      });
    });
  }

  /** Ouvre le sous-menu ; `focus` place le focus sur son premier ou dernier élément. */
  open(focus?: 'first' | 'last'): void {
    if (this.disabled()) return;
    const panel = this.panelRef().nativeElement;
    if (this.flyout() && canPopover(panel)) {
      if (!popoverOpen(panel)) panel.showPopover();
    } else {
      this.expanded.set(true);
    }
    if (focus) afterNextRender(() => this.focusItem(focus), { injector: this.injector });
  }

  /** Ferme le sous-menu (et ses sous-menus) ; `restoreFocus` remet le focus sur son bouton. */
  close(restoreFocus = false): void {
    const panel = this.panelRef().nativeElement;
    if (this.flyout() && popoverOpen(panel)) panel.hidePopover();
    this.expanded.set(false);
    if (restoreFocus) this.focusTrigger();
  }

  /** Ouvre ou ferme le sous-menu. */
  toggle(): void {
    if (this.expanded()) this.close();
    else this.open();
  }

  /** @internal */
  focusTrigger(): void {
    this.triggerRef().nativeElement.focus({ preventScroll: true });
  }

  /** @internal */
  focusItem(which: 'first' | 'last'): void {
    const items = levelItems(this.panelRef().nativeElement);
    (which === 'first' ? items[0] : items.at(-1))?.focus();
  }

  /** @internal Bouton du sous-menu. */
  get triggerElement(): HTMLElement {
    return this.triggerRef().nativeElement;
  }

  /** @internal Ferme toute la cascade de panneaux flottants (après le choix d'un élément). */
  closeCascade(): void {
    if (this.flyout()) this.flyoutRoot().close();
  }

  private flyoutRoot(): UiSubmenu {
    return this.parent?.flyout() ? this.parent.flyoutRoot() : this;
  }

  protected onTriggerClick(): void {
    // En panneau flottant, `popovertarget` gère l'ouverture (et le clic qui referme un panneau déjà ouvert).
    if (!this.flyout()) this.expanded.update((open) => !open);
  }

  protected onToggle(event: Event): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.expanded.set(open);
    if (open) {
      this.placeWithoutAnchorSupport();
      return;
    }
    this.removeFallbackListeners?.();
    // Fermeture alors que le focus était dans le panneau (Échap, élément choisi, clic dans le vide) : retour au bouton.
    const active = this.document.activeElement;
    if (!active || active === this.document.body || this.panelRef().nativeElement.contains(active)) {
      this.focusTrigger();
    }
  }

  protected onEscape(event: Event): void {
    if (!this.flyout() || !this.expanded()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close(true);
  }

  protected onHover(enter: boolean): void {
    if (!this.flyout() || this.disabled() || !this.menu?.openOnHover()) return;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => (enter ? this.open() : this.close()), enter ? 120 : 300);
  }

  protected onHostKeydown(event: KeyboardEvent): void {
    // Sous-menu autonome (bouton de menu) : il gère lui-même le clavier de sa cascade.
    if (!this.standalone) return;
    if (handleMenuKeydown(event, this.host, this.resolvedPlacement() === 'below', false)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /** Sans ancrage CSS : position calculée à l'ouverture, panneau refermé au défilement / redimensionnement. */
  private placeWithoutAnchorSupport(): void {
    if (supportsAnchor()) return;
    const view = this.document.defaultView;
    if (!view) return;
    const panel = this.panelRef().nativeElement;
    const anchor = this.triggerRef().nativeElement.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    const margin = 8;
    let top: number;
    let left: number;
    if (this.resolvedPlacement() === 'below') {
      top = anchor.bottom + 4;
      left = Math.min(anchor.left, view.innerWidth - box.width - margin);
      if (top + box.height > view.innerHeight && anchor.top - box.height > margin) top = anchor.top - box.height - 4;
    } else {
      left = anchor.right + 2;
      if (left + box.width > view.innerWidth) left = anchor.left - box.width - 2;
      top = Math.min(anchor.top - 4, view.innerHeight - box.height - margin);
    }
    Object.assign(panel.style, {
      inset: 'auto',
      margin: '0',
      top: `${Math.max(margin, top)}px`,
      left: `${Math.max(margin, left)}px`,
    });
    const dismiss = (event: Event) => {
      if (!(event.target instanceof Node && panel.contains(event.target))) this.close();
    };
    view.addEventListener('scroll', dismiss, true);
    view.addEventListener('resize', dismiss);
    this.removeFallbackListeners = () => {
      view.removeEventListener('scroll', dismiss, true);
      view.removeEventListener('resize', dismiss);
      this.removeFallbackListeners = null;
    };
  }
}

/** Référence différée (UiMenuGroup est déclaré avant UiSubmenu). */
function forwardSubmenu(): typeof UiSubmenu {
  return UiSubmenu;
}

/**
 * Élément de menu, sur un lien ou un bouton natif (`<a uiMenuItem routerLink="/">`).
 * Avec le routeur : `routerLinkActive="is-active" ariaCurrentWhenActive="page"`, ou l'input `active`.
 * En rail, le libellé est masqué visuellement (toujours lu par les lecteurs d'écran) et affiché en infobulle ;
 * sans icône, l'initiale du libellé est affichée. Choisir un élément d'un panneau flottant referme la cascade.
 *
 * @slot default - Libellé.
 * @slot [uiMenuBadge] - Compteur ou badge en fin de ligne (masqué en rail).
 */
@Component({
  // Sélecteur d'attribut volontaire : on garde le lien / bouton natif (navigation, clavier, routeur).
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'a[uiMenuItem], button[uiMenuItem]',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-menu-item',
    '[class.ui-menu-item--active]': 'active()',
    '[class.ui-menu-item--rail]': 'rail()',
    '[class.ui-menu-item--top]': 'top()',
    '[attr.aria-current]': 'active() ? "page" : null',
    '[attr.title]': 'rail() ? text() : null',
    '(click)': 'onClick()',
  },
  template: `
    @if (icon(); as name) {
      <ui-icon class="ui-menu-item__icon" [name]="name" />
    } @else if (rail()) {
      <span class="ui-menu-item__initial" aria-hidden="true">{{ text().charAt(0) }}</span>
    }
    <span class="ui-menu-item__label"><ng-content /></span>
    <span class="ui-menu-item__badge"><ng-content select="[uiMenuBadge]" /></span>
  `,
  styleUrl: './menu-item.css',
})
export class UiMenuItem {
  /** Icône (`préfixe:nom`, voir `provideUiIcons()`) : indispensable pour un affichage en rail lisible. */
  readonly icon = input<string>();
  /** Élément courant (`aria-current="page"`). Inutile avec `routerLinkActive` + `ariaCurrentWhenActive`. */
  readonly active = input(false, { transform: booleanAttribute });

  private readonly sidebar = inject(UiSidebar, { optional: true });
  private readonly menu = inject(UiMenu, { optional: true });
  private readonly submenu = inject(UiSubmenu, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  protected readonly rail = computed(() => !this.submenu && (this.menu ? this.menu.rail() : (this.sidebar?.isRail() ?? false)));
  /** Premier niveau d'un menu horizontal (indicateur sous l'élément). */
  protected readonly top = computed(() => !this.submenu && !!this.menu?.horizontal());
  protected readonly text = signal('');

  constructor() {
    afterNextRender(() => {
      this.text.set(this.host.querySelector('.ui-menu-item__label')?.textContent?.trim() ?? '');
    });
  }

  protected onClick(): void {
    this.submenu?.closeCascade();
  }
}

/** Éléments navigables d'un niveau : ceux du conteneur, hors panneaux flottants imbriqués et sous-menus repliés. */
function levelItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter((el) => {
    const flyPanel = el.parentElement?.closest('.ui-submenu__panel--flyout');
    if (flyPanel && flyPanel !== container && container.contains(flyPanel)) return false;
    const hidden = el.closest('[hidden]');
    if (hidden && container.contains(hidden)) return false;
    return !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true';
  });
}

/**
 * Clavier d'un menu (délégué depuis sa racine). Renvoie `true` si la touche a été traitée.
 * `navigateRoot` = les flèches parcourent le premier niveau (faux pour un bouton de menu autonome, qui laisse
 * ces touches à la barre d'outils qui le contient).
 */
function handleMenuKeydown(event: KeyboardEvent, root: HTMLElement, rootHorizontal: boolean, navigateRoot: boolean): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  const target = event.target as HTMLElement;
  if (!target.matches?.(ITEM_SELECTOR)) return false;

  const panel = target.parentElement?.closest<HTMLElement>('.ui-submenu__panel--flyout');
  const container = panel && root.contains(panel) ? panel : root;
  const horizontal = container === root && rootHorizontal;
  const rtl = getComputedStyle(container).direction === 'rtl';
  const [left, right] = rtl ? ['ArrowRight', 'ArrowLeft'] : ['ArrowLeft', 'ArrowRight'];
  const next = horizontal ? right : 'ArrowDown';
  const previous = horizontal ? left : 'ArrowUp';
  const enter = horizontal ? 'ArrowDown' : right;
  const leave = horizontal ? null : left;
  const key = event.key;

  if (container === root && !navigateRoot && [next, previous, 'Home', 'End'].includes(key)) return false;

  const items = levelItems(container);
  const index = items.indexOf(target);
  switch (key) {
    case next:
      items[(index + 1) % items.length]?.focus();
      return true;
    case previous:
      items[(index - 1 + items.length) % items.length]?.focus();
      return true;
    case 'Home':
      items[0]?.focus();
      return true;
    case 'End':
      items.at(-1)?.focus();
      return true;
  }

  const submenu = target.classList.contains('ui-submenu__trigger') && target.parentElement ? SUBMENUS.get(target.parentElement) : undefined;
  if (submenu && !submenu.disabled()) {
    if (key === enter) {
      if (submenu.flyout() || !submenu.expanded()) submenu.open('first');
      else submenu.focusItem('first');
      return true;
    }
    if (horizontal && key === 'ArrowUp') {
      submenu.open('last');
      return true;
    }
    if (key === leave && !submenu.flyout() && submenu.expanded()) {
      submenu.close();
      return true;
    }
  }

  if (container !== root && container.parentElement) {
    const owner = SUBMENUS.get(container.parentElement);
    // Panneau sous un élément de la barre : gauche / droite passent au voisin de la barre (comme une barre de menus).
    if (owner?.isTop() && (key === leave || (key === enter && !submenu))) {
      owner.close();
      const tops = levelItems(root);
      const position = tops.indexOf(owner.triggerElement);
      tops[(position + (key === leave ? -1 : 1) + tops.length) % tops.length]?.focus();
      return true;
    }
    if (owner && key === leave) {
      owner.close(true);
      return true;
    }
  } else if (key === leave) {
    // Dans un sous-menu déplié sur place : retour au bouton parent.
    const inlinePanel = target.parentElement?.closest<HTMLElement>('.ui-submenu__panel');
    const owner = inlinePanel && root.contains(inlinePanel) && inlinePanel.parentElement ? SUBMENUS.get(inlinePanel.parentElement) : undefined;
    if (owner) {
      owner.focusTrigger();
      return true;
    }
  }
  return false;
}
