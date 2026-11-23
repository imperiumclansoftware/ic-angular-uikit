let nextId = 0;

/**
 * Génère un identifiant DOM unique et stable (compteur, pas d'aléatoire).
 * @internal
 */
export function uniqueId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}
