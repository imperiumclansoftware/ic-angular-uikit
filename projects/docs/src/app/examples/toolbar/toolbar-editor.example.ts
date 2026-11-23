import { Component, signal } from '@angular/core';
import {
  UiButton,
  UiMenuItem,
  UiSubmenu,
  UiTextField,
  UiToolbar,
  UiToolbarAppearance,
  UiToolbarGroup,
  UiToolbarSeparator,
  UiToolbarSpacer,
  UiRadio,
  UiRadioGroup,
} from 'ic-angular-uikit';

type Align = 'start' | 'center' | 'end';

/**
 * Barre d'outils d'éditeur
 * Un seul arrêt de tabulation : entrez dans la barre avec Tab, puis parcourez les commandes avec ← / → (Origine / Fin pour les extrémités). Les boutons bascule portent `aria-pressed`, les groupes sont nommés (`uiToolbarGroup="…"`), « Insérer » est un sous-menu à plusieurs niveaux (↓ pour l'ouvrir). Le champ de recherche garde ses flèches et reste atteignable avec Tab.
 * @order 1
 */
@Component({
  selector: 'doc-toolbar-editor-example',
  imports: [
    UiToolbar, UiToolbarGroup, UiToolbarSeparator, UiToolbarSpacer, UiButton, UiSubmenu, UiMenuItem, UiTextField,
    UiRadioGroup, UiRadio,
  ],
  template: `
    <ui-radio-group label="appearance" orientation="horizontal" size="sm" [(value)]="appearance">
      <ui-radio value="plain">plain</ui-radio>
      <ui-radio value="outlined">outlined</ui-radio>
      <ui-radio value="filled">filled</ui-radio>
    </ui-radio-group>

    <ui-toolbar class="toolbar" ariaLabel="Mise en forme du texte" [appearance]="appearance()">
      <div uiToolbarGroup="Historique">
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:undo-2" aria-label="Annuler" (click)="log('Annuler')"></button>
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:redo-2" aria-label="Rétablir" (click)="log('Rétablir')"></button>
      </div>
      <ui-toolbar-separator />
      <div uiToolbarGroup="Style">
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:bold" aria-label="Gras" [attr.aria-pressed]="bold()" (click)="bold.set(!bold())"></button>
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:italic" aria-label="Italique" [attr.aria-pressed]="italic()" (click)="italic.set(!italic())"></button>
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:underline" aria-label="Souligné" [attr.aria-pressed]="underline()" (click)="underline.set(!underline())"></button>
      </div>
      <ui-toolbar-separator />
      <div uiToolbarGroup="Alignement">
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:text-align-start" aria-label="Aligner à gauche" [attr.aria-pressed]="align() === 'start'" (click)="align.set('start')"></button>
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:text-align-center" aria-label="Centrer" [attr.aria-pressed]="align() === 'center'" (click)="align.set('center')"></button>
        <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:text-align-end" aria-label="Aligner à droite" [attr.aria-pressed]="align() === 'end'" (click)="align.set('end')"></button>
      </div>
      <ui-toolbar-separator />
      <ui-submenu label="Insérer" icon="lucide:plus">
        <button uiMenuItem icon="lucide:link" (click)="log('Lien')">Lien</button>
        <button uiMenuItem icon="lucide:image" (click)="log('Image')">Image</button>
        <ui-submenu label="Tableau" icon="lucide:table">
          <button uiMenuItem (click)="log('Tableau 2 × 2')">2 × 2</button>
          <button uiMenuItem (click)="log('Tableau 3 × 3')">3 × 3</button>
          <ui-submenu label="Modèles">
            <button uiMenuItem (click)="log('Tableau : facture')">Facture</button>
            <button uiMenuItem (click)="log('Tableau : planning')">Planning</button>
          </ui-submenu>
        </ui-submenu>
        <button uiMenuItem icon="lucide:code" (click)="log('Bloc de code')">Bloc de code</button>
      </ui-submenu>
      <ui-toolbar-spacer />
      <ui-text-field class="search" type="search" size="sm" ariaLabel="Rechercher dans le document" prefixIcon="lucide:search" placeholder="Rechercher…" />
    </ui-toolbar>

    <p
      class="preview"
      [class.bold]="bold()"
      [class.italic]="italic()"
      [class.underline]="underline()"
      [style.text-align]="align()"
    >
      Le texte d'exemple suit la mise en forme choisie.
    </p>
    <p class="log">Dernière commande : <strong>{{ last() }}</strong></p>
  `,
  styles: `
    .toolbar { margin-top: 1rem; }
    .search { width: 13rem; }
    .preview { margin: 1rem 0 0; padding: 1rem; border: 1px dashed var(--ui-color-border-strong); border-radius: var(--ui-radius-md); }
    .bold { font-weight: 700; }
    .italic { font-style: italic; }
    .underline { text-decoration: underline; }
    .log { margin: 0.75rem 0 0; }
  `,
})
export class ToolbarEditorExample {
  protected readonly appearance = signal<UiToolbarAppearance>('outlined');
  protected readonly bold = signal(true);
  protected readonly italic = signal(false);
  protected readonly underline = signal(false);
  protected readonly align = signal<Align>('start');
  protected readonly last = signal('—');

  protected log(command: string): void {
    this.last.set(command);
  }
}
