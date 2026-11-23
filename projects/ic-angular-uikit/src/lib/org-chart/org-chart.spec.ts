import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiOrgChart, UiOrgPersonSelect } from './org-chart';
import { UiOrgLink, UiOrgUnit, buildOrgTree, initials } from './org-model';

const UNITS: UiOrgUnit[] = [
  { id: 'dg', name: 'Direction', people: [{ id: 'p1', name: 'Ada Lovelace', head: true }] },
  { id: 'sec', name: 'Secrétariat', parentId: 'dg', relation: 'attached' },
  { id: 'cab', name: 'Cabinet', parentId: 'dg', relation: 'attached' },
  { id: 'rh', name: 'RH', parentId: 'dg', people: ['A', 'B', 'C', 'D', 'E', 'F'].map((n, i) => ({ id: 'm' + i, name: n + ' Martin' })) },
  { id: 'paie', name: 'Paie', parentId: 'rh' },
  { id: 'qual', name: 'Qualité', parentId: 'dg', relation: 'transverse' },
];
const LINKS: UiOrgLink[] = [{ from: 'qual', to: 'paie', label: 'Audit' }];

describe('buildOrgTree', () => {
  it('range enfants hiérarchiques / transverses et rattachés (alternance gauche / droite)', () => {
    const { roots, warnings } = buildOrgTree(UNITS);
    expect(warnings).toEqual([]);
    const dg = roots[0];
    expect(dg.children.map((n) => n.unit.id)).toEqual(['rh', 'qual']);
    expect(dg.staffLeft.map((n) => n.unit.id)).toEqual(['sec']);
    expect(dg.staffRight.map((n) => n.unit.id)).toEqual(['cab']);
    expect(dg.descendants).toBe(5);
  });

  it('signale parents inconnus et cycles sans boucler', () => {
    const { roots, warnings } = buildOrgTree([
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'zzz' },
    ]);
    expect(roots.length).toBeGreaterThanOrEqual(2);
    expect(warnings.some((w) => w.includes('Cycle'))).toBe(true);
    expect(warnings.some((w) => w.includes('Parent inconnu'))).toBe(true);
  });

  it('calcule les initiales', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Tim Berners-Lee')).toBe('TB');
    expect(initials('Zoé')).toBe('ZO');
  });
});

@Component({
  imports: [UiOrgChart],
  template: `<ui-org-chart [units]="units" [links]="links" [layout]="layout()" [initialDepth]="depth()" peopleSelectable
    (unitSelect)="selected.push($event.id)" (personSelect)="people.push($event)" />`,
})
class Host {
  units = UNITS;
  links = LINKS;
  layout = signal<'tree' | 'list'>('tree');
  depth = signal(Infinity);
  selected: string[] = [];
  people: UiOrgPersonSelect[] = [];
}

describe('UiOrgChart', () => {
  function setup() {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const card = (id: string) => el.querySelector(`[data-org-unit="${id}"]`) as HTMLElement | null;
    return { fixture, el, card, host: fixture.componentInstance, warn };
  }

  it('affiche les unités en listes imbriquées, relations écrites en texte', () => {
    const { el, card } = setup();
    expect(el.querySelectorAll('[data-org-unit]').length).toBe(6);
    expect(card('sec')?.textContent).toContain('Rattaché');
    expect(card('qual')?.textContent).toContain('Fonctionnel');
    expect(card('qual')?.textContent).toContain('↔ Paie (Audit)');
    expect(card('sec')?.closest('ul')?.getAttribute('aria-label')).toBe('Rattachés à Direction');
    expect(card('dg')?.querySelector('.ui-org__person--head')?.textContent).toContain('Responsable');
  });

  it('limite les personnes affichées puis « + N autres »', () => {
    const { fixture, card } = setup();
    expect(card('rh')?.querySelectorAll('.ui-org__person').length).toBe(4);
    const more = card('rh')?.querySelector('.ui-org__more') as HTMLButtonElement;
    expect(more.textContent).toContain('+ 2 autres');
    more.click();
    fixture.detectChanges();
    expect(card('rh')?.querySelectorAll('.ui-org__person').length).toBe(6);
  });

  it('replie / déplie une unité (aria-expanded) et respecte initialDepth', () => {
    const { fixture, el, card, host } = setup();
    const toggle = card('rh')?.querySelector('.ui-org__toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(card('paie')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    host.depth.set(0);
    fixture.detectChanges();
    expect(el.querySelectorAll('[data-org-unit]').length).toBe(1);
    expect(card('dg')?.querySelector('.ui-org__toggle')?.getAttribute('aria-label')).toBe('Déplier Direction (5 unités)');
  });

  it('émet unitSelect et personSelect', () => {
    const { fixture, card, host } = setup();
    (card('rh')?.querySelector('.ui-org__name') as HTMLButtonElement).click();
    (card('dg')?.querySelector('button.ui-org__person-body') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.selected).toEqual(['rh']);
    expect(host.people[0].person.name).toBe('Ada Lovelace');
    expect(card('rh')?.classList).toContain('ui-org__card--selected');
  });

  it('présentation en liste', () => {
    const { fixture, el, host } = setup();
    host.layout.set('list');
    fixture.detectChanges();
    expect(el.querySelector('ui-org-chart')?.classList).toContain('ui-org--list');
  });
});
