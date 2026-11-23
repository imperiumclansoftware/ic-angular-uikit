/** Piste de sous-titres ou de description (WebVTT, même origine que la page). */
export interface UiMediaTextTrack {
  /** URL du fichier `.vtt`. */
  src: string;
  /** Langue (`fr`, `en`…). */
  srclang: string;
  /** Nom affiché dans le choix des sous-titres. */
  label: string;
  /** Type : sous-titres (défaut), sous-titres pour sourds et malentendants, ou description. */
  kind?: 'subtitles' | 'captions' | 'descriptions';
  /** Piste activée par défaut. */
  default?: boolean;
}

/** Un média à lire : fichier audio / vidéo, ou vidéo YouTube / Vimeo. */
export interface UiMediaSource {
  /** URL d'un fichier (`.mp3`, `.ogg`, `.wav`, `.mp4`, `.webm`…) ou d'une page YouTube / Vimeo. */
  src: string;
  /** Titre (lu par les lecteurs d'écran, affiché dans le lecteur et le mini-lecteur). */
  title: string;
  /** Artiste, auteur ou sous-titre. */
  artist?: string;
  /** Album ou collection. */
  album?: string;
  /** Image (pochette, affiche) : servie par votre site (CSP `img-src 'self'`). */
  artwork?: string;
  /** Force le type si l'URL ne permet pas de le deviner (pas d'extension). */
  type?: 'audio' | 'video';
  /** Sous-titres et descriptions (fichiers uniquement). */
  tracks?: readonly UiMediaTextTrack[];
  /**
   * Formats équivalents, du préféré au moins bon (`<source>`) : le navigateur lit le premier qu'il sait décoder.
   * Ex. `[{ src: 'film.webm', type: 'video/webm' }, { src: 'film.mp4', type: 'video/mp4' }]` ; `src` reste le défaut.
   */
  formats?: readonly { src: string; type: string }[];
}

/** Hébergeur d'un média. */
export type UiMediaProvider = 'file' | 'youtube' | 'vimeo';

/** Source analysée. */
export interface UiResolvedMedia {
  provider: UiMediaProvider;
  kind: 'audio' | 'video';
  /** Identifiant chez l'hébergeur (YouTube : 11 caractères, Vimeo : numérique). */
  id?: string;
  /** Domaine de l'hébergeur (origine attendue des messages du lecteur intégré). */
  origin?: string;
  /** Instant de départ en secondes (`?t=90`). */
  start?: number;
}

const AUDIO_EXT = /\.(mp3|m4a|aac|oga|ogg|opus|wav|flac|weba)(?:$|[?#])/i;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function parseStart(value: string | null): number | undefined {
  if (!value) return undefined;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(value);
  if (!match) return undefined;
  const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return seconds > 0 ? seconds : undefined;
}

/**
 * Reconnaît l'hébergeur d'une source : YouTube (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`), Vimeo (`vimeo.com/123`)
 * ou fichier (audio si l'extension est celle d'un format audio, ou `type: 'audio'`).
 * Les identifiants sont validés : seuls eux servent à construire l'adresse du lecteur intégré.
 */
export function resolveMediaSource(source: Pick<UiMediaSource, 'src' | 'type'>): UiResolvedMedia {
  let url: URL | null;
  try {
    url = new URL(source.src, 'https://local.invalid/');
  } catch {
    url = null;
  }
  const host = url?.hostname.replace(/^(www|m|music)\./, '') ?? '';
  if (url && (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be')) {
    const fromPath = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(url.pathname)?.[1];
    const id = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : (url.searchParams.get('v') ?? fromPath ?? '');
    if (YT_ID.test(id)) {
      return { provider: 'youtube', kind: 'video', id, origin: 'https://www.youtube-nocookie.com', start: parseStart(url.searchParams.get('t') ?? url.searchParams.get('start')) };
    }
  }
  if (url && (host === 'vimeo.com' || host === 'player.vimeo.com')) {
    const id = /\/(?:video\/)?(\d{4,12})(?:$|[/?#])/.exec(url.pathname)?.[1];
    if (id) return { provider: 'vimeo', kind: 'video', id, origin: 'https://player.vimeo.com' };
  }
  const kind = source.type ?? (AUDIO_EXT.test(source.src) ? 'audio' : 'video');
  return { provider: 'file', kind };
}

/** Adresse du lecteur intégré, construite uniquement à partir de l'identifiant validé (jamais de l'URL fournie). */
export function mediaEmbedUrl(media: UiResolvedMedia, options: { autoplay?: boolean; origin?: string } = {}): string | null {
  if (media.provider === 'youtube' && media.id && YT_ID.test(media.id)) {
    const params = new URLSearchParams({ enablejsapi: '1', rel: '0', playsinline: '1', modestbranding: '1' });
    if (options.autoplay) params.set('autoplay', '1');
    if (options.origin) params.set('origin', options.origin);
    if (media.start) params.set('start', String(Math.floor(media.start)));
    return `https://www.youtube-nocookie.com/embed/${media.id}?${params}`;
  }
  if (media.provider === 'vimeo' && media.id && /^\d+$/.test(media.id)) {
    const params = new URLSearchParams({ dnt: '1', api: '1', title: '0', byline: '0' });
    if (options.autoplay) params.set('autoplay', '1');
    return `https://player.vimeo.com/video/${media.id}?${params}`;
  }
  return null;
}

/** Durée lisible : `1:05`, `1:02:09`, `--:--` si inconnue. */
export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Durée pour les lecteurs d'écran : « 1 minute 5 secondes ». */
export function speakMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'durée inconnue';
  const total = Math.floor(seconds);
  const parts: string[] = [];
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) parts.push(`${h} heure${h > 1 ? 's' : ''}`);
  if (m) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (s || !parts.length) parts.push(`${s} seconde${s > 1 ? 's' : ''}`);
  return parts.join(' ');
}
