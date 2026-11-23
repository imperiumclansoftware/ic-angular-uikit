import { Component, signal } from '@angular/core';
import { UI_VISUALIZATIONS, UiMediaPlayer, UiRadio, UiRadioGroup, UiVisualization } from 'ic-angular-uikit';
import { MUSIC } from './tracks';

/**
 * Lecteur de musique avec liste de lecture
 * `sources` reçoit la liste des morceaux (`[(index)]` pour la position), `visualization` choisit une des visualisations prédéfinies — essayez-les pendant la lecture. Commandes au clavier quand le focus est dans le lecteur : Espace ou K, ← / →, ↑ / ↓, M, Maj+N / Maj+P. La répétition (bouton ⟲) boucle sur la liste ou le morceau. Les morceaux sont servis par le site : l'analyse du son (visualisations) exige des fichiers de même origine ou servis avec CORS (`crossOrigin`).
 * @order 1
 */
@Component({
  selector: 'doc-media-player-music-example',
  imports: [UiMediaPlayer, UiRadioGroup, UiRadio],
  template: `
    <ui-radio-group label="visualization" orientation="horizontal" size="sm" [(value)]="visualization">
      @for (option of options; track option.value) {
        <ui-radio [value]="option.value">{{ option.label }}</ui-radio>
      }
    </ui-radio-group>
    <ui-media-player class="player" [sources]="music" [visualization]="visualization()" [(index)]="index" />
    <p class="log">Morceau {{ index() + 1 }} sur {{ music.length }}</p>
  `,
  styles: `
    .player { margin-top: 1rem; max-width: 46rem; }
    .log { margin: 0.75rem 0 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }
  `,
})
export class MediaPlayerMusicExample {
  protected readonly music = MUSIC;
  protected readonly index = signal(0);
  protected readonly visualization = signal<UiVisualization | 'none'>('bars');
  protected readonly options = [
    ...(Object.keys(UI_VISUALIZATIONS) as UiVisualization[]).map((value) => ({ value, label: UI_VISUALIZATIONS[value] })),
    { value: 'none' as const, label: 'Aucune' },
  ];
}
