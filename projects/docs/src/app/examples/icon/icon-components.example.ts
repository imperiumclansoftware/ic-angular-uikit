import { Component } from '@angular/core';
import { UiAlert, UiBadge, UiButton, UiSelect, UiTab, UiTabs, UiTextField } from 'ic-angular-uikit';

/**
 * Dans les composants
 * Raccourcis `icon` sur les composants : `icon` / `iconEnd` des boutons, `prefixIcon` / `suffixIcon` des champs, `icon` du select, de l'alerte, du badge et des onglets. Toutes les librairies peuvent se mélanger.
 * @order 2
 */
@Component({
  selector: 'doc-icon-components-example',
  imports: [UiButton, UiTextField, UiSelect, UiBadge, UiAlert, UiTabs, UiTab],
  template: `
    <div class="ex-row">
      <button uiButton icon="fa:plus">Ajouter</button>
      <button uiButton variant="outline" icon="material:download">Exporter</button>
      <button uiButton variant="ghost" iconEnd="lucide:arrow-right">Continuer</button>
      <button uiButton variant="danger" icon="bi:trash">Supprimer</button>
      <button uiButton variant="secondary" iconOnly icon="lucide:settings" aria-label="Réglages"></button>
    </div>

    <div class="ex-stack" style="margin-top: 1.5rem">
      <ui-text-field label="E-mail" type="email" prefixIcon="lucide:mail" placeholder="vous@exemple.fr" />
      <ui-text-field label="Recherche" type="search" prefixIcon="fa:magnifying-glass" clearable />
      <ui-select label="Pays" icon="material:public" [options]="countries" />
    </div>

    <div class="ex-row" style="margin-top: 1.5rem">
      <ui-badge tone="success" icon="lucide:check" pill>Payé</ui-badge>
      <ui-badge tone="warning" icon="material:schedule" pill>En attente</ui-badge>
      <ui-badge tone="neutral" icon="fab:github">Open source</ui-badge>
    </div>

    <div class="ex-stack" style="margin-top: 1.5rem; max-width: 36rem">
      <ui-alert tone="info" icon="lucide:bell" title="Nouveautés">Les icônes sont arrivées dans IC Angular UiKit.</ui-alert>
    </div>

    <ui-tabs style="margin-top: 1.5rem" ariaLabel="Compte">
      <ui-tab label="Profil" icon="lucide:user">Informations du profil.</ui-tab>
      <ui-tab label="Sécurité" icon="lucide:lock">Mot de passe et 2FA.</ui-tab>
      <ui-tab label="Notifications" icon="material:notifications">Préférences d'alerte.</ui-tab>
    </ui-tabs>
  `,
})
export class IconComponentsExample {
  protected readonly countries = [
    { value: 'fr', label: 'France' },
    { value: 'be', label: 'Belgique' },
    { value: 'ch', label: 'Suisse' },
  ];
}
