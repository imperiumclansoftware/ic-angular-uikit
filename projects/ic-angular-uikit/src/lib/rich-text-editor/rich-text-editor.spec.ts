import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiRichText } from './rich-text';
import { UiRichTextEditor } from './rich-text-editor';

@Component({
  imports: [UiRichTextEditor, UiRichText, ReactiveFormsModule],
  template: `
    <ui-rich-text-editor id="free" label="Article" placeholder="Écrire…" [(value)]="html" />
    <ui-rich-text-editor id="form" label="Commentaire" [formControl]="control" />
    <ui-rich-text id="view" [html]="html()" externalLinks="_blank" />
  `,
})
class Host {
  html = signal('<p>Bonjour <b>Ada</b><script>alert(1)</script></p><p><a href="https://ailleurs.fr">lien</a> <a href="/local">local</a></p>');
  control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
}

describe('UiRichTextEditor / UiRichText', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const content = (id: string) => el.querySelector(`#${id} .ui-rte__content`) as HTMLElement;
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, host: fixture.componentInstance, content, render };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('affiche la valeur nettoyée ; zone éditable accessible', async () => {
    const { content, el } = await setup();
    const free = content('free');
    expect(free.querySelector('script')).toBeNull();
    expect(free.querySelector('b, strong')?.textContent).toBe('Ada');
    expect(free.getAttribute('role')).toBe('textbox');
    expect(free.getAttribute('aria-multiline')).toBe('true');
    expect(free.getAttribute('contenteditable')).toBe('true');
    expect(free.getAttribute('aria-labelledby')).toBe(el.querySelector('#free .ui-field__label')?.id);
    expect(el.querySelector('#free [role="toolbar"]')?.getAttribute('aria-label')).toBe('Mise en forme : Article');
  });

  it('saisie : valeur émise nettoyée, historique annuler / rétablir', async () => {
    const { content, host, render } = await setup();
    const free = content('free');
    const p = document.createElement('p');
    p.append('Ajout ', Object.assign(document.createElement('span'), { textContent: 'sans style' }));
    free.append(p);
    free.dispatchEvent(new InputEvent('input', { inputType: 'insertParagraph', bubbles: true }));
    await render();
    expect(host.html()).toBe('<p>Bonjour <strong>Ada</strong></p><p><a href="https://ailleurs.fr">lien</a> <a href="/local">local</a></p><p>Ajout sans style</p>');

    free.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    await render();
    expect(host.html()).not.toContain('Ajout');
    free.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
    await render();
    expect(host.html()).toContain('Ajout sans style');
  });

  it('valeur modifiée de l’extérieur : contenu reconstruit', async () => {
    const { content, host, render } = await setup();
    host.html.set('<h2>Nouveau</h2>');
    await render();
    const free = content('free');
    expect(free.children.length).toBe(1);
    expect(free.firstElementChild?.tagName).toBe('H2');
    expect(free.textContent).toBe('Nouveau');
  });

  it('formulaire : valeur vide quand rien n’est saisi, désactivation', async () => {
    const { content, host, render } = await setup();
    const form = content('form');
    expect(host.control.hasError('required')).toBe(true);
    form.append(Object.assign(document.createElement('p'), { textContent: 'Texte' }));
    form.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    await render();
    expect(host.control.value).toBe('<p>Texte</p>');
    form.replaceChildren(document.createElement('p'));
    form.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
    await render();
    expect(host.control.value).toBe('');
    expect(form.classList).toContain('ui-rte__content--empty');
    host.control.disable();
    await render();
    expect(form.getAttribute('contenteditable')).toBe('false');
    expect(form.getAttribute('aria-disabled')).toBe('true');
  });

  it('listes gérées par le composant (sans execCommand)', async () => {
    const { content, el, host, render } = await setup();
    const free = content('free');
    const first = free.querySelector('p') as HTMLElement;
    free.focus();
    const range = document.createRange();
    range.setStart(first.firstChild as Text, 3);
    range.collapse(true);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    (el.querySelector('#free [aria-label="Liste à puces"]') as HTMLButtonElement).click();
    await render();
    expect(host.html().startsWith('<ul><li>Bonjour <strong>Ada</strong></li></ul>')).toBe(true);
    (el.querySelector('#free [aria-label="Liste à puces"]') as HTMLButtonElement).click();
    await render();
    expect(host.html().startsWith('<p>Bonjour <strong>Ada</strong></p>')).toBe(true);
  });

  it('ui-rich-text : contenu reconstruit, liens externes protégés', async () => {
    const { el } = await setup();
    const view = el.querySelector('#view') as HTMLElement;
    expect(view.querySelector('script')).toBeNull();
    const [external, local] = Array.from(view.querySelectorAll('a'));
    expect(external.getAttribute('rel')).toBe('noopener noreferrer nofollow ugc');
    expect(external.getAttribute('target')).toBe('_blank');
    expect(local.hasAttribute('rel')).toBe(false);
  });
});
