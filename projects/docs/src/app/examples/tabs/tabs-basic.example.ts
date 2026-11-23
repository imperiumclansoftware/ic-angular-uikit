import { Component, signal } from '@angular/core';
import { UiTab, UiTabChange, UiTabs } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Onglets et événements
 * `[(selectedIndex)]` pilote l'onglet actif ; `(tabChange)` fournit l'index courant et précédent. Navigation au clavier : ← → Origine Fin.
 * @order 1
 */
@Component({
  selector: 'doc-tabs-basic-example',
  imports: [UiTabs, UiTab, EventLogView],
  template: `
    <ui-tabs [(selectedIndex)]="index" ariaLabel="Paramètres du compte" (tabChange)="onChange($event)">
      <ui-tab label="Profil">Nom, avatar et biographie.</ui-tab>
      <ui-tab label="Sécurité">Mot de passe et double authentification.</ui-tab>
      <ui-tab label="Facturation" disabled>Indisponible pour votre offre.</ui-tab>
      <ui-tab label="Notifications">E-mails, push et SMS.</ui-tab>
    </ui-tabs>
    <p>selectedIndex = {{ index() }}</p>
    <doc-event-log [log]="log" />
  `,
})
export class TabsBasicExample {
  protected readonly index = signal(0);
  protected readonly log = new EventLog();

  protected onChange(event: UiTabChange): void {
    this.log.add('tabChange', { index: event.index, previousIndex: event.previousIndex });
  }
}
