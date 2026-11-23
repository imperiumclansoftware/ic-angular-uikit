import { Component, signal } from '@angular/core';
import { UiPrefix, UiSuffix, UiTextField } from 'ic-angular-uikit';

/**
 * Préfixe et suffixe
 * Projetez une icône, une unité ou même un bouton avec `uiPrefix` et `uiSuffix`.
 * @order 2
 */
@Component({
  selector: 'doc-text-field-affixes-example',
  imports: [UiTextField, UiPrefix, UiSuffix],
  template: `
    <div class="ex-stack">
      <ui-text-field label="Recherche" type="search" placeholder="Rechercher un composant…" clearable>
        <svg uiPrefix class="ex-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
      </ui-text-field>
      <ui-text-field label="Prix" type="number" placeholder="0,00">
        <span uiSuffix>€ HT</span>
      </ui-text-field>
      <ui-text-field label="Mot de passe" [type]="visible() ? 'text' : 'password'" autocomplete="new-password">
        <button uiSuffix type="button" class="toggle" (click)="visible.set(!visible())">
          {{ visible() ? 'Masquer' : 'Afficher' }}
        </button>
      </ui-text-field>
    </div>
  `,
  styles: `
    .toggle { border: 0; background: none; color: var(--ui-color-primary-text); font: inherit; font-size: 0.8rem; cursor: pointer; }
  `,
})
export class TextFieldAffixesExample {
  protected readonly visible = signal(false);
}
