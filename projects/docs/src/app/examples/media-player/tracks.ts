import { UiMediaSource } from 'ic-angular-uikit';

/**
 * Médias de démonstration, servis par le site (CSP `media-src` / `img-src 'self'`) : morceaux originaux
 * synthétisés pour la documentation, et une vidéo YouTube (lecteur de l'hébergeur, chargé au clic).
 */
export const MUSIC: UiMediaSource[] = [
  { src: 'demo/media/aurore.mp3', title: 'Aurore', artist: 'IC Ensemble', album: 'Démos', artwork: 'demo/media/aurore.svg' },
  { src: 'demo/media/nocturne.mp3', title: 'Nocturne', artist: 'IC Ensemble', album: 'Démos', artwork: 'demo/media/nocturne.svg' },
  { src: 'demo/media/neon.mp3', title: 'Néon', artist: 'IC Ensemble', album: 'Démos', artwork: 'demo/media/neon.svg' },
];

export const VIDEOS: UiMediaSource[] = [
  {
    src: 'demo/media/voyage.mp4',
    // WebM (VP9) d'abord, MP4 (H.264) en repli : chaque navigateur lit le premier format qu'il sait décoder.
    formats: [
      { src: 'demo/media/voyage.webm', type: 'video/webm' },
      { src: 'demo/media/voyage.mp4', type: 'video/mp4' },
    ],
    title: 'Voyage (vidéo locale sous-titrée)',
    artist: 'IC Angular UiKit',
    artwork: 'demo/media/voyage-poster.svg',
    tracks: [
      { src: 'demo/media/voyage.fr.vtt', srclang: 'fr', label: 'Français', default: true },
      { src: 'demo/media/voyage.en.vtt', srclang: 'en', label: 'English' },
    ],
  },
  {
    src: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    title: 'Big Buck Bunny (YouTube)',
    artist: 'Blender Foundation',
  },
];
