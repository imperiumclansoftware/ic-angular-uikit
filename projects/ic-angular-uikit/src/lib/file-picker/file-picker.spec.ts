import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiFileEntry, uiMemoryFileSource } from '../file-manager/file-source';
import { UiFilePicker } from './file-picker';

if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** Valeur présente, sinon échec explicite du test. */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Élément attendu absent');
  return value;
}

@Component({
  imports: [UiFilePicker, ReactiveFormsModule],
  template: `
    <ui-file-picker id="many" label="Photos" [source]="source" accept="image/*" multiple [maxFiles]="2" reorderable display="grid" [formControl]="photos" />
    <ui-file-picker id="one" label="Contrat" [source]="source" [(value)]="contract" [disabled]="disabled()" />
  `,
})
class Host {
  source = uiMemoryFileSource([
    { name: 'a.png', mimeType: 'image/png', url: '/a.png' },
    { name: 'b.png', mimeType: 'image/png', url: '/b.png' },
    { name: 'c.png', mimeType: 'image/png', url: '/c.png' },
    { name: 'contrat.pdf', mimeType: 'application/pdf', url: '/contrat.pdf', size: 2048 },
  ]);
  photos = new FormControl<UiFileEntry[]>([], { nonNullable: true, validators: [Validators.required] });
  contract = signal<UiFileEntry | null>(null);
  disabled = signal(false);
}

describe('UiFilePicker', () => {
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
    const picker = (id: string) => must(el.querySelector<HTMLElement>(`#${id}`));
    const button = (root: HTMLElement, text: string) => must([...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(text)));
    const option = (root: HTMLElement, name: string) => must([...root.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.includes(name)));
    const names = (root: HTMLElement) => [...root.querySelectorAll('.ui-fp__name')].map((n) => n.textContent?.trim());
    return { fixture, el, host: fixture.componentInstance, settle, picker, button, option, names };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('vide : groupe étiqueté, contraintes, required', async () => {
    const { picker, host } = await setup();
    const many = picker('many');
    const group = must(many.querySelector('[role="group"]'));
    expect(group.getAttribute('aria-labelledby')).toBe(must(many.querySelector('.ui-field__label')).id);
    expect(many.querySelector('.ui-fp__empty')?.textContent).toContain('Aucun média choisi.');
    expect(many.querySelector('.ui-fp__constraints')?.textContent?.trim()).toBe('Images · 2 au plus');
    expect(host.photos.hasError('required')).toBe(true);
  });

  it('multiple : ajout depuis la bibliothèque, limite, doublon ignoré, retrait, ordre', async () => {
    const { picker, button, option, settle, host, names } = await setup();
    const many = picker('many');
    button(many, 'Choisir…').click();
    await settle();
    expect([...many.querySelectorAll('[role="option"]')].map((o) => o.textContent?.trim())).not.toContain('contrat.pdf');
    option(many, 'a.png').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    option(many, 'b.png').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    option(many, 'c.png').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();
    expect(many.querySelector('.ui-fp__dialog-count')?.textContent).toContain('2 médias de plus au maximum.');
    expect(button(many, 'Ajouter').disabled).toBe(true);
    option(many, 'c.png').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();
    button(many, 'Ajouter (2)').click();
    await settle();
    expect(host.photos.value.map((e) => e.name)).toEqual(['a.png', 'b.png']);
    expect(host.photos.valid).toBe(true);
    expect(names(many)).toEqual(['a.png', 'b.png']);
    expect(button(many, 'Ajouter…').disabled).toBe(true); // limite atteinte
    expect(many.querySelector('.ui-fp__constraints')?.textContent).toContain('(atteint)');
    must(many.querySelector<HTMLButtonElement>('[aria-label="Placer a.png après"]')).click();
    await settle();
    expect(host.photos.value.map((e) => e.name)).toEqual(['b.png', 'a.png']);
    must(many.querySelector<HTMLButtonElement>('[aria-label="Retirer b.png"]')).click();
    await settle();
    expect(host.photos.value.map((e) => e.name)).toEqual(['a.png']);
    expect(host.photos.touched).toBe(true);
  });

  it('simple : double clic choisit, Remplacer, valeur objet ou null, désactivé', async () => {
    const { picker, button, option, settle, host, names } = await setup();
    const one = picker('one');
    expect(one.querySelector('.ui-fp__empty')?.textContent).toContain('Aucun fichier choisi.');
    button(one, 'Choisir…').click();
    await settle();
    option(one, 'contrat.pdf').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
    expect(host.contract()?.name).toBe('contrat.pdf');
    expect(names(one)).toEqual(['contrat.pdf']);
    expect(one.querySelector('.ui-fp__size')?.textContent).toBe('2 Ko');
    expect(button(one, 'Remplacer…')).toBeDefined();
    must(one.querySelector<HTMLButtonElement>('[aria-label="Retirer contrat.pdf"]')).click();
    await settle();
    expect(host.contract()).toBeNull();
    host.disabled.set(true);
    await settle();
    expect(button(one, 'Choisir…').disabled).toBe(true);
  });
});
