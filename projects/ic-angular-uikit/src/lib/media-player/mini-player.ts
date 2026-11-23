import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { UiAudioVisualizer, UiVisualization } from './audio-visualizer';
import { UiMediaControl, UiMediaHub } from './media-hub';
import { formatMediaTime, speakMediaTime } from './media-source';

/**
 * Lecteur miniature, pour une barre d'application ou un pied de page : vignette (visualisation de la musique,
 * image animée de la vidéo, ou pochette / logo de l'hébergeur pour YouTube et Vimeo), titre, lecture / pause,
 * précédent / suivant et progression. Il pilote le lecteur passé dans `player`, sinon le lecteur actif de la page
 * (le dernier `ui-media-player` lancé).
 *
 * Cliquer sur le titre ramène au lecteur complet. Sans média, il se masque (`hideWhenIdle`).
 *
 * @cssprop --ui-mini-player-thumb - Taille de la vignette (défaut : `2.5rem`).
 * @cssprop --ui-visualizer-color - Couleur de la visualisation (défaut : couleur de texte principale).
 * @category Affichage
 */
@Component({
  selector: 'ui-mini-player',
  imports: [UiAudioVisualizer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-mini-player',
    role: 'group',
    '[attr.aria-label]': '"Lecture en cours : " + (item()?.title ?? "aucun média")',
    '[class.ui-mini-player--hidden]': 'hideWhenIdle() && !item()',
    '[class.ui-mini-player--compact]': 'compact()',
  },
  template: `
    @let media = control();
    @let current = item();
    <div class="ui-mini__thumb" aria-hidden="true">
      @switch (thumbKind()) {
        @case ('visualizer') {
          <ui-audio-visualizer class="ui-mini__viz" [source]="media" [type]="visualization()" [bars]="visualization() === 'radial' ? 24 : 0" />
        }
        @case ('video') {
          <canvas #frame class="ui-mini__frame"></canvas>
        }
        @case ('artwork') {
          <img class="ui-mini__art" [src]="current?.artwork" alt="" />
        }
        @default {
          <span class="ui-mini__badge">{{ badge() }}</span>
        }
      }
    </div>
    <button type="button" class="ui-mini__info" [disabled]="!media" [title]="'Aller au lecteur : ' + (current?.title ?? '')" (click)="media?.reveal()">
      <span class="ui-mini__title">{{ current?.title ?? 'Aucun média' }}</span>
      @if (current?.artist && !compact()) {
        <span class="ui-mini__artist">{{ current?.artist }}</span>
      }
    </button>
    <div class="ui-mini__buttons">
      @if (media?.hasPrevious() && !compact()) {
        <button type="button" class="ui-mini__btn" aria-label="Piste précédente" (click)="media?.previous()">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5.5v13L9 12z" /></svg>
        </button>
      }
      <button type="button" class="ui-mini__btn ui-mini__play" [disabled]="!current" [attr.aria-label]="media?.playing() ? 'Pause' : 'Lecture'" (click)="media?.toggle()">
        @if (media?.playing()) {
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
        } @else {
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
        }
      </button>
      @if (media?.hasNext()) {
        <button type="button" class="ui-mini__btn" aria-label="Piste suivante" (click)="media?.next()">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5.5v13L15 12z" /></svg>
        </button>
      }
    </div>
    @if (showProgress() && media) {
      <progress
        class="ui-mini__progress"
        max="1"
        [value]="progress()"
        [attr.aria-label]="'Progression : ' + speak(media.currentTime()) + ' sur ' + speak(media.duration())"
        [title]="format(media.currentTime()) + ' / ' + format(media.duration())"
      ></progress>
    }
  `,
  styleUrl: './mini-player.css',
})
export class UiMiniPlayer {
  /** Lecteur piloté (référence de template d'un `ui-media-player`) ; par défaut, le lecteur actif de la page. */
  readonly player = input<UiMediaControl | null | undefined>(undefined);
  /** Visualisation de la musique dans la vignette. */
  readonly visualization = input<UiVisualization>('bars');
  /** Barre de progression sous le mini-lecteur. */
  readonly showProgress = input(true, { transform: booleanAttribute });
  /** Masqué tant qu'aucun média n'est chargé. */
  readonly hideWhenIdle = input(false, { transform: booleanAttribute });
  /** Version réduite : vignette, titre et lecture / pause seulement. */
  readonly compact = input(false, { transform: booleanAttribute });

  private readonly hub = inject(UiMediaHub);
  private readonly injector = inject(Injector);
  private readonly frameRef = viewChild<ElementRef<HTMLCanvasElement>>('frame');
  private frame = 0;
  protected readonly format = formatMediaTime;
  protected readonly speak = speakMediaTime;

  /** Lecteur suivi. */
  protected readonly control = computed(() => this.player() ?? this.hub.active());
  protected readonly item = computed(() => this.control()?.current() ?? null);
  protected readonly progress = computed(() => {
    const media = this.control();
    const duration = media?.duration() ?? 0;
    return media && Number.isFinite(duration) && duration > 0 ? Math.min(1, media.currentTime() / duration) : 0;
  });
  protected readonly thumbKind = computed<'visualizer' | 'video' | 'artwork' | 'badge'>(() => {
    const resolved = this.control()?.resolved();
    if (!resolved) return 'badge';
    if (resolved.kind === 'audio') return 'visualizer';
    if (resolved.provider === 'file') return 'video';
    return this.item()?.artwork ? 'artwork' : 'badge';
  });
  protected readonly badge = computed(() => {
    const provider = this.control()?.resolved()?.provider;
    return provider === 'youtube' ? 'YT' : provider === 'vimeo' ? 'V' : '♪';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    // Vignette vidéo : copie des images de la vidéo du lecteur (même sans CORS, l'image s'affiche ; rien n'est relu).
    effect(() => {
      const kind = this.thumbKind();
      const video = this.control()?.videoElement() ?? null;
      const playing = this.control()?.playing() ?? false;
      untracked(() => {
        cancelAnimationFrame(this.frame);
        if (kind !== 'video' || !video) return;
        afterNextRender(
          () => {
            this.paint(video);
            if (playing) this.loop(video);
          },
          { injector: this.injector },
        );
      });
    });
  }

  private loop(video: HTMLVideoElement): void {
    this.frame = requestAnimationFrame(() => {
      this.paint(video);
      this.loop(video);
    });
  }

  private paint(video: HTMLVideoElement): void {
    const canvas = this.frameRef()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || video.readyState < 2) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Recadrage « cover » : la vignette carrée prend le centre de l'image.
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const w = video.videoWidth * scale;
    const h = video.videoHeight * scale;
    ctx.drawImage(video, (width - w) / 2, (height - h) / 2, w, h);
  }
}
