import { Component, computed, signal } from '@angular/core';
import { UiMediaGallery } from 'ic-angular-uikit';
import { PHOTOS } from './photos';

/**
 * Galerie et visionneuse
 * Vignettes chargées à l'approche (avec loader), puis visionneuse plein écran au clic : image entière (voisines préchargées), vidéo lue par `ui-media-player` (fichier avec sous-titres, YouTube ou Vimeo après consentement), légende, compteur, miniatures. Clavier : ← / →, Origine / Fin, Échap (le focus revient à la vignette) ; balayage sur écran tactile. `[(current)]` pilote l'élément ouvert.
 * @order 1
 */
@Component({
  selector: 'doc-gallery-example',
  imports: [UiMediaGallery],
  template: `
    <ui-media-gallery [items]="photos" ariaLabel="Carnet de voyage" [(current)]="current" />
    <p class="state">Ouvert : {{ openedAlt() }}</p>
  `,
  styles: `.state { margin: 0.5rem 0 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }`,
})
export class GalleryExample {
  protected readonly photos = PHOTOS;
  protected readonly current = signal<number | null>(null);
  protected readonly openedAlt = computed(() => {
    const index = this.current();
    return index === null ? 'aucun' : this.photos[index].alt;
  });
}
