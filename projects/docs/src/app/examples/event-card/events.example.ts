import { Component } from '@angular/core';
import { UiButton, UiEventCard } from 'ic-angular-uikit';

/**
 * Événements et rencontres
 * Médaillon de date, titre, horaire en toutes lettres, lieu, participants, branches concernées et statut : calculé depuis `start` / `end` (À venir, En cours, Terminé) ou forcé (`status="cancelled"`). Le cadre reprend les volutes réduites d'`ui-arabesque-frame` ; `variant` lui donne la couleur d'une branche. Ici, `now` fige la date du jour pour la démonstration.
 * @order 1
 */
@Component({
  selector: 'doc-events-example',
  imports: [UiEventCard, UiButton],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <ui-event-card heading="Tournoi des Quatre Couronnes" start="2026-12-05T20:00" end="2026-12-05T23:30" location="Serveur Discord · Arène" [branches]="['joueurs']" [attendees]="18" [capacity]="32" variant="joueurs" [now]="now">
        Élimination directe, parties en 3 manches. Lots pour les finalistes.
        <div uiEventActions><button uiButton size="sm">S'inscrire</button><button uiButton size="sm" variant="ghost">Règlement</button></div>
      </ui-event-card>
      <ui-event-card heading="Marathon Seigneur des Anneaux" start="2026-11-23T14:00" end="2026-11-23T23:59" location="Salon vocal · Salle obscure" [branches]="['cine', 'communicants']" [attendees]="9" variant="cine" [now]="now" />
      <ui-event-card heading="Hackathon de la Forge" start="2026-11-08T10:00" end="2026-11-09T18:00" location="Lyon · La Cordée" [branches]="['developpeurs']" [attendees]="24" [now]="now" />
      <ui-event-card heading="Live du Héraut" start="2026-12-12T19:00" location="Twitch" [branches]="['communicants']" status="cancelled" [now]="now" />
    </div>
  `,
  styles: `.imp { display: grid; grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr)); gap: 1.25rem; padding: 1.5rem; border-radius: var(--ui-radius-lg); } [uiEventActions] { display: flex; gap: 0.5rem; }`,
})
export class EventsExample {
  protected readonly now = new Date(2026, 10, 23, 16, 0);
}
