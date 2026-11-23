import { API } from '../generated/api';
import { ApiGroup } from './doc-types';

/** Dossiers de la librairie documentés dans les guides plutôt que comme composants. */
const GUIDE_SLUGS = new Set(['core', 'validation']);

/** Pages de composants. */
export const COMPONENT_GROUPS = API.filter((group) => !GUIDE_SLUGS.has(group.slug));
export const CORE_GROUP = API.find((group) => group.slug === 'core');
export const VALIDATION_GROUP = API.find((group) => group.slug === 'validation');

/** Ordre d'affichage des catégories (les catégories inconnues suivent, par ordre alphabétique). */
const CATEGORY_ORDER = ['Mise en page', 'Actions', 'Formulaires', 'Navigation', 'Affichage', 'Retours & superpositions'];

export interface NavItem {
  title: string;
  link: string[];
  /** Texte de recherche : titre, catégorie, sélecteurs, description. */
  keywords: string;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

function componentItem(group: ApiGroup): NavItem {
  const selectors = group.entries.map((e) => `${e.name} ${e.selector ?? ''}`).join(' ');
  return {
    title: group.title,
    link: ['/components', group.slug],
    keywords: `${group.title} ${group.category} ${selectors} ${group.description}`,
  };
}

/** Composants regroupés par catégorie, triés. */
export const COMPONENT_SECTIONS: NavSection[] = (() => {
  const byCategory = new Map<string, ApiGroup[]>();
  for (const group of COMPONENT_GROUPS) {
    const list = byCategory.get(group.category) ?? [];
    list.push(group);
    byCategory.set(group.category, list);
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...byCategory.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([title, groups]) => ({
      title,
      items: groups.sort((a, b) => a.title.localeCompare(b.title)).map(componentItem),
    }));
})();

/** Menu complet : guides puis composants par catégorie. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Guide',
    items: [
      { title: 'Prise en main', link: ['/'], keywords: 'prise en main installation démarrage getting started icônes', exact: true },
      { title: 'Thèmes', link: ['/theming'], keywords: 'thèmes light dark sombre clair jetons tokens couleurs theming' },
      { title: 'Validation', link: ['/validation'], keywords: 'validation formulaires erreurs messages validators' },
      { title: 'Accessibilité', link: ['/accessibility'], keywords: 'accessibilité a11y wcag contraste clavier conception universelle' },
    ],
  },
  ...COMPONENT_SECTIONS,
];

/** Normalise pour une recherche insensible à la casse et aux accents. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
