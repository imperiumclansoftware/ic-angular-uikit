import { Component, inject } from '@angular/core';
import { UI_VISUALIZATIONS, UiAudioVisualizer, UiMediaHub, UiVisualization } from 'ic-angular-uikit';

/**
 * Toutes les visualisations
 * `ui-audio-visualizer` s'utilise aussi seul, avec un lecteur ou un `AnalyserNode` Web Audio dans `source`. Ici, les cinq visualisations suivent le lecteur actif de la page (`UiMediaHub.active()`) : lancez un morceau dans le premier exemple. La couleur vient de `--ui-visualizer-color` (couleur de texte principale du thème par défaut) ; avec `prefers-reduced-motion`, l'image n'est mise à jour que quelques fois par seconde.
 * @order 4
 */
@Component({
  selector: 'doc-media-player-visualizers-example',
  imports: [UiAudioVisualizer],
  template: `
    <ul class="grid">
      @for (type of types; track type) {
        <li class="cell">
          <ui-audio-visualizer class="viz" [source]="hub.active()" [type]="type" />
          <code>{{ type }}</code> — {{ labels[type] }}
        </li>
      }
    </ul>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 1rem; margin: 0; padding: 0; list-style: none; }
    .cell { display: grid; gap: 0.5rem; font-size: 0.875rem; }
    .viz { height: 7rem; border-radius: var(--ui-radius-md); background: var(--ui-color-surface-sunken); }
    .cell:nth-child(2) .viz { --ui-visualizer-color: var(--ui-color-success-text); }
    .cell:nth-child(4) .viz { --ui-visualizer-color: var(--ui-color-danger-text); }
  `,
})
export class MediaPlayerVisualizersExample {
  protected readonly hub = inject(UiMediaHub);
  protected readonly labels = UI_VISUALIZATIONS;
  protected readonly types = Object.keys(UI_VISUALIZATIONS) as UiVisualization[];
}
