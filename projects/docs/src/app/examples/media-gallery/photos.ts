import { UiGalleryItem } from 'ic-angular-uikit';

export const PHOTOS: UiGalleryItem[] = [
  { src: 'demo/mountains.svg', alt: 'Chaîne de montagnes enneigées sous un ciel violet', caption: 'Col du Galibier, au petit matin', width: 1600, height: 900 },
  { src: 'demo/forest.svg', alt: 'Forêt de conifères dans la brume', caption: 'Forêt de Chartreuse', width: 1600, height: 900 },
  { src: 'demo/media/voyage.webm', kind: 'video', alt: 'Voyage — court métrage', thumbnail: 'demo/media/voyage-poster.svg', poster: 'demo/media/voyage-poster.svg', caption: 'Vidéo avec sous-titres', width: 1280, height: 720, tracks: [{ src: 'demo/media/voyage.fr.vtt', srclang: 'fr', label: 'Français', default: true }] },
  { src: 'demo/ocean.svg', alt: 'Vagues de l’océan au coucher du soleil', caption: 'Côte sauvage, Quiberon', width: 1600, height: 900 },
  { src: 'demo/media/aurore.svg', alt: 'Pochette « Aurore » : soleil levant stylisé', caption: 'Pochette d’album', width: 600, height: 600 },
  { src: 'demo/city.svg', alt: 'Silhouette d’une ville la nuit', caption: 'Lyon, de nuit', width: 1600, height: 900 },
  { src: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', alt: 'Big Buck Bunny (YouTube)', caption: 'Vidéo YouTube : chargée seulement après votre accord' },
  { src: 'demo/media/nocturne.svg', alt: 'Pochette « Nocturne » : lune et étoiles', width: 600, height: 600 },
];
