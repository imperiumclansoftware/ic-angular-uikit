import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  forwardRef,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { UI_MENU_HOST } from '../menu/menu-host';

/** Couleur de la barre : surface neutre ou couleur principale du thème. */
export type UiAppBarColor = 'surface' | 'primary';

/** Début de la barre : logo, nom de l'application, bouton de colonne (`<a uiAppBarStart routerLink="/">`). */
@Directive({ selector: '[uiAppBarStart]', host: { class: 'ui-app-bar__slot-start' } })
export class UiAppBarStart {}

/** Fin de la barre : actions, recherche, profil (`<div uiAppBarEnd>`). Toujours visible, même repliée. */
@Directive({ selector: '[uiAppBarEnd]', host: { class: 'ui-app-bar__slot-end' } })
export class UiAppBarEnd {}

/**
 * Barre d'application : marque au début, navigation (souvent un `ui-menu orientation="horizontal"`), actions à la fin.
 *
 * Elle s'intègre dans un `ui-layout` (placée directement dedans, elle prend la place de l'en-tête, au-dessus des
 * colonnes) ou en haut de n'importe quelle page (`sticky` pour rester visible au défilement).
 *
 * Sous `breakpoint` (largeur de la barre, pas de l'écran), la navigation se replie derrière un bouton ☰
 * (`aria-expanded`) et s'affiche dans un panneau sous la barre ; les menus qu'elle contient passent en vertical,
 * leurs sous-menus se dépliant sur place. Échap, un clic à l'extérieur ou le choix d'un lien referment le panneau.
 *
 * @slot [uiAppBarStart] - Début de la barre (logo, titre, bouton de colonne).
 * @slot default - Navigation : repliée derrière le bouton ☰ sur petite largeur.
 * @slot [uiAppBarEnd] - Fin de la barre (actions, profil), toujours visible.
 * @cssprop --ui-app-bar-height - Hauteur minimale (défaut : `3.5rem`).
 * @cssprop --ui-app-bar-padding - Marge intérieure horizontale (défaut : `--ui-space-4`).
 * @cssprop --ui-app-bar-z - Niveau d'empilement, pour passer au-dessus du contenu (défaut : `3`).
 * @category Mise en page
 */
@Component({
  selector: 'ui-app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Encapsulation désactivée (classes préfixées ui-app-bar) : la couleur `primary` doit rétablir les couleurs
  // d'origine dans les panneaux flottants et champs projetés, rendus par d'autres composants.
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: UI_MENU_HOST, useExisting: forwardRef(() => UiAppBar) }],
  host: {
    class: 'ui-app-bar',
    '[class.ui-app-bar--primary]': 'color() === "primary"',
    '[class.ui-app-bar--elevated]': 'elevated()',
    '[class.ui-app-bar--sticky]': 'sticky()',
    '[class.ui-app-bar--compact]': 'compact()',
    '[attr.role]': 'landmark() ? "banner" : null',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
  template: `
    <div class="ui-app-bar__bar">
      <div class="ui-app-bar__start"><ng-content select="[uiAppBarStart]" /></div>
      @if (compact() && hasNav()) {
        <button
          #toggle
          type="button"
          class="ui-app-bar__toggle"
          [attr.aria-expanded]="navOpen()"
          [attr.aria-controls]="navId"
          [attr.aria-label]="menuLabel()"
          (click)="toggleNav()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            @if (navOpen()) {
              <path d="M18 6 6 18M6 6l12 12" />
            } @else {
              <path d="M4 7h16M4 12h16M4 17h16" />
            }
          </svg>
        </button>
      }
      <!-- Clics délégués depuis les liens et boutons du menu (fermeture du panneau replié). -->
      <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
      <div
        #nav
        class="ui-app-bar__nav"
        [id]="navId"
        [class.ui-app-bar__nav--panel]="compact()"
        [hidden]="compact() && !navOpen()"
        (click)="onNavClick($event)"
        (keydown.escape)="onNavEscape()"
      >
        <ng-content />
      </div>
      <div class="ui-app-bar__end"><ng-content select="[uiAppBarEnd]" /></div>
    </div>
  `,
  styleUrl: './app-bar.css',
})
export class UiAppBar {
  /** Couleur de fond : `surface` (défaut) ou `primary`. */
  readonly color = input<UiAppBarColor>('surface');
  /** Ombre portée au lieu du filet inférieur. */
  readonly elevated = input(false, { transform: booleanAttribute });
  /** Reste collée en haut de la zone qui défile (`position: sticky`). Inutile dans un `ui-layout`. */
  readonly sticky = input(false, { transform: booleanAttribute });
  /** Largeur de la barre (px) sous laquelle la navigation se replie derrière le bouton ☰ (`0` : jamais). */
  readonly breakpoint = input(768, { transform: numberAttribute });
  /** Nom accessible du bouton ☰. */
  readonly menuLabel = input('Menu');
  /** Rôle `banner` (en-tête du site). Désactivez-le si la page en a déjà un ou si la barre est dans une section. */
  readonly landmark = input(true, { transform: booleanAttribute });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly navRef = viewChild.required<ElementRef<HTMLElement>>('nav');
  private readonly toggleRef = viewChild<ElementRef<HTMLButtonElement>>('toggle');
  private readonly width = signal<number | null>(null);
  protected readonly navId = uniqueId('ui-app-bar-nav');
  /** La zone de navigation a un contenu (sinon, pas de bouton ☰). */
  protected readonly hasNav = signal(false);

  /** `true` quand la barre est plus étroite que `breakpoint` : navigation repliée. */
  readonly compact = computed(() => {
    const width = this.width();
    return width !== null && width < this.breakpoint();
  });

  /** Panneau de navigation ouvert (mode replié). */
  readonly navOpen = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Largeur nulle (conteneur masqué) = pas encore mesurable : on ne replie pas.
    const measure = (width: number) => {
      if (width > 0) this.width.set(width);
      this.hasNav.set(this.navRef().nativeElement.childElementCount > 0);
    };
    afterNextRender(() => {
      measure(this.host.getBoundingClientRect().width);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    effect(() => {
      if (!this.compact()) untracked(() => this.navOpen.set(false));
    });
  }

  /** Ouvre le panneau de navigation (mode replié). */
  openNav(): void {
    if (this.compact()) this.navOpen.set(true);
  }

  /** Ferme le panneau de navigation ; `restoreFocus` remet le focus sur le bouton ☰. */
  closeNav(restoreFocus = false): void {
    this.navOpen.set(false);
    if (restoreFocus) this.toggleRef()?.nativeElement.focus();
  }

  /** Ouvre ou ferme le panneau de navigation. */
  toggleNav(): void {
    if (this.navOpen()) this.closeNav();
    else this.openNav();
  }

  /** @internal Largeur forcée (tests). */
  setWidthForTesting(width: number): void {
    this.width.set(width);
  }

  protected onNavClick(event: Event): void {
    if (!this.navOpen()) return;
    // Un lien ou une action choisi ferme le panneau ; pas le bouton d'un sous-menu.
    const target = event.target instanceof Element ? event.target.closest('a[href], .ui-menu-item') : null;
    if (target) this.closeNav();
  }

  protected onNavEscape(): void {
    if (this.navOpen()) this.closeNav(true);
  }

  protected onDocumentPointerDown(event: Event): void {
    if (this.navOpen() && event.target instanceof Node && !this.host.contains(event.target)) this.closeNav();
  }
}
