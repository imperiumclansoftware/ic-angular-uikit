import { Component } from '@angular/core';
import { UiBadge } from 'ic-angular-uikit';

/**
 * Statuts et compteurs
 * `dot` ajoute une pastille, `pill` arrondit les coins.
 * @order 2
 */
@Component({
  selector: 'doc-badge-status-example',
  imports: [UiBadge],
  template: `
    <div class="ex-row">
      <ui-badge tone="success" dot pill>En ligne</ui-badge>
      <ui-badge tone="warning" dot pill>Absent</ui-badge>
      <ui-badge tone="neutral" dot pill>Hors ligne</ui-badge>
      <span>Messages <ui-badge tone="danger" appearance="solid" pill>12</ui-badge></span>
    </div>
  `,
})
export class BadgeStatusExample {}
