import { Component } from '@angular/core';
import { UiOrgChart } from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';
import { ORG_LINKS, ORG_UNITS } from './org-data';

/**
 * Repli, zoom et affichage mobile
 * `initialDepth="1"` n'ouvre que le premier niveau : le bouton sous chaque carte déplie ses unités (le nombre indique combien sont cachées). La barre d'outils zoome et déplie / replie tout. Avec `layout="auto"` (défaut), l'organigramme devient une **liste indentée** sous 640 px de large : réduisez l'aperçu.
 * @order 2
 */
@Component({
  selector: 'doc-org-responsive-example',
  imports: [UiOrgChart, DemoFrame],
  template: `
    <doc-demo-frame [height]="520">
      <ui-org-chart class="chart" ariaLabel="Organigramme (aperçu)" initialDepth="1" [units]="units" [links]="links" />
    </doc-demo-frame>
  `,
  styles: `.chart { height: 100%; padding: 0.75rem; box-sizing: border-box; }`,
})
export class OrgResponsiveExample {
  protected readonly units = ORG_UNITS;
  protected readonly links = ORG_LINKS;
}
