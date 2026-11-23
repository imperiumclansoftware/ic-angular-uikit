import { Component, signal } from '@angular/core';
import { UiBadge, UiButton, UiCell, UiHeader, UiTable, UiTableColumn, UiTableEmpty, UiTableRowEvent, UiTableSort } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';
import { USERS, User } from './users';

/**
 * Templates de cellule, d'en-tête et état vide
 * `ng-template uiCell="clé"` personnalise une colonne (contexte : `let-row`, `value`, `index`) ; `[uiCellOf]` type la ligne. `uiHeader` et `uiTableEmpty` complètent la personnalisation.
 * @order 2
 */
@Component({
  selector: 'doc-table-templates-example',
  imports: [UiTable, UiCell, UiHeader, UiTableEmpty, UiBadge, UiButton, EventLogView],
  template: `
    <div class="ex-row" style="margin-bottom: 0.75rem">
      <button uiButton size="sm" variant="outline" (click)="users.set(users().length ? [] : all)">
        {{ users().length ? 'Vider' : 'Recharger' }} les données
      </button>
    </div>
    <ui-table
      [data]="users()"
      [columns]="columns"
      [trackBy]="trackById"
      [(sort)]="sort"
      clickableRows
      (rowClick)="onRowClick($event)"
      (sortChange)="log.add('sortChange', $event)"
    >
      <ng-template uiCell="name" [uiCellOf]="users()" let-user>
        <div class="person">
          <span class="avatar" aria-hidden="true">{{ initials(user.name) }}</span>
          <span>
            <strong>{{ user.name }}</strong>
            <small>{{ user.email }}</small>
          </span>
        </div>
      </ng-template>
      <ng-template uiCell="role" let-value="value">
        <ui-badge [tone]="value === 'Admin' ? 'primary' : 'neutral'">{{ value }}</ui-badge>
      </ng-template>
      <ng-template uiCell="active" let-value="value">
        <ui-badge [tone]="value ? 'success' : 'neutral'" dot pill>{{ value ? 'Actif' : 'Suspendu' }}</ui-badge>
      </ng-template>
      <ng-template uiHeader="projects" let-column>
        {{ column.header }} <span aria-hidden="true">📁</span>
      </ng-template>
      <ng-template uiTableEmpty>
        <p>Aucun membre. <strong>Invitez votre équipe</strong> pour commencer.</p>
      </ng-template>
    </ui-table>
    <p>sort = {{ sort() ? sort()!.key + ' ' + sort()!.direction : 'null' }}</p>
    <doc-event-log [log]="log" />
  `,
  styles: `
    .person { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0; }
    .person small { display: block; color: var(--ui-color-text-muted); }
    .avatar { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: var(--ui-color-primary-subtle); color: var(--ui-color-primary-text); font-size: 0.75rem; font-weight: 700; }
  `,
})
export class TableTemplatesExample {
  protected readonly all = USERS;
  protected readonly users = signal<User[]>(USERS);
  protected readonly sort = signal<UiTableSort | null>({ key: 'projects', direction: 'desc' });
  protected readonly log = new EventLog();
  protected readonly columns: UiTableColumn<User>[] = [
    { key: 'name', header: 'Membre', sortable: true },
    { key: 'role', header: 'Rôle', sortable: true },
    { key: 'active', header: 'Statut', value: (u) => u.active, sortable: true },
    { key: 'projects', header: 'Projets', sortable: true, align: 'end' },
  ];

  protected readonly trackById = (user: User) => user.id;

  protected initials(name: string): string {
    return name.split(' ').map((part) => part[0]).join('');
  }

  protected onRowClick(event: UiTableRowEvent<User>): void {
    this.log.add('rowClick', { index: event.index, name: event.row.name });
  }
}
