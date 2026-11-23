import { UiTone } from '../core/types';

/** Une personne dans une unité. */
export interface UiOrgPerson {
  id: string;
  name: string;
  /** Fonction affichée sous le nom. */
  title?: string;
  /** Responsable de l'unité (affiché en tête de carte). */
  head?: boolean;
  /** URL de la photo (sinon initiales). Elle doit être autorisée par la CSP (`img-src`). */
  photo?: string;
  /** Données libres, disponibles dans les templates. */
  data?: unknown;
}

/**
 * Relation d'une unité avec son parent :
 * - `hierarchical` : sous le parent, trait plein (défaut) ;
 * - `attached` : rattachée sur le côté du parent (secrétariat, assistant, cellule d'appui) ;
 * - `transverse` : lien fonctionnel, placée sous le parent mais reliée en pointillés.
 */
export type UiOrgRelation = 'hierarchical' | 'attached' | 'transverse';

/** Une unité d'organisation. */
export interface UiOrgUnit {
  id: string;
  name: string;
  /** Unité parente (absente pour une racine). */
  parentId?: string | null;
  relation?: UiOrgRelation;
  /** Côté d'une unité rattachée (`attached`) ; par défaut, alternance gauche / droite. */
  side?: 'left' | 'right';
  /** Code ou sigle affiché à côté du nom (« DRH »). */
  code?: string;
  /** Couleur d'accent de la carte. */
  tone?: UiTone;
  people?: readonly UiOrgPerson[];
  /** Données libres, disponibles dans les templates. */
  data?: unknown;
}

/** Lien transverse libre entre deux unités (pointillés), ex. relation fonctionnelle ou projet commun. */
export interface UiOrgLink {
  from: string;
  to: string;
  label?: string;
}

/** Nœud calculé de l'organigramme. */
export interface UiOrgNode {
  unit: UiOrgUnit;
  depth: number;
  /** Enfants hiérarchiques et transverses, sous l'unité. */
  children: UiOrgNode[];
  /** Unités rattachées, de part et d'autre du trait vertical. */
  staffLeft: UiOrgNode[];
  staffRight: UiOrgNode[];
  /** Nombre total d'unités descendantes (pour « Déplier (12) »). */
  descendants: number;
}

/**
 * Construit l'arbre à partir d'une liste plate d'unités. Les parents inconnus et les cycles sont ignorés
 * (l'unité devient une racine) et signalés dans `warnings`.
 */
export function buildOrgTree(units: readonly UiOrgUnit[]): { roots: UiOrgNode[]; warnings: string[] } {
  const warnings: string[] = [];
  const byId = new Map<string, UiOrgUnit>();
  for (const unit of units) {
    if (byId.has(unit.id)) warnings.push(`Identifiant en double : « ${unit.id} ».`);
    byId.set(unit.id, unit);
  }
  const parentOf = (unit: UiOrgUnit): string | null => {
    const parent = unit.parentId ?? null;
    if (parent === null) return null;
    if (!byId.has(parent)) {
      warnings.push(`Parent inconnu « ${parent} » pour « ${unit.id} » : affichée comme racine.`);
      return null;
    }
    // Détection de cycle : on remonte la chaîne des parents.
    const seen = new Set([unit.id]);
    let current: string | null = parent;
    while (current) {
      if (seen.has(current)) {
        warnings.push(`Cycle détecté autour de « ${unit.id} » : affichée comme racine.`);
        return null;
      }
      seen.add(current);
      current = byId.get(current)?.parentId ?? null;
      if (current && !byId.has(current)) break;
    }
    return parent;
  };

  const childrenOf = new Map<string | null, UiOrgUnit[]>();
  for (const unit of byId.values()) {
    const parent = parentOf(unit);
    const list = childrenOf.get(parent) ?? [];
    list.push(unit);
    childrenOf.set(parent, list);
  }

  const build = (unit: UiOrgUnit, depth: number): UiOrgNode => {
    const node: UiOrgNode = { unit, depth, children: [], staffLeft: [], staffRight: [], descendants: 0 };
    let alternate = 0;
    for (const child of childrenOf.get(unit.id) ?? []) {
      const childNode = build(child, depth + 1);
      node.descendants += 1 + childNode.descendants;
      if ((child.relation ?? 'hierarchical') === 'attached') {
        const side = child.side ?? (alternate++ % 2 === 0 ? 'left' : 'right');
        (side === 'left' ? node.staffLeft : node.staffRight).push(childNode);
      } else {
        node.children.push(childNode);
      }
    }
    return node;
  };

  return { roots: (childrenOf.get(null) ?? []).map((unit) => build(unit, 0)), warnings };
}

/** Initiales d'un nom (« Ada Lovelace » → « AL »). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
