import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiFileManager } from './file-manager';
import { UiFileEntry, UiFileSource, uiMemoryFileSource } from './file-source';

/** Valeur présente, sinon échec explicite du test. */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Élément attendu absent');
  return value;
}

if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

const library = () =>
  uiMemoryFileSource([
    { name: 'Photos', children: [{ name: 'lac.jpg', mimeType: 'image/jpeg', url: '/lac.jpg', size: 2048 }] },
    { name: 'Archives', children: [] },
    { name: 'budget.xlsx', size: 5000, modifiedAt: '2026-01-02T10:00:00Z' },
    { name: 'affiche.png', mimeType: 'image/png', url: '/affiche.png', size: 300 },
  ]);

@Component({
  imports: [UiFileManager],
  template: `<ui-file-manager [source]="source()" [accept]="accept()" [readonly]="readonly()" [(selection)]="selection" [(folder)]="folder" (open)="opened.push($event.name)" />`,
})
class Host {
  source = signal<UiFileSource>(library());
  accept = signal('');
  readonly = signal(false);
  selection = signal<readonly UiFileEntry[]>([]);
  folder = signal<string | null>(null);
  opened: string[] = [];
}

describe('UiFileManager', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      for (let i = 0; i < 3; i++) {
        fixture.detectChanges();
        await fixture.whenStable();
        await new Promise((r) => setTimeout(r));
      }
      fixture.detectChanges();
    };
    await settle();
    const names = () => [...el.querySelectorAll('[role="option"] .ui-fm__name')].map((n) => n.textContent?.trim());
    const option = (name: string) => must([...el.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.querySelector('.ui-fm__name')?.textContent?.trim() === name));
    const key = async (target: HTMLElement, k: string, init: KeyboardEventInit = {}) => {
      target.focus();
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
      await settle();
    };
    const button = (text: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text));
    const live = () => el.querySelector('.ui-fm__sr[aria-live]')?.textContent?.trim();
    return { fixture, el, host: fixture.componentInstance, settle, names, option, key, button, live };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('liste : dossiers en tête, listbox multisélection, annonce, fil d’Ariane', async () => {
    const { el, names, live } = await setup();
    expect(names()).toEqual(['Archives', 'Photos', 'affiche.png', 'budget.xlsx']);
    const list = must(el.querySelector('[role="listbox"]'));
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    expect(el.querySelector('[aria-current="location"]')?.textContent?.trim()).toBe('Racine');
    expect(live()).toBe('Racine : 4 éléments.');
    expect([...el.querySelectorAll('[role="option"]')].map((o) => o.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
  });

  it('clavier : flèches, Espace, Maj, Ctrl+A, Entrée ouvre, Retour arrière remonte', async () => {
    const { el, host, names, option, key } = await setup();
    const first = option('Archives');
    first.focus();
    await key(first, 'ArrowDown');
    expect(host.selection().map((e) => e.name)).toEqual(['Photos']);
    await key(option('Photos'), 'ArrowDown', { shiftKey: true });
    expect(host.selection().map((e) => e.name)).toEqual(['Photos', 'affiche.png']);
    await key(option('affiche.png'), 'a', { ctrlKey: true });
    expect(host.selection()).toHaveLength(4);
    await key(option('affiche.png'), 'Escape');
    expect(host.selection()).toHaveLength(0);
    await key(option('affiche.png'), 'b');
    expect(document.activeElement).toBe(option('budget.xlsx'));
    await key(option('budget.xlsx'), 'Enter');
    expect(host.opened).toEqual(['budget.xlsx']);
    await key(option('budget.xlsx'), 'Home');
    await key(option('Archives'), 'ArrowDown');
    await key(option('Photos'), 'Enter');
    expect(names()).toEqual(['lac.jpg']);
    expect([...el.querySelectorAll('.ui-fm__crumbs li')].map((l) => l.textContent?.trim())).toEqual(['Racine', 'Photos']);
    await key(must(el.querySelector<HTMLElement>('[role="option"]')), 'Backspace');
    expect(host.folder()).toBeNull();
    expect(names()).toHaveLength(4);
  });

  it('souris : clic sélectionne, Ctrl+clic ajoute, double clic ouvre le dossier', async () => {
    const { host, option, settle, names } = await setup();
    option('budget.xlsx').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    option('affiche.png').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();
    expect(host.selection().map((e) => e.name)).toEqual(['budget.xlsx', 'affiche.png']);
    expect(option('budget.xlsx').getAttribute('aria-selected')).toBe('true');
    option('Photos').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
    expect(names()).toEqual(['lac.jpg']);
  });

  it('nouveau dossier, renommage (nom validé), suppression confirmée', async () => {
    const { el, button, settle, names, option, key, live } = await setup();
    must(button('Nouveau dossier')).click();
    await settle();
    const input = () => must(el.querySelector<HTMLInputElement>('ui-dialog input'));
    input().value = 'Photos';
    input().dispatchEvent(new Event('input'));
    await settle();
    must(el.querySelector<HTMLFormElement>('.ui-fm__form')).dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(el.querySelector('ui-dialog')?.textContent).toContain('existe déjà');
    input().value = 'Vidéos';
    input().dispatchEvent(new Event('input'));
    must(el.querySelector<HTMLFormElement>('.ui-fm__form')).dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(names()).toContain('Vidéos');
    expect(live()).toBe('Dossier « Vidéos » créé.');

    await key(option('budget.xlsx'), 'F2');
    expect(input().value).toBe('budget.xlsx');
    input().value = 'budget 2026.xlsx';
    input().dispatchEvent(new Event('input'));
    must(el.querySelector<HTMLFormElement>('.ui-fm__form')).dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(names()).toContain('budget 2026.xlsx');

    await key(option('Archives'), 'Delete');
    const confirm = el.querySelectorAll('ui-dialog')[1];
    expect(confirm.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(confirm.textContent).toContain('Supprimer « Archives » ? Les dossiers sont supprimés avec tout leur contenu.');
    must([...confirm.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Supprimer')).click();
    await settle();
    expect(names()).not.toContain('Archives');
  });

  it('couper / coller dans un autre dossier', async () => {
    const { option, key, button, settle, names } = await setup();
    await key(option('affiche.png'), 'x', { ctrlKey: true });
    expect(option('affiche.png').classList).toContain('ui-fm__item--cut');
    option('Photos').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
    must(button('Coller ici')).click();
    await settle();
    expect(names()).toEqual(['affiche.png', 'lac.jpg']);
    expect(button('Coller ici')).toBeUndefined();
  });

  it('accept masque les autres fichiers ; lecture seule masque les actions ; envoi refusé', async () => {
    const { host, settle, names, button, el, fixture } = await setup();
    host.accept.set('image/*');
    await settle();
    expect(names()).toEqual(['Archives', 'Photos', 'affiche.png']);
    expect(button('Envoyer des fichiers')).toBeDefined();
    const manager = fixture.debugElement.children[0].componentInstance as UiFileManager;
    manager.uploadFiles([new File(['x'], 'notes.txt', { type: 'text/plain' })]);
    await settle();
    expect(el.querySelector('.ui-fm__upload--error')?.textContent).toContain('Type non accepté (images)');
    host.readonly.set(true);
    await settle();
    expect(button('Nouveau dossier')).toBeUndefined();
    expect(button('Envoyer des fichiers')).toBeUndefined();
  });

  it('erreur de chargement : message et Réessayer', async () => {
    let fail = true;
    const base = library();
    const { host, el, settle, button, names } = await setup();
    host.source.set({ list: (id) => (fail ? Promise.reject(new Error('Serveur indisponible.')) : base.list(id)) });
    await settle();
    expect(el.querySelector('.ui-fm__state[role="alert"]')?.textContent).toContain('Serveur indisponible.');
    fail = false;
    must(button('Réessayer')).click();
    await settle();
    expect(names()).toHaveLength(4);
  });
});
