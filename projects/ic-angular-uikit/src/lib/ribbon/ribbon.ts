import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';
import { UiSize, UiTone } from '../core/types';
import { UiIcon } from '../icon/icon';

export type UiRibbonCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Rend un élément quelconque capable d'accueillir un `ui-ribbon` (lui donne `position: relative`).
 * Inutile sur `ui-card` et `ui-table`, qui le gèrent déjà.
 */
@Directive({ selector: '[uiRibbonContainer]', host: { style: 'position: relative' } })
export class UiRibbonContainer {}

/**
 * Ruban en diagonale posé dans un coin d'une carte, d'une table ou de tout élément `uiRibbonContainer`
 * (« Nouveau », « Promo », « Bêta »…). Il découpe lui-même son débordement et laisse passer les clics ;
 * son texte reste lu par les lecteurs d'écran. Laissez le coin choisi libre de contenu important
 * (titre, bouton) : la bande le recouvre.
 *
 * @slot default - Texte du ruban (court : un ou deux mots).
 * @cssprop --ui-ribbon-size - Côté du carré occupé dans le coin (défaut selon `size` : 5rem, 6.5rem, 8rem).
 * @category Affichage
 */
@Component({
  selector: 'ui-ribbon',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-ribbon ui-ribbon--" + corner() + " ui-ribbon--" + tone() + " ui-ribbon--" + size()',
  },
  template: `
    <span class="ui-ribbon__band">
      @if (icon(); as name) {
        <ui-icon [name]="name" />
      }
      <span class="ui-ribbon__text"><ng-content /></span>
    </span>
  `,
  styleUrl: './ribbon.css',
})
export class UiRibbon {
  /** Coin où placer le ruban. */
  readonly corner = input<UiRibbonCorner>('top-right');
  /** Couleur sémantique (texte et fond contrastés dans les deux thèmes). */
  readonly tone = input<UiTone>('primary');
  /** Taille du ruban. */
  readonly size = input<UiSize>('md');
  /** Icône avant le texte (`préfixe:nom`, voir `provideUiIcons()`). */
  readonly icon = input<string>();
}
