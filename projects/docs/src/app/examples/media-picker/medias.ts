import { uiMemoryFileSource } from 'ic-angular-uikit';

/** Médiathèque de démonstration (en mémoire). */
export const createMediaLibrary = () =>
  uiMemoryFileSource(
    [
      { name: 'Paysages', children: [
        { name: 'montagnes.svg', mimeType: 'image/svg+xml', url: 'demo/mountains.svg', width: 1600, height: 900, alt: 'Montagnes enneigées sous un ciel violet' },
        { name: 'foret.svg', mimeType: 'image/svg+xml', url: 'demo/forest.svg', width: 1600, height: 900, alt: 'Forêt de conifères dans la brume' },
        { name: 'ocean.svg', mimeType: 'image/svg+xml', url: 'demo/ocean.svg', width: 1600, height: 900 },
      ] },
      { name: 'voyage.webm', mimeType: 'video/webm', url: 'demo/media/voyage.webm', thumbnailUrl: 'demo/media/voyage-poster.svg', width: 1280, height: 720 },
      { name: 'ville.svg', mimeType: 'image/svg+xml', url: 'demo/city.svg', width: 1600, height: 900, alt: 'Silhouette d’une ville la nuit' },
      { name: 'contrat.pdf', mimeType: 'application/pdf' },
    ],
    { latency: 200 },
  );
