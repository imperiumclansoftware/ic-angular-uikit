import { Component, signal } from '@angular/core';
import { UiAlert, UiAlertActions, UiButton } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Fermeture et actions
 * `dismissible` affiche le bouton de fermeture et émet `(dismissed)`. Avec `[autoHide]="false"`, c'est à vous de retirer l'alerte.
 * @order 2
 */
@Component({
  selector: 'doc-alert-dismiss-example',
  imports: [UiAlert, UiAlertActions, UiButton, EventLogView],
  template: `
    <div class="ex-stack" style="max-width: 36rem">
      @if (visible()) {
        <ui-alert tone="info" title="Cookies" dismissible [autoHide]="false" (dismissed)="onDismiss()">
          Nous n'utilisons que des cookies techniques.
          <div uiAlertActions>
            <button uiButton size="sm" (click)="onDismiss()">J'ai compris</button>
            <a uiButton size="sm" variant="ghost" href="#">En savoir plus</a>
          </div>
        </ui-alert>
      } @else {
        <button uiButton variant="outline" (click)="visible.set(true)">Réafficher l'alerte</button>
      }
    </div>
    <doc-event-log [log]="log" />
  `,
})
export class AlertDismissExample {
  protected readonly visible = signal(true);
  protected readonly log = new EventLog();

  protected onDismiss(): void {
    this.log.add('dismissed');
    this.visible.set(false);
  }
}
