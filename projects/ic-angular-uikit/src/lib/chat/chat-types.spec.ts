import { HttpClient, HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UiChatRequest, uiChatHttpTransport } from './chat-types';

describe('uiChatHttpTransport', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const transport = uiChatHttpTransport(TestBed.inject(HttpClient), '/api/chat');
    const http = TestBed.inject(HttpTestingController);
    const chunks: string[] = [];
    const state: { error?: string; complete: boolean } = { complete: false };
    const subscription = (
      transport({
        // Champs en trop (appel depuis du JavaScript) : ils ne doivent pas partir au serveur.
        messages: [
          { id: 'a', role: 'user', content: 'Bonjour', status: 'done', createdAt: 'x' },
          { id: 'b', role: 'assistant', content: 'Salut', feedback: 'up' },
          { id: 'c', role: 'user', content: 'Suite' },
        ] as unknown as UiChatRequest['messages'],
        signal: new AbortController().signal,
      }) as import('rxjs').Observable<string>
    ).subscribe({ next: (t) => chunks.push(t), error: (e: Error) => (state.error = e.message), complete: () => (state.complete = true) });
    const req = http.expectOne('/api/chat');
    return { req, chunks, state, subscription, http };
  }

  it('envoie seulement role et content, lit le flux NDJSON au fil de l’eau', () => {
    const { req, chunks, state } = setup();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      messages: [
        { role: 'user', content: 'Bonjour' },
        { role: 'assistant', content: 'Salut' },
        { role: 'user', content: 'Suite' },
      ],
    });
    expect(req.request.reportProgress).toBe(true);
    // Ligne coupée entre deux événements de progression.
    req.event({ type: HttpEventType.DownloadProgress, loaded: 1, partialText: '{"text":"Bon' });
    expect(chunks).toEqual([]);
    req.event({ type: HttpEventType.DownloadProgress, loaded: 2, partialText: '{"text":"Bon"}\n{"text":"jour ✓"}\nligne invalide\n' });
    expect(chunks).toEqual(['Bon', 'jour ✓']);
    req.flush('{"text":"Bon"}\n{"text":"jour ✓"}\nligne invalide\n{"text":" !"}');
    expect(chunks).toEqual(['Bon', 'jour ✓', ' !']);
    expect(state.complete).toBe(true);
  });

  it('une ligne {"error"} termine le flux en erreur', () => {
    const { req, chunks, state } = setup();
    req.event({ type: HttpEventType.DownloadProgress, loaded: 1, partialText: '{"text":"début"}\n{"error":"Réponse tronquée."}\n' });
    expect(chunks).toEqual(['début']);
    expect(state.error).toBe('Réponse tronquée.');
  });

  it('erreurs HTTP : message du serveur, ou message générique (429 compris)', () => {
    let s = setup();
    s.req.flush('{"error":"messages : 1 à 40 messages."}', { status: 422, statusText: 'Unprocessable' });
    expect(s.state.error).toBe('messages : 1 à 40 messages.');
    TestBed.resetTestingModule();
    s = setup();
    s.req.flush('Too Many Requests', { status: 429, statusText: 'Too Many' });
    expect(s.state.error).toBe('Trop de demandes : réessayez dans un instant.');
    TestBed.resetTestingModule();
    s = setup();
    s.req.flush('<html>', { status: 502, statusText: 'Bad Gateway' });
    expect(s.state.error).toBe('La réponse n’a pas pu être obtenue.');
  });

  it('se désabonner annule la requête', () => {
    const { req, subscription } = setup();
    subscription.unsubscribe();
    expect(req.cancelled).toBe(true);
  });
});
