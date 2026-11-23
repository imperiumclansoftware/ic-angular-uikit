import { Observable } from 'rxjs';
import { UiChatRequest, UiChatTransport } from 'ic-angular-uikit';

/**
 * Assistant simulé pour la documentation : réponses préparées, envoyées mot à mot comme un vrai flux.
 * Dans une application, utilisez `uiChatHttpTransport(http, '/api/chat')` et un serveur (onglet « Côté serveur »).
 */
const ANSWERS: { keywords: RegExp; text: string }[] = [
  {
    keywords: /tableau|comparer|comparaison/i,
    text: `Voici une comparaison des trois offres :

| Offre | Prix mensuel | Utilisateurs | Support |
| --- | ---: | :---: | --- |
| Essentiel | 9 € | 3 | E-mail |
| Équipe | 29 € | 15 | E-mail et chat |
| Entreprise | Sur devis | Illimité | Dédié, 24 h/24 |

**À retenir :** l'offre *Équipe* convient à la plupart des PME.`,
  },
  {
    keywords: /code|angular|composant|exemple/i,
    text: `Bien sûr ! Voici un composant Angular minimal qui affiche une conversation :

\`\`\`ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UiChat, uiChatHttpTransport } from 'ic-angular-uikit';

@Component({
  selector: 'app-assistant',
  imports: [UiChat],
  template: \`<ui-chat [transport]="transport" />\`,
})
export class Assistant {
  protected readonly transport = uiChatHttpTransport(inject(HttpClient), '/api/chat');
}
\`\`\`

Points importants :

1. La **clé de l'API** reste sur le serveur.
2. Le serveur valide l'historique et limite le nombre de demandes.
3. La réponse arrive en flux : elle s'affiche au fil de l'écriture.`,
  },
  {
    keywords: /réunion|résum|compte.rendu/i,
    text: `### Compte rendu de la réunion

- **Décisions**
  - Lancement de la version 2 le 15 mars.
  - Budget marketing augmenté de 10 %.
- **Actions**
  - Camille : finaliser la maquette (vendredi).
  - Yanis : préparer la démo client.

> Prochaine réunion : jeudi 10 h, salle Turing.`,
  },
];

const DEFAULT_ANSWER = `Je suis un **assistant simulé** : je ne fais que rejouer des réponses préparées pour la démonstration.

Essayez de me demander :
- un *exemple de code* Angular,
- un *tableau* comparatif,
- le *résumé* d'une réunion.

Dans une vraie application, ce composant affiche les réponses de votre IA (par exemple Claude), obtenues par votre serveur.`;

function pick(question: string): string {
  return ANSWERS.find((a) => a.keywords.test(question))?.text ?? DEFAULT_ANSWER;
}

/** Découpe en petits morceaux (mots et espaces), comme les jetons d'un vrai flux. */
function chunks(text: string): string[] {
  return text.match(/\s+|[^\s]{1,6}/g) ?? [text];
}

/** Transport simulé, sous forme d'itérateur asynchrone (respecte le signal d'annulation). */
export const demoAssistant: UiChatTransport = (request: UiChatRequest) => {
  const question = request.messages.at(-1)?.content ?? '';
  return (async function* () {
    await wait(450, request.signal);
    for (const chunk of chunks(pick(question))) {
      if (request.signal.aborted) return;
      yield chunk;
      await wait(18 + (chunk.length % 4) * 9, request.signal);
    }
  })();
};

/** Même assistant sous forme d'Observable ; échoue sur demande pour montrer la gestion d'erreur. */
export const demoAssistantObservable: UiChatTransport = (request: UiChatRequest) =>
  new Observable<string>((subscriber) => {
    const question = request.messages.at(-1)?.content ?? '';
    const parts = /erreur/i.test(question) ? chunks('Je commence à répondre… ') : chunks(pick(question));
    let index = 0;
    const timer = setInterval(() => {
      if (index < parts.length) {
        subscriber.next(parts[index++]);
      } else if (/erreur/i.test(question)) {
        clearInterval(timer);
        subscriber.error(new Error('Le service d’IA ne répond pas (erreur simulée). Réessayez.'));
      } else {
        clearInterval(timer);
        subscriber.complete();
      }
    }, 30);
    return () => clearInterval(timer);
  });

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
