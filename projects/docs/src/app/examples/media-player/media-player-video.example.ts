import { Component } from '@angular/core';
import { UiMediaPlayer } from 'ic-angular-uikit';
import { VIDEOS } from './tracks';

/**
 * Vidéos : fichier et YouTube
 * Une source est soit un fichier (lecture native : sous-titres WebVTT, vitesse, image dans l'image, plein écran), soit une page YouTube ou Vimeo, reconnue automatiquement. Le lecteur de l'hébergeur n'est chargé qu'au clic (`embedConsent="click"`, il peut déposer des cookies), en version sans cookies (`youtube-nocookie.com`) ; il est piloté par messages, sans script tiers dans la page. La CSP du site autorise seulement ces deux lecteurs : `frame-src https://www.youtube-nocookie.com https://player.vimeo.com`.
 * @order 2
 */
@Component({
  selector: 'doc-media-player-video-example',
  imports: [UiMediaPlayer],
  template: `<ui-media-player class="player" [sources]="videos" />`,
  styles: `.player { max-width: 52rem; }`,
})
export class MediaPlayerVideoExample {
  protected readonly videos = VIDEOS;
}
