import { seasonOf } from './season';

describe('seasonOf', () => {
  const d = (m: number, day: number) => new Date(2026, m - 1, day);
  it('utilise les dates astronomiques usuelles', () => {
    expect(seasonOf(d(3, 19))).toBe('winter');
    expect(seasonOf(d(3, 20))).toBe('spring');
    expect(seasonOf(d(6, 20))).toBe('spring');
    expect(seasonOf(d(6, 21))).toBe('summer');
    expect(seasonOf(d(9, 22))).toBe('autumn');
    expect(seasonOf(d(11, 19))).toBe('autumn');
    expect(seasonOf(d(12, 21))).toBe('winter');
    expect(seasonOf(d(1, 15))).toBe('winter');
  });
  it('inverse les saisons dans l’hémisphère sud', () => {
    expect(seasonOf(d(1, 15), 'south')).toBe('summer');
    expect(seasonOf(d(4, 10), 'south')).toBe('autumn');
  });
});
