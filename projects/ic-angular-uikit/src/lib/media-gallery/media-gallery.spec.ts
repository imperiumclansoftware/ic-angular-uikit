import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiGalleryItem, UiMediaGallery, galleryItemKind } from './media-gallery';

/** Valeur présente, sinon échec explicite du test. */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Élément attendu absent');
  return value;
}

if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

@Component({
  imports: [UiMediaGallery],
  template: `<ui-media-gallery [items]="items" [(current)]="current" ariaLabel="Voyage" />`,
})
class Host {
  current = signal<number | null>(null);
  items: UiGalleryItem[] = [
    { src: '/a.jpg', alt: 'Lac au matin', caption: 'Annecy' },
    { src: '/b.webm', alt: 'Randonnée', thumbnail: '/b.jpg' },
    { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', alt: 'Clip' },
  ];
}

describe('UiMediaGallery', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await render();
    const el: HTMLElement = fixture.nativeElement;
    const dialog = () => el.querySelector('dialog') as HTMLDialogElement;
    const key = async (k: string) => {
      dialog().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await render();
    };
    return { fixture, el, host: fixture.componentInstance, render, dialog, key };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('type déduit de l’adresse (fichier vidéo, YouTube, image)', () => {
    expect(galleryItemKind({ src: '/x.MP4?v=2', alt: '' })).toBe('video');
    expect(galleryItemKind({ src: 'https://vimeo.com/76979871', alt: '' })).toBe('video');
    expect(galleryItemKind({ src: '/x.png', alt: '' })).toBe('image');
    expect(galleryItemKind({ src: '/x', alt: '', kind: 'video' })).toBe('video');
  });

  it('vignettes : boutons nommés, vidéo signalée', async () => {
    const { el } = await setup();
    const buttons = [...el.querySelectorAll('.ui-gallery__open')].map((b) => b.getAttribute('aria-label'));
    expect(buttons).toEqual(['Agrandir : Lac au matin', 'Lire la vidéo : Randonnée', 'Lire la vidéo : Clip']);
    expect(el.querySelector('.ui-gallery__grid')?.getAttribute('aria-label')).toBe('Voyage');
    expect(el.querySelectorAll('.ui-gallery__play')).toHaveLength(2);
    expect(el.querySelector('.ui-gallery__placeholder')?.textContent).toContain('Clip');
  });

  it('visionneuse : ouverture, flèches, boucle, légende, lecteur vidéo, fermeture', async () => {
    const { el, host, render, dialog, key } = await setup();
    must(el.querySelector<HTMLButtonElement>('.ui-gallery__open')).click();
    await render();
    expect(dialog().hasAttribute('open')).toBe(true);
    expect(el.querySelector('.ui-gallery__counter')?.textContent?.trim()).toBe('1 / 3');
    expect(el.querySelector('.ui-gallery__legend')?.textContent).toBe('Annecy');
    expect(el.querySelector('.ui-gallery__image img')?.getAttribute('alt')).toBe('Lac au matin');
    expect(el.querySelector('.ui-gallery__sr')?.textContent).toBe('Image 1 sur 3 : Lac au matin');
    await key('ArrowRight');
    expect(host.current()).toBe(1);
    expect(el.querySelector('ui-media-player')).not.toBeNull();
    await key('ArrowLeft');
    await key('ArrowLeft');
    expect(host.current()).toBe(2);
    expect(el.querySelector('.ui-gallery__filmstrip [aria-current="true"]')?.getAttribute('aria-label')).toBe('3 : Clip');
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    await render();
    expect(host.current()).toBeNull();
    expect(dialog().hasAttribute('open')).toBe(false);
  });
});
