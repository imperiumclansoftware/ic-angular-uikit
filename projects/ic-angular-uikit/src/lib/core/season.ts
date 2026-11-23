/** Saison. */
export type UiSeason = 'winter' | 'spring' | 'summer' | 'autumn';

/** Noms français des saisons. */
export const UI_SEASON_LABELS: Record<UiSeason, string> = {
  winter: 'Hiver',
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
};

/**
 * Saison d'une date, d'après les dates astronomiques usuelles (printemps le 20 mars, été le 21 juin,
 * automne le 22 septembre, hiver le 21 décembre). Dans l'hémisphère sud, les saisons sont inversées.
 */
export function seasonOf(date: Date, hemisphere: 'north' | 'south' = 'north'): UiSeason {
  const day = (date.getMonth() + 1) * 100 + date.getDate(); // 3 mars → 303
  let season: UiSeason;
  if (day >= 1221 || day < 320) season = 'winter';
  else if (day < 621) season = 'spring';
  else if (day < 922) season = 'summer';
  else season = 'autumn';
  if (hemisphere === 'south') {
    const opposite: Record<UiSeason, UiSeason> = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' };
    season = opposite[season];
  }
  return season;
}
