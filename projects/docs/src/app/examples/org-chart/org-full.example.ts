import { Component, signal } from '@angular/core';
import { UiOrgChart, UiOrgPersonSelect, UiOrgUnit } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';
import { ORG_LINKS, ORG_UNITS } from './org-data';

/**
 * Organigramme à partir de données
 * Une liste plate d'unités reliées par `parentId`, avec leurs personnes (`head: true` pour le responsable). Trois relations : **hiérarchique** (sous le parent), **rattachée** (`relation: 'attached'` : le secrétariat et le cabinet, sur les côtés du trait de la direction) et **transverse** (`relation: 'transverse'`, en pointillés). Les `links` ajoutent des liens fonctionnels libres (la mission qualité ↔ production et achats). Cliquez une unité ou une personne.
 * @order 1
 */
@Component({
  selector: 'doc-org-full-example',
  imports: [UiOrgChart, EventLogView],
  template: `
    <div class="chart">
      <ui-org-chart
        ariaLabel="Organigramme de l'entreprise"
        layout="tree"
        [units]="units"
        [links]="links"
        peopleSelectable
        [(selectedId)]="selected"
        (unitSelect)="onUnit($event)"
        (personSelect)="onPerson($event)"
      />
    </div>
    <doc-event-log [log]="log" />
  `,
  styles: `.chart { height: 34rem; display: flex; flex-direction: column; }`,
})
export class OrgFullExample {
  protected readonly units = ORG_UNITS;
  protected readonly links = ORG_LINKS;
  protected readonly selected = signal<string | null>(null);
  protected readonly log = new EventLog();

  protected onUnit(unit: UiOrgUnit): void {
    this.log.add('unitSelect', unit.name);
  }

  protected onPerson(event: UiOrgPersonSelect): void {
    this.log.add('personSelect', `${event.person.name} (${event.unit.name})`);
  }
}
