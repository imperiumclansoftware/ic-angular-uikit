import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { UiChat, UiChatFeedback } from './chat';
import { UiChatMessage, UiChatRequest, UiChatTransport } from './chat-types';

@Component({
  imports: [UiChat],
  template: `
    <ui-chat
      [transport]="transport()"
      [(messages)]="messages"
      [suggestions]="['Idée A', 'Idée B']"
      [disabled]="disabled()"
      [maxLength]="50"
      welcome="Bonjour"
      assistantName="Robot"
      (messageSent)="sent.push($event)"
      (responseComplete)="completed.push($event)"
      (feedbackChange)="feedback.push($event)"
    />
  `,
})
class Host {
  stream = new Subject<string>();
  requests: UiChatRequest[] = [];
  transport = signal<UiChatTransport | undefined>((req) => {
    this.requests.push(req);
    this.stream = new Subject<string>();
    return this.stream;
  });
  messages = signal<UiChatMessage[]>([]);
  disabled = signal(false);
  sent: UiChatMessage[] = [];
  completed: UiChatMessage[] = [];
  feedback: UiChatFeedback[] = [];
}

describe('UiChat', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await render();
    const host = fixture.componentInstance;
    const input = () => el.querySelector('textarea') as HTMLTextAreaElement;
    const type = async (text: string) => {
      input().value = text;
      input().dispatchEvent(new Event('input'));
      await render();
    };
    const key = async (k: string, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
      input().dispatchEvent(event);
      await render();
      return event;
    };
    const sendButton = () => el.querySelector('.ui-chat__send') as HTMLButtonElement;
    const live = () => el.querySelector('[aria-live="polite"]')?.textContent?.trim();
    return { fixture, el, host, render, input, type, key, sendButton, live };
  }

  afterEach(() => document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove()));

  it('accueil : fil en rôle log, saisie étiquetée, suggestions', async () => {
    const { el, sendButton, host, render } = await setup();
    const log = el.querySelector('[role="log"]') as HTMLElement;
    expect(log.getAttribute('aria-live')).toBe('off');
    expect(log.getAttribute('tabindex')).toBe('0');
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    expect(el.querySelector(`label[for="${textarea.id}"]`)?.textContent).toContain('Votre message');
    expect(textarea.getAttribute('maxlength')).toBe('50');
    expect(sendButton().disabled).toBe(true);
    const suggestions = [...el.querySelectorAll<HTMLButtonElement>('.ui-chat__suggestion')];
    expect(suggestions.map((b) => b.textContent?.trim())).toEqual(['Idée A', 'Idée B']);
    suggestions[1].click();
    await render();
    expect(host.sent.map((m) => m.content)).toEqual(['Idée B']);
    expect(host.requests[0].messages).toEqual([{ role: 'user', content: 'Idée B' }]);
    expect(el.querySelector('.ui-chat__welcome')).toBeNull();
  });

  it('Entrée envoie, Maj+Entrée non ; flux, puis réponse terminée et annoncée', async () => {
    const { el, host, type, key, sendButton, render, live, input } = await setup();
    await type('  Bonjour  ');
    expect((await key('Enter', { shiftKey: true })).defaultPrevented).toBe(false);
    expect(host.sent).toEqual([]);
    expect((await key('Enter')).defaultPrevented).toBe(true);
    expect(host.sent[0].content).toBe('Bonjour');
    expect(input().value).toBe('');
    const [user, assistant] = host.messages();
    expect(user).toMatchObject({ role: 'user', content: 'Bonjour', status: 'done' });
    expect(assistant).toMatchObject({ role: 'assistant', content: '', status: 'streaming' });
    expect(sendButton().getAttribute('aria-label')).toBe('Arrêter la réponse');
    expect(el.querySelector('.ui-chat__typing')).not.toBeNull();
    expect(live()).toBe('Robot rédige une réponse…');

    host.stream.next('Salut ');
    host.stream.next('**toi**');
    await render();
    expect(host.messages()[1].content).toBe('Salut **toi**');
    host.stream.complete();
    await render();
    expect(host.messages()[1].status).toBe('done');
    expect(host.completed.map((m) => m.content)).toEqual(['Salut **toi**']);
    expect(live()).toBe('Robot : Salut toi');
    expect(el.querySelector('.ui-chat__typing')).toBeNull();
    expect(sendButton().getAttribute('aria-label')).toBe('Envoyer');
    // Titres masqués de chaque message (navigation par titres).
    const headings = [...el.querySelectorAll('.ui-chat__msg [role="heading"]')].map((h) => [h.textContent?.trim(), h.getAttribute('aria-level')]);
    expect(headings).toEqual([
      ['Vous :', '3'],
      ['Robot :', '3'],
    ]);
  });

  it('Échap arrête : texte gardé, flux désabonné, note affichée', async () => {
    const { el, host, type, key, render, live } = await setup();
    await type('Question');
    await key('Enter');
    host.stream.next('Début');
    await render();
    expect((await key('Escape')).defaultPrevented).toBe(true);
    expect(host.stream.observed).toBe(false);
    expect(host.messages()[1]).toMatchObject({ content: 'Début', status: 'stopped' });
    expect(el.querySelector('.ui-chat__note')?.textContent).toContain('Réponse interrompue');
    expect(live()).toBe('Réponse interrompue.');
    expect(host.requests[0].signal.aborted).toBe(true);
    // Un morceau tardif n'est plus ajouté.
    host.stream.next('tardif');
    expect(host.messages()[1].content).toBe('Début');
  });

  it('erreur : alerte, Réessayer relance sans renvoyer la réponse en erreur', async () => {
    const { el, host, type, key, render } = await setup();
    await type('Question');
    await key('Enter');
    host.stream.error(new Error('Service saturé.'));
    await render();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Service saturé.');
    const retry = [...el.querySelectorAll<HTMLButtonElement>('.ui-chat__action')].find((b) => b.getAttribute('aria-label') === 'Réessayer');
    if (!retry) throw new Error('bouton Réessayer absent');
    retry.click();
    await render();
    expect(host.requests).toHaveLength(2);
    expect(host.requests[1].messages).toEqual([{ role: 'user', content: 'Question' }]);
    expect(host.messages()).toHaveLength(2);
    expect(host.messages()[1].status).toBe('streaming');
  });

  it('régénérer remplace la dernière réponse ; historique alterné envoyé', async () => {
    const { el, host, type, key, render } = await setup();
    await type('Un');
    await key('Enter');
    host.stream.next('Réponse 1');
    host.stream.complete();
    await type('Deux');
    await key('Enter');
    host.stream.next('Réponse 2');
    host.stream.complete();
    await render();
    expect(host.requests[1].messages.map((m) => m.content)).toEqual(['Un', 'Réponse 1', 'Deux']);
    // Seule la dernière réponse propose « Régénérer ».
    expect(el.querySelectorAll('[aria-label="Régénérer la réponse"]')).toHaveLength(1);
    (el.querySelector('[aria-label="Régénérer la réponse"]') as HTMLButtonElement).click();
    await render();
    expect(host.requests[2].messages.map((m) => m.content)).toEqual(['Un', 'Réponse 1', 'Deux']);
    expect(host.messages().map((m) => m.status)).toEqual(['done', 'done', 'done', 'streaming']);
  });

  it('avis : bouton à bascule (aria-pressed) et événement', async () => {
    const { el, host, type, key, render, live } = await setup();
    await type('Q');
    await key('Enter');
    host.stream.next('R');
    host.stream.complete();
    await render();
    const up = () => el.querySelector('[aria-label="Bonne réponse"]') as HTMLButtonElement;
    expect(up().getAttribute('aria-pressed')).toBe('false');
    up().click();
    await render();
    expect(up().getAttribute('aria-pressed')).toBe('true');
    expect(host.messages()[1].feedback).toBe('up');
    expect(live()).toBe('Merci pour votre avis.');
    up().click();
    await render();
    expect(host.feedback.map((f) => f.feedback)).toEqual(['up', null]);
    expect(up().getAttribute('aria-pressed')).toBe('false');
  });

  it('transports Promise et AsyncIterable ; arrêt d’un AsyncIterable via le signal', async () => {
    const { host, type, key, render } = await setup();
    host.transport.set(() => Promise.resolve('Texte complet'));
    await render();
    await type('A');
    await key('Enter');
    await render();
    expect(host.messages()[1]).toMatchObject({ content: 'Texte complet', status: 'done' });

    let signal: AbortSignal | undefined;
    let release!: () => void;
    host.transport.set(({ signal: s }) => {
      signal = s;
      return (async function* () {
        yield 'un ';
        await new Promise<void>((r) => (release = r));
        yield 'deux';
      })();
    });
    await render();
    await type('B');
    await key('Enter');
    await render();
    expect(host.messages()[3]).toMatchObject({ content: 'un ', status: 'streaming' });
    await key('Escape');
    expect(signal?.aborted).toBe(true);
    release();
    await render();
    expect(host.messages()[3]).toMatchObject({ content: 'un ', status: 'stopped' });
  });

  it('désactivé : ni saisie ni envoi ; longueur bornée', async () => {
    const { host, type, key, render, input, sendButton } = await setup();
    host.disabled.set(true);
    await render();
    expect(input().disabled).toBe(true);
    host.disabled.set(false);
    await render();
    await type('x'.repeat(60));
    expect(sendButton().disabled).toBe(true);
    await type('ok');
    expect(sendButton().disabled).toBe(false);
    await key('Enter');
    expect(host.sent).toHaveLength(1);
  });

  it('clear() vide la conversation et arrête le flux', async () => {
    const { fixture, host, type, key, render } = await setup();
    await type('Q');
    await key('Enter');
    const chat = fixture.debugElement.children[0].componentInstance as UiChat;
    chat.clear();
    await render();
    expect(host.messages()).toEqual([]);
    expect(host.stream.observed).toBe(false);
  });
});
