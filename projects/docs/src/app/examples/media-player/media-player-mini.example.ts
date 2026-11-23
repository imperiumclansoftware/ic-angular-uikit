import { Component, signal } from '@angular/core';
import {
  UiAppBar,
  UiAppBarEnd,
  UiAppBarStart,
  UiMediaPlayer,
  UiMenu,
  UiMenuItem,
  UiMiniPlayer,
  UiRadio,
  UiRadioGroup,
  UiVisualization,
} from 'ic-angular-uikit';
import { MUSIC } from './tracks';

/**
 * Mini-lecteur dans une barre d'application
 * `ui-mini-player` suit le lecteur actif de la page (le dernier lancé, y compris ceux des exemples précédents) ou celui passé dans `[player]`. Sa vignette montre une visualisation pour la musique, l'image animée de la vidéo pour un fichier vidéo, la pochette ou le logo de l'hébergeur pour YouTube. Cliquer sur le titre ramène au lecteur. `compact` ne garde que la vignette, le titre et lecture / pause.
 * @order 3
 */
@Component({
  selector: 'doc-media-player-mini-example',
  imports: [UiAppBar, UiAppBarStart, UiAppBarEnd, UiMenu, UiMenuItem, UiMiniPlayer, UiMediaPlayer, UiRadioGroup, UiRadio],
  template: `
    <ui-radio-group label="visualization (vignette)" orientation="horizontal" size="sm" [(value)]="visualization">
      <ui-radio value="bars">Barres</ui-radio>
      <ui-radio value="radial">Cercle</ui-radio>
      <ui-radio value="wave">Onde</ui-radio>
      <ui-radio value="blocks">Égaliseur</ui-radio>
    </ui-radio-group>

    <div class="frame">
      <ui-app-bar color="primary" [landmark]="false" [breakpoint]="0">
        <strong uiAppBarStart>Radio IC</strong>
        <ui-menu orientation="horizontal" ariaLabel="Navigation (démo mini-lecteur)">
          <button uiMenuItem active>Accueil</button>
          <button uiMenuItem>Albums</button>
        </ui-menu>
        <ui-mini-player uiAppBarEnd [visualization]="visualization()" />
      </ui-app-bar>
      <div class="content">
        <p>Le mini-lecteur pilote le lecteur actif de la page. Lancez celui-ci (ou un lecteur des exemples précédents), puis utilisez les commandes de la barre.</p>
        <ui-media-player ariaLabel="Lecteur de la radio" [sources]="music" visualization="radial" [showPlaylist]="false" />
      </div>
    </div>

    <p class="label">Version compacte, liée à ce lecteur avec <code>[player]</code> :</p>
    <ui-mini-player compact [player]="local" [visualization]="visualization()" />
    <ui-media-player #local ariaLabel="Lecteur compact" class="hidden-player" [sources]="lastTrack" visualization="blocks" [showPlaylist]="false" />
  `,
  styles: `
    .frame { margin-top: 1rem; overflow: hidden; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); }
    .content { display: grid; gap: 1rem; padding: 1rem; background: var(--ui-color-bg); }
    .content p { margin: 0; }
    .label { margin: 1.25rem 0 0.5rem; font-size: 0.875rem; }
    .hidden-player { margin-top: 0.75rem; max-width: 30rem; }
  `,
})
export class MediaPlayerMiniExample {
  protected readonly music = MUSIC;
  protected readonly lastTrack = MUSIC.slice(2);
  protected readonly visualization = signal<UiVisualization>('bars');
}
