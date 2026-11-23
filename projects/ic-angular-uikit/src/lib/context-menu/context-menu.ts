import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { handleMenuKeydown, levelItems } from '../menu/menu';
import { UI_CONTEXT_MENU } from '../menu/menu-host';

/** Payload de l'événement `opened`. */
export interface UiContextMenuEvent {
  /** Donnée associée à l'ouverture (`[uiContextMenuData]` ou `openAt(…, { data })`). */
  data: unknown;
  /** Élément sur lequel le menu a été demandé. */
  trigger: HTMLElement | null;
  /** Origine : clic droit, appui long, clavier (touche Menu, Maj+F10) ou code. */
  source: 'pointer' | 'touch' | 'keyboard' | 'api';
}

/** Options de `openAt()`. */
export interface UiContextMenuOpenOptions {
  /** Donnée exposée par `data()` pendant l'ouverture (ligne, fichier…). */
  data?: unknown;
  /** Élément qui reprend le focus à la fermeture. */
  trigger?: HTMLElement | null;
  /** Origine de l'ouverture (transmise à `opened`). */
  source?: UiContextMenuEvent['source'];
}

const MARGIN = 8;

/**
 * Menu contextuel : s'ouvre au clic droit, à l'appui long (tactile) ou au clavier (touche Menu, Maj+F10) sur les
 * éléments qui portent `[uiContextMenuTrigger]`, à l'endroit du pointeur. Contenu : `uiMenuItem` (avec
 * `shortcut`, `tone="danger"`, `checked`), `ui-submenu` (s'ouvre à côté), `ui-menu-group`, `ui-menu-separator`.
 *
 * Motif ARIA « menu » : rôles `menu` / `menuitem` (`menuitemcheckbox`, `menuitemradio`), focus sur le premier
 * élément à l'ouverture, flèches haut / bas, Origine / Fin, première lettre pour atteindre un élément, flèche droite
 * pour un sous-menu, Échap ou Tab pour fermer ; le focus revient alors sur l'élément d'origine. Popover natif :
 * couche supérieure, fermeture au clic extérieur.
 *
 * Un menu contextuel est un raccourci : proposez aussi ces actions ailleurs (bouton « ⋯ », barre d'outils), car
 * il est peu découvrable au clavier et indisponible sans souris sur certains appareils.
 *
 * @slot default - Éléments `uiMenuItem`, `ui-submenu`, `ui-menu-group`, `ui-menu-separator`.
 * @cssprop --ui-context-menu-min-width - Largeur minimale (défaut : `12rem`).
 * @category Actions
 */
@Component({
  selector: 'ui-context-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: UI_CONTEXT_MENU, useExisting: forwardRef(() => UiContextMenu) }],
  host: { class: 'ui-context-menu' },
  template: `
    <div
      #panel
      class="ui-context-menu__panel"
      popover="auto"
      role="menu"
      tabindex="-1"
      [id]="panelId"
      [attr.aria-label]="ariaLabel()"
      (toggle)="onToggle($event)"
      (keydown)="onKeydown($event)"
    >
      <ng-content />
    </div>
  `,
  styles: `
    :host { display: contents; }
    .ui-context-menu__panel {
      box-sizing: border-box;
      position: fixed;
      inset: auto;
      margin: 0;
      min-width: var(--ui-context-menu-min-width, 12rem);
      max-width: min(22rem, calc(100vw - 1rem));
      max-height: calc(100vh - 1rem);
      overflow: auto;
      padding: var(--ui-space-1);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md);
      background: var(--ui-color-surface-raised);
      color: var(--ui-color-text);
      box-shadow: var(--ui-shadow-lg);
      font-family: var(--ui-font-family);
      font-size: var(--ui-font-size-sm);
      text-align: start;
    }
    .ui-context-menu__panel:popover-open { display: flex; flex-direction: column; gap: 2px; }
    .ui-context-menu__panel:focus { outline: none; }
  `,
})
export class UiContextMenu {
  /** Nom accessible du menu. */
  readonly ariaLabel = input('Menu contextuel');

  /** Émis à l'ouverture. */
  readonly opened = output<UiContextMenuEvent>();
  /** Émis à la fermeture. */
  readonly closed = output<void>();

  /** Donnée associée à l'ouverture en cours (ligne, fichier…) : `menu.data()` dans les éléments. */
  readonly data = signal<unknown>(undefined);
  /** Le menu est ouvert. */
  readonly isOpen = signal(false);

  private readonly panelRef = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly panelId = uniqueId('ui-context-menu');
  private returnFocus: HTMLElement | null = null;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.typeaheadTimer));
  }

  /**
   * Ouvre le menu au point (`x`, `y`) de la fenêtre. Le menu se décale pour rester visible.
   * Le contenu est rendu avant l'affichage : il peut dépendre de `data()`.
   */
  openAt(x: number, y: number, options: UiContextMenuOpenOptions = {}): void {
    const active = this.document.activeElement;
    this.returnFocus = options.trigger ?? (active instanceof HTMLElement ? active : null);
    this.data.set(options.data);
    afterNextRender(
      () => {
        const panel = this.panelRef().nativeElement;
        if (typeof panel.showPopover !== 'function') return;
        if (panel.matches(':popover-open')) panel.hidePopover();
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.showPopover();
        this.place(panel, x, y);
        this.isOpen.set(true);
        this.opened.emit({ data: options.data, trigger: options.trigger ?? null, source: options.source ?? 'api' });
        (levelItems(panel)[0] ?? panel).focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  /** Ouvre le menu sous un élément (bouton « ⋯ », ouverture au clavier). */
  openFor(element: HTMLElement, options: UiContextMenuOpenOptions = {}): void {
    const rect = element.getBoundingClientRect();
    this.openAt(rect.left, rect.bottom + 2, { trigger: element, ...options });
  }

  /** Ferme le menu ; `restoreFocus` rend le focus à l'élément d'origine. */
  close(restoreFocus = true): void {
    const panel = this.panelRef().nativeElement;
    if (!restoreFocus) this.returnFocus = null;
    if (typeof panel.hidePopover === 'function' && panel.matches(':popover-open')) panel.hidePopover();
  }

  /** Décale le menu s'il dépasse de la fenêtre (vers la gauche / le haut du point, sinon contre le bord). */
  private place(panel: HTMLElement, x: number, y: number): void {
    const view = this.document.defaultView;
    if (!view) return;
    const { width, height } = panel.getBoundingClientRect();
    const rtl = getComputedStyle(panel).direction === 'rtl';
    let left = rtl ? x - width : x;
    if (left + width > view.innerWidth - MARGIN) left = x - width;
    if (left < MARGIN) left = Math.min(x, view.innerWidth - width - MARGIN);
    let top = y;
    if (top + height > view.innerHeight - MARGIN) top = y - height;
    panel.style.left = `${Math.max(MARGIN, left)}px`;
    panel.style.top = `${Math.max(MARGIN, top)}px`;
  }

  protected onToggle(event: Event): void {
    if ((event as ToggleEvent).newState === 'open') return;
    this.isOpen.set(false);
    this.closed.emit();
    const target = this.returnFocus;
    this.returnFocus = null;
    const active = this.document.activeElement;
    const panel = this.panelRef().nativeElement;
    // Focus resté dans le menu (Échap, élément choisi) ou perdu : retour à l'élément d'origine.
    if (target?.isConnected && (!active || active === this.document.body || panel.contains(active))) {
      target.focus({ preventScroll: true });
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const panel = this.panelRef().nativeElement;
    if (event.key === 'Tab') {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (handleMenuKeydown(event, panel, false, true)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Saisie d'une lettre : élément suivant qui commence par ces lettres (dans le niveau du focus).
    if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target as HTMLElement;
      const container = target.parentElement?.closest<HTMLElement>('.ui-submenu__panel--flyout') ?? panel;
      const items = levelItems(container.contains(target) ? container : panel);
      clearTimeout(this.typeaheadTimer);
      this.typeahead += event.key.toLocaleLowerCase();
      this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), 600);
      const start = Math.max(0, items.indexOf(target) + (this.typeahead.length === 1 ? 1 : 0));
      const ordered = [...items.slice(start), ...items.slice(0, start)];
      const match = ordered.find((item) => labelOf(item).startsWith(this.typeahead));
      if (match) {
        event.preventDefault();
        match.focus();
      }
    }
  }
}

function labelOf(item: HTMLElement): string {
  const label = item.querySelector('.ui-menu-item__label, .ui-submenu__label') ?? item;
  return (label.textContent ?? '').trim().toLocaleLowerCase();
}

/**
 * Associe un menu contextuel à un élément : clic droit, appui long sur écran tactile, touche Menu ou Maj+F10
 * (l'élément doit alors être focalisable, `tabindex="0"`). Le menu natif du navigateur est remplacé.
 *
 * ```html
 * <li tabindex="0" [uiContextMenuTrigger]="menu" [uiContextMenuData]="file">{{ file.name }}</li>
 * <ui-context-menu #menu>…</ui-context-menu>
 * ```
 */
@Directive({
  selector: '[uiContextMenuTrigger]',
  host: {
    '(contextmenu)': 'onContextMenu($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '[style.-webkit-touch-callout]': 'uiContextMenuDisabled() ? null : "none"',
  },
})
export class UiContextMenuTrigger {
  /** Menu à ouvrir. */
  readonly menu = input.required<UiContextMenu>({ alias: 'uiContextMenuTrigger' });
  /** Donnée exposée par `menu.data()` (l'élément concerné). */
  readonly uiContextMenuData = input<unknown>(undefined);
  /** Laisse le menu natif du navigateur. */
  readonly uiContextMenuDisabled = input(false, { transform: booleanAttribute });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly document = inject(DOCUMENT);
  private longPress: { timer: ReturnType<typeof setTimeout>; x: number; y: number; cleanup: () => void } | null = null;
  private openedByLongPress = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelLongPress());
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.uiContextMenuDisabled()) return;
    event.preventDefault();
    event.stopPropagation(); // un déclencheur imbriqué l'emporte sur son parent
    // Android déclenche aussi `contextmenu` après l'appui long déjà traité.
    if (Date.now() - this.openedByLongPress < 1000) return;
    const keyboard = (event as PointerEvent).pointerType === '' || (event.clientX === 0 && event.clientY === 0);
    if (keyboard) {
      const active = this.document.activeElement;
      const target = active instanceof HTMLElement && this.host.contains(active) ? active : this.host;
      this.menu().openFor(target, { data: this.uiContextMenuData(), source: 'keyboard' });
    } else {
      this.menu().openAt(event.clientX, event.clientY, { data: this.uiContextMenuData(), trigger: this.focusTarget(event), source: 'pointer' });
    }
  }

  /**
   * Appui long (tactile) : iOS ne déclenche pas `contextmenu`. Le menu s'ouvre au relâchement, une fois l'appui
   * reconnu (ouvert pendant l'appui, il serait aussitôt refermé : le relâchement compte comme un clic extérieur).
   */
  protected onPointerDown(event: PointerEvent): void {
    if (this.uiContextMenuDisabled() || event.pointerType !== 'touch') return;
    this.cancelLongPress();
    let ready = false;
    const move = (e: PointerEvent) => {
      if (this.longPress && Math.hypot(e.clientX - this.longPress.x, e.clientY - this.longPress.y) > 10) this.cancelLongPress();
    };
    const up = () => {
      const armed = ready;
      this.cancelLongPress();
      if (!armed) return;
      this.openedByLongPress = Date.now();
      // Le clic qui suit le relâchement ne doit pas activer l'élément sous le doigt.
      const swallow = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };
      this.host.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => this.host.removeEventListener('click', swallow, { capture: true }), 400);
      setTimeout(() => this.menu().openAt(event.clientX, event.clientY, { data: this.uiContextMenuData(), trigger: this.focusTarget(event), source: 'touch' }));
    };
    const cancel = () => this.cancelLongPress();
    this.host.addEventListener('pointermove', move);
    this.host.addEventListener('pointerup', up);
    this.host.addEventListener('pointercancel', cancel);
    const timer = setTimeout(() => (ready = true), 500);
    this.longPress = {
      timer,
      x: event.clientX,
      y: event.clientY,
      cleanup: () => {
        this.host.removeEventListener('pointermove', move);
        this.host.removeEventListener('pointerup', up);
        this.host.removeEventListener('pointercancel', cancel);
      },
    };
  }

  private cancelLongPress(): void {
    if (!this.longPress) return;
    clearTimeout(this.longPress.timer);
    this.longPress.cleanup();
    this.longPress = null;
  }

  /** Élément qui reprendra le focus : la cible focalisable la plus proche, sinon l'hôte. */
  private focusTarget(event: Event): HTMLElement {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('a[href], button, input, select, textarea, [tabindex]') : null;
    return target && this.host.contains(target) ? target : this.host;
  }
}
