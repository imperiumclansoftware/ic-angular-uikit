import { Component } from '@angular/core';
import { UiBadge, UiImage } from 'ic-angular-uikit';

/**
 * Erreur, image de secours, aperçu flou et calque
 * Si l'image ne peut pas être chargée : `fallbackSrc` est essayée, sinon un message (`errorText`, suivi du texte alternatif pour les lecteurs d'écran) et un bouton **Réessayer** (`retry`). `placeholderSrc` affiche un aperçu basse définition flouté pendant le chargement. Le contenu `[uiImageOverlay]` (légende, badge) n'apparaît qu'une fois l'image chargée. Sans ratio connu, une hauteur minimale est réservée (`--ui-image-min-height`) ; `--ui-image-background` colore les bandes de `fit="contain"`. `alt` est obligatoire ; `alt=""` pour une image purement décorative.
 * @order 3
 */
@Component({
  selector: 'doc-image-states-example',
  imports: [UiImage, UiBadge],
  template: `
    <div class="grid">
      <figure>
        <ui-image src="demo/introuvable.jpg" alt="Photo de l'équipe" ratio="4/3" />
        <figcaption>Échec, avec Réessayer</figcaption>
      </figure>
      <figure>
        <ui-image src="demo/introuvable.jpg" fallbackSrc="demo/dashboard.svg" alt="Aperçu du tableau de bord" ratio="4/3" />
        <figcaption>Échec → image de secours</figcaption>
      </figure>
      <figure>
        <ui-image src="demo/ocean.svg" placeholderSrc="demo/media/aurore.svg" alt="Vagues de l’océan au coucher du soleil" ratio="4/3">
          <div uiImageOverlay class="overlay"><ui-badge tone="primary" pill>Nouveau</ui-badge></div>
        </ui-image>
        <figcaption>Aperçu flou et badge en calque</figcaption>
      </figure>
      <figure>
        <ui-image src="demo/city.svg" alt="Silhouette d’une ville la nuit" fit="contain" ratio="1" style="--ui-image-background: var(--ui-color-neutral-subtle)" />
        <figcaption><code>fit="contain"</code>, carré</figcaption>
      </figure>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 1rem; }
    figure { margin: 0; }
    ui-image { --ui-image-radius: var(--ui-radius-md); }
    figcaption { margin-top: 0.4rem; color: var(--ui-color-text-muted); font-size: 0.8125rem; }
    .overlay { position: absolute; top: 0.5rem; right: 0.5rem; }
  `,
})
export class ImageStatesExample {}
