import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  isDevMode,
} from '@angular/core';

export type UiCardAppearance = 'elevated' | 'outlined' | 'filled';

/** Marque l'en-tête d'une carte (`<header uiCardHeader>`). */
@Directive({ selector: '[uiCardHeader]', host: { class: 'ui-card__header' } })
export class UiCardHeader {}

/**
 * Marque le média pleine largeur d'une carte (image, vidéo…).
 * Une image doit avoir un `alt` : une description utile, ou `alt=""` si elle est purement décorative.
 */
@Directive({ selector: '[uiCardMedia]', host: { class: 'ui-card__media' } })
export class UiCardMedia {
  constructor() {
    if (isDevMode()) {
      const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
      afterNextRender(() => {
        if (el.tagName === 'IMG' && !el.hasAttribute('alt')) {
          console.warn('[ic-angular-uikit] <img uiCardMedia> sans attribut alt : décrivez l’image, ou alt="" si elle est décorative.', el);
        }
      });
    }
  }
}

/** Marque le pied d'une carte, typiquement des actions (`<footer uiCardFooter>`). */
@Directive({ selector: '[uiCardFooter]', host: { class: 'ui-card__footer' } })
export class UiCardFooter {}

/**
 * Conteneur de contenu structuré en zones optionnelles : média, en-tête, corps, pied.
 * Chaque zone est un emplacement de projection, vous gardez la main sur le balisage.
 *
 * @slot [uiCardMedia] - Média affiché bord à bord en haut de la carte.
 * @slot [uiCardHeader] - En-tête (titre, sous-titre, actions secondaires).
 * @slot default - Corps de la carte.
 * @slot [uiCardFooter] - Pied, aligné à droite par défaut.
 * @slot ui-ribbon - Ruban dans un coin de la carte.
 *
 * Avec `orientation="horizontal"`, le média passe à gauche du contenu quand la carte fait au moins 32rem de large ;
 * plus étroite (colonne, mobile), elle s'empile à nouveau. La règle dépend de la largeur de la carte, pas de l'écran.
 * Une carte sans média reste sur une colonne.
 *
 * @cssprop --ui-card-padding - Marge intérieure des zones (défaut : `--ui-space-5`).
 * @cssprop --ui-card-media-width - Largeur du média en disposition horizontale (défaut : `minmax(10rem, 40%)`).
 * @cssprop --ui-card-radius - Rayon des coins (défaut : `--ui-radius-lg`).
 * @category Affichage
 */
@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-card',
    '[class]': '"ui-card--" + appearance()',
    '[class.ui-card--interactive]': 'interactive()',
    '[class.ui-card--horizontal]': 'orientation() === "horizontal"',
  },
  template: `
    <ng-content select="ui-ribbon" />
    <div class="ui-card__layout">
      <ng-content select="[uiCardMedia]" />
      <ng-content select="[uiCardHeader]" />
      <div class="ui-card__body"><ng-content /></div>
      <ng-content select="[uiCardFooter]" />
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .ui-card {
      --_pad: var(--ui-card-padding, var(--ui-space-5));
      /* La carte est son propre conteneur : sa mise en page suit sa largeur, pas celle de l'écran. */
      container: ui-card / inline-size;
      position: relative;
      display: block;
      overflow: hidden;
      border: 1px solid transparent;
      border-radius: var(--ui-card-radius, var(--ui-radius-lg));
      background: var(--ui-color-surface);
      color: var(--ui-color-text);
    }
    .ui-card--elevated { box-shadow: var(--ui-shadow-md); border-color: var(--ui-color-border); }
    .ui-card--outlined { border-color: var(--ui-color-border); }
    .ui-card--filled { background: var(--ui-color-surface-sunken); }
    .ui-card--interactive {
      cursor: pointer;
      transition: box-shadow var(--ui-duration-normal) var(--ui-easing), transform var(--ui-duration-normal) var(--ui-easing);
    }
    .ui-card--interactive:hover { box-shadow: var(--ui-shadow-lg); transform: translateY(-2px); }
    .ui-card--interactive:focus-visible { outline: 2px solid var(--ui-color-focus-ring); outline-offset: 2px; }

    .ui-card__layout { display: flex; flex-direction: column; height: 100%; }
    .ui-card__layout > .ui-card__body { padding: var(--_pad); flex: 1; }
    .ui-card__layout > .ui-card__header { padding: var(--_pad) var(--_pad) 0; }
    .ui-card__layout > .ui-card__header + .ui-card__body { padding-top: var(--ui-space-3); }
    .ui-card__layout > .ui-card__media { width: 100%; box-sizing: border-box; }
    /* Médias natifs : bloc rempli sans déformation. Un conteneur (div) garde la mise en page choisie par l'auteur. */
    .ui-card__layout > .ui-card__media:is(img, video, picture, svg) { display: block; object-fit: cover; }
    .ui-card__layout > .ui-card__footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--ui-space-2);
      padding: var(--ui-space-3) var(--_pad);
      border-top: 1px solid var(--ui-color-border);
    }

    /* Disposition horizontale : seulement si la carte est assez large ET a un média (pas de colonne vide). */
    @container ui-card (width >= 32rem) {
      .ui-card--horizontal > .ui-card__layout:has(> .ui-card__media) {
        display: grid;
        grid-template-columns: var(--ui-card-media-width, minmax(10rem, 40%)) minmax(0, 1fr);
        grid-template-rows: auto 1fr auto;
      }
      .ui-card--horizontal > .ui-card__layout:has(> .ui-card__media) > .ui-card__media {
        grid-column: 1;
        grid-row: 1 / span 3;
        height: 100%;
        min-height: 100%;
        aspect-ratio: auto;
      }
      .ui-card--horizontal > .ui-card__layout:has(> .ui-card__media) > .ui-card__header { grid-column: 2; grid-row: 1; }
      .ui-card--horizontal > .ui-card__layout:has(> .ui-card__media) > .ui-card__body { grid-column: 2; grid-row: 2; }
      .ui-card--horizontal > .ui-card__layout:has(> .ui-card__media) > .ui-card__footer { grid-column: 2; grid-row: 3; }
    }
  `,
})
export class UiCard {
  /** Rendu de la carte : ombre, contour ou fond teinté. */
  readonly appearance = input<UiCardAppearance>('elevated');
  /** Disposition : contenu sous le média (`vertical`) ou à côté (`horizontal`, si la carte est assez large). */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  /** Ajoute un effet de survol (à combiner avec un `tabindex` et un `(click)`). */
  readonly interactive = input(false, { transform: booleanAttribute });
}
