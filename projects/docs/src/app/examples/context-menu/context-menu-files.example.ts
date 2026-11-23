import { Component, signal } from '@angular/core';
import {
  UiContextMenu,
  UiContextMenuTrigger,
  UiIcon,
  UiMenuItem,
  UiMenuSeparator,
  UiSubmenu,
} from 'ic-angular-uikit';

interface FileItem {
  id: number;
  name: string;
  icon: string;
  starred: boolean;
}

/**
 * Menu contextuel sur une liste de fichiers
 * Clic droit (ou appui long sur écran tactile) sur un fichier ; au clavier, placez le focus sur un fichier puis touche Menu ou Maj+F10. `[uiContextMenuData]` transmet le fichier au menu, lu par `menu.data()`. Éléments : `shortcut` (raccourci indicatif), `checked` (élément cochable), `tone="danger"`, sous-menu `ui-submenu` (s'ouvre à côté, au survol ou avec →), `ui-menu-separator`. Tapez une lettre pour atteindre un élément. Le bouton ⋯ ouvre le même menu avec `openFor()` : un menu contextuel ne doit jamais être le seul accès à une action.
 * @order 1
 */
@Component({
  selector: 'doc-context-menu-files-example',
  imports: [UiContextMenu, UiContextMenuTrigger, UiMenuItem, UiMenuSeparator, UiSubmenu, UiIcon],
  template: `
    <ul class="files" aria-label="Fichiers">
      @for (file of files(); track file.id) {
        <li class="file" tabindex="0" [uiContextMenuTrigger]="menu" [uiContextMenuData]="file">
          <ui-icon [name]="file.icon" />
          <span class="name">{{ file.name }}</span>
          @if (file.starred) {
            <ui-icon class="star" name="lucide:star" label="Favori" />
          }
          <button type="button" class="more" [attr.aria-label]="'Actions sur ' + file.name" (click)="menu.openFor(target($event), { data: file })">
            <ui-icon name="lucide:ellipsis" />
          </button>
        </li>
      }
    </ul>
    <p class="log" aria-live="polite">{{ log() }}</p>

    <ui-context-menu #menu ariaLabel="Actions sur le fichier">
      @let file = asFile(menu.data());
      <button uiMenuItem icon="lucide:eye" shortcut="Entrée" (click)="act('Ouvrir', file)">Ouvrir</button>
      <button uiMenuItem icon="lucide:pencil" shortcut="F2" (click)="act('Renommer', file)">Renommer</button>
      <button uiMenuItem icon="lucide:copy" shortcut="Ctrl+D" (click)="duplicate(file)">Dupliquer</button>
      <button uiMenuItem [checked]="file?.starred ?? false" (click)="toggleStar(file)">Favori</button>
      <ui-submenu label="Partager" icon="lucide:share-2">
        <button uiMenuItem icon="lucide:mail" (click)="act('Partager par e-mail', file)">Par e-mail</button>
        <button uiMenuItem icon="lucide:link" (click)="act('Copier le lien de', file)">Copier le lien</button>
      </ui-submenu>
      <ui-menu-separator />
      <button uiMenuItem icon="lucide:trash-2" tone="danger" shortcut="Suppr" (click)="remove(file)">Supprimer</button>
    </ui-context-menu>
  `,
  styles: `
    .files { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
    .file { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.5rem 0.5rem 0.75rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); background: var(--ui-color-surface); cursor: default; user-select: none; }
    .file:hover { background: var(--ui-color-hover); }
    .file:focus-visible { outline: 2px solid var(--ui-color-focus-ring); outline-offset: 2px; }
    .file > ui-icon:first-child { color: var(--ui-color-primary-text); font-size: 1.25rem; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .star { color: var(--ui-color-warning-text); }
    .more { display: grid; place-items: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: var(--ui-radius-sm); background: transparent; color: var(--ui-color-text-muted); cursor: pointer; }
    .more:hover { background: var(--ui-color-active); color: var(--ui-color-text); }
    .more:focus-visible { outline: 2px solid var(--ui-color-focus-ring); }
    .log { min-height: 1.5rem; margin: 1rem 0 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }
  `,
})
export class ContextMenuFilesExample {
  private nextId = 5;
  protected readonly log = signal('Aucune action pour le moment.');
  protected readonly files = signal<FileItem[]>([
    { id: 1, name: 'Rapport annuel.pdf', icon: 'lucide:file-text', starred: true },
    { id: 2, name: 'Photos de l’équipe', icon: 'lucide:folder', starred: false },
    { id: 3, name: 'Budget 2027.xlsx', icon: 'lucide:table', starred: false },
    { id: 4, name: 'Logo.svg', icon: 'lucide:image', starred: false },
  ]);

  /** `menu.data()` est de type `unknown` : on retrouve le fichier à jour par son identifiant. */
  protected asFile(data: unknown): FileItem | null {
    const id = (data as FileItem | undefined)?.id;
    return this.files().find((file) => file.id === id) ?? null;
  }

  protected target(event: Event): HTMLElement {
    return event.currentTarget as HTMLElement;
  }

  protected act(action: string, file: FileItem | null): void {
    if (file) this.log.set(`${action} « ${file.name} »`);
  }

  protected duplicate(file: FileItem | null): void {
    if (!file) return;
    const copy = { ...file, id: this.nextId++, name: file.name.replace(/(\.[^.]+)?$/, ' (copie)$1'), starred: false };
    this.files.update((files) => [...files, copy]);
    this.log.set(`« ${file.name} » dupliqué.`);
  }

  protected toggleStar(file: FileItem | null): void {
    if (!file) return;
    this.files.update((files) => files.map((f) => (f.id === file.id ? { ...f, starred: !f.starred } : f)));
    this.log.set(`« ${file.name} » ${file.starred ? 'retiré des' : 'ajouté aux'} favoris.`);
  }

  protected remove(file: FileItem | null): void {
    if (!file) return;
    this.files.update((files) => files.filter((f) => f.id !== file.id));
    this.log.set(`« ${file.name} » supprimé.`);
  }
}
