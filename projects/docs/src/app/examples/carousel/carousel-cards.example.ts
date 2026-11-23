import { Component } from '@angular/core';
import { UiBadge, UiButton, UiCard, UiCardFooter, UiCardHeader, UiCarousel, UiCarouselSlide } from 'ic-angular-uikit';

/**
 * Plusieurs cartes visibles
 * `slidesPerView="3"` avec `--ui-carousel-min-slide: 15rem` : trois cartes sur grand écran, puis moins dès que la place manque (le nombre de positions et de pastilles s'adapte). Les flèches passent sous le carrousel avec `controls="below"`. Les cartes hors de la vue sont inertes : Tab ne s'y arrête pas.
 * @order 2
 */
@Component({
  selector: 'doc-carousel-cards-example',
  imports: [UiCarousel, UiCarouselSlide, UiCard, UiCardHeader, UiCardFooter, UiButton, UiBadge],
  template: `
    <ui-carousel class="cards" ariaLabel="Témoignages" slidesPerView="3" controls="below">
      @for (item of testimonials; track item.name) {
        <ui-carousel-slide [label]="item.name">
          <ui-card class="card" appearance="outlined">
            <div uiCardHeader class="head">
              <strong>{{ item.name }}</strong>
              <ui-badge tone="neutral" pill>{{ item.role }}</ui-badge>
            </div>
            <p class="quote">« {{ item.quote }} »</p>
            <div uiCardFooter>
              <button uiButton variant="ghost" size="sm" iconEnd="lucide:arrow-right">Lire l'histoire</button>
            </div>
          </ui-card>
        </ui-carousel-slide>
      }
    </ui-carousel>
  `,
  styles: `
    .cards { --ui-carousel-min-slide: 15rem; --ui-carousel-radius: 0; }
    .card { height: 100%; }
    .head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .quote { margin: 0; line-height: 1.6; }
  `,
})
export class CarouselCardsExample {
  protected readonly testimonials = [
    { name: 'Camille', role: 'Directrice produit', quote: 'Nous avons divisé par deux le temps de mise en ligne de nos écrans.' },
    { name: 'Yanis', role: 'Développeur', quote: 'Les composants sont accessibles par défaut, je n’ai plus à y penser.' },
    { name: 'Léa', role: 'Designer', quote: 'Les thèmes clair et sombre sont cohérents, et faciles à adapter à notre marque.' },
    { name: 'Hugo', role: 'Responsable support', quote: 'Moins de tickets sur l’ergonomie depuis la refonte.' },
    { name: 'Inès', role: 'CTO', quote: 'Une base solide, documentée, et conforme à nos règles de sécurité.' },
    { name: 'Noah', role: 'Chef de projet', quote: 'Les exemples de la documentation nous servent de spécifications.' },
  ];
}
