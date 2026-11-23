import { Component, signal } from '@angular/core';
import { UiTable, UiTableColumn, UiTablePageSize } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

interface Ticket {
  id: number;
  subject: string;
  team: string;
  priority: 'Basse' | 'Normale' | 'Haute';
  hours: number;
}

const SUBJECTS = ['Connexion impossible', 'Facture en double', 'Export PDF vide', 'Lenteur du tableau de bord', 'Mot de passe oublié', 'Erreur 500 à l’envoi'];
const TEAMS = ['Support', 'Facturation', 'Produit', 'Infrastructure'];

const TICKETS: Ticket[] = Array.from({ length: 128 }, (_, i) => ({
  id: 4000 + i,
  subject: SUBJECTS[(i * 7) % SUBJECTS.length],
  team: TEAMS[(i * 3) % TEAMS.length],
  priority: (['Basse', 'Normale', 'Haute'] as const)[(i * 5) % 3],
  hours: 1 + ((i * 13) % 40),
}));

/**
 * Pagination et ordre des colonnes
 * `paginated` découpe les lignes en pages : liste « Lignes par page » (`pageSizeOptions`, défaut 10 / 25 / 50 / 100 / Auto), numéros de page avec ellipses, première / précédente / suivante / dernière page. La page revient à 1 quand la recherche, les filtres ou le tri changent. `reorderable` permet de **réordonner les colonnes** : glisser-déposer des en-têtes, ou au clavier avec les boutons Monter / Descendre du menu « Colonnes » (combinable avec `columnToggle`). Tout est lié en bidirectionnel : `[(page)]`, `[(pageSize)]`, `[(columnOrder)]` — pratique pour mémoriser les préférences de l'utilisateur.
 * @order 4
 */
@Component({
  selector: 'doc-table-pagination-example',
  imports: [UiTable, EventLogView],
  template: `
    <ui-table
      caption="Tickets"
      [data]="tickets"
      [columns]="columns"
      [trackBy]="byId"
      searchable
      columnToggle
      reorderable
      paginated
      dense
      [(page)]="page"
      [(pageSize)]="pageSize"
      [(columnOrder)]="order"
      (paginationChange)="log.add('paginationChange', $event)"
      (columnOrderChange)="log.add('columnOrderChange', $event)"
    />
    <doc-event-log [log]="log" />
  `,
})
export class TablePaginationExample {
  protected readonly tickets = TICKETS;
  protected readonly page = signal(1);
  protected readonly pageSize = signal<UiTablePageSize>(10);
  protected readonly order = signal<readonly string[] | null>(null);
  protected readonly log = new EventLog();
  protected readonly byId = (t: Ticket) => t.id;
  protected readonly columns: UiTableColumn<Ticket>[] = [
    { key: 'id', header: 'N°', sortable: true, width: '6rem' },
    { key: 'subject', header: 'Sujet', sortable: true },
    { key: 'team', header: 'Équipe', sortable: true },
    { key: 'priority', header: 'Priorité', sortable: true },
    { key: 'hours', header: 'Heures', sortable: true, align: 'end' },
  ];
}
