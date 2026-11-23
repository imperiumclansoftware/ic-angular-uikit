import { Component } from '@angular/core';
import { UiStatBlock } from 'ic-angular-uikit';

/**
 * Indicateurs chiffrés
 * Libellé en petites capitales, valeur en Cinzel (nombres formatés à la française), unité, icône et tendance : flèche **et** pourcentage, phrase complète pour les lecteurs d'écran (« en hausse de 12 % sur 30 jours »). `inverse` quand une baisse est une bonne nouvelle ; `accent` prend l'or ou la couleur d'une branche.
 * @order 1
 */
@Component({
  selector: 'doc-stats-example',
  imports: [UiStatBlock],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <ui-stat-block label="Membres actifs" [value]="128" [trend]="12" trendPeriod="sur 30 jours" icon="lucide:users" />
      <ui-stat-block label="Victoires" [value]="1342" [trend]="4.5" trendPeriod="cette saison" accent="joueurs" icon="lucide:star" />
      <ui-stat-block label="Temps de build" [value]="3.8" [decimals]="1" unit="min" [trend]="-18" inverse trendPeriod="sur 7 jours" accent="developpeurs" icon="lucide:code" />
      <ui-stat-block label="Séances ciné" [value]="9" [trend]="0" trendPeriod="ce mois-ci" accent="cine" />
    </div>
  `,
  styles: `.imp { display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: 1rem; padding: 1.5rem; border-radius: var(--ui-radius-lg); }`,
})
export class StatsExample {}
