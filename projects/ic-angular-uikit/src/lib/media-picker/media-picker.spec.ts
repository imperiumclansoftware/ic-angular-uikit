import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiRichTextEditor } from '../rich-text-editor/rich-text-editor';
import { uiMemoryFileSource } from '../file-manager/file-source';
import { UiMediaPicker, UiPickedMedia } from './media-picker';

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
    { name: 'lac.jpg', mimeType: 'image/jpeg', url: '/medias/lac.jpg', width: 800, height: 600, alt: 'Lac de montagne' },
    { name: 'clip.webm', mimeType: 'video/webm', url: '/medias/clip.webm', thumbnailUrl: '/medias/clip.jpg' },
    { name: 'notes.pdf', mimeType: 'application/pdf', url: '/medias/notes.pdf' },
  ]);

@Component({
  imports: [UiMediaPicker, UiRichTextEditor],
  template: `
    <ui-media-picker #picker [source]="source" />
    <ui-rich-text-editor #editor label="Article" [mediaSource]="source" [(value)]="html" />
  `,
})
class Host {
  source = library();
  html = signal('<p>Intro</p>');
  picker = viewChild.required<UiMediaPicker>('picker');
  editor = viewChild.required<UiRichTextEditor>('editor');
}

describe('UiMediaPicker et éditeur', () => {
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
    const pickerEl = () => el.querySelector('ui-media-picker') as HTMLElement;
    const option = (name: string) => [...pickerEl().querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.includes(name));
    const type = async (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await settle();
    };
    const insertButton = () => must([...pickerEl().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Insérer'));
    return { fixture, el, host: fixture.componentInstance, settle, pickerEl, option, type, insertButton };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('bibliothèque filtrée (images, vidéos), texte alternatif obligatoire, image choisie', async () => {
    const { host, settle, option, pickerEl, insertButton, type } = await setup();
    const result = host.picker().pick();
    await settle();
    expect(option('notes.pdf')).toBeUndefined();
    insertButton().click();
    await settle();
    expect(pickerEl().textContent).toContain('Choisissez une image ou une vidéo.');
    must(option('lac.jpg')).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    const alt = must(pickerEl().querySelector<HTMLInputElement>('.ui-mp-picker__fields input'));
    expect(alt.value).toBe('Lac de montagne'); // texte enregistré dans la bibliothèque
    await type(alt, '');
    insertButton().click();
    await settle();
    expect(pickerEl().textContent).toContain('Décrivez l’image, ou cochez « Image décorative ».');
    await type(alt, 'Lac au lever du soleil');
    const caption = pickerEl().querySelectorAll<HTMLInputElement>('.ui-mp-picker__fields input[type="text"], .ui-mp-picker__fields ui-text-field input');
    await type(caption[caption.length - 1], 'Annecy, juin');
    insertButton().click();
    await settle();
    const media = (await result) as UiPickedMedia;
    expect(media).toMatchObject({ kind: 'image', src: '/medias/lac.jpg', alt: 'Lac au lever du soleil', caption: 'Annecy, juin', width: 800, height: 600 });
  });

  it('adresse : refuse javascript:, annule → null', async () => {
    const { host, settle, pickerEl, insertButton, type } = await setup();
    const result = host.picker().pick();
    await settle();
    must([...pickerEl().querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((t) => t.textContent?.includes('Adresse'))).click();
    await settle();
    await type(must(pickerEl().querySelector<HTMLInputElement>('input[type="url"]')), 'javascript:alert(1)');
    expect(pickerEl().textContent).toContain('Adresse refusée');
    insertButton().click();
    await settle();
    must([...pickerEl().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Annuler')).click();
    await settle();
    expect(await result).toBeNull();
  });

  it('éditeur : bouton Image ou vidéo, figure insérée dans la valeur, retirée par son bouton', async () => {
    const { host, el, settle } = await setup();
    expect(el.querySelector('ui-rich-text-editor button[aria-label="Image ou vidéo"]')).not.toBeNull();
    host.editor().insertMedia({ kind: 'video', src: '/medias/clip.webm', alt: 'Clip', poster: '/medias/clip.jpg', caption: 'Notre clip' });
    await settle();
    expect(host.html()).toBe('<p>Intro</p><figure><video src="/medias/clip.webm" poster="/medias/clip.jpg" title="Clip" controls preload="metadata"></video><figcaption>Notre clip</figcaption></figure>');
    const figure = el.querySelector('ui-rich-text-editor figure') as HTMLElement;
    expect(figure.getAttribute('contenteditable')).toBe('false');
    const remove = must(figure.querySelector<HTMLButtonElement>('.ui-rte__figure-remove'));
    expect(remove.getAttribute('aria-label')).toBe('Retirer la vidéo');
    remove.click();
    await settle();
    expect(host.html()).toBe('<p>Intro</p>');
    // Valeur externe avec image : gardée (médias actifs), adresse dangereuse retirée.
    host.html.set('<p>A</p><img src="/x.png" alt="X"><img src="javascript:alert(1)" alt="Y">');
    await settle();
    expect(el.querySelectorAll('ui-rich-text-editor figure')).toHaveLength(1);
  });
});
