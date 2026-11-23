import { Component, signal } from '@angular/core';
import { UiButton, UiJumbotron, UiJumbotronActions, UiJumbotronBackground } from 'ic-angular-uikit';

/**
 * Image de fond
 * `uiJumbotronBackground` sur une `<img>` : l'image couvre la section, un voile sombre assure la lisibilité du texte, qui passe en blanc (boutons compris). Avec `overlay` à 0,55 ou plus, le contraste est garanti quelle que soit l'image ; en dessous, vérifiez-le. Pour l'image principale d'une page, ajoutez `fetchpriority="high"`.
 * @order 3
 */
@Component({
  selector: 'doc-jumbotron-background-example',
  imports: [UiJumbotron, UiJumbotronBackground, UiJumbotronActions, UiButton],
  template: `
    <label class="overlay">
      overlay : <strong>{{ overlay() }}</strong>
      <input type="range" min="0.3" max="0.9" step="0.05" [value]="overlay()" (input)="setOverlay($event)" />
      @if (overlay() < 0.55) {
        <span class="warn">contraste à vérifier</span>
      }
    </label>
    <ui-jumbotron
      class="demo"
      size="lg"
      align="center"
      eyebrow="Été 2027"
      heading="Partez à la découverte des sommets"
      lead="Randonnées guidées, refuges et matériel compris : réservez votre séjour en montagne en quelques clics."
      [headingLevel]="4"
      [overlay]="overlay()"
    >
      <img uiJumbotronBackground src="demo/mountains.svg" alt="" />
      <div uiJumbotronActions>
        <button uiButton size="lg" variant="secondary">Réserver</button>
        <button uiButton size="lg" variant="outline">Nos itinéraires</button>
      </div>
    </ui-jumbotron>
  `,
  styles: `
    .overlay { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .overlay input { width: 14rem; accent-color: var(--ui-color-primary); }
    .warn { padding: 0 0.5rem; border-radius: 999px; background: var(--ui-color-warning-subtle); color: var(--ui-color-warning-text); font-size: 0.75rem; font-weight: 600; }
    .demo { --ui-jumbotron-radius: var(--ui-radius-lg); }
  `,
})
export class JumbotronBackgroundExample {
  protected readonly overlay = signal(0.55);
  protected setOverlay(event: Event): void {
    this.overlay.set(Number((event.target as HTMLInputElement).value));
  }
}
