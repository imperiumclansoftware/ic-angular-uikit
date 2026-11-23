import { Component } from '@angular/core';
import { UI_LOADER_TYPES, UiLoader } from 'ic-angular-uikit';

/**
 * Loaders prédéfinis
 * Neuf loaders, en CSS pur (aucune image, compatibles CSP stricte) : `spinner`, `ring`, `dots`, `pulse`, `bars`, `orbit`, `grid`, `line` (barre indéterminée sur toute la largeur) et `skeleton` (reflet qui remplit son conteneur). Tailles `sm`, `md`, `lg` ou longueur CSS (`size="1em"`), couleur `--ui-loader-color`, vitesse `speed`. Chaque loader est annoncé aux lecteurs d'écran (`role="status"`, texte `label`) ; si l'utilisateur réduit les animations, rotations et rebonds laissent place à un battement lent.
 * @order 1
 */
@Component({
  selector: 'doc-loader-types-example',
  imports: [UiLoader],
  template: `
    <ul class="grid">
      @for (type of types; track type) {
        <li>
          <div class="stage" [class.stage--fill]="type === 'line' || type === 'skeleton'">
            <ui-loader [type]="type" [label]="'Chargement (' + type + ')…'" />
          </div>
          <code>{{ type }}</code>
        </li>
      }
    </ul>
    <div class="sizes">
      <ui-loader type="dots" size="sm" />
      <ui-loader type="dots" />
      <ui-loader type="dots" size="lg" />
      <ui-loader type="ring" size="4rem" style="--ui-loader-color: var(--ui-color-success)" />
      <ui-loader type="bars" size="lg" speed="0.5" label="Chargement lent…" />
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
    li { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .stage { display: grid; place-items: center; width: 100%; height: 5.5rem; padding: 0.75rem; box-sizing: border-box; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); background: var(--ui-color-surface); }
    .stage--fill { place-items: stretch; align-content: center; }
    .stage--fill ui-loader.ui-loader--skeleton { height: 3.5rem; }
    code { font-size: 0.8125rem; }
    .sizes { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5rem; margin-top: 1.25rem; }
  `,
})
export class LoaderTypesExample {
  protected readonly types = UI_LOADER_TYPES;
}
