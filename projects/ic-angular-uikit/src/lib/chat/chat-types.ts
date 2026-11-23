import { HttpClient, HttpDownloadProgressEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Un message de la conversation. */
export interface UiChatMessage {
  /** Identifiant unique dans la conversation. */
  id: string;
  /** Auteur : la personne (`user`) ou l'IA (`assistant`). */
  role: 'user' | 'assistant';
  /** Texte : brut pour `user`, Markdown pour `assistant`. */
  content: string;
  /** Date d'envoi (ISO ou `Date`). */
  createdAt?: string | Date;
  /** État d'une réponse : en cours d'écriture, terminée, interrompue par l'utilisateur, en erreur. */
  status?: 'streaming' | 'done' | 'stopped' | 'error';
  /** Message d'erreur affiché sous la réponse (`status: 'error'`). */
  error?: string;
  /** Avis de l'utilisateur sur la réponse. */
  feedback?: 'up' | 'down' | null;
}

/** Ce que reçoit le transport : l'historique à envoyer (sans la réponse en cours) et un signal d'annulation. */
export interface UiChatRequest {
  messages: readonly Pick<UiChatMessage, 'role' | 'content'>[];
  /** Déclenché par « Arrêter » ou la destruction du composant : interrompez la requête. */
  signal: AbortSignal;
}

/**
 * Fonction qui obtient la réponse de l'IA, par morceaux de texte successifs (flux) ou d'un bloc.
 * N'appelez **jamais** l'API d'un fournisseur d'IA depuis le navigateur avec une clé : passez par votre serveur.
 */
export type UiChatTransport = (request: UiChatRequest) => Observable<string> | AsyncIterable<string> | Promise<string>;

/** Ligne du flux NDJSON renvoyé par le serveur (contrat des exemples « Côté serveur »). */
interface ChatStreamLine {
  /** Morceau de texte à ajouter à la réponse. */
  text?: string;
  /** Erreur (réponse interrompue, refus du modèle…), affichée sous la réponse. */
  error?: string;
}

/**
 * Transport HTTP prêt à l'emploi : `POST url` avec `{ messages }`, réponse en flux NDJSON (une ligne JSON par
 * morceau : `{"text":"…"}`, `{"error":"…"}`). Passe par `HttpClient` : le jeton CSRF est ajouté automatiquement.
 * Le flux arrive au fil de l'eau avec `provideHttpClient(withFetch())`.
 *
 * ```ts
 * protected readonly transport = uiChatHttpTransport(inject(HttpClient), '/api/chat');
 * ```
 */
export function uiChatHttpTransport(http: HttpClient, url: string): UiChatTransport {
  return ({ messages }) =>
    new Observable<string>((subscriber) => {
      let read = 0;
      let buffer = '';
      const lines = (chunk: string, final: boolean) => {
        buffer += chunk;
        const parts = buffer.split('\n');
        buffer = final ? '' : (parts.pop() ?? '');
        for (const raw of parts) {
          const line = raw.trim();
          if (!line) continue;
          let data: ChatStreamLine;
          try {
            data = JSON.parse(line) as ChatStreamLine;
          } catch {
            continue;
          }
          if (typeof data.text === 'string') subscriber.next(data.text);
          if (typeof data.error === 'string') {
            subscriber.error(new Error(data.error));
            return;
          }
        }
      };
      const subscription = http
        .post(url, { messages: messages.map(({ role, content }) => ({ role, content })) }, { observe: 'events', reportProgress: true, responseType: 'text' })
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.DownloadProgress) {
              const text = (event as HttpDownloadProgressEvent).partialText ?? '';
              lines(text.slice(read), false);
              read = text.length;
            } else if (event.type === HttpEventType.Response) {
              const text = event.body ?? '';
              lines(text.slice(read), true);
              read = text.length;
            }
          },
          error: (error: { status?: number; error?: unknown }) => {
            const body = typeof error.error === 'string' ? error.error : '';
            let message = 'La réponse n’a pas pu être obtenue.';
            try {
              message = (JSON.parse(body) as { error?: string }).error ?? message;
            } catch {
              if (error.status === 429) message = 'Trop de demandes : réessayez dans un instant.';
            }
            subscriber.error(new Error(message));
          },
          complete: () => subscriber.complete(),
        });
      return () => subscription.unsubscribe();
    });
}
