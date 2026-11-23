import {
  UiDashboardItem,
  clampItem,
  compactLayout,
  findFreeSpot,
  itemsOverlap,
  moveItem,
  resolveLayout,
  sanitizeDashboardLayout,
} from './dashboard-layout';

const item = (id: string, x: number, y: number, w: number, h: number, type = 'kpi'): UiDashboardItem => ({ id, type, x, y, w, h });
const pos = (items: UiDashboardItem[]) => Object.fromEntries(items.map((i) => [i.id, `${i.x},${i.y} ${i.w}x${i.h}`]));

describe('dashboard-layout', () => {
  it('chevauchement', () => {
    expect(itemsOverlap(item('a', 0, 0, 2, 2), item('b', 1, 1, 2, 2))).toBe(true);
    expect(itemsOverlap(item('a', 0, 0, 2, 2), item('b', 2, 0, 2, 2))).toBe(false);
  });

  it('bornes : largeur, hauteur, colonne, valeurs non finies', () => {
    expect(pos([clampItem(item('a', 10, -3, 5, 0), 12)])).toEqual({ a: '7,0 5x1' });
    expect(pos([clampItem(item('a', 0, 0, 1, 9), 12, { minW: 2, maxH: 4 })])).toEqual({ a: '0,0 2x4' });
    expect(pos([clampItem(item('a', NaN, 1.6, 30, 2), 12)])).toEqual({ a: '0,2 12x2' });
  });

  it('déplacer pousse les widgets recouverts vers le bas, puis tasse', () => {
    const layout = [item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2), item('c', 4, 2, 4, 2)];
    const moved = moveItem(layout, 'a', { x: 4, y: 0 }, 12);
    expect(pos(moved)).toEqual({ a: '4,0 4x2', b: '4,2 4x2', c: '4,4 4x2' });
    expect(moved.some((m, i) => moved.some((n, j) => i !== j && itemsOverlap(m, n)))).toBe(false);
  });

  it('agrandir pousse les voisins ; le tassement remonte les trous', () => {
    const layout = [item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2), item('c', 0, 2, 6, 2)];
    expect(pos(moveItem(layout, 'a', { w: 8 }, 12))).toEqual({ a: '0,0 8x2', b: '6,2 6x2', c: '0,2 6x2' });
    expect(pos(resolveLayout([item('a', 0, 0, 2, 2), item('b', 0, 1, 2, 2)], null))).toEqual({ a: '0,0 2x2', b: '0,2 2x2' });
    expect(pos(compactLayout([item('a', 0, 5, 3, 2), item('b', 3, 3, 3, 1)]))).toEqual({ a: '0,0 3x2', b: '3,0 3x1' });
  });

  it('première place libre', () => {
    const layout = [item('a', 0, 0, 6, 2), item('b', 6, 0, 4, 1)];
    expect(findFreeSpot(layout, 2, 1, 12)).toEqual({ x: 10, y: 0 });
    expect(findFreeSpot(layout, 6, 2, 12)).toEqual({ x: 6, y: 1 });
    expect(findFreeSpot(layout, 12, 1, 12)).toEqual({ x: 0, y: 2 });
  });

  it('validation des données externes', () => {
    const raw = {
      version: 1,
      items: [
        item('ok', 0, 0, 3, 2),
        { ...item('trop-large', 11, 0, 9, 2), config: { a: 1 }, title: '  Mon titre  ' },
        item('inconnu', 0, 0, 2, 2, 'hack'),
        item('ok', 0, 0, 2, 2),
        { id: '../x', type: 'kpi', x: 0, y: 0, w: 1, h: 1 },
        { id: 'pas-de-nombre', type: 'kpi', x: '0', y: 0, w: 1, h: 1 },
        { ...item('config-tableau', 0, 4, 2, 2), config: [1, 2] },
        'texte',
      ],
    };
    const items = sanitizeDashboardLayout(raw, { columns: 12, types: [{ type: 'kpi', maxW: 6 }] });
    expect(items.map((i) => i.id)).toEqual(['ok', 'trop-large', 'config-tableau']);
    const wide = items.find((i) => i.id === 'trop-large') as UiDashboardItem;
    expect(pos([wide])).toEqual({ 'trop-large': '6,0 6x2' });
    expect(wide.title).toBe('Mon titre');
    expect(wide.config).toEqual({ a: 1 });
    expect(items.find((i) => i.id === 'config-tableau')?.config).toBeUndefined();
    expect(sanitizeDashboardLayout('nimporte', { columns: 12, types: {} })).toEqual([]);
    expect(sanitizeDashboardLayout(Array.from({ length: 80 }, (_, i) => item(`i${i}`, 0, i, 1, 1)), { columns: 12, types: { kpi: {} }, maxItems: 10 }).length).toBe(10);
  });
});
