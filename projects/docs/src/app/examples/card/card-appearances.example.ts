import { Component } from '@angular/core';
import { UiCard, UiCardHeader, UiCardMedia } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Apparences, média et carte interactive
 * `appearance` change le rendu ; `interactive` ajoute un effet de survol — ajoutez `tabindex` et un gestionnaire clavier pour l'accessibilité.
 * @order 2
 */
@Component({
  selector: 'doc-card-appearances-example',
  imports: [UiCard, UiCardHeader, UiCardMedia, EventLogView],
  template: `
    <div class="ex-grid">
      <ui-card appearance="elevated"><strong uiCardHeader>Elevated</strong>Ombre portée (défaut).</ui-card>
      <ui-card appearance="outlined"><strong uiCardHeader>Outlined</strong>Simple contour.</ui-card>
      <ui-card appearance="filled"><strong uiCardHeader>Filled</strong>Fond teinté.</ui-card>
      <ui-card interactive tabindex="0" role="button" (click)="open('Montagne')" (keydown.enter)="open('Montagne')">
        <div uiCardMedia class="media" aria-hidden="true"></div>
        <strong uiCardHeader>Interactive</strong>
        Cliquez sur la carte.
      </ui-card>
    </div>
    <doc-event-log [log]="log" />
  `,
  styles: `
    .media { height: 6rem; background: linear-gradient(135deg, var(--ui-color-primary), #8b5cf6); }
  `,
})
export class CardAppearancesExample {
  protected readonly log = new EventLog();

  protected open(name: string): void {
    this.log.add('click', name);
  }
}
