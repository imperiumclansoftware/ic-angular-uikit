import { Component, signal } from '@angular/core';
import { UiFileEntry, UiFileManager, uiMemoryFileSource } from 'ic-angular-uikit';
import { LIBRARY } from './library';

/**
 * Lecture seule, liste détaillée, images seulement
 * Une source sans opérations d'écriture (`uiMemoryFileSource(…, { readonly: true })`, ou `readonly`) masque toutes les actions de modification. `view="list"` affiche taille, date et type ; `accept="image/*"` masque les autres fichiers ; `selectionMode="single"` et `[selectFolders]="false"` en font un sélecteur de fichier.
 * @order 2
 */
@Component({
  selector: 'doc-file-manager-readonly-example',
  imports: [UiFileManager],
  template: `
    <ui-file-manager [source]="source" view="list" accept="image/*" selectionMode="single" [selectFolders]="false" ariaLabel="Images" [(selection)]="selection" />
    <p class="state">Image choisie : {{ selection()[0]?.name ?? 'aucune' }}</p>
  `,
  styles: `ui-file-manager { --ui-file-manager-height: 18rem; } .state { margin: 0.5rem 0 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }`,
})
export class FileManagerReadonlyExample {
  protected readonly source = uiMemoryFileSource(LIBRARY, { readonly: true });
  protected readonly selection = signal<readonly UiFileEntry[]>([]);
}
