import { Component, signal } from '@angular/core';
import { UiButton, UiSwitch, UiTab, UiTabs, UiTextField } from 'ic-angular-uikit';

/**
 * Onglets verticaux
 * `orientation="vertical"` place la liste à gauche du panneau ; les flèches haut / bas changent d'onglet. Sous 30rem de large, le composant revient à des onglets horizontaux : réduisez le cadre pour le voir.
 * @order 3
 */
@Component({
  selector: 'doc-tabs-vertical-example',
  imports: [UiTabs, UiTab, UiTextField, UiSwitch, UiButton],
  template: `
    <label class="width">
      Largeur du cadre : <strong>{{ width() }} px</strong>
      <input type="range" min="300" max="900" step="20" [value]="width()" (input)="setWidth($event)" />
    </label>
    <div class="frame" [style.width.px]="width()">
      <ui-tabs orientation="vertical" ariaLabel="Paramètres du compte">
        <ui-tab label="Profil">
          <div class="panel">
            <ui-text-field label="Nom affiché" value="Ada Lovelace" />
            <ui-text-field label="Site web" type="url" placeholder="https://" />
            <div><button uiButton>Enregistrer</button></div>
          </div>
        </ui-tab>
        <ui-tab label="Sécurité">
          <div class="panel">
            <ui-switch [checked]="true" description="Code envoyé par application à chaque connexion">Double authentification</ui-switch>
            <ui-switch>Alerte de connexion depuis un nouvel appareil</ui-switch>
          </div>
        </ui-tab>
        <ui-tab label="Notifications">
          <div class="panel">
            <ui-switch [checked]="true">E-mails</ui-switch>
            <ui-switch>Notifications push</ui-switch>
          </div>
        </ui-tab>
        <ui-tab label="Facturation" disabled>Indisponible pour votre offre.</ui-tab>
      </ui-tabs>
    </div>
  `,
  styles: `
    .width { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .width input { flex: 1; min-width: 10rem; max-width: 20rem; accent-color: var(--ui-color-primary); }
    .frame { max-width: 100%; padding: 1rem; border: 1px dashed var(--ui-color-border-control); border-radius: var(--ui-radius-md); box-sizing: border-box; }
    .panel { display: flex; flex-direction: column; gap: 0.75rem; max-width: 26rem; }
  `,
})
export class TabsVerticalExample {
  protected readonly width = signal(760);

  protected setWidth(event: Event): void {
    this.width.set(Number((event.target as HTMLInputElement).value));
  }
}
