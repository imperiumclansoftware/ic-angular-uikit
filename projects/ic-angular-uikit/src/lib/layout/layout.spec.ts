import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiLayout } from './layout';
import { UiMenu, UiMenuItem } from '../menu/menu';
import { UiSidebar, UiSidebarMode, UiSidebarState, UiSidebarToggle } from './sidebar';

@Component({
  imports: [UiLayout, UiSidebar, UiSidebarToggle, UiMenu, UiMenuItem],
  template: `
    <ui-layout [fullscreen]="false">
      <button id="toggle" [uiSidebarToggle]="left">Menu</button>
      <ui-sidebar #left position="left" [mode]="mode()" [collapseTo]="collapseTo()" [(state)]="state" [(width)]="width" resizable [minWidth]="200" [maxWidth]="300">
        <ui-menu>
          <button uiMenuItem id="item" icon="x:y" active>Accueil</button>
          <button uiMenuItem id="noicon">Journal</button>
        </ui-menu>
      </ui-sidebar>
      <ui-sidebar #right position="right" mode="over" state="closed" />
      <p>Contenu</p>
    </ui-layout>
  `,
})
class Host {
  mode = signal<UiSidebarMode>('push');
  collapseTo = signal<'rail' | 'closed'>('rail');
  state = signal<UiSidebarState>('open');
  width = signal(240);
}

describe('UiLayout / UiSidebar', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const sidebars = fixture.debugElement.queryAll((d) => d.name === 'ui-sidebar').map((d) => d.componentInstance as UiSidebar);
    const layout = fixture.debugElement.query((d) => d.name === 'ui-layout').componentInstance as UiLayout;
    const occupied = (i: number) => (el.querySelectorAll('ui-sidebar')[i] as HTMLElement).style.getPropertyValue('--_occupied');
    return { fixture, el, host: fixture.componentInstance, left: sidebars[0], right: sidebars[1], layout, occupied };
  }

  it('push : toggle replie vers le rail puis redéploie ; place réservée et aria-expanded suivent', () => {
    const { fixture, el, host, occupied } = setup();
    expect(occupied(0)).toBe('240px');
    const toggle = el.querySelector('#toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(host.state()).toBe('rail');
    expect(occupied(0)).toBe('64px');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(host.state()).toBe('open');
  });

  it('rail : libellés masqués visuellement mais présents, infobulle et initiale sans icône', async () => {
    const { fixture, el, host } = setup();
    host.state.set('rail');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const item = el.querySelector('#item') as HTMLElement;
    expect(item.classList).toContain('ui-menu-item--rail');
    expect(item.textContent).toContain('Accueil');
    expect(item.getAttribute('title')).toBe('Accueil');
    expect(item.getAttribute('aria-current')).toBe('page');
    expect(el.querySelector('#noicon .ui-menu-item__initial')?.textContent).toBe('J');
  });

  it('over : déployée par-dessus le contenu (rien de réservé), voile, contenu inerte ; Échap referme', () => {
    const { fixture, el, right, occupied } = setup();
    right.open();
    fixture.detectChanges();
    expect(right.overlayOpen()).toBe(true);
    expect(occupied(1)).toBe('0px');
    expect(el.querySelector('.ui-sidebar__scrim')).not.toBeNull();
    expect(el.querySelector('.ui-layout__main')?.hasAttribute('inert')).toBe(true);
    el.querySelectorAll('.ui-sidebar__panel')[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(right.expanded()).toBe(false);
    expect(el.querySelector('.ui-layout__main')?.hasAttribute('inert')).toBe(false);
  });

  it('static : ne se masque jamais', () => {
    const { fixture, host, left } = setup();
    host.mode.set('static');
    host.collapseTo.set('closed');
    fixture.detectChanges();
    left.toggle();
    left.hide();
    fixture.detectChanges();
    expect(left.effectiveState()).toBe('open');
  });

  it('mobile : tiroirs fermés par défaut, état desktop conservé', () => {
    const { fixture, host, left, layout, occupied } = setup();
    layout.setWidthForTesting(500);
    fixture.detectChanges();
    expect(left.isMobile()).toBe(true);
    expect(left.effectiveState()).toBe('closed');
    expect(occupied(0)).toBe('0px');
    left.toggle();
    fixture.detectChanges();
    expect(left.overlayOpen()).toBe(true);
    layout.setWidthForTesting(1200);
    fixture.detectChanges();
    expect(host.state()).toBe('open');
    expect(left.overlayOpen()).toBe(false);
  });

  it('redimensionnement au clavier, borné par min / max', () => {
    const { fixture, el, host } = setup();
    const handle = el.querySelector('.ui-sidebar__resizer') as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(host.width()).toBe(256);
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(host.width()).toBe(300);
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
    expect(host.width()).toBe(200);
    fixture.detectChanges();
  });
});
