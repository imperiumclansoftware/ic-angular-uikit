import { Component } from '@angular/core';
import { UiBadge, UiTab, UiTabLabel, UiTabs } from 'ic-angular-uikit';

/**
 * Onglets verticaux « pills » et libellés riches
 * Combinez `orientation="vertical"`, `appearance="pills"` et `ng-template uiTabLabel` (icône, compteur). La largeur de la liste se règle avec `--ui-tabs-list-width`.
 * @order 4
 */
@Component({
  selector: 'doc-tabs-vertical-pills-example',
  imports: [UiTabs, UiTab, UiTabLabel, UiBadge],
  template: `
    <ui-tabs orientation="vertical" appearance="pills" ariaLabel="Messagerie" class="mail">
      @for (folder of folders; track folder.name) {
        <ui-tab>
          <ng-template uiTabLabel>
            <svg class="ex-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="folder.icon" />
            </svg>
            <span class="name">{{ folder.name }}</span>
            @if (folder.count) {
              <ui-badge tone="primary" appearance="solid" pill>{{ folder.count }}</ui-badge>
            }
          </ng-template>
          <p>{{ folder.count ? folder.count + ' message(s) non lu(s)' : 'Aucun nouveau message' }} dans « {{ folder.name }} ».</p>
        </ui-tab>
      }
    </ui-tabs>
  `,
  styles: `
    .mail { --ui-tabs-list-width: 13rem; }
    .name { flex: 1; }
    p { margin: 0; }
  `,
})
export class TabsVerticalPillsExample {
  protected readonly folders = [
    { name: 'Boîte de réception', count: 4, icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z' },
    { name: 'Envoyés', count: 0, icon: 'm22 2-7 20-4-9-9-4Z' },
    { name: 'Brouillons', count: 1, icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' },
    { name: 'Corbeille', count: 0, icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6' },
  ];
}
