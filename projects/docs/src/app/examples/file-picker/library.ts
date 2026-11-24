import { uiMemoryFileSource } from 'ic-angular-uikit';

/** Bibliothèque de démonstration (en mémoire : les fichiers envoyés restent dans la page). */
export const createPickerLibrary = () =>
  uiMemoryFileSource(
    [
      { name: 'Paysages', children: [
        { name: 'montagnes.svg', mimeType: 'image/svg+xml', url: 'demo/mountains.svg', size: 567 },
        { name: 'foret.svg', mimeType: 'image/svg+xml', url: 'demo/forest.svg', size: 593 },
        { name: 'ocean.svg', mimeType: 'image/svg+xml', url: 'demo/ocean.svg', size: 543 },
        { name: 'ville.svg', mimeType: 'image/svg+xml', url: 'demo/city.svg', size: 595 },
      ] },
      { name: 'Vidéos', children: [{ name: 'voyage.webm', mimeType: 'video/webm', url: 'demo/media/voyage.webm', thumbnailUrl: 'demo/media/voyage-poster.svg', size: 427256 }] },
      { name: 'aurore.svg', mimeType: 'image/svg+xml', url: 'demo/media/aurore.svg', size: 431 },
      { name: 'reglement-interieur.pdf', mimeType: 'application/pdf', size: 182_400 },
      { name: 'budget-2026.xlsx', size: 48_211 },
    ],
    { latency: 150 },
  );
