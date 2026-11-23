import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';
import { UiOrnament } from '../ornament/ornament';

/**
 * En-tête panoramique sombre : image de fond fondue dans le noir, frise d'arabesques, sur-titre, titre (gothique
 * UnifrakturCook dans le thème `imperium-dark`), devise et zone d'actions. L'image est décorative (`alt=""`) : le
 * titre porte le sens.
 *
 * ```html
 * <ui-banner-header heading="Imperium Clan" motto="Façonner la légende, une victoire à la fois" image="/banniere.jpg">
 *   <div uiBannerActions><a uiButton href="/rejoindre">Rejoindre le clan</a></div>
 * </ui-banner-header>
 * ```
 * @slot [uiBannerEmblem] - Emblème au-dessus du titre (sceau, blason).
 * @slot [uiBannerActions] - Boutons d'action.
 * @slot (défaut) - Contenu libre sous la devise.
 * @cssprop --ui-banner-min-height - Hauteur minimale (défaut 22rem).
 * @category Imperium
 */
@Component({
  selector: 'ui-banner-header',
  imports: [UiOrnament],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-banner-header', '[class.ui-banner-header--start]': "align() === 'start'" },
  template: `
    @if (image()) {
      <img class="ui-banner-header__image" [src]="image()" alt="" decoding="async" [style.object-position]="imagePosition()" />
    }
    <div class="ui-banner-header__shade" aria-hidden="true"></div>
    <div class="ui-banner-header__content">
      <ng-content select="[uiBannerEmblem]" />
      @if (eyebrow()) {
        <p class="ui-banner-header__eyebrow">{{ eyebrow() }}</p>
      }
      <span class="ui-banner-header__title" role="heading" [attr.aria-level]="headingLevel()">{{ heading() }}</span>
      @if (motto()) {
        <ui-ornament kind="flourish" class="ui-banner-header__flourish" />
        <p class="ui-banner-header__motto">« {{ motto() }} »</p>
      }
      <ng-content />
      <div class="ui-banner-header__actions"><ng-content select="[uiBannerActions]" /></div>
    </div>
    <div class="ui-banner-header__frieze" aria-hidden="true">
      <span class="ui-banner-header__rule"></span>
      <ui-ornament kind="knot" />
      <span class="ui-banner-header__rule ui-banner-header__rule--end"></span>
    </div>
  `,
  styleUrl: './banner-header.css',
})
export class UiBannerHeader {
  /** Titre principal. */
  readonly heading = input.required<string>();
  /** Niveau de titre (`aria-level`, défaut 1). */
  readonly headingLevel = input(1, { transform: numberAttribute });
  /** Sur-titre en petites capitales. */
  readonly eyebrow = input<string>();
  /** Devise (affichée entre guillemets français). */
  readonly motto = input<string>();
  /** Image de fond (décorative). */
  readonly image = input<string>();
  /** Cadrage de l'image (`object-position`). */
  readonly imagePosition = input('center');
  /** Alignement du contenu. */
  readonly align = input<'center' | 'start'>('center');
}
