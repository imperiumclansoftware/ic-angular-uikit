import { Component } from '@angular/core';
import { UiBadge, UiOrgChart, UiOrgPersonTemplate, UiOrgUnit } from 'ic-angular-uikit';

interface Contact {
  phone: string;
  remote?: boolean;
}

/**
 * Personnes personnalisées
 * `ng-template uiOrgPerson` remplace l'affichage de chaque personne en gardant la carte standard (nom de l'unité, relation, « + N autres »). Contexte : `let-person`, `let-unit="unit"`.
 * @order 4
 */
@Component({
  selector: 'doc-org-people-example',
  imports: [UiOrgChart, UiOrgPersonTemplate, UiBadge],
  template: `
    <div class="chart">
      <ui-org-chart ariaLabel="Équipe support" layout="tree" [units]="units" [toolbar]="false" [maxPeople]="3">
        <ng-template uiOrgPerson let-person>
          <span class="person">
            <span class="name">{{ person.name }}</span>
            @if (contact(person.data); as c) {
              <span class="phone">{{ c.phone }}</span>
              @if (c.remote) {
                <ui-badge tone="primary" pill>Télétravail</ui-badge>
              }
            }
          </span>
        </ng-template>
      </ui-org-chart>
    </div>
  `,
  styles: `
    .chart { height: 22rem; display: flex; flex-direction: column; }
    .person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 0.5rem; padding: 0.15rem 0; }
    .name { font-weight: 600; }
    .phone { color: var(--ui-color-text-muted); font-size: 0.75rem; font-variant-numeric: tabular-nums; }
  `,
})
export class OrgPeopleExample {
  protected readonly units: UiOrgUnit[] = [
    {
      id: 'sup',
      name: 'Support client',
      people: [{ id: 'a', name: 'Ada Lovelace', head: true, data: { phone: '01 23 45 67 00' } }],
    },
    {
      id: 'n1',
      name: 'Niveau 1',
      parentId: 'sup',
      people: [
        { id: 'b', name: 'Emma Girard', data: { phone: '01 23 45 67 11', remote: true } },
        { id: 'c', name: 'Lucas Bonnet', data: { phone: '01 23 45 67 12' } },
        { id: 'd', name: 'Zoé Laurent', data: { phone: '01 23 45 67 13', remote: true } },
        { id: 'e', name: 'Nathan Morel', data: { phone: '01 23 45 67 14' } },
      ],
    },
    {
      id: 'n2',
      name: 'Niveau 2',
      parentId: 'sup',
      people: [{ id: 'f', name: 'Alan Turing', data: { phone: '01 23 45 67 21' } }],
    },
  ];

  protected contact(data: unknown): Contact | null {
    return (data as Contact | undefined) ?? null;
  }
}
