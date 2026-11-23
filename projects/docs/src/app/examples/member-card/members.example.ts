import { Component } from '@angular/core';
import { UiButton, UiMemberCard } from 'ic-angular-uikit';
import { MEMBERS } from './members';

/**
 * Cartes membres
 * Avatar encadré d'un double anneau doré (initiales si l'image manque), pseudo en Cinzel, rôle, statut de présence (pastille de **forme** différente et texte) et une pastille par branche : un membre peut appartenir à plusieurs branches. Avec `href`, toute la carte devient le lien du profil (un seul arrêt au clavier).
 * @order 1
 */
@Component({
  selector: 'doc-members-example',
  imports: [UiMemberCard, UiButton],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      @for (member of members; track member.pseudo; let first = $first) {
        <ui-member-card
          [pseudo]="member.pseudo"
          [role]="member.role"
          [branches]="member.branches"
          [presence]="member.presence"
          [avatar]="member.avatar"
          [href]="first ? undefined : '#profil-' + member.pseudo"
        >
          @if (first) {
            <div uiMemberActions><button uiButton size="sm" variant="secondary">Écrire</button></div>
          }
        </ui-member-card>
      }
    </div>
  `,
  styles: `.imp { display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: 1.25rem; padding: 1.5rem; border-radius: var(--ui-radius-lg); }`,
})
export class MembersExample {
  protected readonly members = MEMBERS;
}
