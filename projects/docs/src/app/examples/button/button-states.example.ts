import { Component, signal } from '@angular/core';
import { UiButton } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * États et événement click
 * `loading` affiche un indicateur et bloque les clics ; le bouton reste un `<button>` natif, donc `(click)` est l'événement natif.
 * @order 3
 */
@Component({
  selector: 'doc-button-states-example',
  imports: [UiButton, EventLogView],
  template: `
    <div class="ex-row">
      <button uiButton [loading]="saving()" (click)="save()">
        {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
      <button uiButton variant="outline" disabled>Désactivé</button>
      <button uiButton variant="secondary" block>Pleine largeur (block)</button>
    </div>
    <doc-event-log [log]="log" />
  `,
})
export class ButtonStatesExample {
  protected readonly saving = signal(false);
  protected readonly log = new EventLog();

  protected save(): void {
    this.log.add('click');
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 1500);
  }
}
