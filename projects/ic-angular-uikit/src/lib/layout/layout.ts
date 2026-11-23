import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { UiSidebar } from './sidebar';

/** En-tête du layout, sur toute la largeur (`<header uiLayoutHeader>`). */
@Directive({
  selector: '[uiLayoutHeader]',
  host: {
    class: 'ui-layout__header',
    style:
      'display:flex;align-items:center;gap:var(--ui-space-3);min-height:3.5rem;padding:0 var(--ui-space-4);border-bottom:1px solid var(--ui-color-border);background:var(--ui-color-surface);position:relative;z-index:3',
  },
})
export class UiLayoutHeader {}

/** Pied du layout, sur toute la largeur (`<footer uiLayoutFooter>`). */
@Directive({
  selector: '[uiLayoutFooter]',
  host: {
    class: 'ui-layout__footer',
    style:
      'display:flex;align-items:center;gap:var(--ui-space-3);min-height:2.75rem;padding:0 var(--ui-space-4);border-top:1px solid var(--ui-color-border);background:var(--ui-color-surface);font-size:var(--ui-font-size-sm);color:var(--ui-color-text-muted)',
  },
})
export class UiLayoutFooter {}

/**
 * Structure de page sur toute la hauteur : en-tête et pied facultatifs, colonnes `ui-sidebar` à gauche
 * et / ou à droite, et une zone de contenu qui défile seule, en largeur fixe centrée ou pleine largeur.
 *
 * Sous `breakpoint` (largeur du layout, pas de l'écran), les colonnes deviennent des tiroirs au-dessus du contenu ;
 * pendant qu'un tiroir est ouvert, le contenu est rendu inactif (`inert`).
 *
 * @slot [uiLayoutHeader] - En-tête sur toute la largeur.
 * @slot ui-app-bar - Barre d'application, placée comme l'en-tête (au-dessus des colonnes).
 * @slot ui-sidebar - Colonnes latérales (gauche, droite ou les deux).
 * @slot default - Contenu de la page.
 * @slot [uiLayoutFooter] - Pied sur toute la largeur.
 * @cssprop --ui-layout-content-max - Largeur maximale du contenu en mode `fixed` (défaut : `72rem`).
 * @cssprop --ui-layout-gutter - Marge autour du contenu (défaut : `--ui-space-6`, `--ui-space-4` sur mobile).
 * @category Mise en page
 */
@Component({
  selector: 'ui-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-layout',
    '[class.ui-layout--fullscreen]': 'fullscreen()',
    '[class.ui-layout--mobile]': 'isMobile()',
  },
  template: `
    <ng-content select="[uiLayoutHeader], ui-app-bar" />
    <div class="ui-layout__body">
      <ng-content select="ui-sidebar" />
      <div
        class="ui-layout__main"
        [attr.role]="landmarks() ? 'main' : 'region'"
        [attr.aria-label]="landmarks() ? null : contentLabel()"
        [attr.inert]="overlayOpen() ? '' : null"
        tabindex="0"
      >
        <div class="ui-layout__content" [class.ui-layout__content--fixed]="content() === 'fixed'">
          <ng-content />
        </div>
      </div>
    </div>
    <ng-content select="[uiLayoutFooter]" />
  `,
  styleUrl: './layout.css',
})
export class UiLayout {
  /** Occupe toute la hauteur de l'écran (`100dvh`). Sinon, la hauteur du parent. */
  readonly fullscreen = input(true, { transform: booleanAttribute });
  /** Largeur du contenu : `fixed` (centrée, limitée à `--ui-layout-content-max`) ou `full`. */
  readonly content = input<'fixed' | 'full'>('full');
  /** Largeur du layout (px) sous laquelle les colonnes deviennent des tiroirs mobiles. */
  readonly breakpoint = input(768, { transform: numberAttribute });
  /** Ajoute le rôle `main` à la zone de contenu (désactivez-le si la page a déjà un `<main>`). */
  readonly landmarks = input(true, { transform: booleanAttribute });
  /** Nom de la zone de contenu quand `landmarks` est désactivé (région nommée). */
  readonly contentLabel = input('Contenu');

  private readonly sidebars = contentChildren(forwardRef(() => UiSidebar));
  private readonly width = signal<number | null>(null);

  /** `true` quand le layout est plus étroit que `breakpoint`. */
  readonly isMobile = computed(() => {
    const width = this.width();
    return width !== null && width < this.breakpoint();
  });

  /** Une colonne est ouverte au-dessus du contenu (tiroir mobile ou mode `over`). */
  readonly overlayOpen = computed(() => this.sidebars().some((sidebar) => sidebar.overlayOpen()));

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    // Largeur nulle (conteneur masqué, onglet inactif…) = pas encore mesurable : on ne bascule pas en mobile.
    const measure = (width: number) => {
      if (width > 0) this.width.set(width);
    };
    afterNextRender(() => {
      measure(host.getBoundingClientRect().width);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** @internal Largeur forcée (tests). */
  setWidthForTesting(width: number): void {
    this.width.set(width);
  }
}
