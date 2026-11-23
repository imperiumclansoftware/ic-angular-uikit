import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiMenu, UiMenuItem, UiMenuOrientation, UiSubmenu } from './menu';

@Component({
  imports: [UiMenu, UiMenuItem, UiSubmenu],
  template: `
    <ui-menu [orientation]="orientation()">
      <button uiMenuItem id="home">Accueil</button>
      <ui-submenu id="products" label="Produits" [(expanded)]="productsOpen">
        <button uiMenuItem id="news">Nouveautés</button>
        <ui-submenu id="catalog" label="Catalogue">
          <button uiMenuItem id="software" [active]="softwareActive()">Logiciels</button>
        </ui-submenu>
      </ui-submenu>
      <button uiMenuItem id="contact">Contact</button>
    </ui-menu>
    <ui-submenu id="standalone" label="Actions">
      <button uiMenuItem id="copy">Copier</button>
    </ui-submenu>
  `,
})
class Host {
  orientation = signal<UiMenuOrientation>('vertical');
  productsOpen = signal(false);
  softwareActive = signal(false);
}

describe('UiMenu / UiSubmenu', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const $ = <T extends HTMLElement = HTMLElement>(selector: string) => el.querySelector<T>(selector) as T;
    const trigger = (id: string) => $<HTMLButtonElement>(`#${id} > .ui-submenu__trigger`);
    const panel = (id: string) => $(`#${id} > .ui-submenu__panel`);
    const key = (target: HTMLElement, k: string) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    return { fixture, el, host: fixture.componentInstance, $, trigger, panel, key };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('vertical : les sous-menus se déplient sur place (aria-expanded, hidden)', () => {
    const { fixture, host, trigger, panel } = setup();
    expect(panel('products').hidden).toBe(true);
    expect(panel('products').hasAttribute('popover')).toBe(false);
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');

    trigger('products').click();
    fixture.detectChanges();
    expect(panel('products').hidden).toBe(false);
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
    expect(host.productsOpen()).toBe(true);
  });

  it('horizontal : panneaux flottants (popover), sous le bouton puis à côté', () => {
    const { fixture, host, el, trigger, panel } = setup();
    host.orientation.set('horizontal');
    fixture.detectChanges();
    expect(el.querySelector('ui-menu')?.classList).toContain('ui-menu--horizontal');
    expect(panel('products').getAttribute('popover')).toBe('auto');
    expect(trigger('products').getAttribute('popovertarget')).toBe(panel('products').id);
    expect(el.querySelector('#products')?.classList).toContain('ui-submenu--below');
    expect(el.querySelector('#catalog')?.classList).toContain('ui-submenu--side');
    expect(el.querySelector('#home')?.classList).toContain('ui-menu-item--top');
    expect(el.querySelector('#news')?.classList).not.toContain('ui-menu-item--top');
  });

  it('un sous-menu autonome est flottant, sous son bouton', () => {
    const { el, panel } = setup();
    expect(el.querySelector('#standalone')?.classList).toContain('ui-submenu--standalone');
    expect(el.querySelector('#standalone')?.classList).toContain('ui-submenu--below');
    expect(panel('standalone').getAttribute('popover')).toBe('auto');
  });

  it("s'ouvre et signale la page courante qu'il contient", async () => {
    const { fixture, host, el } = setup();
    host.softwareActive.set(true);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(host.productsOpen()).toBe(true);
    const catalog = fixture.debugElement.query((d) => d.name === 'ui-submenu' && d.attributes['id'] === 'catalog').componentInstance as UiSubmenu;
    expect(catalog.hasActive()).toBe(true);
    expect(catalog.expanded()).toBe(true);
    expect(el.querySelector('#software')?.getAttribute('aria-current')).toBe('page');
  });

  it('clavier vertical : ↓ / ↑ entre éléments visibles, → déplie, ← replie', () => {
    const { el, trigger, key, host } = setup();
    const home = el.querySelector<HTMLElement>('#home') as HTMLElement;
    home.focus();
    key(home, 'ArrowDown');
    expect(document.activeElement).toBe(trigger('products'));
    key(trigger('products'), 'ArrowDown');
    expect(document.activeElement?.id).toBe('contact');
    key(document.activeElement as HTMLElement, 'ArrowUp');
    expect(document.activeElement).toBe(trigger('products'));

    key(trigger('products'), 'ArrowRight');
    expect(host.productsOpen()).toBe(true);
    key(trigger('products'), 'ArrowDown');
    expect(document.activeElement?.id).toBe('news');
    key(document.activeElement as HTMLElement, 'ArrowLeft');
    expect(document.activeElement).toBe(trigger('products'));
    key(trigger('products'), 'ArrowLeft');
    expect(host.productsOpen()).toBe(false);
    key(trigger('products'), 'End');
    expect(document.activeElement?.id).toBe('contact');
  });

  it('clavier horizontal : ← / → dans la barre', () => {
    const { fixture, host, el, trigger, key } = setup();
    host.orientation.set('horizontal');
    fixture.detectChanges();
    const home = el.querySelector<HTMLElement>('#home') as HTMLElement;
    home.focus();
    key(home, 'ArrowRight');
    expect(document.activeElement).toBe(trigger('products'));
    key(trigger('products'), 'ArrowRight');
    expect(document.activeElement?.id).toBe('contact');
    key(document.activeElement as HTMLElement, 'ArrowRight');
    expect(document.activeElement?.id).toBe('home');
    key(home, 'ArrowLeft');
    expect(document.activeElement?.id).toBe('contact');
  });
});
