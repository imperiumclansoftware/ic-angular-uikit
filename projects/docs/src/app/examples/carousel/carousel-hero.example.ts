import { Component } from '@angular/core';
import { UiButton, UiCarousel, UiCarouselSlide, UiJumbotron, UiJumbotronActions, UiJumbotronBackground } from 'ic-angular-uikit';

interface HeroSlide {
  label: string;
  image: string;
  eyebrow: string;
  heading: string;
  lead: string;
  action: string;
}

/**
 * Carrousel d'accroche (avec ui-jumbotron)
 * Chaque diapositive est un `ui-jumbotron` à image de fond (`landmark` désactivé : c'est le carrousel qui est la région). Défilement automatique toutes les 6 s (`autoplay`) avec bouton Pause / Lecture : il s'arrête au survol, et définitivement dès que le focus entre dans le carrousel ; il ne démarre pas si l'utilisateur a demandé à réduire les animations. `loop` enchaîne la dernière diapositive avec la première. Glissez au doigt ou au pavé tactile, ou utilisez ← / → sur la zone des diapositives.
 * @order 1
 */
@Component({
  selector: 'doc-carousel-hero-example',
  imports: [UiCarousel, UiCarouselSlide, UiJumbotron, UiJumbotronBackground, UiJumbotronActions, UiButton],
  template: `
    <ui-carousel ariaLabel="À la une" [autoplay]="6000" loop>
      @for (slide of slides; track slide.label) {
        <ui-carousel-slide [label]="slide.label">
          <ui-jumbotron
            size="lg"
            [landmark]="false"
            [headingLevel]="4"
            [eyebrow]="slide.eyebrow"
            [heading]="slide.heading"
            [lead]="slide.lead"
          >
            <img uiJumbotronBackground [src]="slide.image" alt="" />
            <div uiJumbotronActions>
              <button uiButton size="lg" variant="secondary">{{ slide.action }}</button>
            </div>
          </ui-jumbotron>
        </ui-carousel-slide>
      }
    </ui-carousel>
  `,
  styles: `
    ui-jumbotron { height: 100%; --ui-jumbotron-gutter: 4.5rem; }
  `,
})
export class CarouselHeroExample {
  protected readonly slides: HeroSlide[] = [
    {
      label: 'Montagne',
      image: 'demo/mountains.svg',
      eyebrow: 'Été 2027',
      heading: 'Les sommets vous attendent',
      lead: 'Randonnées guidées et refuges, matériel compris.',
      action: 'Découvrir les séjours',
    },
    {
      label: 'Océan',
      image: 'demo/ocean.svg',
      eyebrow: 'Nouveau',
      heading: "Cap sur l'Atlantique",
      lead: 'Surf, voile et longues plages, à deux heures de Paris.',
      action: 'Voir les destinations',
    },
    {
      label: 'Ville',
      image: 'demo/city.svg',
      eyebrow: 'Week-end',
      heading: 'Nuits urbaines',
      lead: 'Concerts, musées et restaurants : nos city-guides pour 48 h.',
      action: 'Explorer les villes',
    },
    {
      label: 'Forêt',
      image: 'demo/forest.svg',
      eyebrow: 'Déconnexion',
      heading: 'Respirer en forêt',
      lead: 'Cabanes perchées et sentiers balisés, loin des écrans.',
      action: 'Réserver une cabane',
    },
  ];
}
