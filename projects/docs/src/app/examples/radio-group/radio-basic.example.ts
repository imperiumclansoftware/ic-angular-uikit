import { Component, signal } from '@angular/core';
import { UiRadio, UiRadioGroup } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Choix unique et événements
 * `[(value)]` sur le groupe lie la valeur choisie ; `(selectionChange)` est émis à chaque choix. Au clavier, Tab entre dans le groupe et les flèches changent d'option.
 * @order 1
 */
@Component({
  selector: 'doc-radio-basic-example',
  imports: [UiRadioGroup, UiRadio, EventLogView],
  template: `
    <ui-radio-group label="Livraison" [(value)]="shipping" (selectionChange)="log.add('selectionChange', $event)">
      <ui-radio value="standard" description="3 à 5 jours ouvrés — gratuit">Standard</ui-radio>
      <ui-radio value="express" description="Sous 24 h — 9,90 €">Express</ui-radio>
      <ui-radio value="relay" description="Indisponible dans votre région" disabled>Point relais</ui-radio>
    </ui-radio-group>
    <p>value = {{ shipping() }}</p>
    <doc-event-log [log]="log" />
  `,
})
export class RadioBasicExample {
  protected readonly shipping = signal<string | null>('standard');
  protected readonly log = new EventLog();
}
