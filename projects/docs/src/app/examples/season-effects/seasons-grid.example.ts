import { Component, signal } from '@angular/core';
import { UI_SEASON_LABELS, UiButton, UiSeason, UiSeasonEffects, UiSwitch } from 'ic-angular-uikit';

/**
 * Les quatre saisons
 * Chaque cadre force sa saison (`[season]`) et sa variante (`[mode]` : en sombre, l'été devient une nuit étoilée) et s'affiche même hors thème saisonnier (`force`) ; `contained` limite le décor à son conteneur positionné. Dans une application, il suffit d'un `<ui-season-effects />` à la racine : la saison est alors celle du jour et le décor n'apparaît qu'avec `season-light` ou `season-dark`. Le bouton pause de la page (en bas à gauche) arrête toutes les animations.
 * @order 1
 */
@Component({
  selector: 'doc-seasons-grid-example',
  imports: [UiSeasonEffects, UiButton, UiSwitch],
  template: `
    <ui-switch [(checked)]="dark">Variante sombre (season-dark)</ui-switch>
    <div class="grid">
      @for (season of seasons; track season) {
        <div class="box" [attr.data-ui-theme]="dark() ? 'season-dark' : 'season-light'" [attr.data-ui-season]="season">
          <ui-season-effects contained force [season]="season" [mode]="dark() ? 'dark' : 'light'" [showControl]="false" />
          <strong>{{ labels[season] }}</strong>
          <button uiButton size="sm">Action</button>
        </div>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); margin-top: 1rem; }
    .box { position: relative; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; height: 13rem; padding: 1rem; overflow: hidden; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); }
    .box strong { position: relative; z-index: 1000; }
    .box button { position: relative; z-index: 1000; }
  `,
})
export class SeasonsGridExample {
  protected readonly seasons: UiSeason[] = ['winter', 'spring', 'summer', 'autumn'];
  protected readonly labels = UI_SEASON_LABELS;
  protected readonly dark = signal(false);
}
