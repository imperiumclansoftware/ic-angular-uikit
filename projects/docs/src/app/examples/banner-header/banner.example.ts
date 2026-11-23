import { Component } from '@angular/core';
import { UI_IMPERIUM_CLAN, UiBannerHeader, UiButton } from 'ic-angular-uikit';

/**
 * Bannière impériale
 * En-tête panoramique : image de fond fondue dans l'obsidienne (décorative, `alt=""`), emblème (ici le sceau du clan), sur-titre, titre en gothique UnifrakturCook, devise encadrée d'un fleuron et frise d'arabesques en pied. Le fondu garantit la lisibilité du texte quelle que soit l'image. En tête de page, le titre est de niveau 1 (défaut) ; ici `headingLevel` 4, sous le titre de l'exemple.
 * @order 1
 */
@Component({
  selector: 'doc-banner-example',
  imports: [UiBannerHeader, UiButton],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <ui-banner-header [headingLevel]="4" [heading]="clan.name" [motto]="clan.motto" eyebrow="Depuis 2012 · 4 branches" image="demo/mountains.svg">
        <img uiBannerEmblem src="demo/imperium/sceau.svg" alt="" width="96" height="96" />
        <div uiBannerActions>
          <button uiButton size="lg">Rejoindre le clan</button>
          <button uiButton variant="secondary" size="lg">Découvrir les branches</button>
        </div>
      </ui-banner-header>
    </div>
  `,
  styles: `.imp { overflow: hidden; border-radius: var(--ui-radius-lg); } [uiBannerActions] { display: contents; }`,
})
export class BannerExample {
  protected readonly clan = UI_IMPERIUM_CLAN;
}
