// app.config.ts — le jeton CSRF (cookie XSRF-TOKEN) est renvoyé automatiquement dans l'en-tête X-XSRF-TOKEN.
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withXsrfConfiguration } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  // withFetch : la réponse de l'IA arrive au fil de l'eau (flux lu morceau par morceau).
  providers: [provideHttpClient(withFetch(), withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))],
};

// assistant.ts — ui-chat branché sur POST /api/chat (réponse en flux NDJSON).
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UiChat, UiChatFeedback, UiChatMessage, uiChatHttpTransport } from 'ic-angular-uikit';

@Component({
  selector: 'app-assistant',
  imports: [UiChat],
  template: `
    <ui-chat
      assistantName="Assistant"
      [transport]="transport"
      [(messages)]="messages"
      [maxLength]="8000"
      [suggestions]="['Résume ce document', 'Explique-moi les signaux Angular']"
      welcome="Bonjour ! Posez votre question."
      (feedbackChange)="saveFeedback($event)"
    />
  `,
  styles: `:host { display: block; height: 100dvh; }`,
})
export class Assistant {
  private readonly http = inject(HttpClient);
  // Envoie { messages: [{ role, content }] } et lit les lignes {"text":…} / {"error":…} au fil de l'eau.
  // « Arrêter » désabonne la requête : le serveur voit la déconnexion et annule l'appel à l'API.
  protected readonly transport = uiChatHttpTransport(this.http, '/api/chat');
  // Historique en mémoire seulement (pas de localStorage : il peut contenir des données personnelles).
  protected readonly messages = signal<UiChatMessage[]>([]);

  protected saveFeedback(event: UiChatFeedback): void {
    // À envoyer à votre API si vous collectez les avis (id du message + avis, sans le texte si inutile).
    console.debug('avis', event.message.id, event.feedback);
  }
}
