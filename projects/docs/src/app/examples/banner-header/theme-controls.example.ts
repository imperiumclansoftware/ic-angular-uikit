import { Component, signal } from '@angular/core';
import { UiBadge, UiButton, UiMenu, UiMenuItem, UiTab, UiTabLabel, UiTabs } from 'ic-angular-uikit';

/**
 * Boutons et navigation du thème
 * Dans le thème `imperium-dark`, les composants existants prennent l'allure impériale sans changer d'API : `uiButton` en Cinzel capitales (`primary` or forgé avec lueur au survol, `secondary` saphir arcanique, `ghost` filet d'or, `disabled`, `loading` avec le loader de l'application) ; `ui-tabs` souligne l'onglet actif d'un filet lumineux et d'un losange ; `uiMenuItem` (navigation latérale) l'éclaire d'un filet d'or. Les compteurs utilisent `ui-badge` (`uiTabLabel`, `[uiMenuBadge]`).
 * @order 2
 */
@Component({
  selector: 'doc-theme-controls-example',
  imports: [UiButton, UiTabs, UiTab, UiTabLabel, UiBadge, UiMenu, UiMenuItem],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <div class="buttons">
        <button uiButton>Principal</button>
        <button uiButton variant="secondary">Secondaire</button>
        <button uiButton variant="ghost">Fantôme</button>
        <button uiButton disabled>Désactivé</button>
        <button uiButton [loading]="true">Chargement</button>
      </div>
      <ui-tabs ariaLabel="Sections du clan">
        <ui-tab label="Chroniques">Les récits du clan.</ui-tab>
        <ui-tab>
          <ng-template uiTabLabel>Événements <ui-badge tone="primary" appearance="solid" pill>3</ui-badge></ng-template>
          Trois rencontres à venir.
        </ui-tab>
        <ui-tab label="Membres">128 membres actifs.</ui-tab>
      </ui-tabs>
      <ui-menu ariaLabel="Navigation du portail (démo)" class="side">
        @for (item of items; track item.label) {
          <button uiMenuItem [icon]="item.icon" [active]="current() === item.label" (click)="current.set(item.label)">
            {{ item.label }}
            @if (item.count) {
              <ui-badge uiMenuBadge tone="primary" pill>{{ item.count }}</ui-badge>
            }
          </button>
        }
      </ui-menu>
    </div>
  `,
  styles: `
    .imp { display: grid; gap: 1.5rem; padding: 1.5rem; border-radius: var(--ui-radius-lg); }
    .buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .side { max-width: 18rem; }
  `,
})
export class ThemeControlsExample {
  protected readonly current = signal('Tableau de bord');
  protected readonly items = [
    { label: 'Tableau de bord', icon: 'lucide:layout-dashboard', count: 0 },
    { label: 'Messagerie', icon: 'lucide:message-square', count: 5 },
    { label: 'Événements', icon: 'lucide:calendar', count: 3 },
    { label: 'Membres', icon: 'lucide:users', count: 0 },
  ];
}
