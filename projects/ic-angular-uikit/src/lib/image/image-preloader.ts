import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Résultat du préchargement d'une image. */
export interface UiImagePreloadResult {
  src: string;
  ok: boolean;
}

/** Options de préchargement (mêmes valeurs que sur `ui-image`, pour que le navigateur choisisse la même ressource). */
export interface UiImagePreloadOptions {
  srcset?: string;
  sizes?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  referrerPolicy?: ReferrerPolicy;
}

/**
 * Précharge des images (téléchargées puis décodées) avant leur affichage : image suivante d'une galerie, visuels de
 * la page suivante… Une image déjà préchargée s'affiche dans `ui-image` sans loader ni fondu.
 *
 * ```ts
 * inject(UiImagePreloader).preload(['/a.jpg', '/b.jpg']);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class UiImagePreloader {
  private readonly document = inject(DOCUMENT);
  private readonly cache = new Map<string, Promise<UiImagePreloadResult>>();
  private readonly done = new Set<string>();

  /** Précharge une ou plusieurs images (chacune une seule fois) ; ne rejette jamais. */
  preload(sources: string | readonly string[], options: UiImagePreloadOptions = {}): Promise<UiImagePreloadResult[]> {
    const list = typeof sources === 'string' ? [sources] : sources;
    return Promise.all(list.filter(Boolean).map((src) => this.load(src, options)));
  }

  /** L'image a déjà été préchargée avec succès. */
  isLoaded(src: string | null | undefined): boolean {
    return !!src && this.done.has(this.key(src));
  }

  /** @internal Signale une image chargée par `ui-image`. */
  markLoaded(src: string): void {
    this.done.add(this.key(src));
  }

  private key(src: string): string {
    try {
      return new URL(src, this.document.baseURI).href;
    } catch {
      return src;
    }
  }

  private load(src: string, options: UiImagePreloadOptions): Promise<UiImagePreloadResult> {
    const key = this.key(src);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const View = this.document.defaultView?.Image;
    if (!View) return Promise.resolve({ src, ok: false });
    const promise = new Promise<UiImagePreloadResult>((resolve) => {
      const img = new View();
      img.decoding = 'async';
      if (options.crossOrigin) img.crossOrigin = options.crossOrigin;
      if (options.referrerPolicy) img.referrerPolicy = options.referrerPolicy;
      if (options.sizes) img.sizes = options.sizes;
      if (options.srcset) img.srcset = options.srcset;
      const finish = (ok: boolean) => {
        if (ok) this.done.add(key);
        else this.cache.delete(key); // une nouvelle tentative reste possible
        resolve({ src, ok });
      };
      img.onload = () => (typeof img.decode === 'function' ? img.decode().then(() => finish(true), () => finish(true)) : finish(true));
      img.onerror = () => finish(false);
      img.src = src;
    });
    this.cache.set(key, promise);
    return promise;
  }
}
