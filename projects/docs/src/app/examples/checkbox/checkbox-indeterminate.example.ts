import { Component, computed, signal } from '@angular/core';
import { UiCheckbox } from 'ic-angular-uikit';

/**
 * « Tout sélectionner » et état indéterminé
 * `indeterminate` affiche un tiret quand une partie seulement des éléments est cochée.
 * @order 2
 */
@Component({
  selector: 'doc-checkbox-indeterminate-example',
  imports: [UiCheckbox],
  template: `
    <ui-checkbox [checked]="allChecked()" [indeterminate]="someChecked()" (changed)="toggleAll($event)">
      <strong>Toutes les notifications</strong>
    </ui-checkbox>
    <div class="children">
      @for (item of items(); track item.id) {
        <ui-checkbox [checked]="item.checked" (changed)="toggle(item.id, $event)">{{ item.label }}</ui-checkbox>
      }
    </div>
  `,
  styles: `.children { display: flex; flex-direction: column; padding-left: 2rem; }`,
})
export class CheckboxIndeterminateExample {
  protected readonly items = signal([
    { id: 1, label: 'Commentaires', checked: true },
    { id: 2, label: 'Mentions', checked: false },
    { id: 3, label: 'Nouveaux abonnés', checked: true },
  ]);
  protected readonly allChecked = computed(() => this.items().every((i) => i.checked));
  protected readonly someChecked = computed(() => !this.allChecked() && this.items().some((i) => i.checked));

  protected toggleAll(checked: boolean): void {
    this.items.update((items) => items.map((i) => ({ ...i, checked })));
  }

  protected toggle(id: number, checked: boolean): void {
    this.items.update((items) => items.map((i) => (i.id === id ? { ...i, checked } : i)));
  }
}
