import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiImage } from './image';
import { UiImagePreloader } from './image-preloader';

@Component({
  imports: [UiImage],
  template: `
    <ui-image
      [src]="src()"
      alt="Lac de montagne"
      ratio="16/9"
      [fallbackSrc]="fallback()"
      [loader]="loader()"
      (loaded)="loaded.push($event.src)"
      (failed)="failed.push($event.src)"
    >
      <span uiImageOverlay class="badge">Nouveau</span>
    </ui-image>
  `,
})
class Host {
  src = signal<string | null>('/a.jpg');
  fallback = signal<string | undefined>(undefined);
  loader = signal<string | undefined>('dots');
  loaded: string[] = [];
  failed: string[] = [];
}

describe('UiImage', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await render();
    const el: HTMLElement = fixture.nativeElement;
    const host = () => el.querySelector('ui-image') as HTMLElement;
    const img = () => el.querySelector('.ui-image__img') as HTMLImageElement | null;
    const fire = async (type: 'load' | 'error') => {
      img()?.dispatchEvent(new Event(type));
      await Promise.resolve();
      await render();
    };
    return { fixture, el, host, img, fire, render, component: fixture.componentInstance };
  }

  it('réserve le ratio, affiche le loader (décoratif, aria-busy) puis l’image', async () => {
    const { host, img, fire, component } = await setup();
    expect(host().style.aspectRatio.replace(/\s/g, '')).toBe('16/9');
    expect(host().getAttribute('aria-busy')).toBe('true');
    const loader = host().querySelector('ui-loader') as HTMLElement;
    expect(loader.className).toContain('ui-loader--dots');
    expect(loader.getAttribute('aria-hidden')).toBe('true');
    expect(img()?.getAttribute('src')).toBe('/a.jpg');
    expect(img()?.getAttribute('alt')).toBe('Lac de montagne');
    expect(img()?.getAttribute('decoding')).toBe('async');
    expect((host().querySelector('.ui-image__overlay') as HTMLElement).hidden).toBe(true);
    await fire('load');
    expect(host().classList).toContain('ui-image--loaded');
    expect(host().getAttribute('aria-busy')).toBeNull();
    expect(host().querySelector('ui-loader')).toBeNull();
    expect((host().querySelector('.ui-image__overlay') as HTMLElement).hidden).toBe(false);
    expect(component.loaded).toEqual(['/a.jpg']);
  });

  it('erreur : image de secours, puis message et Réessayer', async () => {
    const { host, img, fire, component, render } = await setup();
    component.fallback.set('/secours.svg');
    await render();
    await fire('error');
    expect(img()?.getAttribute('src')).toBe('/secours.svg');
    await fire('error');
    expect(host().classList).toContain('ui-image--error');
    expect(host().querySelector('.ui-image__error')?.textContent).toContain('Image indisponible : Lac de montagne');
    expect(component.failed).toEqual(['/a.jpg']);
    const first = img();
    (host().querySelector('.ui-image__retry') as HTMLButtonElement).click();
    await render();
    expect(img()).not.toBe(first); // élément recréé : nouveau téléchargement
    expect(img()?.getAttribute('src')).toBe('/a.jpg');
    expect(host().querySelector('ui-loader')).not.toBeNull();
    await fire('load');
    expect(host().classList).toContain('ui-image--loaded');
  });

  it('src null : loader en attente ; changement de source : nouveau chargement', async () => {
    const { host, img, fire, component, render } = await setup();
    component.src.set(null);
    await render();
    expect(img()).toBeNull();
    expect(host().querySelector('ui-loader')).not.toBeNull();
    component.src.set('/b.jpg');
    await render();
    expect(img()?.getAttribute('src')).toBe('/b.jpg');
    await fire('load');
    component.loader.set('none');
    component.src.set('/c.jpg');
    await render();
    expect(host().classList).not.toContain('ui-image--loaded');
    expect(host().querySelector('ui-loader')).toBeNull(); // loader="none"
  });

  it('image déjà préchargée : ni loader ni fondu', async () => {
    TestBed.inject(UiImagePreloader).markLoaded('/a.jpg');
    const { host, img } = await setup();
    expect(host().querySelector('ui-loader')).toBeNull();
    expect(img()?.classList).not.toContain('ui-image__img--fade');
  });
});

describe('UiImagePreloader', () => {
  it('précharge une seule fois et ne rejette jamais', async () => {
    const created: HTMLImageElement[] = [];
    const Original = window.Image;
    window.Image = class extends Original {
      constructor() {
        super();
        created.push(this);
      }
    } as typeof Image;
    try {
      const preloader = TestBed.inject(UiImagePreloader);
      const done = preloader.preload(['/x.jpg', '/y.jpg']);
      void preloader.preload('/x.jpg');
      expect(created).toHaveLength(2);
      created[0].onload?.(new Event('load'));
      created[1].onerror?.(new Event('error'));
      expect(await done).toEqual([
        { src: '/x.jpg', ok: true },
        { src: '/y.jpg', ok: false },
      ]);
      expect(preloader.isLoaded('/x.jpg')).toBe(true);
      expect(preloader.isLoaded('/y.jpg')).toBe(false);
      void preloader.preload('/y.jpg'); // échec : nouvelle tentative possible
      expect(created).toHaveLength(3);
    } finally {
      window.Image = Original;
    }
  });
});
