import { Component, signal } from '@angular/core';
import { UiTable, UiTableColumn } from 'ic-angular-uikit';

interface City {
  name: string;
  country: string;
  population: number;
}

const NAMES = ['Lyon', 'Lille', 'Nantes', 'Rennes', 'Bordeaux', 'Toulouse', 'Nice', 'Brest', 'Dijon', 'Metz', 'Tours', 'Reims'];

const CITIES: City[] = Array.from({ length: 90 }, (_, i) => ({
  name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
  country: 'France',
  population: 20_000 + ((i * 7919) % 480_000),
}));

/**
 * Pagination automatique
 * Avec `pageSize="auto"`, la table affiche **autant de lignes que la hauteur disponible le permet, sans défilement** : elle mesure la hauteur visible de son conteneur défilant (ici le cadre, `overflow: auto`) — ou de la fenêtre s'il n'y en a pas — et en retire l'en-tête, la barre d'outils et la pagination. Le nombre est recalculé au redimensionnement : changez la hauteur du cadre avec le curseur. L'option « Auto (n) » reste proposée dans la liste à côté des tailles fixes.
 * @order 5
 */
@Component({
  selector: 'doc-table-auto-page-example',
  imports: [UiTable],
  template: `
    <label class="height">
      Hauteur du cadre : {{ height() }} px
      <input type="range" min="220" max="720" step="20" [value]="height()" (input)="height.set(+$any($event.target).value)" />
    </label>
    <div class="frame" [style.height.px]="height()">
      <ui-table caption="Villes" [data]="cities" [columns]="columns" paginated pageSize="auto" dense />
    </div>
  `,
  styles: `
    .height { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .frame { overflow: auto; padding: 0.5rem; border: 1px dashed var(--ui-color-border-control); border-radius: var(--ui-radius-md); }
  `,
})
export class TableAutoPageExample {
  protected readonly height = signal(400);
  protected readonly cities = CITIES;
  protected readonly columns: UiTableColumn<City>[] = [
    { key: 'name', header: 'Ville', sortable: true },
    { key: 'country', header: 'Pays' },
    { key: 'population', header: 'Population', sortable: true, align: 'end', value: (c) => c.population.toLocaleString('fr-FR') },
  ];
}
