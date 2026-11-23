import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiTab, UiTabChange, UiTabs } from './tabs';

@Component({
  imports: [UiTabs, UiTab],
  template: `
    <ui-tabs [(selectedIndex)]="index" (tabChange)="changes.push($event)">
      <ui-tab label="A">Panneau A</ui-tab>
      <ui-tab label="B" disabled>Panneau B</ui-tab>
      <ui-tab label="C">Panneau C</ui-tab>
    </ui-tabs>
  `,
})
class Host {
  index = signal(0);
  changes: UiTabChange[] = [];
}

describe('UiTabs', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, tabs: () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role=tab]')) };
  }

  it('affiche uniquement le panneau actif', () => {
    const { el } = setup();
    expect(el.querySelector('[role=tabpanel]')?.textContent?.trim()).toBe('Panneau A');
  });

  it('saute les onglets désactivés au clavier et émet tabChange', () => {
    const { fixture, el, tabs } = setup();
    tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.index()).toBe(2);
    expect(fixture.componentInstance.changes[0]).toMatchObject({ index: 2, previousIndex: 0 });
    expect(el.querySelector('[role=tabpanel]')?.textContent?.trim()).toBe('Panneau C');
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
  });
});

@Component({
  imports: [UiTabs, UiTab],
  template: `
    <ui-tabs orientation="vertical" [(selectedIndex)]="index">
      <ui-tab label="Profil">P</ui-tab>
      <ui-tab label="Sécurité">S</ui-tab>
      <ui-tab label="Facturation">F</ui-tab>
    </ui-tabs>
  `,
})
class VerticalHost {
  index = signal(0);
}

describe('UiTabs vertical', () => {
  it('expose aria-orientation et navigue avec les flèches haut / bas', () => {
    const fixture = TestBed.createComponent(VerticalHost);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const list = el.querySelector('[role=tablist]') as HTMLElement;
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    expect(el.querySelector('ui-tabs')?.classList).toContain('ui-tabs--vertical');
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role=tab]'));
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.index()).toBe(1);
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.index()).toBe(0);
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.index()).toBe(2);
  });

  it('en horizontal, les flèches haut / bas ne changent pas d’onglet', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const tab = fixture.nativeElement.querySelector('[role=tab]') as HTMLButtonElement;
    tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.index()).toBe(0);
    expect(fixture.nativeElement.querySelector('[role=tablist]').getAttribute('aria-orientation')).toBe('horizontal');
  });
});

@Component({
  imports: [UiTabs, UiTab],
  template: `
    <ui-tabs appearance="line">
      <ui-tab label="Parent">
        <ui-tabs appearance="pills" class="inner">
          <ui-tab label="Enfant A">A</ui-tab>
          <ui-tab label="Enfant B">B</ui-tab>
        </ui-tabs>
      </ui-tab>
    </ui-tabs>
  `,
  styleUrl: './tabs.css',
})
class NestedHost {}

describe('UiTabs imbriqués', () => {
  it('les onglets internes ne reçoivent pas le style « line » du parent', () => {
    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    const innerActive = fixture.nativeElement.querySelector('.inner .ui-tabs__tab--active') as HTMLElement;
    expect(getComputedStyle(innerActive).borderBottomStyle).not.toBe('solid');
  });
});
