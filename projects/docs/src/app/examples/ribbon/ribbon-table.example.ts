import { Component } from '@angular/core';
import { UiRibbon, UiTable, UiTableColumn } from 'ic-angular-uikit';

interface Release {
  version: string;
  date: string;
  notes: string;
}

/**
 * Sur une table
 * `ui-table` accueille aussi un ruban. Avec une légende (`caption`), le coin supérieur droit reste libre.
 * @order 2
 */
@Component({
  selector: 'doc-ribbon-table-example',
  imports: [UiTable, UiRibbon],
  template: `
    <ui-table [data]="releases" [columns]="columns" caption="Versions publiées">
      <ui-ribbon tone="success" size="sm" icon="lucide:check">Stable</ui-ribbon>
    </ui-table>
  `,
})
export class RibbonTableExample {
  protected readonly columns: UiTableColumn<Release>[] = [
    { key: 'version', header: 'Version', width: '8rem' },
    { key: 'date', header: 'Date', width: '10rem' },
    { key: 'notes', header: 'Nouveautés' },
  ];
  protected readonly releases: Release[] = [
    { version: '0.4.0', date: '18/11/2026', notes: 'Icônes, rubans, menu par catégories' },
    { version: '0.3.0', date: '18/11/2026', notes: 'Validation graphique des formulaires' },
    { version: '0.2.0', date: '18/11/2026', notes: 'Select, Textarea, Checkbox, Radio' },
  ];
}
