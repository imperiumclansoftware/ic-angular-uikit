export interface Photo {
  src: string;
  alt: string;
  title: string;
}

/** Illustrations de démonstration (servies par le site : CSP img-src 'self'). */
export const PHOTOS: Photo[] = [
  { src: 'demo/mountains.svg', alt: 'Chaîne de montagnes enneigées sous un ciel violet', title: 'Montagnes' },
  { src: 'demo/forest.svg', alt: 'Forêt de conifères dans la brume', title: 'Forêt' },
  { src: 'demo/ocean.svg', alt: 'Vagues de l’océan au coucher du soleil', title: 'Océan' },
  { src: 'demo/city.svg', alt: 'Silhouette d’une ville la nuit', title: 'Ville' },
];
