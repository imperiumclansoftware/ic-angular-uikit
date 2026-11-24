import { UiMemoryFileNode, uiMemoryFileSource } from 'ic-angular-uikit';

const day = (d: number) => new Date(2026, 10, d, 9 + (d % 8), 15).toISOString();

/** Arborescence de démonstration (aucun fichier n'est envoyé : bibliothèque en mémoire). */
export const LIBRARY: UiMemoryFileNode[] = [
  {
    name: 'Images',
    modifiedAt: day(20),
    children: [
      { name: 'montagnes.svg', mimeType: 'image/svg+xml', url: 'demo/mountains.svg', size: 567, width: 1600, height: 900, modifiedAt: day(18), alt: 'Montagnes enneigées sous un ciel violet' },
      { name: 'foret.svg', mimeType: 'image/svg+xml', url: 'demo/forest.svg', size: 593, width: 1600, height: 900, modifiedAt: day(12), alt: 'Forêt de conifères dans la brume' },
      { name: 'ocean.svg', mimeType: 'image/svg+xml', url: 'demo/ocean.svg', size: 543, width: 1600, height: 900, modifiedAt: day(9), alt: 'Vagues de l’océan au coucher du soleil' },
      { name: 'ville.svg', mimeType: 'image/svg+xml', url: 'demo/city.svg', size: 595, width: 1600, height: 900, modifiedAt: day(3), alt: 'Silhouette d’une ville la nuit' },
      { name: 'Pochettes', modifiedAt: day(15), children: [
        { name: 'aurore.svg', mimeType: 'image/svg+xml', url: 'demo/media/aurore.svg', size: 431, width: 600, height: 600, modifiedAt: day(15) },
        { name: 'nocturne.svg', mimeType: 'image/svg+xml', url: 'demo/media/nocturne.svg', size: 685, width: 600, height: 600, modifiedAt: day(15) },
      ] },
    ],
  },
  {
    name: 'Vidéos',
    modifiedAt: day(19),
    children: [
      { name: 'voyage.webm', mimeType: 'video/webm', url: 'demo/media/voyage.webm', thumbnailUrl: 'demo/media/voyage-poster.svg', size: 427256, width: 1280, height: 720, modifiedAt: day(19) },
    ],
  },
  { name: 'Musique', modifiedAt: day(10), children: [{ name: 'aurore.mp3', mimeType: 'audio/mpeg', url: 'demo/media/aurore.mp3', size: 481260, modifiedAt: day(10) }] },
  { name: 'Documents', modifiedAt: day(21), children: [] },
  { name: 'budget-2026.xlsx', size: 48_211, modifiedAt: day(22) },
  { name: 'compte-rendu.pdf', mimeType: 'application/pdf', size: 182_400, modifiedAt: day(21) },
  { name: 'notes.md', mimeType: 'text/markdown', size: 2_048, modifiedAt: day(5) },
  { name: 'tableau-de-bord.svg', mimeType: 'image/svg+xml', url: 'demo/dashboard.svg', size: 1656, width: 640, height: 440, modifiedAt: day(17) },
];

/** Nouvelle bibliothèque modifiable (latence simulée pour voir les états de chargement). */
export const createLibrary = () => uiMemoryFileSource(LIBRARY, { latency: 250 });
