import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiMenu, UiMenuItem, UiSubmenu } from '../menu/menu';
import { UiAppBar, UiAppBarEnd, UiAppBarStart } from './app-bar';

@Component({
  imports: [UiAppBar, UiAppBarStart, UiAppBarEnd, UiMenu, UiMenuItem, UiSubmenu],
  template: `
    <ui-app-bar>
      <span uiAppBarStart>Marque</span>
      <ui-menu id="nav" orientation="horizontal">
        <a uiMenuItem id="link" href="#a">Accueil</a>
        <ui-submenu id="sub" label="Produits"><a uiMenuItem href="#b">B</a></ui-submenu>
      </ui-menu>
      <div uiAppBarEnd>
        <ui-menu id="end-menu" orientation="horizontal" [landmark]="false"><button uiMenuItem>Profil</button></ui-menu>
      </div>
    </ui-app-bar>
  `,
})
class Host {}

describe('UiAppBar', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const bar = fixture.debugElement.query((d) => d.name === 'ui-app-bar').componentInstance as UiAppBar;
    const menu = (id: string) =>
      fixture.debugElement.query((d) => d.name === 'ui-menu' && d.attributes['id'] === id).componentInstance as UiMenu;
    return { fixture, el, bar, menu };
  }

  it('large : navigation visible, pas de bouton ☰, rôle banner', async () => {
    const { fixture, el, bar } = await setup();
    bar.setWidthForTesting(1200);
    fixture.detectChanges();
    expect(el.querySelector('ui-app-bar')?.getAttribute('role')).toBe('banner');
    expect(el.querySelector('.ui-app-bar__toggle')).toBeNull();
    expect((el.querySelector('.ui-app-bar__nav') as HTMLElement).hidden).toBe(false);
  });

  it('replié : bouton ☰, panneau, menus de navigation verticaux (pas ceux des actions)', async () => {
    const { fixture, el, bar, menu } = await setup();
    bar.setWidthForTesting(500);
    fixture.detectChanges();
    const toggle = el.querySelector<HTMLButtonElement>('.ui-app-bar__toggle') as HTMLButtonElement;
    const nav = el.querySelector('.ui-app-bar__nav') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(nav.id);
    expect(nav.hidden).toBe(true);
    expect(menu('nav').effectiveOrientation()).toBe('vertical');
    expect(menu('end-menu').effectiveOrientation()).toBe('horizontal');

    toggle.click();
    fixture.detectChanges();
    expect(nav.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    // Un sous-menu ne ferme pas le panneau ; un lien, si.
    (el.querySelector('#sub > .ui-submenu__trigger') as HTMLElement).click();
    fixture.detectChanges();
    expect(bar.navOpen()).toBe(true);
    (el.querySelector('#link') as HTMLElement).click();
    fixture.detectChanges();
    expect(bar.navOpen()).toBe(false);
  });

  it('Échap ferme le panneau et rend le focus au bouton ☰', async () => {
    const { fixture, el, bar } = await setup();
    document.body.appendChild(el);
    bar.setWidthForTesting(500);
    fixture.detectChanges();
    bar.openNav();
    fixture.detectChanges();
    const link = el.querySelector('#link') as HTMLElement;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(bar.navOpen()).toBe(false);
    expect(document.activeElement).toBe(el.querySelector('.ui-app-bar__toggle'));
    el.remove();
  });

  it('repasse en large : panneau refermé', async () => {
    const { fixture, bar } = await setup();
    bar.setWidthForTesting(500);
    fixture.detectChanges();
    bar.openNav();
    fixture.detectChanges();
    bar.setWidthForTesting(1000);
    fixture.detectChanges();
    expect(bar.navOpen()).toBe(false);
  });
});
