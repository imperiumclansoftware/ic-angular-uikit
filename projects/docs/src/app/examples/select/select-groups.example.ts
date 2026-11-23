import { Component, signal } from '@angular/core';
import { UiSelect, UiSelectOption } from 'ic-angular-uikit';

interface Plan {
  id: string;
  name: string;
  price: number;
}

/**
 * Groupes et valeurs objet
 * `group` crée des `<optgroup>`. Les valeurs peuvent être des objets : `compareWith` retrouve l'option sélectionnée même si l'objet a été recréé (par ex. rechargé depuis une API).
 * @order 2
 */
@Component({
  selector: 'doc-select-groups-example',
  imports: [UiSelect],
  template: `
    <div class="ex-stack">
      <ui-select label="Offre" [options]="plans" [compareWith]="sameId" [(value)]="plan" />
    </div>
    <p>value = {{ plan() ? plan()!.name + ' — ' + plan()!.price + ' €' : 'null' }}</p>
  `,
})
export class SelectGroupsExample {
  private readonly all: (Plan & { group: string })[] = [
    { id: 'solo', name: 'Solo', price: 9, group: 'Particuliers' },
    { id: 'famille', name: 'Famille', price: 15, group: 'Particuliers' },
    { id: 'equipe', name: 'Équipe', price: 49, group: 'Professionnels' },
    { id: 'entreprise', name: 'Entreprise', price: 199, group: 'Professionnels' },
  ];
  protected readonly plans: UiSelectOption<Plan>[] = this.all.map(({ group, ...plan }) => ({
    value: plan,
    label: `${plan.name} — ${plan.price} €/mois`,
    group,
  }));
  /** Objet « reçu de l'API » : ce n'est pas la même instance que dans `plans`. */
  protected readonly plan = signal<Plan | null>({ id: 'equipe', name: 'Équipe', price: 49 });
  protected readonly sameId = (a: Plan | null, b: Plan | null) => a?.id === b?.id;
}
