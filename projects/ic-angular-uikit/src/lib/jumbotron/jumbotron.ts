import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
  isDevMode,
  numberAttribute,
} from '@angular/core';
import { uniqueId } from '../core/id';

/** Fond de la section. Avec une image de fond (`uiJumbotronBackground`), le texte passe en clair sur un voile. */
export type UiJumbotronTone = 'surface' | 'sunken' | 'primary' | 'gradient';

/** Hauteur : marges verticales croissantes, ou toute la hauteur de l'écran (`screen`). */
export type UiJumbotronSize = 'sm' | 'md' | 'lg' | 'screen';

/** Niveau du titre généré par l'input `heading`. */
export type UiHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Avertit (en développement) si une image projetée n'a pas d'attribut `alt`. */
function warnMissingAlt(slot: string, advice: string): void {
  if (!isDevMode()) return;
  const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  afterNextRender(() => {
    const img = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (img && !img.hasAttribute('alt')) console.warn(`[ic-angular-uikit] <img ${slot}> sans attribut alt : ${advice}`, img);
  });
}

/** Petit texte au-dessus du titre (catégorie, nouveauté) : `<p uiJumbotronEyebrow>`. */
@Directive({ selector: '[uiJumbotronEyebrow]', host: { class: 'ui-jumbotron__eyebrow' } })
export class UiJumbotronEyebrow {}

/**
 * Titre riche, à la place de l'input `heading` : `<h1 uiJumbotronTitle>Bienvenue <em>chez nous</em></h1>`.
 * Il reçoit un identifiant qui nomme la section.
 */
@Directive({ selector: '[uiJumbotronTitle]', host: { class: 'ui-jumbotron__title', '[id]': 'id' } })
export class UiJumbotronTitle {
  /** @internal */
  readonly id = uniqueId('ui-jumbotron-title');
}

/** Boutons d'action (`<div uiJumbotronActions>`). */
@Directive({ selector: '[uiJumbotronActions]', host: { class: 'ui-jumbotron__actions' } })
export class UiJumbotronActions {}

/**
 * Illustration (image, vidéo, composant) à côté du texte sur grand écran, dessous sur petit écran.
 * Une image doit avoir un `alt` : une description utile, ou `alt=""` si elle est décorative.
 */
@Directive({ selector: '[uiJumbotronMedia]', host: { class: 'ui-jumbotron__media' } })
export class UiJumbotronMedia {
  constructor() {
    warnMissingAlt('uiJumbotronMedia', 'décrivez l’image, ou alt="" si elle est décorative.');
  }
}

/**
 * Image de fond couvrant toute la section (`<img uiJumbotronBackground src="…" alt="">`).
 * Décorative en général (`alt=""`) ; pour l'image principale de la page, ajoutez `fetchpriority="high"`.
 */
@Directive({ selector: '[uiJumbotronBackground]', host: { class: 'ui-jumbotron__bg' } })
export class UiJumbotronBackground {
  constructor() {
    warnMissingAlt('uiJumbotronBackground', 'ajoutez alt="" (image décorative) ou une description.');
  }
}

/**
 * Grande section d'accroche pour les pages d'accueil : surtitre, titre, texte d'introduction, actions,
 * et au choix une illustration à côté du texte ou une image de fond.
 *
 * Le titre nomme la section (landmark `region`). Typographie fluide, calculée sur la largeur du composant.
 * Avec une image de fond, un voile sombre (`overlay`, 0,55 par défaut) garantit un contraste suffisant pour
 * le texte blanc quelle que soit l'image ; en dessous de 0,55, vérifiez le contraste.
 *
 * @slot default - Contenu libre sous l'introduction (liste d'arguments, formulaire d'inscription…).
 * @slot [uiJumbotronEyebrow] - Surtitre riche, à la place de `eyebrow`.
 * @slot [uiJumbotronTitle] - Titre riche, à la place de `heading`.
 * @slot [uiJumbotronActions] - Boutons d'action.
 * @slot [uiJumbotronMedia] - Illustration à côté du texte (ou dessous sur petite largeur).
 * @slot [uiJumbotronBackground] - Image de fond couvrante.
 * @cssprop --ui-jumbotron-max - Largeur maximale du contenu (défaut : `72rem`).
 * @cssprop --ui-jumbotron-gutter - Marge latérale (défaut : `--ui-space-6`).
 * @cssprop --ui-jumbotron-radius - Rayon des coins (défaut : `0`, pleine largeur).
 * @cssprop --ui-jumbotron-bg - Fond personnalisé (couleur, dégradé), prioritaire sur `tone`.
 * @category Mise en page
 */
@Component({
  selector: 'ui-jumbotron',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Encapsulation désactivée (classes préfixées ui-jumbotron) : le composant met en forme le contenu projeté.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ui-jumbotron',
    '[class.ui-jumbotron--surface]': 'tone() === "surface"',
    '[class.ui-jumbotron--sunken]': 'tone() === "sunken"',
    '[class.ui-jumbotron--primary]': 'tone() === "primary"',
    '[class.ui-jumbotron--gradient]': 'tone() === "gradient"',
    '[class.ui-jumbotron--sm]': 'size() === "sm"',
    '[class.ui-jumbotron--md]': 'size() === "md"',
    '[class.ui-jumbotron--lg]': 'size() === "lg"',
    '[class.ui-jumbotron--screen]': 'size() === "screen"',
    '[class.ui-jumbotron--center]': 'align() === "center"',
    '[class.ui-jumbotron--split]': '!!media()',
    '[class.ui-jumbotron--media-start]': 'mediaPosition() === "start"',
    '[class.ui-jumbotron--image]': '!!background()',
    '[class.ui-jumbotron--on-color]': '!!background() || tone() === "primary" || tone() === "gradient"',
    '[attr.role]': 'landmark() && labelId() ? "region" : null',
    '[attr.aria-labelledby]': 'landmark() ? labelId() : null',
    '[style.--_overlay]': 'overlayOpacity()',
  },
  template: `
    <ng-content select="[uiJumbotronBackground]" />
    @if (background()) {
      <div class="ui-jumbotron__overlay" aria-hidden="true"></div>
    }
    <div class="ui-jumbotron__inner">
      <div class="ui-jumbotron__content">
        <ng-content select="[uiJumbotronEyebrow]" />
        @if (eyebrow()) {
          <p class="ui-jumbotron__eyebrow">{{ eyebrow() }}</p>
        }
        <ng-content select="[uiJumbotronTitle]" />
        @if (heading()) {
          @switch (headingLevel()) {
            @case (1) { <h1 class="ui-jumbotron__title" [id]="headingId">{{ heading() }}</h1> }
            @case (2) { <h2 class="ui-jumbotron__title" [id]="headingId">{{ heading() }}</h2> }
            @case (3) { <h3 class="ui-jumbotron__title" [id]="headingId">{{ heading() }}</h3> }
            @case (4) { <h4 class="ui-jumbotron__title" [id]="headingId">{{ heading() }}</h4> }
            @case (5) { <h5 class="ui-jumbotron__title" [id]="headingId">{{ heading() }}</h5> }
            @default { <h6 class="ui-jumbotron__title" [id]="headingId">{{ heading() }}</h6> }
          }
        }
        @if (lead()) {
          <p class="ui-jumbotron__lead">{{ lead() }}</p>
        }
        <ng-content />
        <ng-content select="[uiJumbotronActions]" />
      </div>
      <ng-content select="[uiJumbotronMedia]" />
    </div>
  `,
  styleUrl: './jumbotron.css',
})
export class UiJumbotron {
  /** Titre (texte simple). Pour un titre riche, utilisez `[uiJumbotronTitle]`. */
  readonly heading = input<string>();
  /** Niveau du titre : `1` pour l'accroche principale d'une page, `2` pour une section suivante. */
  readonly headingLevel = input<UiHeadingLevel, unknown>(1, {
    transform: (v: unknown) => Math.min(6, Math.max(1, Math.round(numberAttribute(v, 1)))) as UiHeadingLevel,
  });
  /** Surtitre (petit texte au-dessus du titre). */
  readonly eyebrow = input<string>();
  /** Texte d'introduction sous le titre. */
  readonly lead = input<string>();
  /** Fond : `surface`, `sunken`, `primary` ou `gradient` (ignoré sous une image de fond). */
  readonly tone = input<UiJumbotronTone>('sunken');
  /** Hauteur : `sm`, `md`, `lg` ou `screen` (toute la hauteur de l'écran). */
  readonly size = input<UiJumbotronSize>('md');
  /** Alignement du texte : `start` ou `center`. */
  readonly align = input<'start' | 'center'>('start');
  /** Côté de l'illustration sur grand écran. */
  readonly mediaPosition = input<'start' | 'end'>('end');
  /** Opacité du voile sur l'image de fond (0 à 0,9 ; 0,55 garantit le contraste du texte blanc). */
  readonly overlay = input(0.55, { transform: numberAttribute });
  /** Landmark `region` nommé par le titre. Désactivez-le pour une section secondaire ou une diapositive. */
  readonly landmark = input(true, { transform: booleanAttribute });

  protected readonly media = contentChild(UiJumbotronMedia);
  protected readonly background = contentChild(UiJumbotronBackground);
  private readonly titleSlot = contentChild(UiJumbotronTitle);
  protected readonly headingId = uniqueId('ui-jumbotron-heading');

  /** Identifiant du titre qui nomme la section. */
  protected readonly labelId = computed(() => this.titleSlot()?.id ?? (this.heading() ? this.headingId : null));
  protected readonly overlayOpacity = computed(() => {
    const value = this.overlay();
    return Number.isFinite(value) ? Math.min(0.9, Math.max(0, value)) : 0.55;
  });
}
