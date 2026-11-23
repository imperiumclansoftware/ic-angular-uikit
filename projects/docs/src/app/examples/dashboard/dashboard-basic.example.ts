import { Component, signal } from '@angular/core';
import { UiDashboard, UiDashboardItem, UiDashboardLayout, UiDashboardToolbar } from 'ic-angular-uikit';
import { DEMO_CATEGORIES, DEMO_WIDGETS } from './demo-widgets';

/**
 * Tableau de bord personnalisable
 * Cliquez sur « Personnaliser » : les widgets se déplacent par leur poignée ⠿ et se redimensionnent par le coin, à la souris, au doigt ou au clavier (flèches sur les poignées) ; les autres widgets se poussent. La colonne de droite règle le widget sélectionné (titre, taille, réglages propres) et ajoute des widgets du catalogue, rangés par catégorie dans des tiroirs (`category` sur chaque définition, `[widgetCategories]` pour l'ordre, les icônes et les descriptions ; un seul tiroir ouvert à la fois, sauf avec `[catalogAccordion]="false"`). Le bouton ⟳ retourne un widget : le graphique montre au verso ses valeurs en tableau. `layoutChange` émet la disposition à enregistrer (ci-dessous).
 * @order 1
 */
@Component({
  selector: 'doc-dashboard-basic-example',
  imports: [UiDashboard, UiDashboardToolbar],
  template: `
    <ui-dashboard ariaLabel="Tableau de bord des ventes (démo)" [widgets]="widgets" [widgetCategories]="categories" [(items)]="items" (layoutChange)="last.set($event)">
      <strong uiDashboardToolbar>Ventes</strong>
    </ui-dashboard>

    <details class="json">
      <summary>Disposition émise par <code>layoutChange</code>{{ last() ? '' : ' (modifiez le tableau de bord)' }}</summary>
      <pre tabindex="0">{{ json() }}</pre>
    </details>
  `,
  styles: `
    .json { margin-top: 1.5rem; font-size: 0.8125rem; }
    .json summary { cursor: pointer; }
    .json pre { max-height: 16rem; overflow: auto; padding: 0.75rem; border-radius: var(--ui-radius-md); background: var(--ui-color-surface-sunken); }
  `,
})
export class DashboardBasicExample {
  protected readonly widgets = DEMO_WIDGETS;
  protected readonly categories = DEMO_CATEGORIES;
  protected readonly last = signal<UiDashboardLayout | null>(null);
  protected readonly items = signal<UiDashboardItem[]>([
    { id: 'ca', type: 'kpi', x: 0, y: 0, w: 3, h: 2, config: { metric: 'revenue' } },
    { id: 'commandes', type: 'kpi', x: 3, y: 0, w: 3, h: 2, config: { metric: 'orders' } },
    { id: 'taches', type: 'tasks', x: 6, y: 0, w: 6, h: 4, config: { done: ['Valider les congés'] } },
    { id: 'evolution', type: 'chart', x: 0, y: 2, w: 6, h: 3, title: 'Commandes par mois' },
    { id: 'note', type: 'note', x: 6, y: 4, w: 6, h: 1, config: { text: 'Point équipe jeudi 10 h.' } },
  ]);

  protected json(): string {
    return JSON.stringify(this.last() ?? { version: 1, columns: 12, items: this.items() }, null, 2);
  }
}
