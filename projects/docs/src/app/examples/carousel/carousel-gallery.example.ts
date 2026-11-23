import { Component, signal } from '@angular/core';
import { UiButton, UiCarousel, UiCarouselChange, UiCarouselSlide } from 'ic-angular-uikit';

/**
 * Galerie : aperçu de la suivante, pilotage par le code
 * `slidesPerView="1.15"` laisse deviner la diapositive suivante. `[(index)]` lie la position à un signal (ici des vignettes en dehors du carrousel), et `slideChange` indique l'origine du changement (`user` ou `autoplay`).
 * @order 3
 */
@Component({
  selector: 'doc-carousel-gallery-example',
  imports: [UiCarousel, UiCarouselSlide, UiButton],
  template: `
    <ui-carousel ariaLabel="Galerie de paysages" slidesPerView="1.15" [(index)]="index" (slideChange)="last.set($event)">
      @for (photo of photos; track photo.src) {
        <ui-carousel-slide [label]="photo.alt">
          <figure class="photo">
            <img [src]="photo.src" [alt]="photo.alt" width="1600" height="900" loading="lazy" />
            <figcaption>{{ photo.caption }}</figcaption>
          </figure>
        </ui-carousel-slide>
      }
    </ui-carousel>

    <div class="thumbs" role="group" aria-label="Vignettes">
      @for (photo of photos; track photo.src; let i = $index) {
        <button uiButton size="sm" [variant]="i === index() ? 'primary' : 'outline'" [attr.aria-pressed]="i === index()" (click)="index.set(i)">
          {{ photo.caption }}
        </button>
      }
    </div>
    <p class="log">index = {{ index() }} — dernier slideChange : {{ last() ? last()?.previousIndex + ' → ' + last()?.index + ' (' + last()?.source + ')' : '—' }}</p>
  `,
  styles: `
    .photo { position: relative; margin: 0; }
    .photo img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--ui-radius-lg); }
    .photo figcaption { position: absolute; inset-inline-start: 0.75rem; bottom: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 999px; background: rgb(0 0 0 / 0.7); color: #fff; font-size: 0.875rem; font-weight: 600; }
    .thumbs { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    .log { margin: 0.75rem 0 0; font-size: 0.875rem; color: var(--ui-color-text-muted); }
  `,
})
export class CarouselGalleryExample {
  protected readonly index = signal(1);
  protected readonly last = signal<UiCarouselChange | null>(null);
  protected readonly photos = [
    { src: 'demo/mountains.svg', alt: 'Montagnes au coucher du soleil', caption: 'Montagnes' },
    { src: 'demo/ocean.svg', alt: 'Océan sous un soleil pâle', caption: 'Océan' },
    { src: 'demo/city.svg', alt: 'Silhouette d’une ville la nuit', caption: 'Ville' },
    { src: 'demo/forest.svg', alt: 'Forêt de sapins au crépuscule', caption: 'Forêt' },
  ];
}
