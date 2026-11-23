import { Component, signal } from '@angular/core';
import { UiRadio, UiRadioGroup, UiRichText, sanitizeRichText } from 'ic-angular-uikit';

/**
 * Afficher du HTML venu d'ailleurs
 * `ui-rich-text` affiche du HTML non fiable sans `innerHTML` : il est analysé par la même liste blanche que l'éditeur, puis reconstruit nœud par nœud. Ici, un contenu piégé : le script, l'attribut `onerror`, l'image, le style et le lien `javascript:` disparaissent ; le texte et la mise en forme autorisée restent. Les liens vers un autre site reçoivent `rel="noopener noreferrer nofollow ugc"`. `sanitizeRichText()` donne le HTML nettoyé.
 * @order 3
 */
@Component({
  selector: 'doc-rich-text-viewer-example',
  imports: [UiRichText, UiRadioGroup, UiRadio],
  template: `
    <ui-radio-group label="externalLinks" orientation="horizontal" size="sm" [(value)]="target">
      <ui-radio value="_self">_self</ui-radio>
      <ui-radio value="_blank">_blank (nouvel onglet)</ui-radio>
    </ui-radio-group>
    <div class="grid">
      <div>
        <p class="label" id="viewer-source">HTML reçu</p>
        <pre tabindex="0" aria-labelledby="viewer-source">{{ untrusted }}</pre>
      </div>
      <div>
        <p class="label">Rendu par <code>ui-rich-text</code></p>
        <ui-rich-text class="box" [html]="untrusted" [externalLinks]="target()" />
        <p class="label" id="viewer-clean">HTML nettoyé (<code>sanitizeRichText</code>)</p>
        <pre tabindex="0" aria-labelledby="viewer-clean">{{ clean }}</pre>
      </div>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1.5rem; margin-top: 1rem; }
    .label { margin: 0 0 0.5rem; font-size: 0.875rem; font-weight: 600; }
    pre { margin: 0 0 1rem; padding: 0.75rem; overflow: auto; border-radius: var(--ui-radius-md); background: var(--ui-color-surface-sunken); font-size: 0.8125rem; white-space: pre-wrap; word-break: break-word; }
    .box { margin-bottom: 1rem; padding: 0.75rem 1rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); }
  `,
})
export class RichTextViewerExample {
  protected readonly target = signal<'_self' | '_blank'>('_self');
  protected readonly untrusted = [
    '<h4 style="color:red">Message <script>alert(1)</script>reçu</h4>',
    '<p onclick="steal()">Bonjour <b>Ada</b>, <img src=x onerror="alert(2)">voici <a href="javascript:alert(3)">un lien piégé</a>',
    'et <a href="https://angular.uikit.imperiumclan.fr/" target="_top">un lien sûr</a>.</p>',
    '<style>body{display:none}</style><ul><li>Premier point<li>Second point</ul>',
    '<iframe src="https://exemple.fr"></iframe><div>Texte dans une <span class="x">div</span></div>',
  ].join('\n');
  protected readonly clean = sanitizeRichText(this.untrusted);
}
