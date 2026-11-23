import { Component, computed, inject, signal } from '@angular/core';
import { UiButton, UiImage, UiImagePreloader } from 'ic-angular-uikit';
import { PHOTOS } from './photos';

/**
 * Préchargement : galerie et défilement
 * Hors de l'écran, `ui-image` attend : le téléchargement commence quand l'image arrive à `preloadMargin` (300 px par défaut) de la fenêtre, pour qu'elle soit prête quand l'utilisateur la voit. Le service `UiImagePreloader` précharge à l'avance les images dont on sait qu'elles vont venir : ici l'image **suivante** de la galerie, téléchargée et décodée pendant que l'on regarde la courante ; elle s'affiche alors sans loader ni fondu.
 * @order 2
 */
@Component({
  selector: 'doc-image-gallery-example',
  imports: [UiImage, UiButton],
  template: `
    <div class="viewer">
      <ui-image [src]="current().src" [alt]="current().alt" ratio="16/9" loading="eager" (loaded)="preloadNext()" />
      <div class="bar">
        <button uiButton variant="secondary" icon="lucide:chevron-left" (click)="go(-1)">Précédente</button>
        <span aria-live="polite">{{ current().title }} ({{ index() + 1 }} / {{ photos.length }})</span>
        <button uiButton variant="secondary" iconEnd="lucide:chevron-right" (click)="go(1)">Suivante</button>
      </div>
      <p class="note">Préchargée : {{ preloaded() }}</p>
    </div>
    <h4>Liste longue (chargement à l'approche)</h4>
    <div class="scroller" tabindex="0" role="region" aria-label="Liste d'images">
      @for (item of list; track item.id) {
        <div class="item">
          <ui-image [src]="item.src" [alt]="item.alt" ratio="16/9" preloadMargin="100px" loader="skeleton" />
          <span>Image {{ item.id }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .viewer ui-image { --ui-image-radius: var(--ui-radius-md); }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.5rem; }
    .note { margin: 0.25rem 0 0; color: var(--ui-color-text-muted); font-size: 0.8125rem; }
    h4 { margin: 1.25rem 0 0.5rem; }
    .scroller { display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: 0.75rem; max-height: 16rem; overflow-y: auto; padding: 0.5rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); }
    .scroller:focus-visible { outline: 2px solid var(--ui-color-focus-ring); }
    .item span { font-size: 0.75rem; color: var(--ui-color-text-muted); }
  `,
})
export class ImageGalleryExample {
  private readonly preloader = inject(UiImagePreloader);
  protected readonly photos = PHOTOS;
  protected readonly index = signal(0);
  protected readonly current = computed(() => PHOTOS[this.index()]);
  protected readonly preloaded = signal('—');
  /** 40 images distinctes (adresses différentes) : seules celles proches de la zone visible sont téléchargées. */
  protected readonly list = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, src: `${PHOTOS[i % 4].src}?liste=${i + 1}`, alt: `${PHOTOS[i % 4].alt} (${i + 1})` }));

  protected go(step: number): void {
    this.index.update((i) => (i + step + PHOTOS.length) % PHOTOS.length);
  }

  protected preloadNext(): void {
    const next = PHOTOS[(this.index() + 1) % PHOTOS.length];
    void this.preloader.preload(next.src).then(([result]) => this.preloaded.set(result.ok ? next.title : `échec (${next.title})`));
  }
}
