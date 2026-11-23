import { Component } from '@angular/core';
import { UiButton, UiCard, UiCardFooter, UiCardHeader, UiRibbon, UiRibbonCorner, UiTone } from 'ic-angular-uikit';

interface Offer {
  name: string;
  price: string;
  ribbon: string;
  tone: UiTone;
  corner: UiRibbonCorner;
  icon?: string;
}

/**
 * Sur des cartes
 * Placez `<ui-ribbon>` directement dans `ui-card` : 4 coins (`corner`), 5 tons (`tone`) et une icône facultative. Le ruban ne gêne pas les clics. Pensez à laisser le coin choisi libre de contenu important.
 * @order 1
 */
@Component({
  selector: 'doc-ribbon-cards-example',
  imports: [UiCard, UiCardHeader, UiCardFooter, UiRibbon, UiButton],
  template: `
    <div class="ex-grid">
      @for (offer of offers; track offer.name) {
        <ui-card
          appearance="outlined"
          [class.offer--top-left]="offer.corner === 'top-left'"
          [class.offer--top-right]="offer.corner === 'top-right'"
          [class.offer--bottom-left]="offer.corner === 'bottom-left'"
          [class.offer--bottom-right]="offer.corner === 'bottom-right'"
        >
          <ui-ribbon [corner]="offer.corner" [tone]="offer.tone" [icon]="offer.icon">{{ offer.ribbon }}</ui-ribbon>
          <h4 uiCardHeader>{{ offer.name }}</h4>
          <p class="price">{{ offer.price }}</p>
          <p class="corner"><code>corner="{{ offer.corner }}"</code></p>
          <footer uiCardFooter>
            <button uiButton size="sm">Choisir</button>
          </footer>
        </ui-card>
      }
    </div>
  `,
  styles: `
    h4 { margin: 0; font-size: 1.05rem; }
    .price { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .corner { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--ui-color-text-muted); }
    /* Le coin du ruban reste libre : contenu décalé du bon côté. */
    .offer--top-left h4,
    .offer--top-left p { padding-left: 4rem; }
    .offer--top-right h4 { padding-right: 3.5rem; }
    .offer--bottom-right footer { justify-content: flex-start; }
    .offer--bottom-left footer { justify-content: flex-end; }
  `,
})
export class RibbonCardsExample {
  protected readonly offers: Offer[] = [
    { name: 'Solo', price: '9 €/mois', ribbon: 'Nouveau', tone: 'primary', corner: 'top-right' },
    { name: 'Équipe', price: '39 €/mois', ribbon: '-20 %', tone: 'danger', corner: 'top-left', icon: 'lucide:star' },
    { name: 'Entreprise', price: 'Sur devis', ribbon: 'Bientôt', tone: 'warning', corner: 'bottom-right' },
    { name: 'Archive', price: '4 €/mois', ribbon: 'Épuisé', tone: 'neutral', corner: 'bottom-left' },
  ];
}
