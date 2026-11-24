import { uiMemoryFileSource } from 'ic-angular-uikit';

/** Médiathèque de l'article (en mémoire : les fichiers envoyés restent dans la page). */
export const createArticleMedia = () =>
  uiMemoryFileSource([
    { name: 'foret.svg', mimeType: 'image/svg+xml', url: 'demo/forest.svg', width: 1600, height: 900, alt: 'Forêt de conifères dans la brume' },
    { name: 'ocean.svg', mimeType: 'image/svg+xml', url: 'demo/ocean.svg', width: 1600, height: 900, alt: 'Vagues de l’océan au coucher du soleil' },
    { name: 'voyage.webm', mimeType: 'video/webm', url: 'demo/media/voyage.webm', thumbnailUrl: 'demo/media/voyage-poster.svg', width: 1280, height: 720 },
  ]);
