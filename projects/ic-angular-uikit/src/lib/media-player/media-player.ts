import { UiLoader } from '../loader/loader';
import { UiLoaderDefaults, compactLoaderType } from '../loader/loader-config';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  Renderer2,
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
import { UiButton } from '../button/button';
import { uniqueId } from '../core/id';
import { UiAudioVisualizer, UiVisualization } from './audio-visualizer';
import { UiMediaControl, UiMediaHub } from './media-hub';
import { UiMediaSource, formatMediaTime, mediaEmbedUrl, resolveMediaSource, speakMediaTime } from './media-source';

/** Répétition de la liste de lecture. */
export type UiMediaRepeat = 'none' | 'one' | 'all';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PROVIDER_NAMES = { youtube: 'YouTube', vimeo: 'Vimeo', file: '' } as const;

/**
 * Lecteur de musique et de vidéos : fichiers audio / vidéo (lecture native, commandes accessibles, sous-titres
 * WebVTT, vitesse, image dans l'image, plein écran), vidéos YouTube et Vimeo (lecteur de l'hébergeur), liste de
 * lecture, visualisations prédéfinies pour la musique.
 *
 * - **YouTube / Vimeo** : chargés seulement au clic (`embedConsent="click"`, par défaut) car le lecteur de
 *   l'hébergeur peut déposer des cookies ; domaine sans cookies `youtube-nocookie.com`, Vimeo en `dnt=1`. Aucun
 *   script tiers dans la page : le lecteur intégré est piloté par messages (`postMessage`, origine vérifiée).
 *   Autorisez-les dans la CSP : `frame-src https://www.youtube-nocookie.com https://player.vimeo.com`.
 * - **Visualisations** (`visualization`) : analyse Web Audio du son, possible pour les fichiers de la même origine
 *   que le site ou servis avec CORS (`crossOrigin`) ; sinon, visualisation au repos (le son reste intact).
 * - **Clavier** (focus dans le lecteur) : Espace ou K lecture / pause, ← / → 5 s, J / L 10 s, ↑ / ↓ volume,
 *   M muet, C sous-titres, F plein écran, Maj+N / Maj+P piste suivante / précédente.
 * - Le dernier lecteur lancé devient le lecteur actif de la page (`UiMediaHub`), suivi par `ui-mini-player`, et met
 *   les autres en pause (`exclusive`). Les commandes système (Media Session) sont renseignées.
 *
 * @slot default - Contenu ajouté sous le lecteur (description, liens).
 * @cssprop --ui-media-ratio - Proportions de la zone vidéo (défaut : `16 / 9`).
 * @cssprop --ui-media-stage-height - Hauteur de la zone de visualisation audio (défaut : `12rem`).
 * @cssprop --ui-visualizer-color - Couleur des visualisations.
 * @category Affichage
 */
@Component({
  selector: 'ui-media-player',
  imports: [UiAudioVisualizer, UiButton, UiLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-media-player',
    role: 'region',
    '[attr.aria-label]': '(ariaLabel() || "Lecteur") + " : " + (current()?.title ?? "aucun média")',
    '[class.ui-media-player--audio]': 'isAudio()',
    '[class.ui-media-player--video]': '!isAudio()',
    '[class.ui-media-player--embed]': 'isEmbed()',
    '[class.ui-media-player--playing]': 'playing()',
    '(keydown)': 'onKeydown($event)',
  },
  templateUrl: './media-player.html',
  styleUrl: './media-player.css',
})
export class UiMediaPlayer implements UiMediaControl {
  /** Nom du lecteur (complété par le titre en cours) : à préciser s'il y a plusieurs lecteurs dans la page. */
  readonly ariaLabel = input('Lecteur');
  /** Médias à lire (liste de lecture si plusieurs). */
  readonly sources = input<readonly UiMediaSource[]>([]);
  /** Position dans la liste (liaison bidirectionnelle `[(index)]`). */
  readonly index = model(0);
  /** Visualisation des fichiers audio (`none` : pochette seule). */
  readonly visualization = input<UiVisualization | 'none'>('bars');
  /** Affiche la liste de lecture (si plusieurs médias). */
  readonly showPlaylist = input(true, { transform: booleanAttribute });
  /** Répétition : aucune, le média courant, toute la liste. */
  readonly repeat = model<UiMediaRepeat>('none');
  /** Lecture automatique du média suivant à la fin du courant. */
  readonly autoAdvance = input(true, { transform: booleanAttribute });
  /** YouTube / Vimeo : `click` charge le lecteur de l'hébergeur au clic (cookies possibles), `auto` immédiatement. */
  readonly embedConsent = input<'click' | 'auto'>('click');
  /** Mode CORS des fichiers d'une autre origine (`anonymous` si le serveur l'autorise) : nécessaire aux visualisations. */
  readonly crossOrigin = input<'anonymous' | 'use-credentials' | null>(null);
  /** Met en pause les autres lecteurs de la page au démarrage. */
  readonly exclusive = input(true, { transform: booleanAttribute });

  /** Émis quand la lecture démarre ou s'arrête. */
  readonly playingChange = output<boolean>();
  /** Émis à la fin d'un média. */
  readonly mediaEnded = output<UiMediaSource>();

  private readonly hub = inject(UiMediaHub);
  private readonly loaderDefaults = inject(UiLoaderDefaults);
  /** Loader de mise en mémoire tampon (celui de l'application). */
  protected readonly loaderType = computed(() => compactLoaderType(undefined, this.loaderDefaults));
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly injector = inject(Injector);
  protected readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly mediaRef = viewChild<ElementRef<HTMLVideoElement>>('media');
  private readonly embedHostRef = viewChild<ElementRef<HTMLElement>>('embedHost');
  protected readonly baseId = uniqueId('ui-media');

  /** Média courant. */
  readonly current = computed<UiMediaSource | null>(() => {
    const list = this.sources();
    return list.length ? list[Math.min(Math.max(0, this.index()), list.length - 1)] : null;
  });
  readonly resolved = computed(() => {
    const current = this.current();
    return current ? resolveMediaSource(current) : null;
  });
  protected readonly isAudio = computed(() => this.resolved()?.kind === 'audio');
  protected readonly isEmbed = computed(() => !!this.resolved() && this.resolved()?.provider !== 'file');
  protected readonly providerName = computed(() => PROVIDER_NAMES[this.resolved()?.provider ?? 'file']);
  /** URL du fichier courant (le `src` de l'élément média) ; `null` pour une vidéo hébergée. */
  protected readonly fileSrc = computed(() => (this.isEmbed() ? null : (this.current()?.src ?? null)));

  readonly playing = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(Number.NaN);
  readonly volume = signal(1);
  readonly muted = signal(false);
  readonly analyser = signal<AnalyserNode | null>(null);
  readonly videoElement = signal<HTMLVideoElement | null>(null);
  readonly hasPrevious = computed(() => this.sources().length > 1 && (this.index() > 0 || this.repeat() === 'all'));
  readonly hasNext = computed(() => this.sources().length > 1 && (this.index() < this.sources().length - 1 || this.repeat() === 'all'));

  protected readonly rate = signal(1);
  protected readonly rates = RATES;
  protected readonly captions = signal(false);
  protected readonly hasCaptions = computed(() => !this.isEmbed() && !!this.current()?.tracks?.some((t) => t.kind !== 'descriptions'));
  protected readonly buffering = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly embedLoaded = signal(false);
  protected readonly fullscreen = signal(false);
  protected readonly pipSupported = signal(false);
  protected readonly announcement = signal('');
  protected readonly format = formatMediaTime;
  protected readonly speak = speakMediaTime;

  /** Analyse Web Audio possible : toutes les sources sont de la même origine, ou servies avec CORS. */
  private readonly canAnalyse = computed(() => {
    if (this.crossOrigin()) return true;
    const origin = this.document.location?.origin;
    return this.sources().every((s) => {
      if (resolveMediaSource(s).provider !== 'file') return true;
      try {
        return new URL(s.src, this.document.baseURI).origin === origin;
      } catch {
        return false;
      }
    });
  });
  protected readonly vizType = computed<UiVisualization>(() => {
    const v = this.visualization();
    return v === 'none' ? 'bars' : v;
  });
  /** Durée connue et finie (un flux en direct n'a pas de position). */
  protected readonly seekable = computed(() => Number.isFinite(this.duration()) && this.duration() > 0);
  protected readonly round = Math.round;
  protected resolvedOf(source: UiMediaSource): string {
    return resolveMediaSource(source).provider;
  }
  protected readonly visualized = computed(() => this.visualization() !== 'none' && this.isAudio());

  /** Hébergeurs pour lesquels l'utilisateur a déjà accepté le chargement du lecteur (pour cette instance). */
  private readonly consented = new Set<string>();
  private audioContext: AudioContext | null = null;
  private embedFrame: HTMLIFrameElement | null = null;
  private wantPlay = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.hub.register(this);
    destroyRef.onDestroy(() => {
      this.hub.unregister(this);
      void this.audioContext?.close();
      this.removeEmbed();
    });

    afterNextRender(() => {
      this.videoElement.set(this.mediaRef()?.nativeElement ?? null);
      this.pipSupported.set(!!this.document.pictureInPictureEnabled);
      const onFullscreen = () => this.fullscreen.set(this.document.fullscreenElement === this.host);
      this.document.addEventListener('fullscreenchange', onFullscreen);
      const view = this.document.defaultView;
      const onMessage = (event: MessageEvent) => this.onEmbedMessage(event);
      view?.addEventListener('message', onMessage);
      destroyRef.onDestroy(() => {
        this.document.removeEventListener('fullscreenchange', onFullscreen);
        view?.removeEventListener('message', onMessage);
      });
    });

    // Changement de média : état remis à zéro, vidéo hébergée chargée si consentie d'office.
    effect(() => {
      const current = this.current();
      const resolved = this.resolved();
      untracked(() => {
        this.removeEmbed();
        this.currentTime.set(0);
        this.duration.set(Number.NaN);
        this.error.set(null);
        this.embedLoaded.set(false);
        if (!this.wantPlay) this.playing.set(false);
        if (current) this.announcement.set(`${current.title}${current.artist ? ` — ${current.artist}` : ''}`);
        if (resolved && resolved.provider !== 'file' && this.mayLoadEmbed() && !this.wantPlay) {
          afterNextRender(() => this.loadEmbed(false), { injector: this.injector });
        }
        this.updateMediaSession();
      });
    });

    // Lecture enchaînée : le nouveau fichier démarre dès qu'il est chargé.
    effect(() => {
      this.fileSrc();
      untracked(() => {
        // Les éléments <source> ne sont relus qu'au rechargement de l'élément.
        if (this.current()?.formats?.length) afterNextRender(() => this.mediaRef()?.nativeElement.load(), { injector: this.injector });
        if (!this.wantPlay) return;
        // Vidéo hébergée : jamais chargée sans consentement (clic sur « Lire la vidéo » ou `embedConsent="auto"`).
        if (this.isEmbed() && !this.mayLoadEmbed()) {
          this.wantPlay = false;
          this.playing.set(false);
          return;
        }
        afterNextRender(() => (this.isEmbed() ? this.loadEmbed(true) : this.play()), { injector: this.injector });
      });
    });

    effect(() => {
      const media = this.mediaRef()?.nativeElement;
      const showing = this.captions();
      this.current();
      untracked(() => {
        if (!media) return;
        afterNextRender(
          () => Array.from(media.textTracks).forEach((t, i) => (t.mode = showing && i === 0 ? 'showing' : t.kind === 'descriptions' ? 'hidden' : 'disabled')),
          { injector: this.injector },
        );
      });
    });
  }

  // ---------------------------------------------------------------- Commandes publiques

  /** Chargement du lecteur de l'hébergeur autorisé (consentement donné ou `embedConsent="auto"`). */
  private mayLoadEmbed(): boolean {
    const provider = this.resolved()?.provider;
    return this.embedConsent() === 'auto' || (!!provider && this.consented.has(provider));
  }

  /**
   * Lance la lecture. Pour une vidéo YouTube / Vimeo, le lecteur de l'hébergeur n'est chargé que si l'utilisateur
   * l'a accepté (bouton « Lire la vidéo ») ou avec `embedConsent="auto"`.
   */
  play(): void {
    if (this.isEmbed()) {
      if (!this.embedFrame) {
        if (this.mayLoadEmbed()) this.loadEmbed(true);
        else this.reveal();
        return;
      }
      else this.embedCommand('play');
      return;
    }
    const media = this.mediaRef()?.nativeElement;
    if (!media || !this.fileSrc()) return;
    this.ensureAudioGraph(media);
    void this.audioContext?.resume();
    media.play().catch((error: DOMException) => {
      if (error.name !== 'AbortError') this.error.set('Lecture impossible : format non pris en charge ou fichier inaccessible.');
    });
  }

  pause(): void {
    this.wantPlay = false;
    if (this.isEmbed()) this.embedCommand('pause');
    else this.mediaRef()?.nativeElement.pause();
  }

  toggle(): void {
    if (this.playing()) this.pause();
    else this.play();
  }

  /** Va à la position donnée (secondes). */
  seek(seconds: number): void {
    const duration = this.duration();
    const target = Math.max(0, Number.isFinite(duration) ? Math.min(duration, seconds) : seconds);
    if (this.isEmbed()) this.embedCommand('seek', target);
    else {
      const media = this.mediaRef()?.nativeElement;
      if (media) media.currentTime = target;
    }
    this.currentTime.set(target);
  }

  next(): void {
    this.goTo(this.index() + 1, true);
  }

  previous(): void {
    // Après 3 s de lecture, « précédent » revient au début du média (comportement habituel des lecteurs).
    if (this.currentTime() > 3 && !this.isEmbed()) this.seek(0);
    else this.goTo(this.index() - 1, true);
  }

  setMuted(muted: boolean): void {
    this.muted.set(muted);
    if (this.isEmbed()) this.embedCommand(muted ? 'mute' : 'unmute');
    else {
      const media = this.mediaRef()?.nativeElement;
      if (media) media.muted = muted;
    }
  }

  setVolume(volume: number): void {
    const value = Math.min(1, Math.max(0, volume));
    this.volume.set(value);
    const media = this.mediaRef()?.nativeElement;
    if (media) media.volume = value;
    if (this.isEmbed()) this.embedCommand('volume', value);
    if (value > 0 && this.muted()) this.setMuted(false);
  }

  reveal(): void {
    this.host.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.host.querySelector<HTMLElement>('.ui-mp__play')?.focus({ preventScroll: true });
  }

  /** Lit le média d'index donné. */
  goTo(index: number, autoplay = this.playing()): void {
    const count = this.sources().length;
    if (!count) return;
    let target = index;
    if (target >= count) target = this.repeat() === 'all' ? 0 : -1;
    if (target < 0) target = index < 0 && this.repeat() === 'all' ? count - 1 : -1;
    if (target < 0 || target === this.index()) {
      if (target === this.index() && autoplay) {
        this.seek(0);
        this.play();
      }
      return;
    }
    this.wantPlay = autoplay;
    this.index.set(target);
  }

  // ---------------------------------------------------------------- Élément média natif

  protected onMediaEvent(event: Event): void {
    const media = event.target as HTMLVideoElement;
    switch (event.type) {
      case 'play':
        this.playing.set(true);
        this.wantPlay = true;
        this.hub.started(this, this.exclusive());
        this.playingChange.emit(true);
        this.updateMediaSession();
        break;
      case 'pause':
        this.playing.set(false);
        this.playingChange.emit(false);
        break;
      case 'timeupdate':
        this.currentTime.set(media.currentTime);
        break;
      case 'durationchange':
      case 'loadedmetadata':
        this.duration.set(media.duration);
        break;
      case 'volumechange':
        this.volume.set(media.volume);
        this.muted.set(media.muted);
        break;
      case 'waiting':
        this.buffering.set(true);
        break;
      case 'playing':
      case 'canplay':
        this.buffering.set(false);
        break;
      case 'ended':
        this.onEnded();
        break;
      case 'error':
        this.playing.set(false);
        this.error.set('Ce média ne peut pas être lu (format non pris en charge ou fichier introuvable).');
        break;
    }
  }

  private onEnded(): void {
    const current = this.current();
    if (current) this.mediaEnded.emit(current);
    if (this.repeat() === 'one') {
      this.seek(0);
      this.play();
    } else if (this.autoAdvance() && this.hasNext()) {
      this.goTo(this.index() + 1, true);
    } else {
      this.playing.set(false);
      this.wantPlay = false;
    }
  }

  /** Graphe Web Audio (une seule fois par élément) : le son passe par un analyseur pour les visualisations. */
  private ensureAudioGraph(media: HTMLVideoElement): void {
    if (this.audioContext || !this.canAnalyse() || this.visualization() === 'none') return;
    const Context = this.document.defaultView?.AudioContext;
    if (!Context) return;
    try {
      const context = new Context();
      const source = context.createMediaElementSource(media);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(context.destination);
      this.audioContext = context;
      this.analyser.set(analyser);
    } catch {
      this.audioContext = null;
    }
  }

  protected onSeekInput(event: Event): void {
    this.seek(Number((event.target as HTMLInputElement).value));
  }

  protected onVolumeInput(event: Event): void {
    this.setVolume(Number((event.target as HTMLInputElement).value) / 100);
  }

  protected onRateChange(event: Event): void {
    const rate = Number((event.target as HTMLSelectElement).value);
    this.rate.set(rate);
    const media = this.mediaRef()?.nativeElement;
    if (media) media.playbackRate = rate;
  }

  protected toggleFullscreen(): void {
    if (this.document.fullscreenElement) void this.document.exitFullscreen();
    else void this.host.requestFullscreen?.();
  }

  protected togglePictureInPicture(): void {
    const media = this.mediaRef()?.nativeElement;
    if (!media) return;
    if (this.document.pictureInPictureElement) void this.document.exitPictureInPicture();
    else void media.requestPictureInPicture?.();
  }

  protected cycleRepeat(): void {
    this.repeat.update((r) => (r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'));
  }

  protected repeatLabel(): string {
    return { none: 'Répétition désactivée', all: 'Répéter toute la liste', one: 'Répéter le média en cours' }[this.repeat()];
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    // Les curseurs, listes et boutons gardent leurs touches propres (flèches, Espace, Entrée).
    const ownsArrows = target.matches('input, select, textarea');
    const ownsSpace = ownsArrows || target.matches('button, a[href], [role="button"]');
    const key = event.key.toLowerCase();
    const actions: Record<string, () => void> = {
      k: () => this.toggle(),
      j: () => this.seek(this.currentTime() - 10),
      l: () => this.seek(this.currentTime() + 10),
      m: () => this.setMuted(!this.muted()),
      c: () => this.hasCaptions() && this.captions.update((c) => !c),
      f: () => !this.isAudio() && this.toggleFullscreen(),
    };
    let action: (() => void) | undefined = event.shiftKey ? { n: () => this.next(), p: () => this.previous() }[key] : actions[key];
    if (!action && !ownsSpace && event.key === ' ') action = () => this.toggle();
    if (!action && !ownsArrows) {
      action = {
        ArrowLeft: () => this.seek(this.currentTime() - 5),
        ArrowRight: () => this.seek(this.currentTime() + 5),
        ArrowUp: () => this.setVolume(this.volume() + 0.1),
        ArrowDown: () => this.setVolume(this.volume() - 0.1),
      }[event.key];
    }
    if (action && !(this.isEmbed() && !this.embedFrame)) {
      event.preventDefault();
      action();
    }
  }

  // ---------------------------------------------------------------- Vidéos hébergées (YouTube, Vimeo)

  /** Charge le lecteur de l'hébergeur (après consentement) : iframe créée nœud par nœud, URL construite par l'identifiant. */
  /** Clic sur « Lire la vidéo » : consentement pour cet hébergeur, puis chargement. */
  protected acceptEmbed(): void {
    const provider = this.resolved()?.provider;
    if (provider) this.consented.add(provider);
    this.loadEmbed(true);
  }

  protected loadEmbed(autoplay: boolean): void {
    const resolved = this.resolved();
    const container = this.embedHostRef()?.nativeElement;
    const url = resolved ? mediaEmbedUrl(resolved, { autoplay, origin: this.document.location?.origin }) : null;
    if (!resolved || !container || !url) return;
    this.removeEmbed();
    const frame = this.renderer.createElement('iframe') as HTMLIFrameElement;
    this.renderer.setAttribute(frame, 'title', `Lecteur ${this.providerName()} : ${this.current()?.title ?? ''}`);
    this.renderer.setAttribute(frame, 'allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    this.renderer.setAttribute(frame, 'referrerpolicy', 'strict-origin-when-cross-origin');
    this.renderer.setAttribute(frame, 'class', 'ui-mp__iframe');
    this.renderer.listen(frame, 'load', () => this.embedHandshake());
    this.renderer.setAttribute(frame, 'src', url);
    this.renderer.appendChild(container, frame);
    this.embedFrame = frame;
    this.embedLoaded.set(true);
    if (autoplay) this.hub.started(this, this.exclusive());
  }

  private removeEmbed(): void {
    this.embedFrame?.remove();
    this.embedFrame = null;
  }

  private post(message: unknown): void {
    const origin = this.resolved()?.origin;
    if (this.embedFrame?.contentWindow && origin) this.embedFrame.contentWindow.postMessage(JSON.stringify(message), origin);
  }

  /** Abonnement aux événements du lecteur intégré. */
  private embedHandshake(): void {
    if (this.resolved()?.provider === 'youtube') {
      this.post({ event: 'listening', id: this.baseId, channel: 'widget' });
    } else {
      for (const value of ['play', 'pause', 'ended', 'timeupdate']) this.post({ method: 'addEventListener', value });
    }
  }

  private embedCommand(command: 'play' | 'pause' | 'seek' | 'mute' | 'unmute' | 'volume', value?: number): void {
    if (this.resolved()?.provider === 'youtube') {
      const calls = {
        play: ['playVideo', []],
        pause: ['pauseVideo', []],
        seek: ['seekTo', [value, true]],
        mute: ['mute', []],
        unmute: ['unMute', []],
        volume: ['setVolume', [Math.round((value ?? 1) * 100)]],
      } as const;
      const [func, args] = calls[command];
      this.post({ event: 'command', func, args, id: this.baseId, channel: 'widget' });
    } else {
      const calls = {
        play: { method: 'play' },
        pause: { method: 'pause' },
        seek: { method: 'setCurrentTime', value },
        mute: { method: 'setVolume', value: 0 },
        unmute: { method: 'setVolume', value: this.volume() },
        volume: { method: 'setVolume', value },
      };
      this.post(calls[command]);
    }
  }

  /** Messages du lecteur intégré : origine et fenêtre vérifiées, contenu analysé sans `eval`. */
  private onEmbedMessage(event: MessageEvent): void {
    const resolved = this.resolved();
    if (!this.embedFrame || !resolved?.origin || event.origin !== resolved.origin || event.source !== this.embedFrame.contentWindow) return;
    let data: Record<string, unknown>;
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }
    if (!data || typeof data !== 'object') return;
    if (resolved.provider === 'youtube') {
      const info = (data['info'] ?? {}) as Record<string, unknown>;
      const state = data['event'] === 'onStateChange' ? data['info'] : info['playerState'];
      if (typeof info['currentTime'] === 'number') this.currentTime.set(info['currentTime']);
      if (typeof info['duration'] === 'number' && info['duration'] > 0) this.duration.set(info['duration']);
      if (typeof info['muted'] === 'boolean') this.muted.set(info['muted']);
      if (typeof state === 'number') this.embedState(state === 1 ? 'play' : state === 0 ? 'ended' : state === 2 ? 'pause' : null);
    } else {
      const payload = (data['data'] ?? {}) as Record<string, unknown>;
      if (data['event'] === 'ready') this.embedHandshake();
      if (typeof payload['seconds'] === 'number') this.currentTime.set(payload['seconds']);
      if (typeof payload['duration'] === 'number') this.duration.set(payload['duration']);
      if (data['event'] === 'play' || data['event'] === 'pause' || data['event'] === 'ended') this.embedState(data['event']);
    }
  }

  private embedState(state: 'play' | 'pause' | 'ended' | null): void {
    if (!state) return;
    const playing = state === 'play';
    if (playing !== this.playing()) {
      this.playing.set(playing);
      this.playingChange.emit(playing);
    }
    if (playing) this.hub.started(this, this.exclusive());
    if (state === 'ended') this.onEnded();
  }

  // ---------------------------------------------------------------- Commandes système (Media Session)

  private updateMediaSession(): void {
    const session = this.document.defaultView?.navigator.mediaSession;
    const current = this.current();
    const MediaMetadataCtor = this.document.defaultView?.MediaMetadata;
    if (!session || !current || !MediaMetadataCtor || (this.hub.active() !== this && !this.playing())) return;
    session.metadata = new MediaMetadataCtor({
      title: current.title,
      artist: current.artist ?? '',
      album: current.album ?? '',
      artwork: current.artwork ? [{ src: current.artwork }] : [],
    });
    const handlers: [MediaSessionAction, (() => void) | null][] = [
      ['play', () => this.play()],
      ['pause', () => this.pause()],
      ['previoustrack', this.hasPrevious() ? () => this.previous() : null],
      ['nexttrack', this.hasNext() ? () => this.next() : null],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // action non prise en charge par le navigateur
      }
    }
  }
}
