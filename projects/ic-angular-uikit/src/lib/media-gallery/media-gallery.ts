import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { UiImage } from '../image/image';
import { UiImagePreloader } from '../image/image-preloader';
import { UiMediaPlayer } from '../media-player/media-player';
import { UiMediaSource, UiMediaTextTrack, resolveMediaSource } from '../media-player/media-source';

/** Élément d'une galerie : image ou vidéo (fichier, YouTube, Vimeo). */
export interface UiGalleryItem {
  /** Image, fichier vidéo, ou page YouTube / Vimeo. */
  src: string;
  /** Description de l'image, ou titre de la vidéo (obligatoire). */
  alt: string;
  /** Force le type (sinon déduit de l'adresse). */
  kind?: 'image' | 'video';
  /** Vignette (conseillée pour les vidéos ; sinon `src` pour les images). */
  thumbnail?: string;
  /** Légende affichée dans la visionneuse (et sous la vignette avec `captions`). */
  caption?: string;
  /** Dimensions intrinsèques : réservent la place en mosaïque. */
  width?: number;
  height?: number;
  /** Variantes de résolution de l'image en grand. */
  srcset?: string;
  sizes?: string;
  /** Affiche de la vidéo. */
  poster?: string;
  /** Sous-titres de la vidéo (WebVTT). */
  tracks?: readonly UiMediaTextTrack[];
}

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i;

/** Type d'un élément de galerie. */
export function galleryItemKind(item: UiGalleryItem): 'image' | 'video' {
  if (item.kind) return item.kind;
  if (VIDEO_EXT.test(item.src)) return 'video';
  const resolved = resolveMediaSource({ src: item.src });
  return resolved.provider !== 'file' ? 'video' : 'image';
}

/**
 * Galerie d'images et de vidéos : grille ou mosaïque de vignettes (chargées à l'approche, avec loader), et
 * visionneuse plein écran au clic. Visionneuse : image entière (préchargement des voisines), vidéo lue par
 * `ui-media-player` (fichiers, YouTube, Vimeo, sous-titres), légende, compteur, bande de miniatures ; précédent /
 * suivant aux boutons, aux flèches du clavier ou par balayage ; Échap ferme et rend le focus à la vignette.
 *
 * ```html
 * <ui-media-gallery [items]="photos" />
 * ```
 * @cssprop --ui-gallery-tile - Largeur minimale d'une vignette (défaut : `11rem`).
 * @cssprop --ui-gallery-gap - Espacement (défaut : `0.5rem`).
 * @category Affichage
 */
@Component({
  selector: 'ui-media-gallery',
  imports: [UiImage, UiMediaPlayer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-media-gallery', '[class]': "'ui-media-gallery--' + layout()" },
  templateUrl: './media-gallery.html',
  styleUrl: './media-gallery.css',
})
export class UiMediaGallery {
  /** Éléments. */
  readonly items = input<readonly UiGalleryItem[]>([]);
  /** `grid` : vignettes de même ratio ; `masonry` : mosaïque qui respecte les proportions. */
  readonly layout = input<'grid' | 'masonry'>('grid');
  /** Ratio des vignettes en grille (`'1'`, `'4/3'`, `'16/9'`). */
  readonly ratio = input('4/3');
  /** Légende sous chaque vignette. */
  readonly captions = input(false, { transform: booleanAttribute });
  /** Bande de miniatures dans la visionneuse. */
  readonly filmstrip = input(true, { transform: booleanAttribute });
  /** Revient au début après le dernier élément. */
  readonly loop = input(true, { transform: booleanAttribute });
  /** Nom accessible de la galerie. */
  readonly ariaLabel = input('Galerie');
  /** Élément ouvert dans la visionneuse (`null` : fermée). Liaison `[(current)]`. */
  readonly current = model<number | null>(null);

  /** Visionneuse ouverte. */
  readonly opened = output<number>();
  /** Visionneuse fermée. */
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly preloader = inject(UiImagePreloader);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly gridRef = viewChild<ElementRef<HTMLElement>>('grid');
  protected readonly announcement = signal('');
  private lastOpen: number | null = null;
  private swipeStart: { x: number; y: number } | null = null;

  protected readonly kinds = computed(() => this.items().map(galleryItemKind));
  protected readonly item = computed(() => {
    const index = this.current();
    return index === null ? null : (this.items()[index] ?? null);
  });
  protected readonly isVideo = computed(() => {
    const index = this.current();
    return index !== null && this.kinds()[index] === 'video';
  });
  protected readonly videoSources = computed<UiMediaSource[]>(() => {
    const item = this.item();
    return item && this.isVideo() ? [{ src: item.src, title: item.alt, type: 'video', artwork: item.poster ?? item.thumbnail, tracks: item.tracks }] : [];
  });
  protected readonly hasPrev = computed(() => this.loop() || (this.current() ?? 0) > 0);
  protected readonly hasNext = computed(() => this.loop() || (this.current() ?? 0) < this.items().length - 1);

  constructor() {
    effect(() => {
      const index = this.current();
      const count = this.items().length;
      untracked(() => this.sync(index !== null && index >= 0 && index < count ? index : null));
    });
  }

  /** Ouvre la visionneuse sur un élément. */
  open(index: number): void {
    if (index >= 0 && index < this.items().length) this.current.set(index);
  }

  /** Ferme la visionneuse. */
  close(): void {
    this.current.set(null);
  }

  /** Élément suivant. */
  next(): void {
    this.step(1);
  }

  /** Élément précédent. */
  previous(): void {
    this.step(-1);
  }

  private step(delta: number): void {
    const index = this.current();
    const count = this.items().length;
    if (index === null || !count) return;
    let target = index + delta;
    if (this.loop()) target = (target + count) % count;
    if (target >= 0 && target < count) this.current.set(target);
  }

  private sync(index: number | null): void {
    const dialog = this.dialogRef().nativeElement;
    if (index === null) {
      if (dialog.open) dialog.close();
      if (this.lastOpen !== null) {
        const thumb = this.gridRef()?.nativeElement.querySelector<HTMLElement>(`[data-index="${this.lastOpen}"]`);
        this.lastOpen = null;
        this.closed.emit();
        afterNextRender(() => thumb?.focus(), { injector: this.injector });
      }
      return;
    }
    if (!dialog.open) {
      dialog.showModal();
      this.opened.emit(index);
    }
    this.lastOpen = index;
    const item = this.items()[index];
    const kind = this.kinds()[index];
    this.announcement.set(`${kind === 'video' ? 'Vidéo' : 'Image'} ${index + 1} sur ${this.items().length} : ${item.alt}`);
    // Images voisines préchargées : la navigation est instantanée.
    const count = this.items().length;
    const neighbours = [index + 1, index - 1].map((i) => (i + count) % count).filter((i) => i !== index && this.kinds()[i] === 'image');
    void this.preloader.preload(neighbours.map((i) => this.items()[i].src));
    afterNextRender(() => this.document.defaultView && this.dialogRef().nativeElement.querySelector<HTMLElement>('.ui-gallery__filmstrip [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }), { injector: this.injector });
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    // Les flèches restent aux contrôles du lecteur vidéo (curseur de progression, volume).
    if (target.closest('ui-media-player')) return;
    if (event.key === 'ArrowRight') this.next();
    else if (event.key === 'ArrowLeft') this.previous();
    else if (event.key === 'Home') this.current.set(0);
    else if (event.key === 'End') this.current.set(this.items().length - 1);
    else return;
    event.preventDefault();
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') this.swipeStart = { x: event.clientX, y: event.clientY };
  }

  protected onPointerUp(event: PointerEvent): void {
    const start = this.swipeStart;
    this.swipeStart = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) this.next();
      else this.previous();
    }
  }

  /** Clic sur le fond (hors image et contrôles) : fermeture. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('ui-gallery__stage')) this.close();
  }

  protected thumb(item: UiGalleryItem, index: number): string | null {
    return item.thumbnail ?? (this.kinds()[index] === 'image' ? item.src : null);
  }

  protected tileRatio(item: UiGalleryItem): string {
    if (this.layout() === 'masonry' && item.width && item.height) return `${item.width}/${item.height}`;
    return this.layout() === 'masonry' ? '4/3' : this.ratio();
  }
}
