import { UiOrgLink, UiOrgUnit } from 'ic-angular-uikit';

/** Données d'exemple : une liste plate, telle que la renverrait une API. */
export const ORG_UNITS: UiOrgUnit[] = [
  {
    id: 'dg',
    name: 'Direction générale',
    code: 'DG',
    people: [{ id: 'p1', name: 'Ada Lovelace', title: 'Directrice générale', head: true }],
  },
  {
    id: 'sec',
    name: 'Secrétariat de direction',
    parentId: 'dg',
    relation: 'attached',
    tone: 'neutral',
    people: [
      { id: 'p2', name: 'Claire Martin', title: 'Assistante de direction', head: true },
      { id: 'p3', name: 'Hugo Bernard', title: 'Assistant' },
    ],
  },
  {
    id: 'cab',
    name: 'Cabinet',
    parentId: 'dg',
    relation: 'attached',
    tone: 'neutral',
    people: [{ id: 'p4', name: 'Léa Petit', title: 'Cheffe de cabinet', head: true }],
  },
  {
    id: 'drh',
    name: 'Ressources humaines',
    code: 'DRH',
    parentId: 'dg',
    tone: 'success',
    people: [
      { id: 'p5', name: 'Grace Hopper', title: 'DRH', head: true },
      { id: 'p6', name: 'Paul Durand', title: 'Chargé de recrutement' },
      { id: 'p7', name: 'Inès Moreau', title: 'Gestionnaire paie' },
    ],
  },
  {
    id: 'daf',
    name: 'Finances',
    code: 'DAF',
    parentId: 'dg',
    tone: 'warning',
    people: [
      { id: 'p8', name: 'Alan Turing', title: 'Directeur financier', head: true },
      { id: 'p9', name: 'Sarah Lefèvre', title: 'Contrôleuse de gestion' },
    ],
  },
  {
    id: 'achats',
    name: 'Achats',
    parentId: 'daf',
    people: [
      { id: 'p10', name: 'Marc Roux', title: 'Responsable achats', head: true },
      { id: 'p11', name: 'Julie Fournier', title: 'Acheteuse' },
    ],
  },
  {
    id: 'dt',
    name: 'Direction technique',
    code: 'DT',
    parentId: 'dg',
    people: [{ id: 'p12', name: 'Margaret Hamilton', title: 'Directrice technique', head: true }],
  },
  {
    id: 'dt-sec',
    name: 'Assistanat technique',
    parentId: 'dt',
    relation: 'attached',
    side: 'right',
    tone: 'neutral',
    people: [{ id: 'p13', name: 'Nora Lambert', title: 'Assistante', head: true }],
  },
  {
    id: 'prod',
    name: 'Production',
    parentId: 'dt',
    people: [
      { id: 'p14', name: 'Linus Torvalds', title: 'Chef de production', head: true },
      { id: 'p15', name: 'Emma Girard', title: 'Technicienne' },
      { id: 'p16', name: 'Lucas Bonnet', title: 'Technicien' },
      { id: 'p17', name: 'Chloé Dupont', title: 'Technicienne' },
      { id: 'p18', name: 'Nathan Morel', title: 'Technicien' },
      { id: 'p19', name: 'Zoé Laurent', title: 'Apprentie' },
    ],
  },
  {
    id: 'rd',
    name: 'Recherche & développement',
    code: 'R&D',
    parentId: 'dt',
    people: [
      { id: 'p20', name: 'Tim Berners-Lee', title: 'Responsable R&D', head: true },
      { id: 'p21', name: 'Katherine Johnson', title: 'Ingénieure' },
    ],
  },
  {
    id: 'qual',
    name: 'Mission qualité',
    parentId: 'dg',
    relation: 'transverse',
    tone: 'danger',
    people: [{ id: 'p22', name: 'Edsger Dijkstra', title: 'Responsable qualité', head: true }],
  },
];

/** Liens transverses : la mission qualité travaille avec la production et les achats. */
export const ORG_LINKS: UiOrgLink[] = [
  { from: 'qual', to: 'prod', label: 'Audits' },
  { from: 'qual', to: 'achats', label: 'Fournisseurs' },
];
