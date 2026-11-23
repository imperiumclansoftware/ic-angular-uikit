import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import { UiLoader } from '../loader/loader';
import { UiLoaderType } from '../loader/loader-config';
import { UiImagePreloader } from './image-preloader';

/** État de chargement de `ui-image`. */
export type UiImageState = 'idle' | 'loading' | 'loaded' | 'error';

const optionalNumber = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v));

/**
 * Image avec préchargement et loader : l'emplacement est réservé (`ratio`, ou `width` / `height`) pour éviter tout
 * décalage de la page ; le loader (celui de l'application, ou `loader`) est affiché pendant le téléchargement, puis
 * l'image apparaît en fondu une fois **décodée**. Hors de l'écran, le téléchargement commence un peu avant que l'image
 * n'entre dans la fenêtre (`preloadMargin`). En cas d'échec : image de secours (`fallbackSrc`), sinon un message et
 * un bouton Réessayer.
 *
 * ```html
 * <ui-image src="/photos/lac.jpg" alt="Lac de montagne au lever du soleil" ratio="16/9" />
 * ```
 * `src` à `null` : adresse pas encore connue (chargée depuis une API), le loader est affiché.
 * @slot [uiImageOverlay] - Contenu superposé à l'image (légende, badge…), affiché une fois l'image chargée ; à positionner (calque `position: absolute; inset: 0`).
 * @cssprop --ui-image-radius - Arrondi des coins.
 * @cssprop --ui-image-placeholder - Fond pendant le chargement.
 * @cssprop --ui-image-background - Fond une fois l'image chargée (bandes de `fit="contain"`, images transparentes ; défaut transparent).
 * @cssprop --ui-image-min-height - Hauteur réservée pendant le chargement quand aucun ratio n'est connu (défaut 10rem).
 * @category Affichage
 */
@Component({
  selector: 'ui-image',
  imports: [UiLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-image',
    '[class.ui-image--ratio]': '!!aspectRatio()',
    '[class.ui-image--loaded]': "state() === 'loaded'",
    '[class.ui-image--error]': "state() === 'error'",
    '[class.ui-image--instant]': 'instant()',
    '[style.aspect-ratio]': 'aspectRatio()',
    '[attr.aria-busy]': "state() === 'loading' || state() === 'idle' || null",
  },
  templateUrl: './image.html',
  styleUrl: './image.css',
})
export class UiImage {
  private readonly preloader = inject(UiImagePreloader);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  /** Adresse de l'image ; `null` tant qu'elle n'est pas connue (loader affiché). */
  readonly src = input<string | null>();
  /** Texte alternatif (obligatoire ; `''` pour une image purement décorative). */
  readonly alt = input.required<string>();
  /** Variantes de résolution (`srcset`). */
  readonly srcset = input<string>();
  /** Tailles d'affichage pour `srcset` (`sizes`). */
  readonly sizes = input<string>();
  /** Largeur intrinsèque en pixels (avec `height`, réserve le bon ratio). */
  readonly width = input(undefined, { transform: optionalNumber });
  /** Hauteur intrinsèque en pixels. */
  readonly height = input(undefined, { transform: optionalNumber });
  /** Ratio réservé, ex. `'16/9'`, `'1'` (prioritaire sur `width` / `height`). */
  readonly ratio = input<string>();
  /** Recadrage dans l'emplacement (`object-fit`). */
  readonly fit = input<'cover' | 'contain' | 'fill' | 'none' | 'scale-down'>('cover');
  /** Point d'ancrage du recadrage (`object-position`), ex. `'top'`, `'30% 50%'`. */
  readonly position = input('center');
  /** `lazy` : chargée à l'approche de la fenêtre ; `eager` : chargée tout de suite. */
  readonly loading = input<'lazy' | 'eager'>('lazy');
  /** Image importante (au-dessus de la ligne de flottaison) : chargée tout de suite, en priorité haute. */
  readonly priority = input(false, { transform: booleanAttribute });
  /** Distance avant la fenêtre à partir de laquelle le téléchargement commence (`rootMargin`). */
  readonly preloadMargin = input('300px');
  /** Loader affiché pendant le chargement (défaut : celui de l'application) ; `'none'` : aucun. */
  readonly loader = input<UiLoaderType | 'none'>();
  /** Petite image floutée affichée pendant le chargement (aperçu basse définition). */
  readonly placeholderSrc = input<string>();
  /** Image de secours si `src` ne peut pas être chargée. */
  readonly fallbackSrc = input<string>();
  /** Message en cas d'échec. */
  readonly errorText = input('Image indisponible');
  /** Bouton « Réessayer » en cas d'échec. */
  readonly retry = input(true, { transform: booleanAttribute });
  /** Apparition en fondu. */
  readonly fade = input(true, { transform: booleanAttribute });
  /** Mode CORS (`crossorigin`). */
  readonly crossOrigin = input<'anonymous' | 'use-credentials'>();
  /** Politique de référent (`referrerpolicy`). */
  readonly referrerPolicy = input<ReferrerPolicy>();

  /** Émis quand l'image (ou l'image de secours) est chargée et décodée. */
  readonly loaded = output<{ src: string; naturalWidth: number; naturalHeight: number }>();
  /** Émis quand ni l'image ni l'image de secours n'ont pu être chargées. */
  readonly failed = output<{ src: string }>();

  /** État de chargement. */
  readonly state = signal<UiImageState>('idle');
  /** L'image est assez proche de la fenêtre pour être téléchargée. */
  protected readonly near = signal(false);
  /** Adresse en cours (source, puis secours). */
  protected readonly current = signal<{ src: string; srcset?: string; fallback: boolean } | null>(null);
  /** Clé de l'élément `<img>` : une nouvelle clé recrée l'élément (Réessayer). */
  protected readonly attempt = signal(0);
  /** Déjà en cache (préchargée) : pas de loader ni de fondu. */
  protected readonly instant = signal(false);

  protected readonly aspectRatio = computed(() => {
    const ratio = this.ratio()?.trim();
    if (ratio) return /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/.test(ratio) ? ratio : null;
    const w = this.width();
    const h = this.height();
    return w && h ? `${w} / ${h}` : null;
  });
  protected readonly eager = computed(() => this.priority() || this.loading() === 'eager');
  protected readonly showLoader = computed(() => this.loader() !== 'none' && (this.state() === 'loading' || this.state() === 'idle'));
  protected readonly loaderType = computed(() => {
    const loader = this.loader();
    return loader === 'none' ? undefined : loader;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Nouvelle source : on repart de zéro.
    effect(() => {
      const src = this.src();
      const srcset = this.srcset();
      untracked(() => {
        this.instant.set(!srcset && this.preloader.isLoaded(src));
        this.current.set(src ? { src, srcset, fallback: false } : null);
        this.state.set(src ? (this.near() || this.eager() ? 'loading' : 'idle') : 'idle');
      });
    });
    effect(() => {
      if ((this.near() || this.eager()) && this.current() && untracked(this.state) === 'idle') this.state.set('loading');
    });

    afterNextRender(() => {
      if (this.eager()) return this.near.set(true);
      const View = this.host.ownerDocument.defaultView;
      if (!View || !('IntersectionObserver' in View)) return this.near.set(true);
      const observer = new View.IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.near.set(true);
            observer.disconnect();
          }
        },
        { rootMargin: this.preloadMargin() },
      );
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    const current = this.current();
    if (!current) return;
    const done = () => {
      // Une autre source a pu être demandée pendant le décodage.
      if (this.current() !== current) return;
      this.preloader.markLoaded(current.src);
      this.state.set('loaded');
      this.loaded.emit({ src: img.currentSrc || current.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    };
    if (typeof img.decode === 'function') img.decode().then(done, done);
    else done();
  }

  protected onError(): void {
    const current = this.current();
    if (!current) return;
    const fallback = this.fallbackSrc();
    if (!current.fallback && fallback && fallback !== current.src) {
      this.current.set({ src: fallback, fallback: true });
      return;
    }
    this.state.set('error');
    this.failed.emit({ src: this.src() ?? current.src });
  }

  /** Relance le téléchargement (après un échec). */
  reload(): void {
    const src = this.src();
    if (!src) return;
    this.instant.set(false);
    this.current.set({ src, srcset: this.srcset(), fallback: false });
    this.attempt.update((n) => n + 1);
    this.state.set('loading');
  }
}
