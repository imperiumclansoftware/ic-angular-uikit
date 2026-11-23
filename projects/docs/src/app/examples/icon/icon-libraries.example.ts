import { Component } from '@angular/core';
import { UiIcon } from 'ic-angular-uikit';

/**
 * Les principales librairies
 * Une même syntaxe `préfixe:nom` pour toutes : Font Awesome (`fa`, `far`, `fab`), Google Material Symbols (`material`), Bootstrap Icons (`bi`), Lucide (`lucide`, jeu par défaut de ce site). La déclaration des jeux est décrite dans **Prise en main → Icônes**.
 * @order 1
 */
@Component({
  selector: 'doc-icon-libraries-example',
  imports: [UiIcon],
  template: `
    <div class="table" role="table" aria-label="Mêmes icônes dans chaque librairie">
      <div class="row head" role="row">
        <span role="columnheader">Librairie</span>
        @for (concept of concepts; track concept) {
          <span role="columnheader">{{ concept }}</span>
        }
      </div>
      @for (lib of libraries; track lib.name) {
        <div class="row" role="row">
          <span role="rowheader" class="lib">{{ lib.name }}</span>
          @for (icon of lib.icons; track icon) {
            <span role="cell" class="cell">
              <ui-icon [name]="icon" size="lg" />
              <code>{{ icon }}</code>
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .table { display: grid; gap: 2px; overflow-x: auto; }
    .row { display: grid; grid-template-columns: 9rem repeat(4, minmax(7.5rem, 1fr)); align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--ui-color-border); }
    .head { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--ui-color-text-subtle); }
    .lib { font-weight: 600; font-size: 0.875rem; }
    .cell { display: flex; align-items: center; gap: 0.5rem; }
    code { font-size: 0.7rem; color: var(--ui-color-text-muted); }
  `,
})
export class IconLibrariesExample {
  protected readonly concepts = ['Accueil', 'Recherche', 'Utilisateur', 'Réglages'];
  protected readonly libraries = [
    { name: 'Font Awesome', icons: ['fa:house', 'fa:magnifying-glass', 'far:user', 'fa:gear'] },
    { name: 'Material Symbols', icons: ['material:home', 'material:search', 'material:person', 'material:settings'] },
    { name: 'Bootstrap Icons', icons: ['bi:house', 'bi:search', 'bi:person', 'bi:gear'] },
    { name: 'Lucide', icons: ['lucide:house', 'lucide:search', 'lucide:user', 'lucide:settings'] },
  ];
}
