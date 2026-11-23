import { Component, signal } from '@angular/core';
import { UiTextField } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Libellé, aide et événements
 * `[(value)]` lie la valeur ; `clearable` ajoute un bouton d'effacement qui émet `(cleared)` ; `maxLength` affiche un compteur.
 * @order 1
 */
@Component({
  selector: 'doc-text-field-basic-example',
  imports: [UiTextField, EventLogView],
  template: `
    <div class="ex-stack">
      <ui-text-field
        label="Nom d'utilisateur"
        hint="Visible par les autres membres"
        placeholder="ada.lovelace"
        clearable
        maxLength="20"
        [(value)]="username"
        (cleared)="log.add('cleared')"
        (focusChange)="log.add('focusChange', $event)"
      />
      <ui-text-field label="Désactivé" value="Lecture impossible" disabled />
      <ui-text-field label="Lecture seule" value="ID-4821" readonly size="sm" />
    </div>
    <p>value = « {{ username() }} »</p>
    <doc-event-log [log]="log" />
  `,
})
export class TextFieldBasicExample {
  protected readonly username = signal('');
  protected readonly log = new EventLog();
}
