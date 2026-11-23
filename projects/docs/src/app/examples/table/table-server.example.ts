import { Component, effect, signal, untracked } from '@angular/core';
import { UiTable, UiTableColumn, UiTableFilters, UiTablePage, UiTableRange, UiTableSort } from 'ic-angular-uikit';

interface Order {
  id: string;
  customer: string;
  status: 'Payée' | 'En attente' | 'Annulée';
  total: number;
}

const ALL: Order[] = Array.from({ length: 140 }, (_, i) => ({
  id: `CMD-${1000 + i}`,
  customer: ['Ada', 'Alan', 'Grace', 'Linus', 'Hédy'][i % 5] + ' ' + ['Martin', 'Bernard', 'Petit', 'Durand'][i % 4],
  status: (['Payée', 'En attente', 'Annulée'] as const)[i % 3],
  total: 20 + ((i * 37) % 480),
}));

/**
 * Filtrage et pagination côté serveur
 * Avec `manualFilter`, `manualSort` et `manualPagination`, la table n'applique rien elle-même : elle émet la recherche, les filtres, le tri et la page (`paginationChange` donne la page et la taille effective, y compris en mode Auto), et affiche les lignes renvoyées ; `totalItems` indique le nombre total côté serveur. Ici une « API » simulée répond après 400 ms. Les options d'un filtre `select` sont fournies (`options`), puisque la table ne voit qu'une partie des données.
 * @order 6
 */
@Component({
  selector: 'doc-table-server-example',
  imports: [UiTable],
  template: `
    <ui-table
      caption="Commandes (filtrage serveur)"
      [data]="rows()"
      [columns]="columns"
      searchable
      filterable
      manualFilter
      manualSort
      dense
      [emptyText]="loading() ? 'Chargement…' : 'Aucune commande'"
      [(search)]="search"
      [(filters)]="filters"
      [(sort)]="sort"
      paginated
      manualPagination
      [totalItems]="total()"
      [pageSizeOptions]="[10, 20, 50]"
      (paginationChange)="pagination.set($event)"
    >
      <span uiTableToolbar class="info" aria-live="polite">{{ loading() ? 'Chargement…' : total() + ' résultat(s) côté serveur' }}</span>
    </ui-table>
  `,
  styles: `.info { margin-left: auto; font-size: 0.75rem; color: var(--ui-color-text-muted); }`,
})
export class TableServerExample {
  protected readonly search = signal('');
  protected readonly filters = signal<UiTableFilters>({});
  protected readonly sort = signal<UiTableSort | null>(null);
  protected readonly pagination = signal<UiTablePage>({ page: 1, pageSize: 10 });
  protected readonly rows = signal<Order[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly columns: UiTableColumn<Order>[] = [
    { key: 'id', header: 'N°', sortable: true, width: '8rem' },
    { key: 'customer', header: 'Client', sortable: true, filter: { type: 'text' } },
    {
      key: 'status',
      header: 'Statut',
      filter: { type: 'select', options: ['Payée', 'En attente', 'Annulée'].map((s) => ({ value: s, label: s })) },
    },
    { key: 'total', header: 'Total (€)', sortable: true, align: 'end', filter: { type: 'number' } },
  ];

  constructor() {
    // Chaque changement de recherche, filtres, tri ou page déclenche une « requête » (page et taille → LIMIT / OFFSET).
    effect((onCleanup) => {
      const query = { search: this.search(), filters: this.filters(), sort: this.sort(), ...this.pagination() };
      untracked(() => this.loading.set(true));
      const timer = setTimeout(() => {
        const result = this.fakeApi(query.search, query.filters, query.sort);
        const start = (query.page - 1) * query.pageSize;
        this.rows.set(result.slice(start, start + query.pageSize));
        this.total.set(result.length);
        this.loading.set(false);
      }, 400);
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** Simule le filtrage et le tri faits par le serveur (en vrai : paramètres d'une requête HTTP). */
  private fakeApi(search: string, filters: UiTableFilters, sort: UiTableSort | null): Order[] {
    const q = search.trim().toLowerCase();
    const range = (filters['total'] as UiTableRange | undefined) ?? {};
    let result = ALL.filter(
      (o) =>
        (!q || `${o.id} ${o.customer} ${o.status}`.toLowerCase().includes(q)) &&
        (!filters['customer'] || o.customer.toLowerCase().includes(String(filters['customer']).toLowerCase())) &&
        (!filters['status'] || o.status === filters['status']) &&
        (range.min == null || o.total >= range.min) &&
        (range.max == null || o.total <= range.max),
    );
    if (sort) {
      const key = sort.key as keyof Order;
      result = [...result].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1));
    }
    return result;
  }
}
