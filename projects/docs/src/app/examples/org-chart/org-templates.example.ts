import { Component } from '@angular/core';
import { UiBadge, UiIcon, UiOrgChart, UiOrgUnit, UiOrgUnitTemplate } from 'ic-angular-uikit';

interface TeamData {
  budget: string;
  site: string;
}

/**
 * Cartes personnalisées
 * `ng-template uiOrgUnit` remplace tout le contenu des cartes (ici : effectif, site, budget). Les données libres (`data`) de chaque unité sont disponibles dans le template ; le bouton de repli reste géré par le composant.
 * @order 3
 */
@Component({
  selector: 'doc-org-templates-example',
  imports: [UiOrgChart, UiOrgUnitTemplate, UiBadge, UiIcon],
  template: `
    <div class="chart">
      <ui-org-chart ariaLabel="Organigramme commercial" layout="tree" [units]="units" [selectable]="false" [toolbar]="false">
        <ng-template uiOrgUnit let-unit>
          <div class="head">
            <strong>{{ unit.name }}</strong>
            <ui-badge tone="neutral" pill>{{ unit.people?.length ?? 0 }} pers.</ui-badge>
          </div>
          @if (team(unit); as team) {
            <span class="meta"><ui-icon name="lucide:house" /> {{ team.site }} · budget {{ team.budget }}</span>
          }
          @for (person of unit.people ?? []; track person.id) {
            <span class="person" [class.lead]="person.head">
              <ui-icon [name]="person.head ? 'lucide:star' : 'lucide:user'" />
              {{ person.name }}
            </span>
          }
        </ng-template>
      </ui-org-chart>
    </div>
  `,
  styles: `
    .chart { height: 24rem; display: flex; flex-direction: column; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .meta { display: flex; align-items: center; gap: 0.35rem; color: var(--ui-color-text-muted); font-size: 0.75rem; }
    .person { display: flex; align-items: center; gap: 0.4rem; }
    .lead { font-weight: 600; }
  `,
})
export class OrgTemplatesExample {
  protected readonly units: UiOrgUnit[] = [
    { id: 'com', name: 'Direction commerciale', data: { budget: '1,2 M€', site: 'Paris' }, people: [{ id: 'a', name: 'Ada Lovelace', head: true }] },
    { id: 'n', name: 'Région Nord', parentId: 'com', tone: 'success', data: { budget: '400 k€', site: 'Lille' }, people: [{ id: 'b', name: 'Alan Turing', head: true }, { id: 'c', name: 'Emma Girard' }] },
    { id: 's', name: 'Région Sud', parentId: 'com', tone: 'warning', data: { budget: '350 k€', site: 'Marseille' }, people: [{ id: 'd', name: 'Grace Hopper', head: true }, { id: 'e', name: 'Lucas Bonnet' }, { id: 'f', name: 'Zoé Laurent' }] },
    { id: 'adv', name: 'Administration des ventes', parentId: 'com', relation: 'attached', tone: 'neutral', data: { budget: '120 k€', site: 'Paris' }, people: [{ id: 'g', name: 'Claire Martin', head: true }] },
  ];

  protected team(unit: UiOrgUnit): TeamData | null {
    return (unit.data as TeamData | undefined) ?? null;
  }
}
