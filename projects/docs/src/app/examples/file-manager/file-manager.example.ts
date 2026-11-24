import { Component, signal } from '@angular/core';
import { UiFileEntry, UiFileManager } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';
import { createLibrary } from './library';

/**
 * Gestionnaire de fichiers
 * Parcours des dossiers (fil d'Ariane, double clic ou Entrée), vignettes ou liste détaillée, recherche et tri (dossiers en tête), sélection multiple (Ctrl / Maj + clic ou flèches), **Nouveau dossier**, **Renommer** (F2), **Supprimer** (Suppr, avec confirmation), **Couper / Coller** (Ctrl+X, Ctrl+V) ou glisser-déposer sur un dossier ou un segment du fil d'Ariane, **envoi** par bouton ou dépôt de fichiers avec progression et annulation, menu contextuel (clic droit, Maj+F10). Les données viennent d'une `UiFileSource` : ici `uiMemoryFileSource` (en mémoire, rien n'est envoyé) ; en production `uiHttpFileSource` et l'onglet « Côté serveur ».
 * @order 1
 */
@Component({
  selector: 'doc-file-manager-example',
  imports: [UiFileManager, EventLogView],
  template: `
    <ui-file-manager
      [source]="source"
      [(selection)]="selection"
      [(folder)]="folder"
      maxFileSize="5 Mo"
      (open)="log.add('open', $event.name)"
      (changed)="log.add('changed', { action: $event.action, entries: names($event.entries) })"
      (failed)="log.add('failed', $event)"
    />
    <p class="state">Sélection : {{ selection().length ? names(selection()).join(', ') : 'aucune' }} · dossier : {{ folder() ?? 'racine' }}</p>
    <doc-event-log [log]="log" />
  `,
  styles: `.state { margin: 0.5rem 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }`,
})
export class FileManagerExample {
  protected readonly source = createLibrary();
  protected readonly selection = signal<readonly UiFileEntry[]>([]);
  protected readonly folder = signal<string | null>(null);
  protected readonly log = new EventLog();
  protected readonly names = (entries: readonly UiFileEntry[]) => entries.map((e) => e.name);
}
