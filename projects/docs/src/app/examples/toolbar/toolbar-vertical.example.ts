import { Component, signal } from '@angular/core';
import { UiButton, UiMenuItem, UiSubmenu, UiToolbar, UiToolbarSeparator } from 'ic-angular-uikit';

/**
 * Barre d'outils verticale
 * `orientation="vertical"` : ↑ / ↓ parcourent les commandes. Un sous-menu placé dans une barre verticale s'ouvre à côté, avec → pour y entrer.
 * @order 2
 */
@Component({
  selector: 'doc-toolbar-vertical-example',
  imports: [UiToolbar, UiToolbarSeparator, UiButton, UiSubmenu, UiMenuItem],
  template: `
    <div class="row">
      <ui-toolbar ariaLabel="Outils de dessin" orientation="vertical" appearance="filled">
        <button uiButton variant="ghost" iconOnly icon="lucide:scissors" aria-label="Couper" (click)="last.set('Couper')"></button>
        <button uiButton variant="ghost" iconOnly icon="lucide:copy" aria-label="Copier" (click)="last.set('Copier')"></button>
        <button uiButton variant="ghost" iconOnly icon="lucide:clipboard-paste" aria-label="Coller" (click)="last.set('Coller')"></button>
        <ui-toolbar-separator />
        <ui-submenu label="Partager" icon="lucide:share-2">
          <button uiMenuItem icon="lucide:mail" (click)="last.set('Partager par e-mail')">Par e-mail</button>
          <button uiMenuItem icon="lucide:link" (click)="last.set('Copier le lien')">Copier le lien</button>
        </ui-submenu>
        <button uiButton variant="ghost" iconOnly icon="lucide:trash-2" aria-label="Supprimer" (click)="last.set('Supprimer')"></button>
      </ui-toolbar>
      <p>Dernière commande : <strong>{{ last() }}</strong></p>
    </div>
  `,
  styles: `
    .row { display: flex; align-items: flex-start; gap: 1.5rem; }
    p { margin: 0; }
  `,
})
export class ToolbarVerticalExample {
  protected readonly last = signal('—');
}
