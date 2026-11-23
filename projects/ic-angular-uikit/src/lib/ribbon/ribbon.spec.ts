import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiCard } from '../card/card';
import { UiTable } from '../table/table';
import { UiRibbon, UiRibbonContainer } from './ribbon';

@Component({
  imports: [UiRibbon, UiRibbonContainer, UiCard, UiTable],
  template: `
    <ui-card><ui-ribbon id="r1" corner="bottom-left" tone="danger">Promo</ui-ribbon><p>Corps</p></ui-card>
    <ui-table [data]="[]" [columns]="[{ key: 'a', header: 'A' }]"><ui-ribbon id="r2">Bêta</ui-ribbon></ui-table>
    <div uiRibbonContainer id="box"><ui-ribbon id="r3" size="lg">Live</ui-ribbon></div>
  `,
})
class Host {}

describe('UiRibbon', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('applique coin, ton, taille et garde le texte lisible', () => {
    const el = setup();
    const r1 = el.querySelector('#r1') as HTMLElement;
    expect(r1.className).toContain('ui-ribbon--bottom-left');
    expect(r1.className).toContain('ui-ribbon--danger');
    expect(r1.textContent?.trim()).toBe('Promo');
    const r2 = el.querySelector('#r2') as HTMLElement;
    expect(r2.className).toContain('ui-ribbon--top-right');
    expect(r2.className).toContain('ui-ribbon--primary');
    expect((el.querySelector('#r3') as HTMLElement).className).toContain('ui-ribbon--lg');
  });

  it('se place hors du contenu de la carte et de la table', () => {
    const el = setup();
    const card = el.querySelector('ui-card') as HTMLElement;
    expect(el.querySelector('#r1')?.parentElement).toBe(card);
    expect(card.querySelector('.ui-card__body #r1')).toBeNull();
    expect(el.querySelector('#r2')?.parentElement).toBe(el.querySelector('ui-table'));
  });

  it('uiRibbonContainer rend l’élément positionné', () => {
    const el = setup();
    expect((el.querySelector('#box') as HTMLElement).style.position).toBe('relative');
  });
});
