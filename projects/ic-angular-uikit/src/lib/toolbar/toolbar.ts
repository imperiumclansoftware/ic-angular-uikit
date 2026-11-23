import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { warnIfUnlabelled } from '../core/a11y';

/** Apparence de la barre d'outils. */
export type UiToolbarAppearance = 'plain' | 'outlined' | 'filled';

const FOCUSABLE = 'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]';
/** Types d'input qui n'utilisent pas les flèches : parcourus par la barre d'outils. */
const ARROW_FREE_INPUTS = new Set(['button', 'checkbox', 'submit', 'reset', 'image', 'color', 'file']);

/**
 * Barre d'outils accessible (motif ARIA « toolbar ») : un seul arrêt de tabulation, puis les flèches parcourent
 * les commandes (gauche / droite, ou haut / bas en vertical ; Origine / Fin). La dernière commande utilisée garde
 * le focus au retour dans la barre.
 *
 * Les champs qui ont besoin des flèches (texte, liste, boutons radio, curseur) restent atteignables avec Tab et
 * gardent leurs flèches. Les commandes des sous-menus (`ui-submenu`) ont leur propre clavier.
 *
 * @slot default - Boutons, `ui-submenu`, groupes `uiToolbarGroup`, `ui-toolbar-separator`, `ui-toolbar-spacer`, champs.
 * @cssprop --ui-toolbar-gap - Espace entre les commandes (défaut : `--ui-space-1`).
 * @category Actions
 */
@Component({
  selector: 'ui-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'toolbar',
    class: 'ui-toolbar',
    '[class.ui-toolbar--vertical]': 'orientation() === "vertical"',
    '[class.ui-toolbar--outlined]': 'appearance() === "outlined"',
    '[class.ui-toolbar--filled]': 'appearance() === "filled"',
    '[class.ui-toolbar--nowrap]': '!wrap()',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    '[attr.aria-orientation]': 'orientation()',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusin($event)',
  },
  template: `<ng-content />`,
  styleUrl: './toolbar.css',
})
export class UiToolbar {
  /** Nom accessible, obligatoire (« Mise en forme », « Actions sur la sélection »…). */
  readonly ariaLabel = input<string>();
  /** Disposition : `horizontal` (défaut) ou `vertical`. */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Apparence : `plain` (sans fond), `outlined` (bordure) ou `filled` (fond). */
  readonly appearance = input<UiToolbarAppearance>('plain');
  /** Passe à la ligne quand la place manque (sinon : défilement horizontal). */
  readonly wrap = input(true, { transform: booleanAttribute });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  /** Éléments dont la barre gère le `tabindex`. */
  private readonly managed = new WeakSet<HTMLElement>();
  private current: HTMLElement | null = null;
  private refreshQueued = false;

  constructor() {
    warnIfUnlabelled('ui-toolbar', () => !!this.ariaLabel());
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.refresh();
      if (typeof MutationObserver === 'undefined') return;
      const observer = new MutationObserver(() => this.queueRefresh());
      observer.observe(this.host, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'hidden'] });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Commandes parcourues aux flèches, dans l'ordre du document. */
  private items(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => this.isItem(el));
  }

  private isItem(el: HTMLElement): boolean {
    if (el.closest('ui-toolbar') !== this.host) return false;
    // Contenu des panneaux (sous-menus, popovers) et des menus : clavier propre.
    const nested = el.closest('[popover], dialog, .ui-submenu__panel, ui-menu, [hidden]');
    if (nested && this.host.contains(nested)) return false;
    if (usesArrows(el)) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    if (el.tabIndex < 0 && !this.managed.has(el)) return false;
    return true;
  }

  private queueRefresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      this.refresh();
    });
  }

  /** Tabindex itinérant : 0 sur la commande courante, -1 sur les autres. */
  private refresh(): void {
    const items = this.items();
    if (!this.current || !items.includes(this.current)) this.current = items[0] ?? null;
    for (const item of items) {
      this.managed.add(item);
      item.tabIndex = item === this.current ? 0 : -1;
    }
  }

  protected onFocusin(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target !== this.current && this.isItem(target)) {
      this.current = target;
      this.refresh();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (!this.isItem(target)) return;
    const vertical = this.orientation() === 'vertical';
    const rtl = getComputedStyle(this.host).direction === 'rtl';
    const next = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const previous = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const items = this.items();
    const index = items.indexOf(target);
    let destination: HTMLElement | undefined;
    switch (event.key) {
      case next:
        destination = items[(index + 1) % items.length];
        break;
      case previous:
        destination = items[(index - 1 + items.length) % items.length];
        break;
      case 'Home':
        destination = items[0];
        break;
      case 'End':
        destination = items.at(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (destination) {
      this.current = destination;
      this.refresh();
      destination.focus();
    }
  }
}

/** Champs qui ont besoin des flèches (saisie, liste, radio, curseur…) : exclus du parcours. */
function usesArrows(el: HTMLElement): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable) return true;
  if (el instanceof HTMLInputElement) return !ARROW_FREE_INPUTS.has(el.type);
  const role = el.getAttribute('role');
  return role === 'slider' || role === 'spinbutton' || role === 'radio' || role === 'textbox' || role === 'combobox';
}

/**
 * Groupe de commandes liées, nommé pour les lecteurs d'écran (`<div uiToolbarGroup="Alignement">`).
 */
@Directive({
  selector: '[uiToolbarGroup]',
  host: {
    role: 'group',
    class: 'ui-toolbar-group',
    '[attr.aria-label]': 'label() || null',
    style: 'display:flex;flex-direction:inherit;align-items:center;gap:2px',
  },
})
export class UiToolbarGroup {
  /** Nom du groupe. */
  readonly label = input('', { alias: 'uiToolbarGroup' });
}

/** Séparateur entre deux groupes de commandes (rôle `separator`, perpendiculaire à la barre). */
@Component({
  selector: 'ui-toolbar-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    class: 'ui-toolbar-separator',
    '[attr.aria-orientation]': 'vertical() ? "horizontal" : "vertical"',
    '[class.ui-toolbar-separator--horizontal]': 'vertical()',
  },
  template: ``,
  styles: `
    :host { flex: none; align-self: stretch; width: 1px; margin: var(--ui-space-1) var(--ui-space-1); background: var(--ui-color-border-strong); }
    :host(.ui-toolbar-separator--horizontal) { width: auto; height: 1px; margin: var(--ui-space-1) 0; }
  `,
})
export class UiToolbarSeparator {
  private readonly toolbar = inject(UiToolbar, { optional: true });
  protected readonly vertical = computed(() => this.toolbar?.orientation() === 'vertical');
}

/** Espace flexible : repousse les commandes suivantes au bout de la barre. */
@Component({
  selector: 'ui-toolbar-spacer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'ui-toolbar-spacer', style: 'flex:1 1 0;min-width:0' },
  template: ``,
})
export class UiToolbarSpacer {}
