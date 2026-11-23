import { Component } from '@angular/core';
import { UiButton, UiFeedPost, UiImage } from 'ic-angular-uikit';

/**
 * Fil d'actualité
 * Une **annonce** officielle (`kind="announcement"`) est mise en valeur : filet d'or, fleuron et étiquette ; `pinned` l'indique épinglée. Une publication ordinaire reste sobre. Date relative (« il y a 3 heures ») avec la date complète en infobulle et dans `datetime`. Emplacements : contenu, `[uiPostMedia]`, `[uiPostActions]`.
 * @order 1
 */
@Component({
  selector: 'doc-feed-example',
  imports: [UiFeedPost, UiButton, UiImage],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <ui-feed-post author="Aurelius" authorRole="Empereur" avatar="demo/imperium/sceau.svg" [date]="hoursAgo(3)" [now]="now" heading="Ouverture de la saison d'hiver" kind="announcement" pinned [branches]="['joueurs', 'developpeurs', 'communicants', 'cine']">
        <p>Membres de l'Imperium, la saison d'hiver s'ouvre le 1er décembre : nouveaux tournois, nouveaux projets, nouvelles soirées. Façonnons la légende ensemble.</p>
        <div uiPostActions><button uiButton size="sm" variant="ghost">Lire la suite</button></div>
      </ui-feed-post>
      <ui-feed-post author="Lumen" authorRole="Membre" [date]="hoursAgo(26)" [now]="now" heading="Critique : la trilogie revisitée" [branches]="['cine']">
        <p>Retour sur notre marathon de dimanche : mise en scène, musique et ce que la version longue apporte vraiment.</p>
        <ui-image uiPostMedia src="demo/forest.svg" alt="Forêt brumeuse, ambiance du film" ratio="16/7" class="media" />
        <div uiPostActions>
          <button uiButton size="sm" variant="ghost" icon="lucide:heart">12</button>
          <button uiButton size="sm" variant="ghost" icon="lucide:message-square">4</button>
        </div>
      </ui-feed-post>
    </div>
  `,
  styles: `.imp { display: grid; gap: 1.75rem; max-width: 42rem; padding: 2rem 1.5rem 1.5rem; border-radius: var(--ui-radius-lg); } .media { --ui-image-radius: var(--ui-radius-md); } p { margin: 0; } [uiPostActions] { display: flex; gap: 0.25rem; }`,
})
export class FeedExample {
  protected readonly now = new Date(2026, 10, 23, 16, 0);
  protected hoursAgo(hours: number): Date {
    return new Date(this.now.getTime() - hours * 3600_000);
  }
}
