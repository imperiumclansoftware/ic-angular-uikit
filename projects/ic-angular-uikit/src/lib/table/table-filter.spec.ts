import { distinctOptions, isFilterActive, matchesFilter, matchesSearch, normalizeText, operatorArity, toDayKey } from './table-filter';

describe('table-filter', () => {
  it('normalise sans accents ni casse', () => {
    expect(normalizeText('  Élodie GRÂCE ')).toBe('elodie grace');
  });
  it('recherche : tous les mots, dans le désordre', () => {
    expect(matchesSearch('Ada Lovelace Admin Paris', 'paris ada')).toBe(true);
    expect(matchesSearch('Ada Lovelace Admin Paris', 'ada lyon')).toBe(false);
    expect(matchesSearch('Ada', '   ')).toBe(true);
  });
  it('filtres texte, select, nombre, booléen', () => {
    expect(matchesFilter({ type: 'text' }, 'Grâce Hopper', 'grace')).toBe(true);
    expect(matchesFilter({ type: 'select' }, 'Admin', 'Admin')).toBe(true);
    expect(matchesFilter({ type: 'select' }, 'Lecteur', 'Admin')).toBe(false);
    expect(matchesFilter({ type: 'select', options: [{ value: 2, label: 'Deux' }] }, 2, 2)).toBe(true);
    expect(matchesFilter({ type: 'number' }, 12, { min: 10, max: 20 })).toBe(true);
    expect(matchesFilter({ type: 'number' }, 25, { min: 10, max: 20 })).toBe(false);
    expect(matchesFilter({ type: 'number' }, 5, { min: null, max: 6 })).toBe(true);
    expect(matchesFilter({ type: 'boolean' }, false, false)).toBe(true);
    expect(matchesFilter({ type: 'boolean' }, true, false)).toBe(false);
  });
  it('filtre inactif : tout passe', () => {
    expect(isFilterActive('')).toBe(false);
    expect(isFilterActive({ min: null, max: null })).toBe(false);
    expect(isFilterActive(false)).toBe(true);
    expect(matchesFilter({ type: 'text' }, 'x', '')).toBe(true);
  });
  it('options distinctes triées', () => {
    expect(distinctOptions(['b', 'a', 'b', null, 'C']).map((o) => o.label)).toEqual(['a', 'b', 'C']);
  });
});


describe('filtres avancés', () => {
  const text = { type: 'text' as const, advanced: true };
  it('texte : commence par, finit par, égal, différent, ne contient pas (sans accents ni casse)', () => {
    expect(matchesFilter(text, 'Élodie Martin', { op: 'startsWith', value: 'elo' })).toBe(true);
    expect(matchesFilter(text, 'Élodie Martin', { op: 'startsWith', value: 'mar' })).toBe(false);
    expect(matchesFilter(text, 'Élodie Martin', { op: 'endsWith', value: 'TIN' })).toBe(true);
    expect(matchesFilter(text, 'Ada', { op: 'equals', value: 'ada' })).toBe(true);
    expect(matchesFilter(text, 'Ada', { op: 'notEquals', value: 'ada' })).toBe(false);
    expect(matchesFilter(text, 'Ada', { op: 'notContains', value: 'z' })).toBe(true);
  });
  it('vide / non vide, actifs sans valeur', () => {
    expect(isFilterActive({ op: 'empty' })).toBe(true);
    expect(isFilterActive({ op: 'startsWith', value: '' })).toBe(false);
    expect(matchesFilter(text, '  ', { op: 'empty' })).toBe(true);
    expect(matchesFilter(text, null, { op: 'notEmpty' })).toBe(false);
  });
  it('nombre : comparaisons et entre', () => {
    const n = { type: 'number' as const, advanced: true };
    expect(matchesFilter(n, 10, { op: 'gt', value: 9 })).toBe(true);
    expect(matchesFilter(n, 10, { op: 'gte', value: 10 })).toBe(true);
    expect(matchesFilter(n, 10, { op: 'lt', value: 10 })).toBe(false);
    expect(matchesFilter(n, 10, { op: 'neq', value: 10 })).toBe(false);
    expect(matchesFilter(n, 10, { op: 'between', value: 5, to: 10 })).toBe(true);
    expect(matchesFilter(n, null, { op: 'gt', value: 0 })).toBe(false);
  });
  it('dates : jour, avant, après, entre (bornes incluses), formats Date / ISO / timestamp', () => {
    const d = { type: 'date' as const };
    expect(toDayKey(new Date(2026, 10, 20, 23, 30))).toBe('2026-11-20');
    expect(toDayKey('2026-03-05T10:00:00')).toBe('2026-03-05');
    expect(matchesFilter(d, new Date(2026, 2, 5), { op: 'on', value: '2026-03-05' })).toBe(true);
    expect(matchesFilter(d, '2026-03-05', { op: 'before', value: '2026-03-05' })).toBe(false);
    expect(matchesFilter(d, '2026-03-04', { op: 'before', value: '2026-03-05' })).toBe(true);
    expect(matchesFilter(d, new Date(2026, 2, 6).getTime(), { op: 'after', value: '2026-03-05' })).toBe(true);
    expect(matchesFilter(d, '2026-03-10', { op: 'between', value: '2026-03-01', to: '2026-03-10' })).toBe(true);
    expect(matchesFilter(d, '2026-03-11', { op: 'between', value: '2026-03-01', to: '2026-03-10' })).toBe(false);
    expect(matchesFilter(d, 'pas une date', { op: 'between', value: '2026-03-01' })).toBe(false);
  });
  it('dates relatives à aujourd’hui', () => {
    const d = { type: 'date' as const, advanced: true };
    const now = new Date(2026, 10, 20, 9, 0); // 20 novembre 2026
    expect(matchesFilter(d, '2026-11-20', { op: 'today' }, now)).toBe(true);
    expect(matchesFilter(d, '2026-11-14', { op: 'last7' }, now)).toBe(true);
    expect(matchesFilter(d, '2026-11-13', { op: 'last7' }, now)).toBe(false);
    expect(matchesFilter(d, '2026-10-22', { op: 'last30' }, now)).toBe(true);
    expect(matchesFilter(d, '2026-11-01', { op: 'thisMonth' }, now)).toBe(true);
    expect(matchesFilter(d, '2026-10-31', { op: 'thisMonth' }, now)).toBe(false);
    expect(matchesFilter(d, '2026-01-01', { op: 'thisYear' }, now)).toBe(true);
    expect(matchesFilter(d, '2026-11-21', { op: 'last7' }, now)).toBe(false);
  });
  it('arité des opérateurs', () => {
    expect(operatorArity('between')).toBe(2);
    expect(operatorArity('startsWith')).toBe(1);
    expect(operatorArity('thisMonth')).toBe(0);
  });
});
