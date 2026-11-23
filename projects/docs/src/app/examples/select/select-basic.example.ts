import { Component, signal } from '@angular/core';
import { UiSelect, UiSelectOption } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Liste simple et événements
 * `options` décrit les choix ; `[(value)]` lie la valeur ; `(selectionChange)` renvoie l'option choisie. Les options `disabled` ne sont pas sélectionnables.
 * @order 1
 */
@Component({
  selector: 'doc-select-basic-example',
  imports: [UiSelect, EventLogView],
  template: `
    <div class="ex-stack">
      <ui-select
        label="Pays"
        hint="Utilisé pour calculer les frais de port"
        [options]="countries"
        [(value)]="country"
        (selectionChange)="log.add('selectionChange', $event)"
      />
      <ui-select label="Petit (sm)" size="sm" placeholder="Choisir une taille" [options]="sizes" />
      <ui-select label="Désactivé" disabled [options]="countries" [value]="'fr'" />
    </div>
    <p>value = {{ country() ?? 'null' }}</p>
    <doc-event-log [log]="log" />
  `,
})
export class SelectBasicExample {
  protected readonly country = signal<string | null>(null);
  protected readonly log = new EventLog();
  protected readonly countries: UiSelectOption<string>[] = [
    { value: 'fr', label: 'France' },
    { value: 'be', label: 'Belgique' },
    { value: 'ch', label: 'Suisse' },
    { value: 'ca', label: 'Canada' },
    { value: 'us', label: 'États-Unis (bientôt)', disabled: true },
  ];
  protected readonly sizes: UiSelectOption<string>[] = ['XS', 'S', 'M', 'L', 'XL'].map((s) => ({ value: s, label: s }));
}
