/** Branches d'Imperium Clan. */
export type UiImperiumBranch = 'joueurs' | 'developpeurs' | 'communicants' | 'cine';

/** Description d'une branche : libellés, couleur (jetons CSS) et icône (tracés SVG 24 × 24, trait 2 px). */
export interface UiImperiumBranchInfo {
  id: UiImperiumBranch;
  /** Nom complet. */
  label: string;
  /** Nom court (badges étroits). */
  short: string;
  /** Jeton de couleur des éléments graphiques. */
  color: string;
  /** Jeton de couleur du texte (≥ 4,5:1 sur fond sombre). */
  text: string;
  /** Jeton de couleur du texte posé sur la couleur pleine. */
  on: string;
  /** Tracés de l'icône. */
  icon: readonly string[];
}

/** Identité du clan. */
export const UI_IMPERIUM_CLAN = {
  name: 'Imperium Clan',
  motto: 'Façonner la légende, une victoire à la fois',
} as const;

/** Les quatre branches, dans l'ordre d'affichage. */
export const UI_IMPERIUM_BRANCHES: readonly UiImperiumBranchInfo[] = [
  {
    id: 'joueurs',
    label: 'Joueurs',
    short: 'Joueurs',
    color: 'var(--ui-branch-joueurs)',
    text: 'var(--ui-branch-joueurs-text)',
    on: 'var(--ui-branch-joueurs-on)',
    // Manette
    icon: ['M6 11h4M8 9v4', 'M15 12h.01M18 10h.01', 'M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 6.1A3 3 0 0 0 5.1 18c1 0 1.9-.5 2.4-1.3L9 15h6l1.5 1.7c.5.8 1.4 1.3 2.4 1.3a3 3 0 0 0 3-3.3l-.6-6.1A4 4 0 0 0 17.3 5Z'],
  },
  {
    id: 'developpeurs',
    label: 'Développeurs',
    short: 'Dév',
    color: 'var(--ui-branch-developpeurs)',
    text: 'var(--ui-branch-developpeurs-text)',
    on: 'var(--ui-branch-developpeurs-on)',
    // Chevrons de code
    icon: ['m8 7-5 5 5 5', 'm16 7 5 5-5 5', 'm14 4-4 16'],
  },
  {
    id: 'communicants',
    label: 'Communicants',
    short: 'Com',
    color: 'var(--ui-branch-communicants)',
    text: 'var(--ui-branch-communicants-text)',
    on: 'var(--ui-branch-communicants-on)',
    // Porte-voix
    icon: ['M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z', 'M15 9a4 4 0 0 1 0 6', 'M18 6a8 8 0 0 1 0 12'],
  },
  {
    id: 'cine',
    label: 'Ciné & séries',
    short: 'Ciné',
    color: 'var(--ui-branch-cine)',
    text: 'var(--ui-branch-cine-text)',
    on: 'var(--ui-branch-cine-on)',
    // Clap de cinéma
    icon: ['M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4Z', 'm4 11-.9-3.4a2 2 0 0 1 1.4-2.4l11.6-3.1a2 2 0 0 1 2.4 1.4l.6 2.2L4 11Z', 'm6.6 4.9 3.1 3.9M12.4 3.4l3.1 3.9'],
  },
];

/** Informations d'une branche. */
export function imperiumBranch(id: UiImperiumBranch): UiImperiumBranchInfo {
  return UI_IMPERIUM_BRANCHES.find((b) => b.id === id) ?? UI_IMPERIUM_BRANCHES[0];
}
