import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiDashboardItem, UiDashboardLayout } from './dashboard-layout';
import { UiDashboard } from './dashboard';
import { UiWidgetBack, UiWidgetDefinition, UiWidgetFront, UiWidgetSettings, injectUiWidgetContext } from './widget';

interface CounterConfig {
  count: number;
}

@Component({
  selector: 'ui-test-counter-widget',
  imports: [UiWidgetFront, UiWidgetBack, UiWidgetSettings],
  template: `
    <ng-template uiWidgetFront><p class="front">Compteur {{ ctx.config().count }}</p></ng-template>
    <ng-template uiWidgetBack><p class="back">Verso</p></ng-template>
    <ng-template uiWidgetSettings><button class="inc" (click)="ctx.updateConfig({ count: ctx.config().count + 1 })">+1</button></ng-template>
  `,
})
class CounterWidget {
  protected readonly ctx = injectUiWidgetContext<CounterConfig>();
}

@Component({
  selector: 'ui-test-plain-widget',
  imports: [UiWidgetFront],
  template: `<ng-template uiWidgetFront><p class="plain">Simple</p></ng-template>`,
})
class PlainWidget {}

const WIDGETS: UiWidgetDefinition<object>[] = [
  { type: 'counter', category: 'Mesures', title: 'Compteur', component: CounterWidget, defaultSize: { w: 4, h: 2 }, defaultConfig: { count: 0 } satisfies CounterConfig, maxInstances: 2 },
  { type: 'plain', title: 'Simple', component: PlainWidget, defaultSize: { w: 6, h: 1 } },
];

@Component({
  imports: [UiDashboard],
  template: `<ui-dashboard [widgets]="widgets" [(items)]="items" [(editing)]="editing" (layoutChange)="changes.push($event)" />`,
})
class Host {
  widgets = WIDGETS;
  editing = signal(false);
  items = signal<UiDashboardItem[]>([
    { id: 'c1', type: 'counter', x: 0, y: 0, w: 4, h: 2, title: 'Visites', config: { count: 3 } },
    { id: 'p1', type: 'plain', x: 4, y: 0, w: 6, h: 1 },
    { id: 'zz', type: 'inconnu', x: 0, y: 5, w: 2, h: 2 },
  ]);
  changes: UiDashboardLayout[] = [];
}

describe('UiDashboard', () => {
  async function setup() {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const $ = (s: string) => el.querySelector(s) as HTMLElement;
    const widget = (id: string) => el.querySelector(`[data-widget-id="${id}"]`) as HTMLElement;
    const dashboard = fixture.debugElement.query((d) => d.name === 'ui-dashboard').componentInstance as UiDashboard;
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, host: fixture.componentInstance, $, widget, dashboard, render, warn };
  }

  afterEach(() => vi.restoreAllMocks());

  it('affiche les widgets connus, à leur place, avec leurs faces', async () => {
    const { el, widget, warn } = await setup();
    expect(el.querySelectorAll('ui-dashboard-widget').length).toBe(2);
    expect(widget('c1').style.gridColumn).toBe('1 / span 4');
    expect(widget('p1').style.gridRow).toBe('1 / span 1');
    expect(widget('c1').querySelector('.front')?.textContent).toContain('Compteur 3');
    expect(widget('c1').querySelector('[role="heading"]')?.textContent?.trim()).toBe('Visites');
    expect(widget('p1').querySelector('[role="heading"]')?.textContent?.trim()).toBe('Simple');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('inconnu'));
  });

  it('retourner : verso visible, recto inerte ; sans verso, pas de bouton', async () => {
    const { widget, render } = await setup();
    const flip = widget('c1').querySelector<HTMLButtonElement>('[aria-pressed]') as HTMLButtonElement;
    expect(flip.getAttribute('aria-label')).toBe('Afficher le verso de Visites');
    expect(widget('c1').querySelector('.ui-widget__face--back')?.hasAttribute('inert')).toBe(true);
    flip.click();
    await render();
    expect(flip.getAttribute('aria-pressed')).toBe('true');
    expect(widget('c1').querySelector('.ui-widget__face--front')?.hasAttribute('inert')).toBe(true);
    expect(widget('c1').querySelector('.ui-widget__face--back')?.hasAttribute('inert')).toBe(false);
    expect(widget('p1').querySelector('[aria-pressed]')).toBeNull();
  });

  it('personnaliser : poignées, réglages du widget, émission de la disposition', async () => {
    const { host, el, $, widget, render } = await setup();
    expect(widget('c1').querySelector('.ui-widget__move')).toBeNull();
    (widget('c1').querySelector('[aria-label="Configurer Visites"]') as HTMLElement).click();
    await render();
    expect(host.editing()).toBe(true);
    expect(widget('c1').querySelector('.ui-widget__move')).not.toBeNull();
    expect(widget('c1').querySelector('.ui-widget__resize')).not.toBeNull();
    expect($('.ui-dashboard__config')).not.toBeNull();

    ($('.ui-dashboard__config .inc') as HTMLElement).click();
    await render();
    expect(widget('c1').querySelector('.front')?.textContent).toContain('Compteur 4');
    const last = host.changes.at(-1) as UiDashboardLayout;
    expect(last.version).toBe(1);
    expect(last.items.find((i) => i.id === 'c1')?.config).toEqual({ count: 4 });
    expect(last.items.some((i) => i.id === 'zz')).toBe(false); // type inconnu écarté
    expect(el.querySelector('.ui-widget--selected')).toBe(widget('c1').querySelector('.ui-widget'));
  });

  it('clavier : flèches sur la poignée = déplacement, sur le coin = taille ; voisins poussés', async () => {
    const { host, widget, render, dashboard } = await setup();
    dashboard.toggleEditing();
    await render();
    const key = async (el: Element, k: string) => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await render();
    };
    await key(widget('p1').querySelector('.ui-widget__move') as Element, 'ArrowLeft');
    let items = host.items();
    // p1 recule d'une colonne et recouvre c1 : c1 est poussé dessous.
    expect(items.find((i) => i.id === 'p1')).toMatchObject({ x: 3, y: 0 });
    expect(items.find((i) => i.id === 'c1')).toMatchObject({ x: 0, y: 1 });
    await key(widget('c1').querySelector('.ui-widget__resize') as Element, 'ArrowRight');
    items = host.items();
    expect(items.find((i) => i.id === 'c1')).toMatchObject({ w: 5, h: 2 });
    expect(host.changes.length).toBe(2);
  });

  it('ajouter (place libre, limite d’exemplaires) et retirer', async () => {
    const { host, dashboard, render } = await setup();
    const id = dashboard.addWidget('counter');
    await render();
    expect(id).toMatch(/^counter-[0-9a-f]{12}$/);
    const added = host.items().find((i) => i.id === id) as UiDashboardItem;
    expect(added).toMatchObject({ type: 'counter', w: 4, h: 2 });
    expect(dashboard.addWidget('counter')).toBeNull(); // maxInstances: 2
    dashboard.removeWidget('p1');
    await render();
    expect(host.items().map((i) => i.id).sort()).toEqual(['c1', id].sort());
  });

  it('catalogue en tiroirs par catégorie, « Autres » en dernier, un seul ouvert (accordéon)', async () => {
    const { el, dashboard, render } = await setup();
    dashboard.toggleEditing();
    await render();
    const drawers = () => Array.from(el.querySelectorAll<HTMLDetailsElement>('.ui-dashboard__drawer'));
    expect(drawers().map((d) => d.querySelector('.ui-dashboard__drawer-name')?.textContent)).toEqual(['Mesures', 'Autres']);
    expect(drawers().map((d) => d.open)).toEqual([true, false]);
    expect(drawers()[0].querySelector('summary')?.textContent).toContain('1 widget');
    expect(drawers()[0].querySelector('[aria-label="Ajouter Compteur"]')).not.toBeNull();
    expect(drawers()[1].querySelector('[aria-label="Ajouter Simple"]')).not.toBeNull();

    const second = drawers()[1];
    second.open = true;
    second.dispatchEvent(new Event('toggle'));
    await render();
    expect(drawers().map((d) => d.open)).toEqual([false, true]);
  });

  it('disposition sérialisable', async () => {
    const { dashboard } = await setup();
    const layout = dashboard.getLayout();
    expect(layout).toEqual({ version: 1, columns: 12, items: expect.any(Array) });
    expect(JSON.parse(JSON.stringify(layout))).toEqual(layout);
  });
});
