import { Component, signal } from '@angular/core';
import { UiRichText, UiRichTextEditor, UiTabs, UiTab } from 'ic-angular-uikit';

/**
 * Éditeur et aperçu
 * `[(value)]` contient du HTML nettoyé (liste blanche), affiché à côté par `ui-rich-text`. Essayez la barre d'outils, les raccourcis (Ctrl+B, Ctrl+K pour un lien, Ctrl+Z…) et le collage depuis une page web ou un traitement de texte : styles, images et scripts sont retirés, titres, listes, liens et gras sont gardés.
 * @order 1
 */
@Component({
  selector: 'doc-rich-text-editor-basic-example',
  imports: [UiRichTextEditor, UiRichText, UiTabs, UiTab],
  template: `
    <div class="layout">
      <ui-rich-text-editor label="Article" placeholder="Rédigez votre article…" [(value)]="html" />
      <ui-tabs ariaLabel="Résultat">
        <ui-tab label="Aperçu">
          <ui-rich-text class="preview" [html]="html()" />
        </ui-tab>
        <ui-tab label="HTML">
          <pre class="source" tabindex="0">{{ html() || '(vide)' }}</pre>
        </ui-tab>
      </ui-tabs>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 1.5rem; align-items: start; }
    .preview { padding: 0.5rem 0; }
    .source { max-height: 22rem; margin: 0; padding: 0.75rem; overflow: auto; border-radius: var(--ui-radius-md); background: var(--ui-color-surface-sunken); font-size: 0.8125rem; white-space: pre-wrap; word-break: break-word; }
  `,
})
export class RichTextEditorBasicExample {
  protected readonly html = signal(
    '<h2>Bienvenue</h2><p>Ce texte est <strong>modifiable</strong> : mettez-le en <em>forme</em>, ajoutez des <a href="https://angular.uikit.imperiumclan.fr/">liens</a> ou des listes.</p><ul><li>Titres et citations</li><li>Listes à puces ou numérotées</li></ul><blockquote><p>Le HTML produit est toujours nettoyé.</p></blockquote>',
  );
}
