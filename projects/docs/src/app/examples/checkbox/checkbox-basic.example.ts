import { Component, signal } from '@angular/core';
import { UiCheckbox } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Cases à cocher et événements
 * `[(checked)]` lie l'état ; `(changed)` n'est émis que pour les actions de l'utilisateur. `description` ajoute une aide reliée par `aria-describedby`.
 * @order 1
 */
@Component({
  selector: 'doc-checkbox-basic-example',
  imports: [UiCheckbox, EventLogView],
  template: `
    <div class="ex-stack" style="gap: 0">
      <ui-checkbox [(checked)]="newsletter" (changed)="log.add('changed', $event)">S'abonner à la newsletter</ui-checkbox>
      <ui-checkbox description="Un e-mail par semaine au maximum">Recevoir les offres partenaires</ui-checkbox>
      <ui-checkbox size="sm">Petite (sm)</ui-checkbox>
      <ui-checkbox size="lg" [checked]="true">Grande (lg)</ui-checkbox>
      <ui-checkbox disabled [checked]="true">Désactivée</ui-checkbox>
    </div>
    <p>newsletter = {{ newsletter() }}</p>
    <doc-event-log [log]="log" />
  `,
})
export class CheckboxBasicExample {
  protected readonly newsletter = signal(true);
  protected readonly log = new EventLog();
}
