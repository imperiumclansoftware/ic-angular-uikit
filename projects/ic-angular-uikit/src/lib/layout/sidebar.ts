import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
  viewChild,
  Injector,
  DOCUMENT,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { UiLayout } from './layout';

/** État d'une colonne : déployée, réduite aux icônes (rail) ou masquée. */
export type UiSidebarState = 'open' | 'rail' | 'closed';

/** Comportement : toujours visible, pousse le contenu, ou glisse au-dessus. */
export type UiSidebarMode = 'static' | 'push' | 'over';

/**
 * Colonne latérale d'un `ui-layout`, à gauche ou à droite.
 *
 * - `mode="static"` : toujours visible (seule la réduction en rail est possible) ;
 * - `mode="push"` : se replie en poussant / libérant le contenu ;
 * - `mode="over"` : se déploie au-dessus du contenu.
 *
 * Repli vers un rail d'icônes (`collapseTo="rail"`) ou masquage complet (`collapseTo="closed"`).
 * Largeur fixe, ou ajustable à la souris et au clavier avec `resizable`. Sous le `breakpoint` du layout,
 * la colonne devient un tiroir : voile, Échap pour fermer, focus déplacé dans le tiroir puis restitué.
 *
 * @slot default - Contenu de la colonne (souvent un `ui-menu`).
 * @slot [uiSidebarHeader] - Haut de colonne (logo, titre).
 * @slot [uiSidebarFooter] - Bas de colonne (profil, réglages).
 * @cssprop --ui-sidebar-bg - Fond de la colonne (défaut : `--ui-color-surface`).
 * @category Mise en page
 */
@Component({
  selector: 'ui-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-sidebar ui-sidebar--" + position() + " ui-sidebar--" + effectiveState()',
    '[class.ui-sidebar--overlay]': 'overlayOpen()',
    '[class.ui-sidebar--resizing]': 'resizing()',
    '[style.--_occupied.px]': 'occupiedWidth()',
    '[style.--_panel.px]': 'panelWidth()',
  },
  template: `
    @if (overlayOpen()) {
      <div class="ui-sidebar__scrim" aria-hidden="true" (click)="close()"></div>
    }
    <div
      #panel
      class="ui-sidebar__panel"
      tabindex="-1"
      [id]="panelId"
      [attr.role]="ariaLabel() ? 'region' : null"
      [attr.aria-label]="ariaLabel() ?? null"
      (keydown.escape)="onEscape($event)"
    >
      <ng-content select="[uiSidebarHeader]" />
      <div class="ui-sidebar__content"><ng-content /></div>
      <ng-content select="[uiSidebarFooter]" />
      @if (canResize()) {
        <div
          class="ui-sidebar__resizer"
          role="separator"
          tabindex="0"
          aria-orientation="vertical"
          [attr.aria-label]="'Redimensionner ' + (ariaLabel() ?? 'la colonne')"
          [attr.aria-valuenow]="width()"
          [attr.aria-valuemin]="minWidth()"
          [attr.aria-valuemax]="maxWidth()"
          (pointerdown)="startResize($event)"
          (keydown)="onResizeKey($event)"
        ></div>
      }
    </div>
  `,
  styleUrl: './sidebar.css',
})
export class UiSidebar {
  /** Côté de la colonne. */
  readonly position = input<'left' | 'right'>('left');
  /** Comportement : `static`, `push` (pousse le contenu) ou `over` (au-dessus du contenu). */
  readonly mode = input<UiSidebarMode>('push');
  /** État : `open`, `rail` (icônes seules) ou `closed` (liaison `[(state)]`). */
  readonly state = model<UiSidebarState>('open');
  /** État atteint par `toggle()` quand la colonne se replie : rail d'icônes ou masquage complet. */
  readonly collapseTo = input<'rail' | 'closed'>('closed');
  /** Largeur déployée en pixels (liaison `[(width)]`, mise à jour par le redimensionnement). */
  readonly width = model(256);
  /** Largeur du rail en pixels. */
  readonly railWidth = input(64, { transform: numberAttribute });
  /** Largeur ajustable par l'utilisateur (poignée sur le bord intérieur, flèches au clavier). */
  readonly resizable = input(false, { transform: booleanAttribute });
  /** Largeur minimale (px) en redimensionnement. */
  readonly minWidth = input(180, { transform: numberAttribute });
  /** Largeur maximale (px) en redimensionnement. */
  readonly maxWidth = input(480, { transform: numberAttribute });
  /** Nom accessible de la colonne (en fait une région nommée). */
  readonly ariaLabel = input<string>();

  private readonly layout = inject(UiLayout, { optional: true });
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  /** Identifiant du panneau (pour `aria-controls`). */
  readonly panelId = uniqueId('ui-sidebar');
  /** Tiroir mobile ouvert (indépendant de l'état desktop, conservé). */
  private readonly drawerOpen = signal(false);
  protected readonly resizing = signal(false);
  private returnFocus: HTMLElement | null = null;

  /** Le layout est en mode mobile. */
  readonly isMobile = computed(() => this.layout?.isMobile() ?? false);

  /** État réellement appliqué (mobile : tiroir ouvert / fermé ; static : jamais masquée). */
  readonly effectiveState = computed<UiSidebarState>(() => {
    if (this.isMobile()) return this.drawerOpen() ? 'open' : 'closed';
    const state = this.state();
    return this.mode() === 'static' && state === 'closed' ? 'open' : state;
  });

  /** Colonne réduite aux icônes. */
  readonly isRail = computed(() => this.effectiveState() === 'rail');
  /** Colonne déployée. */
  readonly expanded = computed(() => this.effectiveState() === 'open');
  /** Déployée au-dessus du contenu (tiroir mobile ou mode `over`). */
  readonly overlayOpen = computed(() => this.expanded() && (this.isMobile() || this.mode() === 'over'));

  protected readonly canResize = computed(() => this.resizable() && this.expanded() && !this.isMobile());

  /** Place réservée dans la mise en page (le panneau peut être plus large en mode `over`). */
  protected readonly occupiedWidth = computed(() => {
    if (this.isMobile()) return 0;
    const state = this.effectiveState();
    if (state === 'closed') return 0;
    if (state === 'rail') return this.railWidth();
    return this.mode() === 'over' ? (this.collapseTo() === 'rail' ? this.railWidth() : 0) : this.width();
  });

  protected readonly panelWidth = computed(() => (this.isRail() ? this.railWidth() : this.width()));

  constructor() {
    // Ouverture en superposition : focus dans le panneau ; fermeture : focus rendu à l'élément d'origine.
    effect(() => {
      const overlay = this.overlayOpen();
      untracked(() => {
        if (overlay) {
          const active = this.document.activeElement;
          this.returnFocus = active instanceof HTMLElement ? active : null;
          afterNextRender(() => this.panel().nativeElement.focus({ preventScroll: true }), { injector: this.injector });
        } else if (this.returnFocus) {
          const target = this.returnFocus;
          this.returnFocus = null;
          const active = this.document.activeElement;
          if (this.panel().nativeElement.contains(active) || active === this.document.body) {
            target.focus({ preventScroll: true });
          }
        }
      });
    });
    // Passage en mobile : le tiroir démarre fermé.
    effect(() => {
      if (this.isMobile()) untracked(() => this.drawerOpen.set(false));
    });
  }

  /** Déploie la colonne. */
  open(): void {
    if (this.isMobile()) this.drawerOpen.set(true);
    else this.state.set('open');
  }

  /** Replie la colonne vers `collapseTo` (ferme le tiroir sur mobile). */
  close(): void {
    if (this.isMobile()) this.drawerOpen.set(false);
    else if (this.mode() !== 'static' || this.collapseTo() === 'rail') this.state.set(this.collapseTo());
  }

  /** Réduit la colonne aux icônes. */
  rail(): void {
    if (!this.isMobile()) this.state.set('rail');
  }

  /** Masque complètement la colonne (sauf `mode="static"`). */
  hide(): void {
    if (this.isMobile()) this.drawerOpen.set(false);
    else if (this.mode() !== 'static') this.state.set('closed');
  }

  /** Bascule entre déployée et repliée. */
  toggle(): void {
    if (this.expanded()) this.close();
    else this.open();
  }

  protected onEscape(event: Event): void {
    if (this.overlayOpen()) {
      event.stopPropagation();
      this.close();
    }
  }

  protected startResize(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const panel = this.panel().nativeElement.getBoundingClientRect();
    const left = this.position() === 'left';
    this.resizing.set(true);
    const move = (e: PointerEvent) => this.setWidth(left ? e.clientX - panel.left : panel.right - e.clientX);
    const stop = () => {
      this.resizing.set(false);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }

  protected onResizeKey(event: KeyboardEvent): void {
    const step = event.shiftKey ? 64 : 16;
    const grow = this.position() === 'left' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = this.position() === 'left' ? 'ArrowLeft' : 'ArrowRight';
    const changes: Record<string, number> = {
      [grow]: this.width() + step,
      [shrink]: this.width() - step,
      Home: this.minWidth(),
      End: this.maxWidth(),
    };
    if (event.key in changes) {
      event.preventDefault();
      this.setWidth(changes[event.key]);
    }
  }

  private setWidth(width: number): void {
    this.width.set(Math.round(Math.min(this.maxWidth(), Math.max(this.minWidth(), width))));
  }
}

/** Contenu du haut de colonne (`<div uiSidebarHeader>`). */
@Directive({
  selector: '[uiSidebarHeader]',
  host: { class: 'ui-sidebar__header', style: 'display:flex;align-items:center;gap:var(--ui-space-2);min-height:3.5rem;padding:0 var(--ui-space-3);flex:none' },
})
export class UiSidebarHeader {}

/** Contenu du bas de colonne (`<div uiSidebarFooter>`). */
@Directive({
  selector: '[uiSidebarFooter]',
  host: { class: 'ui-sidebar__footer', style: 'display:flex;flex-direction:column;gap:var(--ui-space-1);padding:var(--ui-space-2);border-top:1px solid var(--ui-color-border);flex:none' },
})
export class UiSidebarFooter {}

/**
 * Bouton qui déploie / replie une colonne et expose son état (`aria-expanded`, `aria-controls`).
 *
 * ```html
 * <button uiButton iconOnly icon="lucide:menu" aria-label="Menu" [uiSidebarToggle]="nav"></button>
 * <ui-sidebar #nav>…</ui-sidebar>
 * ```
 */
@Directive({
  selector: '[uiSidebarToggle]',
  host: {
    '(click)': 'sidebar().toggle()',
    '[attr.aria-expanded]': 'sidebar().expanded()',
    '[attr.aria-controls]': 'sidebar().panelId',
  },
})
export class UiSidebarToggle {
  /** Colonne pilotée. */
  readonly sidebar = input.required<UiSidebar>({ alias: 'uiSidebarToggle' });
}
