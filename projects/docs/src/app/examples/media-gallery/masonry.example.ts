import { Component } from '@angular/core';
import { UiMediaGallery } from 'ic-angular-uikit';
import { PHOTOS } from './photos';

/**
 * Mosaïque avec légendes
 * `layout="masonry"` respecte les proportions de chaque image (`width` / `height` réservent la place avant le chargement) ; `captions` affiche la légende sous la vignette ; `--ui-gallery-tile` règle la largeur des colonnes.
 * @order 2
 */
@Component({
  selector: 'doc-masonry-example',
  imports: [UiMediaGallery],
  template: `<ui-media-gallery [items]="photos" layout="masonry" captions [filmstrip]="false" ariaLabel="Mosaïque" style="--ui-gallery-tile: 13rem" />`,
})
export class MasonryExample {
  protected readonly photos = PHOTOS.filter((p) => !p.src.startsWith('https://'));
}
