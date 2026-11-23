import { Component } from '@angular/core';
import { UiBadge, UiTab, UiTabContent, UiTabLabel, UiTabs } from 'ic-angular-uikit';

/**
 * Libellés riches et contenu paresseux
 * `ng-template uiTabLabel` permet n'importe quel contenu dans l'onglet ; `ng-template uiTabContent` ne crée le panneau qu'à sa première ouverture. Apparence `pills`, onglets étirés avec `stretch`.
 * @order 2
 */
@Component({
  selector: 'doc-tabs-templates-example',
  imports: [UiTabs, UiTab, UiTabLabel, UiTabContent, UiBadge],
  template: `
    <ui-tabs appearance="pills" stretch ariaLabel="Boîte de réception">
      <ui-tab>
        <ng-template uiTabLabel>Reçus <ui-badge tone="primary" appearance="solid" pill>4</ui-badge></ng-template>
        Quatre nouveaux messages.
      </ui-tab>
      <ui-tab>
        <ng-template uiTabLabel>Archivés</ng-template>
        <ng-template uiTabContent>
          Contenu créé à la première ouverture : {{ createdAt() }}
        </ng-template>
      </ui-tab>
      <ui-tab label="Spam">Rien à signaler.</ui-tab>
    </ui-tabs>
  `,
})
export class TabsTemplatesExample {
  protected createdAt(): string {
    return new Date().toLocaleTimeString('fr-FR');
  }
}
