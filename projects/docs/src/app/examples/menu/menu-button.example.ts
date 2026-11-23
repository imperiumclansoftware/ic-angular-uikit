import { Component, signal } from '@angular/core';
import { UiMenuItem, UiSubmenu } from 'ic-angular-uikit';

/**
 * Bouton de menu (sous-menu autonome)
 * Hors d'un `ui-menu`, `ui-submenu` devient un bouton qui ouvre un panneau d'actions, avec autant de niveaux que nécessaire : idéal dans une `ui-toolbar` ou les actions d'une `ui-app-bar`. ↓ (ou Entrée) ouvre le panneau, choisir une action referme toute la cascade et rend le focus au bouton. `placement` force la position (`below` / `side`).
 * @order 3
 */
@Component({
  selector: 'doc-menu-button-example',
  imports: [UiSubmenu, UiMenuItem],
  template: `
    <div class="row">
      <ui-submenu label="Actions" icon="lucide:ellipsis">
        <button uiMenuItem icon="lucide:copy" (click)="last.set('Dupliquer')">Dupliquer</button>
        <button uiMenuItem icon="lucide:share-2" (click)="last.set('Partager')">Partager</button>
        <ui-submenu label="Exporter" icon="lucide:download">
          <button uiMenuItem (click)="last.set('Exporter en PDF')">PDF</button>
          <button uiMenuItem (click)="last.set('Exporter en CSV')">CSV</button>
          <ui-submenu label="Image">
            <button uiMenuItem (click)="last.set('Exporter en PNG')">PNG</button>
            <button uiMenuItem (click)="last.set('Exporter en SVG')">SVG</button>
          </ui-submenu>
        </ui-submenu>
        <button uiMenuItem icon="lucide:printer" (click)="last.set('Imprimer')">Imprimer</button>
        <button uiMenuItem icon="lucide:trash-2" disabled>Supprimer (désactivé)</button>
      </ui-submenu>

      <ui-submenu label="Panneau à côté" placement="side">
        <button uiMenuItem (click)="last.set('Option A')">Option A</button>
        <button uiMenuItem (click)="last.set('Option B')">Option B</button>
      </ui-submenu>
    </div>
    <p>Dernière action : <strong>{{ last() }}</strong></p>
  `,
  styles: `
    .row { display: flex; flex-wrap: wrap; gap: 1rem; }
    p { margin: 1rem 0 0; }
  `,
})
export class MenuButtonExample {
  protected readonly last = signal('—');
}
