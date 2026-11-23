import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiMenuItem, UiSubmenu } from '../menu/menu';
import { UiToolbar, UiToolbarGroup, UiToolbarSeparator } from './toolbar';

@Component({
  imports: [UiToolbar, UiToolbarGroup, UiToolbarSeparator, UiSubmenu, UiMenuItem],
  template: `
    <ui-toolbar ariaLabel="Outils" [orientation]="orientation()">
      <div uiToolbarGroup="Style">
        <button id="a">A</button>
        <button id="b" [disabled]="bDisabled()">B</button>
      </div>
      <ui-toolbar-separator />
      <input id="text" type="text" aria-label="Texte" />
      <ui-submenu id="more" label="Plus"><button uiMenuItem id="inside">Dedans</button></ui-submenu>
      <button id="c">C</button>
    </ui-toolbar>
  `,
})
class Host {
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  bDisabled = signal(false);
}

describe('UiToolbar', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const $ = (selector: string) => el.querySelector(selector) as HTMLElement;
    const key = (target: HTMLElement, k: string) => {
      const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    const more = () => $('#more > .ui-submenu__trigger');
    return { fixture, el, host: fixture.componentInstance, $, key, more };
  }

  afterEach(() => document.querySelectorAll('ui-toolbar').forEach((n) => n.closest('div[ng-version]')?.remove()));

  it('rôle, nom, orientation ; groupe et séparateur', () => {
    const { $ } = setup();
    expect($('ui-toolbar').getAttribute('role')).toBe('toolbar');
    expect($('ui-toolbar').getAttribute('aria-label')).toBe('Outils');
    expect($('ui-toolbar').getAttribute('aria-orientation')).toBe('horizontal');
    expect($('[uiToolbarGroup]').getAttribute('role')).toBe('group');
    expect($('[uiToolbarGroup]').getAttribute('aria-label')).toBe('Style');
    expect($('ui-toolbar-separator').getAttribute('aria-orientation')).toBe('vertical');
  });

  it('un seul arrêt de tabulation ; champ texte et contenu de sous-menu non gérés', () => {
    const { $, more } = setup();
    expect($('#a').tabIndex).toBe(0);
    expect($('#b').tabIndex).toBe(-1);
    expect(more().tabIndex).toBe(-1);
    expect($('#c').tabIndex).toBe(-1);
    expect($('#text').tabIndex).toBe(0);
    expect($('#inside').tabIndex).toBe(0);
  });

  it('flèches, Origine / Fin, bouclage ; le champ texte garde ses flèches', () => {
    const { $, key, more } = setup();
    $('#a').focus();
    expect(key($('#a'), 'ArrowRight').defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('b');
    expect($('#b').tabIndex).toBe(0);
    expect($('#a').tabIndex).toBe(-1);
    key($('#b'), 'ArrowRight');
    expect(document.activeElement).toBe(more());
    key(more(), 'ArrowRight');
    expect(document.activeElement?.id).toBe('c');
    key($('#c'), 'ArrowRight');
    expect(document.activeElement?.id).toBe('a');
    key($('#a'), 'End');
    expect(document.activeElement?.id).toBe('c');
    key($('#c'), 'Home');
    expect(document.activeElement?.id).toBe('a');

    $('#text').focus();
    expect(key($('#text'), 'ArrowLeft').defaultPrevented).toBe(false);
    expect(document.activeElement?.id).toBe('text');
  });

  it('vertical : haut / bas ; séparateur horizontal', () => {
    const { fixture, host, $, key } = setup();
    host.orientation.set('vertical');
    fixture.detectChanges();
    expect($('ui-toolbar-separator').getAttribute('aria-orientation')).toBe('horizontal');
    $('#a').focus();
    key($('#a'), 'ArrowDown');
    expect(document.activeElement?.id).toBe('b');
    key($('#b'), 'ArrowRight');
    expect(document.activeElement?.id).toBe('b');
  });

  it('commande désactivée : sautée', async () => {
    const { fixture, host, $, key, more } = setup();
    host.bDisabled.set(true);
    fixture.detectChanges();
    await Promise.resolve();
    $('#a').focus();
    key($('#a'), 'ArrowRight');
    expect(document.activeElement).toBe(more());
  });
});
