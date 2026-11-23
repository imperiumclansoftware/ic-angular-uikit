import { Component, signal } from '@angular/core';
import { UiBadge, UiCell, UiTable, UiTableColumn, UiTableFilters } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

interface Member {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Éditeur' | 'Lecteur';
  city: string;
  active: boolean;
  projects: number;
  /** Date d'arrivée (AAAA-MM-JJ). */
  joined: string;
}

/**
 * Recherche, filtres avancés, dates et masquage de colonnes
 * Trois options de la table : `searchable` (recherche sur les colonnes visibles, sans accents ni casse), `filterable` (une ligne de filtres) et `columnToggle` (bouton « Colonnes » ; l'e-mail est masqué au départ, le nom n'est pas masquable). Filtres **avancés** (`advanced: true`, ou `operators` pour en restreindre la liste) : le nom propose commence par / finit par / égal à…, l'e-mail seulement trois opérateurs, les projets =, >, entre… La colonne « Arrivée » utilise le filtre **date** : entre deux dates, le, avant, après, aujourd'hui, 7 / 30 derniers jours, ce mois-ci, cette année. Tout est lié en bidirectionnel : `[(search)]`, `[(filters)]`, `[(hiddenColumns)]`.
 * @order 3
 */
@Component({
  selector: 'doc-table-filters-example',
  imports: [UiTable, UiCell, UiBadge, EventLogView],
  template: `
    <ui-table
      caption="Membres"
      [data]="members"
      [columns]="columns"
      [trackBy]="byId"
      searchable
      filterable
      columnToggle
      striped
      [(search)]="search"
      [(filters)]="filters"
      [(hiddenColumns)]="hidden"
      (searchChange)="log.add('searchChange', $event)"
      (filtersChange)="log.add('filtersChange', $event)"
      (hiddenColumnsChange)="log.add('hiddenColumnsChange', $event)"
    >
      <ng-template uiCell="role" let-value="value">
        <ui-badge [tone]="value === 'Admin' ? 'primary' : 'neutral'">{{ value }}</ui-badge>
      </ng-template>
      <ng-template uiCell="joined" let-value="value">{{ formatDate(value) }}</ng-template>
      <ng-template uiCell="active" let-value="value">
        <ui-badge [tone]="value ? 'success' : 'neutral'" dot pill>{{ value ? 'Actif' : 'Suspendu' }}</ui-badge>
      </ng-template>
    </ui-table>
    <doc-event-log [log]="log" />
  `,
})
export class TableFiltersExample {
  protected readonly search = signal('');
  protected readonly filters = signal<UiTableFilters>({});
  protected readonly hidden = signal<readonly string[] | null>(null);
  protected readonly log = new EventLog();
  protected readonly byId = (m: Member) => m.id;

  protected readonly columns: UiTableColumn<Member>[] = [
    { key: 'name', header: 'Nom', sortable: true, hideable: false, filter: { type: 'text', advanced: true } },
    { key: 'email', header: 'E-mail', hidden: true, filter: { type: 'text', operators: ['startsWith', 'endsWith', 'equals'] } },
    { key: 'role', header: 'Rôle', sortable: true, filter: { type: 'select' } },
    { key: 'city', header: 'Ville', sortable: true, filter: { type: 'select' } },
    { key: 'active', header: 'Statut', filter: { type: 'boolean', trueLabel: 'Actif', falseLabel: 'Suspendu' } },
    { key: 'projects', header: 'Projets', sortable: true, align: 'end', filter: { type: 'number', advanced: true } },
    { key: 'joined', header: 'Arrivée', sortable: true, width: '11rem', filter: { type: 'date', advanced: true } },
  ];

  protected readonly members: Member[] = [
    ['Ada Lovelace', 'Admin', 'Londres', true, 12],
    ['Alan Turing', 'Éditeur', 'Manchester', true, 7],
    ['Grace Hopper', 'Éditeur', 'New York', false, 23],
    ['Élodie Martin', 'Lecteur', 'Paris', true, 3],
    ['Margaret Hamilton', 'Admin', 'Boston', true, 18],
    ['Linus Torvalds', 'Lecteur', 'Helsinki', true, 4],
    ['Katherine Johnson', 'Éditeur', 'Hampton', true, 15],
    ['Tim Berners-Lee', 'Admin', 'Londres', false, 9],
    ['Hédy Lamarr', 'Lecteur', 'Vienne', true, 2],
    ['Edsger Dijkstra', 'Éditeur', 'Rotterdam', false, 11],
    ['Barbara Liskov', 'Admin', 'Boston', true, 20],
    ['Donald Knuth', 'Éditeur', 'Milwaukee', true, 31],
    ['Frances Allen', 'Lecteur', 'New York', true, 6],
    ['Ken Thompson', 'Éditeur', 'New Orleans', false, 14],
    ['Radia Perlman', 'Lecteur', 'Portsmouth', true, 8],
    ['Annie Easley', 'Lecteur', 'Birmingham', true, 5],
  ].map(([name, role, city, active, projects], i) => ({
    // Dates d'arrivée réparties autour d'aujourd'hui, pour que « 7 derniers jours », « ce mois-ci »… aient des résultats.
    joined: daysAgo([0, 2, 5, 9, 16, 28, 45, 70, 120, 200, 320, 400, 500, 640, 800, 3][i]),
    id: i + 1,
    name: name as string,
    email: (name as string).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.') + '@exemple.fr',
    role: role as Member['role'],
    city: city as string,
    active: active as boolean,
    projects: projects as number,
  }));

  protected formatDate(value: unknown): string {
    return new Date(String(value) + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
