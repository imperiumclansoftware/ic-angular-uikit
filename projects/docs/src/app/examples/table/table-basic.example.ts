import { Component } from '@angular/core';
import { UiTable, UiTableColumn } from 'ic-angular-uikit';
import { USERS, User } from './users';

/**
 * Colonnes et tri
 * Les colonnes sont déclarées en TypeScript ; `sortable` active le tri (ascendant → descendant → aucun). Sans template, la valeur est affichée telle quelle.
 * @order 1
 */
@Component({
  selector: 'doc-table-basic-example',
  imports: [UiTable],
  template: `<ui-table [data]="users" [columns]="columns" striped caption="Membres de l'équipe" />`,
})
export class TableBasicExample {
  protected readonly users = USERS;
  protected readonly columns: UiTableColumn<User>[] = [
    { key: 'name', header: 'Nom', sortable: true },
    { key: 'email', header: 'E-mail' },
    { key: 'role', header: 'Rôle', sortable: true },
    { key: 'projects', header: 'Projets', sortable: true, align: 'end', width: '7rem' },
  ];
}
