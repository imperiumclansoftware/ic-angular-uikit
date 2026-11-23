import { Component, signal } from '@angular/core';
import { UiBadge, UiSelect, UiSelectOption, UiSelectOptionTemplate } from 'ic-angular-uikit';

interface Member {
  initials: string;
  role: string;
  online: boolean;
}

/**
 * Options riches (ng-template)
 * `ng-template uiSelectOption` personnalise le contenu des options (avatar, badge…). Rendu riche dans les navigateurs qui gèrent le select personnalisable (Chrome, Edge, Safari 27) ; ailleurs, la liste native affiche `label`, qui doit donc se suffire à lui-même.
 * @order 3
 */
@Component({
  selector: 'doc-select-rich-example',
  imports: [UiSelect, UiSelectOptionTemplate, UiBadge],
  template: `
    <div class="ex-stack">
      <ui-select label="Assigner à" placeholder="Choisir un membre" [options]="members" [(value)]="assignee">
        <ng-template uiSelectOption [uiSelectOptionOf]="members" let-option>
          <span class="avatar" aria-hidden="true">{{ option.value.initials }}</span>
          <span class="name">{{ option.label }}</span>
          <ui-badge [tone]="option.value.online ? 'success' : 'neutral'" dot pill>{{ option.value.role }}</ui-badge>
        </ng-template>
      </ui-select>
    </div>
  `,
  styles: `
    .avatar { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: var(--ui-color-primary-subtle); color: var(--ui-color-primary-text); font-size: 0.7rem; font-weight: 700; flex: none; }
    .name { flex: 1; }
  `,
})
export class SelectRichExample {
  protected readonly assignee = signal<Member | null>(null);
  protected readonly members: UiSelectOption<Member>[] = [
    { value: { initials: 'AL', role: 'Admin', online: true }, label: 'Ada Lovelace' },
    { value: { initials: 'AT', role: 'Éditeur', online: false }, label: 'Alan Turing' },
    { value: { initials: 'GH', role: 'Éditeur', online: true }, label: 'Grace Hopper' },
  ];
}
