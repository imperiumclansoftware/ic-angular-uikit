import { Component, signal } from '@angular/core';
import { UiRichText, UiRichTextEditor } from 'ic-angular-uikit';
import { createArticleMedia } from './article-media';

/**
 * Images et vidéos dans l'éditeur
 * `[mediaSource]` (une `UiFileSource`) ajoute le bouton **Image ou vidéo** : le sélecteur s'ouvre sur la bibliothèque (ou une adresse), demande le texte alternatif et la légende, puis insère une figure après le paragraphe courant. Les figures sont des blocs : bouton × ou Retour arrière pour les retirer. Les médias restent **désactivés par défaut** dans la liste blanche : ils ne sont acceptés que sous la forme `figure > img | video`, adresses http(s) ou relatives (jamais `data:` ni `javascript:`) ; `[media]="{ allowUrl }"` restreint les adresses. Pour l'affichage : `<ui-rich-text [media]="true">`. Le serveur doit accepter les mêmes éléments (onglet « Côté serveur », section médias).
 * @order 4
 */
@Component({
  selector: 'doc-rich-text-media-example',
  imports: [UiRichTextEditor, UiRichText],
  template: `
    <ui-rich-text-editor label="Article" [mediaSource]="library" [(value)]="html" />
    <p class="label">Rendu avec <code>ui-rich-text [media]="true"</code></p>
    <ui-rich-text class="preview" [html]="html()" [media]="true" />
    <p class="label">Valeur (HTML nettoyé)</p>
    <pre class="value">{{ html() }}</pre>
  `,
  styles: `
    .label { margin: 1.25rem 0 0.5rem; font-weight: 600; }
    .preview { padding: 1rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); }
    .value { max-height: 10rem; overflow: auto; font-size: 0.75rem; white-space: pre-wrap; overflow-wrap: anywhere; }
  `,
})
export class RichTextMediaExample {
  protected readonly library = createArticleMedia();
  protected readonly html = signal(
    '<h2>Carnet de route</h2><p>Première étape : les cols alpins.</p><figure><img src="demo/mountains.svg" alt="Montagnes enneigées sous un ciel violet" width="1600" height="900"><figcaption>Col du Galibier</figcaption></figure><p>Ajoutez une image ou une vidéo avec le bouton de la barre d’outils.</p>',
  );
}
