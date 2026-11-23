import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiMenuItem, UiMenuSeparator, UiSubmenu } from '../menu/menu';
import { UiContextMenu, UiContextMenuEvent, UiContextMenuTrigger } from './context-menu';

@Component({
  imports: [UiContextMenu, UiContextMenuTrigger, UiMenuItem, UiMenuSeparator, UiSubmenu],
  template: `
    <div id="target" tabindex="0" [uiContextMenuTrigger]="menu" [uiContextMenuData]="'fichier-1'">Cible</div>
    <div id="native" [uiContextMenuTrigger]="menu" uiContextMenuDisabled>Natif</div>
    <ui-context-menu #menu (opened)="events.push($event)">
      <button uiMenuItem id="open" shortcut="Entrée" (click)="chosen.set('open')">Ouvrir</button>
      <button uiMenuItem id="star" [checked]="starred()">Favori</button>
      <button uiMenuItem id="grid" checkMode="radio" [checked]="true">Grille</button>
      <ui-submenu id="share" label="Partager"><button uiMenuItem>E-mail</button></ui-submenu>
      <ui-menu-separator />
      <button uiMenuItem id="delete" tone="danger">Supprimer</button>
    </ui-context-menu>
  `,
})
class Host {
  starred = signal(false);
  chosen = signal('');
  events: UiContextMenuEvent[] = [];
}

describe('UiContextMenu', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const panel = el.querySelector('.ui-context-menu__panel') as HTMLElement & { showPopover(): void; hidePopover(): void };
    const popover = panel.getAttribute('popover');
    // jsdom refuse le focus dans un popover qu'il croit fermé : attribut retiré après lecture.
    panel.removeAttribute('popover');
    // jsdom n'a pas l'API popover : simulation minimale (état ouvert + événement toggle).
    let open = false;
    panel.showPopover = () => {
      open = true;
    };
    panel.hidePopover = () => {
      open = false;
      panel.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));
    };
    const matches = panel.matches.bind(panel);
    Object.defineProperty(panel, 'matches', { value: (selector: string) => (selector === ':popover-open' ? open : matches(selector)) });
    const menu = fixture.debugElement.query((d) => d.name === 'ui-context-menu').componentInstance as UiContextMenu;
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, host: fixture.componentInstance, panel, popover, menu, render, isOpen: () => open };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('rôles ARIA de menu : menuitem, menuitemcheckbox, menuitemradio, separator', async () => {
    const { el, panel, popover } = await setup();
    expect(panel.getAttribute('role')).toBe('menu');
    expect(popover).toBe('auto');
    expect(el.querySelector('#open')?.getAttribute('role')).toBe('menuitem');
    expect(el.querySelector('#star')?.getAttribute('role')).toBe('menuitemcheckbox');
    expect(el.querySelector('#star')?.getAttribute('aria-checked')).toBe('false');
    expect(el.querySelector('#grid')?.getAttribute('role')).toBe('menuitemradio');
    expect(el.querySelector('#grid')?.getAttribute('aria-checked')).toBe('true');
    expect(el.querySelector('#share > .ui-submenu__trigger')?.getAttribute('role')).toBe('menuitem');
    expect(el.querySelector('#share > .ui-submenu__trigger')?.getAttribute('aria-haspopup')).toBe('menu');
    expect(el.querySelector('#share > .ui-submenu__panel')?.getAttribute('role')).toBe('menu');
    expect(el.querySelector('#share')?.classList).toContain('ui-submenu--side');
    expect(el.querySelector('ui-menu-separator')?.getAttribute('role')).toBe('separator');
    expect(el.querySelector('#delete')?.classList).toContain('ui-menu-item--danger');
    expect(el.querySelector('#open .ui-menu-item__shortcut')?.textContent).toBe('Entrée');
  });

  it('clic droit : menu natif remplacé, ouvert au pointeur avec la donnée, focus sur le premier élément', async () => {
    const { el, host, menu, render, isOpen, panel } = await setup();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 80, button: 2 });
    el.querySelector('#target')?.dispatchEvent(event);
    await render();
    expect(event.defaultPrevented).toBe(true);
    expect(isOpen()).toBe(true);
    expect(menu.data()).toBe('fichier-1');
    expect(panel.style.left).toBe('120px');
    expect(host.events[0]).toMatchObject({ data: 'fichier-1', source: 'pointer' });
    expect(document.activeElement?.id).toBe('open');
  });

  it('choisir un élément ferme le menu et rend le focus ; Tab ferme aussi', async () => {
    const { el, host, render, isOpen } = await setup();
    const target = el.querySelector('#target') as HTMLElement;
    target.focus();
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10, button: 2 }));
    await render();
    (el.querySelector('#open') as HTMLElement).click();
    await render();
    expect(host.chosen()).toBe('open');
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(target);

    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10, button: 2 }));
    await render();
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await render();
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  it('flèches et première lettre', async () => {
    const { el, render } = await setup();
    el.querySelector('#target')?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10, button: 2 }));
    await render();
    const key = async (k: string) => {
      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await render();
    };
    await key('ArrowDown');
    expect(document.activeElement?.id).toBe('star');
    await key('End');
    expect(document.activeElement?.id).toBe('delete');
    await key('p');
    expect(document.activeElement?.closest('ui-submenu')?.id).toBe('share');
    // Lettres tapées à moins de 600 ms d'intervalle : recherche « po » (aucun élément) ; après la pause, « o ».
    await new Promise((resolve) => setTimeout(resolve, 650));
    await key('o');
    expect(document.activeElement?.id).toBe('open');
  });

  it('clavier (touche Menu) : ouvert sous l’élément ; déclencheur désactivé : menu natif', async () => {
    const { el, host, render, isOpen } = await setup();
    const target = el.querySelector('#target') as HTMLElement;
    target.focus();
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 }));
    await render();
    expect(isOpen()).toBe(true);
    expect(host.events.at(-1)?.source).toBe('keyboard');

    const native = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5, button: 2 });
    el.querySelector('#native')?.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(false);
  });
});
