import { Component, signal, viewChild } from '@angular/core';
import { UiButton, UiChat, UiChatHeader, UiChatMessage } from 'ic-angular-uikit';
import { demoAssistant } from './demo-assistant';

/**
 * Assistant conversationnel
 * `transport` reçoit l'historique et renvoie la réponse en flux : elle s'affiche au fil de l'écriture, en Markdown (titres, listes, tableaux, blocs de code avec bouton Copier), rendu sans `innerHTML`. Pendant l'écriture, le bouton d'envoi devient Arrêter (ou touche Échap). Sous chaque réponse : copier, régénérer, avis 👍 / 👎. Entrée envoie, Maj+Entrée va à la ligne. Ici, l'assistant est simulé (`demo-assistant.ts`) : demandez un exemple de code, un tableau ou un résumé.
 * @order 1
 */
@Component({
  selector: 'doc-chat-assistant-example',
  imports: [UiChat, UiChatHeader, UiButton],
  template: `
    <div class="frame">
      <ui-chat
        #chat
        assistantName="Assistant IC"
        [transport]="assistant"
        [(messages)]="messages"
        [suggestions]="suggestions"
        welcome="Bonjour ! Je suis l'**assistant de démonstration**. Posez-moi une question ou choisissez une suggestion."
      >
        <div uiChatHeader class="header">
          <strong>Assistant IC</strong>
          <span class="badge">démo</span>
          <button uiButton variant="ghost" size="sm" icon="lucide:plus" [disabled]="!messages().length" (click)="chat.clear()">Nouvelle conversation</button>
        </div>
      </ui-chat>
    </div>
  `,
  styles: `
    .frame { height: 36rem; overflow: hidden; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); }
    .header { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem 0.5rem 1rem; border-bottom: 1px solid var(--ui-color-border); background: var(--ui-color-surface); }
    .header button { margin-inline-start: auto; }
    .badge { padding: 0 0.5rem; border-radius: 999px; background: var(--ui-color-neutral-subtle); color: var(--ui-color-neutral-text); font-size: 0.75rem; }
  `,
})
export class ChatAssistantExample {
  protected readonly chat = viewChild.required<UiChat>('chat');
  protected readonly assistant = demoAssistant;
  protected readonly messages = signal<UiChatMessage[]>([]);
  protected readonly suggestions = ['Montre-moi un exemple de code Angular', 'Compare les offres dans un tableau', 'Résume la réunion de ce matin'];
}
