import { Component, signal } from '@angular/core';
import { UiChat, UiChatFeedback, UiChatMessage } from 'ic-angular-uikit';
import { demoAssistantObservable } from './demo-assistant';

/**
 * Historique, événements et erreurs
 * `[(messages)]` contient toute la conversation (à enregistrer pour la reprendre) ; ici, elle démarre avec un historique. Les événements `messageSent`, `responseComplete` (avec son `status` : `done`, `stopped`, `error`) et `feedbackChange` permettent de journaliser ou d'envoyer les avis. Le transport est ici un `Observable` ; écrivez « erreur » pour voir une réponse qui échoue en cours de route, puis « Réessayer ». `showTimestamps` affiche l'heure des messages.
 * @order 2
 */
@Component({
  selector: 'doc-chat-events-example',
  imports: [UiChat],
  template: `
    <div class="layout">
      <div class="frame">
        <ui-chat
          ariaLabel="Conversation avec le support (démo)"
          assistantName="Support"
          userName="Marie"
          showTimestamps
          disclaimer=""
          [transport]="assistant"
          [(messages)]="messages"
          (messageSent)="log('messageSent', $event.content)"
          (responseComplete)="log('responseComplete', $event.status + ' — ' + $event.content.length + ' caractères')"
          (feedbackChange)="onFeedback($event)"
        />
      </div>
      <section class="journal" aria-labelledby="chat-journal-title">
        <h4 id="chat-journal-title">Événements</h4>
        <ol>
          @for (entry of journal(); track $index) {
            <li><code>{{ entry.name }}</code> {{ entry.detail }}</li>
          } @empty {
            <li class="empty">Aucun événement pour le moment.</li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; align-items: start; }
    .frame { height: 28rem; overflow: hidden; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); }
    .journal h4 { margin: 0 0 0.5rem; font-size: 0.875rem; }
    .journal ol { display: grid; gap: 0.25rem; max-height: 26rem; margin: 0; padding-inline-start: 1.25rem; overflow: auto; font-size: 0.8125rem; }
    .empty { color: var(--ui-color-text-muted); list-style: none; margin-inline-start: -1.25rem; }
  `,
})
export class ChatEventsExample {
  protected readonly assistant = demoAssistantObservable;
  protected readonly journal = signal<{ name: string; detail: string }[]>([]);
  protected readonly messages = signal<UiChatMessage[]>([
    { id: 'm1', role: 'user', content: 'Bonjour, ma commande n° 4521 n’est pas arrivée.', createdAt: '2026-11-23T09:12:00', status: 'done' },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Bonjour Marie ! La commande **4521** est partie hier et sera livrée **demain avant 13 h**.\n\nSouhaitez-vous recevoir le lien de suivi par e-mail ?',
      createdAt: '2026-11-23T09:12:05',
      status: 'done',
    },
  ]);

  protected log(name: string, detail: string): void {
    this.journal.update((list) => [...list, { name, detail }]);
  }

  protected onFeedback(event: UiChatFeedback): void {
    this.log('feedbackChange', event.feedback ?? 'retiré');
  }
}
