import { Component, signal } from '@angular/core';
import { UiBadge, UiButton, UiCard, UiCardFooter, UiCardHeader, UiCardMedia } from 'ic-angular-uikit';

/**
 * Carte horizontale
 * `orientation="horizontal"` place le média à gauche du contenu dès que la carte fait au moins 32rem de large, et l'empile à nouveau en dessous. C'est la largeur de la carte qui compte (requête de conteneur), pas celle de l'écran : faites varier la largeur du cadre.
 * @order 3
 */
@Component({
  selector: 'doc-card-horizontal-example',
  imports: [UiCard, UiCardHeader, UiCardMedia, UiCardFooter, UiButton, UiBadge],
  template: `
    <label class="width">
      Largeur du cadre : <strong>{{ width() }} px</strong>
      <input type="range" min="260" max="760" step="20" [value]="width()" (input)="setWidth($event)" />
    </label>
    <div class="frame" [style.width.px]="width()">
      <ui-card orientation="horizontal" appearance="outlined">
        <svg uiCardMedia class="art" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="160" height="120" fill="#1e3a8a" />
          <circle cx="118" cy="34" r="16" fill="#fbbf24" />
          <path d="M0 120 50 58l30 32 22-22 58 52Z" fill="#60a5fa" />
          <path d="M0 120 34 86l26 34Z" fill="#93c5fd" />
        </svg>
        <header uiCardHeader class="header">
          <h4>Randonnée au lac Blanc</h4>
          <ui-badge tone="success" pill>Facile</ui-badge>
        </header>
        <p>Boucle de 9 km au départ du col, 650 m de dénivelé. Vue sur le massif à l'arrivée.</p>
        <footer uiCardFooter>
          <button uiButton variant="ghost">Partager</button>
          <button uiButton>Voir l'itinéraire</button>
        </footer>
      </ui-card>
    </div>
  `,
  styles: `
    .width { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .width input { flex: 1; min-width: 10rem; max-width: 20rem; accent-color: var(--ui-color-primary); }
    .frame { max-width: 100%; padding: 0.5rem; border: 1px dashed var(--ui-color-border-control); border-radius: var(--ui-radius-md); box-sizing: border-box; }
    .art { aspect-ratio: 16 / 9; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    h4 { margin: 0; font-size: 1.05rem; }
    p { margin: 0; color: var(--ui-color-text-muted); }
  `,
})
export class CardHorizontalExample {
  protected readonly width = signal(620);

  protected setWidth(event: Event): void {
    this.width.set(Number((event.target as HTMLInputElement).value));
  }
}
