import { Component, signal } from '@angular/core';
import { UiSwitch } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Liaison bidirectionnelle
 * `[(checked)]` synchronise l'état avec un signal ; `(changed)` n'est émis que pour les actions de l'utilisateur.
 * @order 1
 */
@Component({
  selector: 'doc-switch-basic-example',
  imports: [UiSwitch, EventLogView],
  template: `
    <div class="ex-stack">
      <ui-switch [(checked)]="wifi" (changed)="log.add('changed', $event)">Wi-Fi</ui-switch>
      <ui-switch [(checked)]="bluetooth" description="Visible par les appareils à proximité">Bluetooth</ui-switch>
      <ui-switch size="sm" labelPosition="start">Libellé à gauche (sm)</ui-switch>
      <ui-switch size="lg" disabled [checked]="true">Désactivé (lg)</ui-switch>
    </div>
    <p>wifi = {{ wifi() }} · bluetooth = {{ bluetooth() }}</p>
    <doc-event-log [log]="log" />
  `,
})
export class SwitchBasicExample {
  protected readonly wifi = signal(true);
  protected readonly bluetooth = signal(false);
  protected readonly log = new EventLog();
}
