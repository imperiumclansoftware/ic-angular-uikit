import { Component } from '@angular/core';
import { UiButton, UiLoader, provideUiLoader } from 'ic-angular-uikit';
import { BrandLoader } from './brand-loader';

/**
 * Loader personnalisé
 * Un loader sur mesure est un composant Angular ordinaire, enregistré sous un nom avec `provideUiLoader({ loaders: { marque: BrandLoader } })` ; il s'utilise ensuite comme les loaders prédéfinis (`type="marque"`), ou devient le loader par défaut (`type: 'marque'`). Il lit `--ui-loader-size`, `--ui-loader-color` et `--ui-loader-duration-scale` ; `ui-loader` lui ajoute le rôle `status` et le texte pour les lecteurs d'écran. `delay` évite le clignotement d'un loader sur un chargement rapide.
 * @order 3
 */
@Component({
  selector: 'doc-loader-custom-example',
  imports: [UiLoader, UiButton],
  providers: [provideUiLoader({ loaders: { marque: BrandLoader } })],
  template: `
    <div class="row">
      <ui-loader type="marque" size="lg" label="Chargement de votre espace…" />
      <ui-loader type="marque" size="4rem" style="--ui-loader-color: var(--ui-color-success)" />
      <button uiButton variant="secondary" loader="marque" loading>Synchronisation</button>
    </div>
    <div class="row">
      <button uiButton variant="outline" (click)="toggle()">{{ shown ? 'Masquer' : 'Afficher avec 400 ms de délai' }}</button>
      @if (shown) {
        <ui-loader type="dots" [delay]="400" />
      }
    </div>
  `,
  styles: `.row { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5rem; } .row + .row { margin-top: 1.25rem; }`,
})
export class LoaderCustomExample {
  protected shown = false;

  protected toggle(): void {
    this.shown = !this.shown;
  }
}
