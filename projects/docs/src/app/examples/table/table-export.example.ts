import { Component, signal } from '@angular/core';
import { UiBadge, UiButton, UiCell, UiSwitch, UiTable, UiTableColumn, UiTableExportEvent } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';
import { ORDERS, Order } from './orders';

/**
 * Export des données affichées
 * `exportable` ajoute le bouton **Exporter** : CSV (séparateur `;` et accents lisibles par Excel), Excel `.xlsx` (en-tête figé, filtre automatique, nombres et dates typés) ou JSON. L'export reprend ce qui est affiché : recherche, filtres, tri, colonnes visibles et leur ordre ; avec la pagination, l'utilisateur choisit toutes les lignes ou la page affichée. Par colonne : `exportable: false` (colonne d'actions) et `exportValue` (valeur exportée quand la cellule est un template, ici « Payée » / « À régler »). `exportFormats`, `exportFilename` et `exportOptions` règlent les formats, le nom du fichier et le CSV. `(exportRequest)` est émis avant chaque export ; `preventDefault()` permet de le faire côté serveur. Les textes commençant par `=`, `+`, `-` ou `@` sont neutralisés dans le CSV (injection de formules).
 * @order 7
 */
@Component({
  selector: 'doc-table-export-example',
  imports: [UiTable, UiCell, UiBadge, UiButton, UiSwitch, EventLogView],
  template: `
    <div class="toggle"><ui-switch [(checked)]="enabled">Autoriser l'export</ui-switch></div>
    <ui-table
      caption="Commandes"
      exportFilename="commandes"
      [exportable]="enabled()"
      [data]="orders"
      [columns]="columns"
      [trackBy]="byId"
      searchable
      columnToggle
      reorderable
      paginated
      [pageSizeOptions]="[10, 25]"
      [sort]="{ key: 'date', direction: 'desc' }"
      (exportRequest)="onExport($event)"
    >
      <ng-template uiCell="date" [uiCellOf]="orders" let-order>{{ dateFormat.format(order.date) }}</ng-template>
      <ng-template uiCell="amount" [uiCellOf]="orders" let-order>{{ money.format(order.amount) }}</ng-template>
      <ng-template uiCell="paid" let-value="value">
        <ui-badge [tone]="value ? 'success' : 'warning'" dot pill>{{ value ? 'Payée' : 'À régler' }}</ui-badge>
      </ng-template>
      <ng-template uiCell="actions" [uiCellOf]="orders" let-order>
        <button uiButton variant="ghost" size="sm" [attr.aria-label]="'Ouvrir ' + order.id">Ouvrir</button>
      </ng-template>
    </ui-table>
    <doc-event-log [log]="log" />
  `,
  styles: `.toggle { margin-bottom: 0.75rem; }`,
})
export class TableExportExample {
  protected readonly orders = ORDERS;
  protected readonly enabled = signal(true);
  protected readonly log = new EventLog();
  protected readonly byId = (o: Order) => o.id;
  protected readonly dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
  protected readonly money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

  protected readonly columns: UiTableColumn<Order>[] = [
    { key: 'id', header: 'N°', sortable: true, width: '7rem' },
    { key: 'customer', header: 'Client', sortable: true },
    { key: 'city', header: 'Ville', sortable: true },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'amount', header: 'Montant (€)', sortable: true, align: 'end' },
    { key: 'paid', header: 'Paiement', exportValue: (o) => (o.paid ? 'Payée' : 'À régler') },
    { key: 'actions', header: 'Actions', exportable: false, hideable: false, searchable: false },
  ];

  protected onExport(event: UiTableExportEvent<Order>): void {
    // Pour un export côté serveur : event.preventDefault(), puis appel à l'API avec event.state.
    this.log.add('exportRequest', { format: event.format, scope: event.scope, filename: event.filename, lignes: event.rows.length, colonnes: event.columns.map((c) => c.key) });
  }
}
