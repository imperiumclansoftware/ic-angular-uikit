import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { UiButton } from '../button/button';
import { uniqueId } from '../core/id';
import { UiContextMenu, UiContextMenuEvent, UiContextMenuTrigger } from '../context-menu/context-menu';
import { UiDialog } from '../dialog/dialog';
import { UiFileSize, formatFileSize, parseFileSize, matchesAccept, describeAccept } from '../file-upload/file-utils';
import { UiImage } from '../image/image';
import { UiLoader } from '../loader/loader';
import { UiMenuItem, UiMenuSeparator } from '../menu/menu';
import { UiSelect } from '../select/select';
import { UiTextField } from '../text-field/text-field';
import { UiFileIcon } from './file-icon';
import {
  UiFileEntry,
  UiFileListing,
  UiFileSource,
  entryMatchesAccept,
  fileFamily,
  resolveFileResult,
  validateFileName,
} from './file-source';

/** Tri des éléments (les dossiers restent en tête). */
export interface UiFileSort {
  key: 'name' | 'modifiedAt' | 'size' | 'type';
  direction: 'asc' | 'desc';
}

/** Action ayant échoué (événement `failed`). */
export interface UiFileManagerError {
  action: 'list' | 'createFolder' | 'rename' | 'remove' | 'move' | 'upload';
  message: string;
}

/** Envoi en cours ou terminé. */
interface Upload {
  id: number;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  subscription?: Subscription;
}

const SORTS: { value: string; label: string; sort: UiFileSort }[] = [
  { value: 'name-asc', label: 'Nom (A → Z)', sort: { key: 'name', direction: 'asc' } },
  { value: 'name-desc', label: 'Nom (Z → A)', sort: { key: 'name', direction: 'desc' } },
  { value: 'modifiedAt-desc', label: 'Plus récents', sort: { key: 'modifiedAt', direction: 'desc' } },
  { value: 'modifiedAt-asc', label: 'Plus anciens', sort: { key: 'modifiedAt', direction: 'asc' } },
  { value: 'size-desc', label: 'Plus gros', sort: { key: 'size', direction: 'desc' } },
  { value: 'size-asc', label: 'Plus petits', sort: { key: 'size', direction: 'asc' } },
  { value: 'type-asc', label: 'Type', sort: { key: 'type', direction: 'asc' } },
];

const FAMILY_LABELS: Record<string, string> = {
  folder: 'Dossier', image: 'Image', video: 'Vidéo', audio: 'Audio', pdf: 'PDF', text: 'Document', sheet: 'Tableur',
  archive: 'Archive', code: 'Code', file: 'Fichier',
};

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: unknown } | null;
    if (body && typeof body === 'object' && typeof body.error === 'string') return body.error;
    if (error.status === 413) return 'Fichier trop volumineux.';
    if (error.status === 403) return 'Action non autorisée.';
    return fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Gestionnaire de fichiers : parcours de dossiers (fil d'Ariane), vues grille (vignettes) et liste, recherche et
 * tri, sélection simple ou multiple, création de dossier, renommage, suppression confirmée, déplacement
 * (couper / coller ou glisser-déposer sur un dossier), envoi de fichiers (bouton ou dépôt) avec progression, menu
 * contextuel. Les données viennent d'une `UiFileSource` (`uiHttpFileSource`, `uiMemoryFileSource` ou la vôtre) ;
 * les actions non fournies par la source sont masquées.
 *
 * Clavier (motif ARIA « listbox ») : flèches (2 dimensions en grille), Origine / Fin, Entrée ouvre, Espace
 * sélectionne, Ctrl + flèches déplace sans sélectionner, Maj + flèches étend, Ctrl+A tout sélectionne, F2 renomme,
 * Suppr supprime, Ctrl+X / Ctrl+V déplacent, Retour arrière ou Alt+↑ remonte, première lettre pour atteindre un
 * élément.
 *
 * ```html
 * <ui-file-manager [source]="files" (open)="preview($event)" />
 * ```
 * @slot [uiFileManagerActions] - Actions supplémentaires dans la barre d'outils.
 * @cssprop --ui-file-manager-height - Hauteur de la zone des éléments (défaut : `26rem`).
 * @cssprop --ui-file-manager-tile - Largeur minimale d'une vignette en grille (défaut : `9.5rem`).
 * @category Affichage
 */
@Component({
  selector: 'ui-file-manager',
  imports: [UiButton, UiContextMenu, UiContextMenuTrigger, UiMenuItem, UiMenuSeparator, UiDialog, UiTextField, UiSelect, UiImage, UiLoader, UiFileIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-file-manager', '[class.ui-file-manager--list]': "view() === 'list'" },
  templateUrl: './file-manager.html',
  styleUrl: './file-manager.css',
})
export class UiFileManager {
  /** Source des fichiers. */
  readonly source = input.required<UiFileSource>();
  /** Dossier affiché (`null` : racine). Liaison `[(folder)]`. */
  readonly folder = model<string | null>(null);
  /** Affichage `grid` (vignettes) ou `list` (détails). Liaison `[(view)]`. */
  readonly view = model<'grid' | 'list'>('grid');
  /** Tri. Liaison `[(sort)]`. */
  readonly sort = model<UiFileSort>({ key: 'name', direction: 'asc' });
  /** Éléments sélectionnés. Liaison `[(selection)]`. */
  readonly selection = model<readonly UiFileEntry[]>([]);
  /** Sélection d'un seul élément ou de plusieurs. */
  readonly selectionMode = input<'single' | 'multiple'>('multiple');
  /** Types affichés et acceptés à l'envoi (`'image/*,video/*'`, `.pdf`…) ; les autres fichiers sont masqués. */
  readonly accept = input('');
  /** Taille maximale d'un fichier envoyé (`'20 Mo'` ou octets). */
  readonly maxFileSize = input<UiFileSize>();
  /** Lecture seule : aucune modification, même si la source le permet. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Les dossiers sont sélectionnables (sinon seulement ouvrables, utile pour choisir un fichier). */
  readonly selectFolders = input(true, { transform: booleanAttribute });
  /** Nom accessible de la liste. */
  readonly ariaLabel = input('Fichiers');

  /** Un fichier est ouvert (double clic, Entrée). */
  readonly open = output<UiFileEntry>();
  /** Une action a échoué. */
  readonly failed = output<UiFileManagerError>();
  /** Le contenu a été modifié (création, renommage, suppression, déplacement, envoi). */
  readonly changed = output<{ action: UiFileManagerError['action']; entries: readonly UiFileEntry[] }>();

  protected readonly listing = signal<UiFileListing | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly focusId = signal<string | null>(null);
  private anchorId: string | null = null;
  protected readonly clipboard = signal<readonly UiFileEntry[]>([]);
  protected readonly clipboardIds = computed(() => new Set(this.clipboard().map((e) => e.id)));
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly announcement = signal('');
  protected readonly nameDialog = signal<{ mode: 'create' | 'rename'; entry?: UiFileEntry; value: string; error: string | null } | null>(null);
  protected readonly deleteDialog = signal<readonly UiFileEntry[] | null>(null);
  protected readonly dropTarget = signal<string | null>(null);
  protected readonly fileDrag = signal(false);
  protected readonly busy = signal(false);
  private dragging: UiFileEntry[] | null = null;
  private uploadCounter = 0;
  private refocusAfterLoad = false;
  private request = 0;

  private readonly listRef = viewChild<ElementRef<HTMLElement>>('list');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly injector = inject(Injector);
  protected readonly baseId = uniqueId('ui-fm');

  protected readonly sortOptions = SORTS.map(({ value, label }) => ({ value, label }));
  protected readonly sortValue = computed(() => `${this.sort().key}-${this.sort().direction}`);
  protected readonly can = computed(() => {
    const source = this.source();
    const write = !this.readonly();
    return {
      create: write && !!source.createFolder,
      rename: write && !!source.rename,
      remove: write && !!source.remove,
      move: write && !!source.move,
      upload: write && !!source.upload,
    };
  });
  protected readonly path = computed(() => this.listing()?.path ?? [{ id: null, name: 'Racine' }]);

  /** Éléments affichés : filtrés (types acceptés, recherche) et triés, dossiers en tête. */
  readonly items = computed(() => {
    const accept = this.accept();
    const words = normalize(this.search()).split(/\s+/).filter(Boolean);
    const { key, direction } = this.sort();
    const factor = direction === 'asc' ? 1 : -1;
    const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
    const value = (e: UiFileEntry): number | string => {
      if (key === 'size') return e.size ?? -1;
      if (key === 'modifiedAt') return e.modifiedAt ? new Date(e.modifiedAt).getTime() : 0;
      if (key === 'type') return FAMILY_LABELS[fileFamily(e)];
      return e.name;
    };
    return (this.listing()?.items ?? [])
      .filter((e) => entryMatchesAccept(e, accept) && words.every((w) => normalize(e.name).includes(w)))
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        const va = value(a);
        const vb = value(b);
        const result = typeof va === 'number' && typeof vb === 'number' ? va - vb : collator.compare(String(va), String(vb));
        return factor * (result || collator.compare(a.name, b.name));
      });
  });
  protected readonly selectedIds = computed(() => new Set(this.selection().map((e) => e.id)));
  /** Élément qui reçoit le focus avec Tab (tabindex itinérant). */
  protected readonly tabStopId = computed(() => {
    const items = this.items();
    const id = this.focusId();
    return items.some((e) => e.id === id) ? id : (items[0]?.id ?? null);
  });
  protected readonly acceptLabel = computed(() => describeAccept(this.accept()));

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.uploads().forEach((u) => u.subscription?.unsubscribe()));
    effect(() => {
      const source = this.source();
      const folder = this.folder();
      untracked(() => void this.load(source, folder));
    });
  }

  // ---------------------------------------------------------------- Chargement

  /** Recharge le dossier courant. */
  refresh(): Promise<void> {
    return this.load(this.source(), this.folder());
  }

  private async load(source: UiFileSource, folder: string | null, announce = true): Promise<void> {
    const request = ++this.request;
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const listing = await resolveFileResult(source.list(folder));
      if (request !== this.request) return;
      this.listing.set(listing);
      // Sélection gardée seulement pour les éléments encore présents.
      const ids = new Set(listing.items.map((e) => e.id));
      const kept = this.selection().filter((e) => ids.has(e.id));
      if (kept.length !== this.selection().length) this.selection.set(kept);
      const count = this.items().length;
      if (this.refocusAfterLoad) {
        this.refocusAfterLoad = false;
        afterNextRender(() => this.focusCurrent(), { injector: this.injector });
      }
      if (announce) this.announcement.set(`${listing.path.at(-1)?.name ?? 'Dossier'} : ${count} élément${count > 1 ? 's' : ''}.`);
    } catch (error) {
      if (request !== this.request) return;
      const message = errorMessage(error, 'Impossible d’afficher ce dossier.');
      this.loadError.set(message);
      this.failed.emit({ action: 'list', message });
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }

  /** Ouvre un dossier. */
  openFolder(id: string | null): void {
    if (id === this.folder()) return;
    this.search.set('');
    this.selection.set([]);
    this.focusId.set(null);
    this.anchorId = null;
    // Focus dans la liste : il passera au premier élément du dossier, une fois son contenu chargé.
    this.refocusAfterLoad = !!this.listRef()?.nativeElement.contains(this.host.ownerDocument.activeElement);
    this.folder.set(id);
  }

  /** Ouvre un élément : dossier parcouru, fichier émis par `open`. */
  protected openEntry(entry: UiFileEntry): void {
    if (entry.kind === 'folder') this.openFolder(entry.id);
    else this.open.emit(entry);
  }

  protected goUp(): void {
    const path = this.path();
    if (path.length > 1) this.openFolder(path[path.length - 2].id);
  }

  // ---------------------------------------------------------------- Sélection

  protected selectable(entry: UiFileEntry): boolean {
    return entry.kind === 'file' || this.selectFolders();
  }

  private setSelection(entries: UiFileEntry[]): void {
    const allowed = entries.filter((e) => this.selectable(e));
    const next = this.selectionMode() === 'single' ? allowed.slice(-1) : allowed;
    this.selection.set(next);
  }

  protected onItemClick(event: MouseEvent, entry: UiFileEntry): void {
    this.focusId.set(entry.id);
    if (this.selectionMode() === 'multiple' && event.shiftKey && this.anchorId) this.selectRange(entry);
    else if (this.selectionMode() === 'multiple' && (event.ctrlKey || event.metaKey)) this.toggle(entry);
    else {
      this.setSelection([entry]);
      this.anchorId = entry.id;
    }
  }

  private toggle(entry: UiFileEntry): void {
    if (!this.selectable(entry)) return;
    const selected = this.selectedIds().has(entry.id);
    this.setSelection(selected ? this.selection().filter((e) => e.id !== entry.id) : [...this.selection(), entry]);
    this.anchorId = entry.id;
  }

  private selectRange(entry: UiFileEntry): void {
    const items = this.items();
    const from = items.findIndex((e) => e.id === this.anchorId);
    const to = items.findIndex((e) => e.id === entry.id);
    if (from < 0 || to < 0) return this.setSelection([entry]);
    this.setSelection(items.slice(Math.min(from, to), Math.max(from, to) + 1));
  }

  // ---------------------------------------------------------------- Clavier

  protected onListKeydown(event: KeyboardEvent): void {
    const items = this.items();
    if (!items.length) return;
    const index = Math.max(0, items.findIndex((e) => e.id === this.tabStopId()));
    const current = items[index];
    const ctrl = event.ctrlKey || event.metaKey;
    const columns = this.view() === 'grid' ? this.columnCount() : 1;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        if (this.view() === 'grid') target = Math.min(items.length - 1, index + 1);
        break;
      case 'ArrowLeft':
        if (this.view() === 'grid') target = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        target = Math.min(items.length - 1, index + columns);
        break;
      case 'ArrowUp':
        if (event.altKey) {
          event.preventDefault();
          this.goUp();
          return;
        }
        target = Math.max(0, index - columns);
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = items.length - 1;
        break;
      case 'Enter':
        event.preventDefault();
        this.openEntry(current);
        return;
      case ' ':
        event.preventDefault();
        if (this.selectionMode() === 'multiple' && (ctrl || this.selectedIds().has(current.id))) this.toggle(current);
        else {
          this.setSelection([current]);
          this.anchorId = current.id;
        }
        return;
      case 'Backspace':
        event.preventDefault();
        this.goUp();
        return;
      case 'F2':
        event.preventDefault();
        if (this.can().rename) this.startRename(current);
        return;
      case 'Delete':
        event.preventDefault();
        if (this.can().remove) this.askDelete(this.selectedIds().has(current.id) ? this.selection() : [current]);
        return;
      case 'Escape':
        if (this.selection().length) {
          event.preventDefault();
          this.selection.set([]);
        }
        return;
    }
    if (ctrl && event.key.toLowerCase() === 'a' && this.selectionMode() === 'multiple') {
      event.preventDefault();
      this.setSelection(items);
      return;
    }
    if (ctrl && event.key.toLowerCase() === 'x' && this.can().move) {
      event.preventDefault();
      this.cut(this.selectedIds().has(current.id) ? this.selection() : [current]);
      return;
    }
    if (ctrl && event.key.toLowerCase() === 'v' && this.clipboard().length) {
      event.preventDefault();
      void this.paste(this.folder());
      return;
    }
    if (target === null && event.key.length === 1 && !ctrl && !event.altKey && /\S/.test(event.key)) {
      // Première lettre : élément suivant dont le nom commence par cette lettre.
      const letter = normalize(event.key);
      const order = [...items.slice(index + 1), ...items.slice(0, index + 1)];
      const match = order.find((e) => normalize(e.name).startsWith(letter));
      if (match) target = items.indexOf(match);
    }
    if (target === null) return;
    event.preventDefault();
    const next = items[target];
    this.focusId.set(next.id);
    if (event.shiftKey && this.selectionMode() === 'multiple') this.selectRange(next);
    else if (!ctrl) {
      this.setSelection([next]);
      this.anchorId = next.id;
    }
    this.focusCurrent();
  }

  /** Nombre de vignettes par ligne (grille). */
  private columnCount(): number {
    const options = Array.from(this.listRef()?.nativeElement.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    if (options.length < 2 || !options[0].offsetWidth) return 1;
    const top = options[0].offsetTop;
    const count = options.findIndex((o) => o.offsetTop !== top);
    return count === -1 ? options.length : count;
  }

  private focusCurrent(): void {
    const id = this.tabStopId();
    const option = this.listRef()?.nativeElement.querySelector<HTMLElement>(`[data-id="${CSS.escape(id ?? '')}"]`);
    option?.focus();
    option?.scrollIntoView?.({ block: 'nearest' });
  }

  // ---------------------------------------------------------------- Dossiers, renommage, suppression

  protected startCreate(): void {
    this.nameDialog.set({ mode: 'create', value: '', error: null });
  }

  protected startRename(entry: UiFileEntry | undefined = this.selection()[0]): void {
    if (entry) this.nameDialog.set({ mode: 'rename', entry, value: entry.name, error: null });
  }

  protected setDialogName(value: string): void {
    const dialog = this.nameDialog();
    if (dialog) this.nameDialog.set({ ...dialog, value, error: null });
  }

  protected async submitName(): Promise<void> {
    const dialog = this.nameDialog();
    if (!dialog || this.busy()) return;
    const error = validateFileName(dialog.value);
    const duplicate = (this.listing()?.items ?? []).some((e) => e.id !== dialog.entry?.id && normalize(e.name) === normalize(dialog.value.trim()));
    if (error || duplicate) {
      this.nameDialog.set({ ...dialog, error: error ?? `« ${dialog.value.trim()} » existe déjà dans ce dossier.` });
      return;
    }
    const source = this.source();
    this.busy.set(true);
    try {
      if (dialog.mode === 'create' && source.createFolder) {
        const created = await resolveFileResult(source.createFolder(this.folder(), dialog.value.trim()));
        this.done('createFolder', [created], `Dossier « ${created.name} » créé.`, created.id);
      } else if (dialog.mode === 'rename' && dialog.entry && source.rename) {
        const renamed = await resolveFileResult(source.rename(dialog.entry, dialog.value.trim()));
        this.done('rename', [renamed], `Renommé en « ${renamed.name} ».`, renamed.id);
      }
      this.nameDialog.set(null);
    } catch (e) {
      const action = dialog.mode === 'create' ? 'createFolder' : 'rename';
      const message = errorMessage(e, dialog.mode === 'create' ? 'Création impossible.' : 'Renommage impossible.');
      this.nameDialog.set({ ...dialog, error: message });
      this.failed.emit({ action, message });
    } finally {
      this.busy.set(false);
    }
  }

  protected askDelete(entries: readonly UiFileEntry[]): void {
    if (entries.length) this.deleteDialog.set(entries);
  }

  protected async confirmDelete(): Promise<void> {
    const entries = this.deleteDialog();
    const source = this.source();
    if (!entries || !source.remove || this.busy()) return;
    const items = this.items();
    const firstIndex = Math.min(...entries.map((e) => items.findIndex((i) => i.id === e.id)).filter((i) => i >= 0));
    this.busy.set(true);
    try {
      await resolveFileResult(source.remove(entries));
      this.deleteDialog.set(null);
      this.selection.set([]);
      const ids = new Set(entries.map((e) => e.id));
      const next = items.slice(firstIndex).find((e) => !ids.has(e.id)) ?? items.slice(0, firstIndex).reverse().find((e) => !ids.has(e.id));
      this.done('remove', entries, entries.length > 1 ? `${entries.length} éléments supprimés.` : `« ${entries[0].name} » supprimé.`, next?.id ?? null);
    } catch (e) {
      this.deleteDialog.set(null);
      this.fail('remove', e, 'Suppression impossible.');
    } finally {
      this.busy.set(false);
    }
  }

  protected deleteMessage(entries: readonly UiFileEntry[]): string {
    const folders = entries.some((e) => e.kind === 'folder');
    const what = entries.length > 1 ? `ces ${entries.length} éléments` : `« ${entries[0]?.name} »`;
    return `Supprimer ${what} ?${folders ? ' Les dossiers sont supprimés avec tout leur contenu.' : ''} Cette action est définitive.`;
  }

  // ---------------------------------------------------------------- Déplacement

  protected cut(entries: readonly UiFileEntry[]): void {
    if (!entries.length) return;
    this.clipboard.set([...entries]);
    this.announcement.set(`${entries.length > 1 ? `${entries.length} éléments coupés` : `« ${entries[0].name} » coupé`} : ouvrez le dossier de destination puis « Coller ici ».`);
  }

  protected async paste(target: string | null): Promise<void> {
    const entries = this.clipboard();
    if (!entries.length) return;
    if (await this.move(entries, target)) this.clipboard.set([]);
  }

  private async move(entries: readonly UiFileEntry[], target: string | null): Promise<boolean> {
    const source = this.source();
    if (!source.move || this.busy()) return false;
    if (entries.some((e) => e.id === target)) return false;
    const targetName = target === this.folder() ? 'ce dossier' : `« ${this.items().find((e) => e.id === target)?.name ?? this.path().find((p) => p.id === target)?.name ?? 'Racine'} »`;
    this.busy.set(true);
    try {
      await resolveFileResult(source.move(entries, target));
      this.done('move', entries, `${entries.length > 1 ? `${entries.length} éléments déplacés` : `« ${entries[0].name} » déplacé`} dans ${targetName}.`);
      return true;
    } catch (e) {
      this.fail('move', e, 'Déplacement impossible.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected onDragStart(event: DragEvent, entry: UiFileEntry): void {
    if (!this.can().move) {
      event.preventDefault();
      return;
    }
    this.dragging = this.selectedIds().has(entry.id) ? [...this.selection()] : [entry];
    event.dataTransfer?.setData('text/plain', this.dragging.map((e) => e.name).join('\n'));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onDragEnd(): void {
    this.dragging = null;
    this.dropTarget.set(null);
  }

  /** Survol d'une cible de dépôt (dossier, segment du fil d'Ariane). */
  protected onDragOverTarget(event: DragEvent, targetId: string | null): void {
    if (this.dragging && !this.dragging.some((e) => e.id === targetId)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this.dropTarget.set(targetId ?? '#root');
    }
  }

  protected onDropTarget(event: DragEvent, targetId: string | null): void {
    if (!this.dragging) return;
    event.preventDefault();
    event.stopPropagation();
    const entries = this.dragging;
    this.onDragEnd();
    if (targetId !== this.folder()) void this.move(entries, targetId);
  }

  // ---------------------------------------------------------------- Envoi

  protected chooseFiles(): void {
    this.fileInput().nativeElement.click();
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onBodyDragOver(event: DragEvent): void {
    if (this.can().upload && !this.dragging && event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      this.fileDrag.set(true);
    }
  }

  protected onBodyDragLeave(event: DragEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.fileDrag.set(false);
  }

  protected onBodyDrop(event: DragEvent): void {
    this.fileDrag.set(false);
    if (this.dragging || !event.dataTransfer?.files.length || !this.can().upload) return;
    event.preventDefault();
    this.uploadFiles(Array.from(event.dataTransfer.files));
  }

  /** Envoie des fichiers dans le dossier courant (types et taille vérifiés avant l'envoi). */
  uploadFiles(files: readonly File[]): void {
    const source = this.source();
    if (!source.upload || this.readonly()) return;
    const folder = this.folder();
    const max = parseFileSize(this.maxFileSize());
    let pending = 0;
    for (const file of files) {
      const upload: Upload = { id: ++this.uploadCounter, name: file.name, progress: 0, status: 'uploading' };
      const reject = !matchesAccept(file, this.accept())
        ? `Type non accepté${this.acceptLabel() ? ` (${this.acceptLabel()})` : ''}.`
        : max !== undefined && file.size > max
          ? `Trop volumineux (${formatFileSize(file.size)}, ${formatFileSize(max)} au plus).`
          : null;
      if (reject) {
        this.uploads.update((list) => [...list, { ...upload, status: 'error', error: reject }]);
        this.announcement.set(`${file.name} refusé : ${reject}`);
        continue;
      }
      pending++;
      this.uploads.update((list) => [...list, upload]);
      const patch = (changes: Partial<Upload>) => this.uploads.update((list) => list.map((u) => (u.id === upload.id ? { ...u, ...changes } : u)));
      let created: UiFileEntry | null = null;
      const finish = () => {
        pending--;
        if (pending === 0) void this.load(this.source(), this.folder(), false);
      };
      upload.subscription = source.upload(folder, file).subscribe({
        next: (event) => {
          if (typeof event === 'number') patch({ progress: Math.max(0, Math.min(100, event)) });
          else if ('id' in event && 'kind' in event) created = event as UiFileEntry;
        },
        error: (error: unknown) => {
          const message = errorMessage(error, 'Envoi impossible.');
          patch({ status: 'error', error: message, subscription: undefined });
          this.failed.emit({ action: 'upload', message: `${file.name} : ${message}` });
          this.announcement.set(`Échec de l'envoi de ${file.name} : ${message}`);
          finish();
        },
        complete: () => {
          patch({ status: 'done', progress: 100, subscription: undefined });
          this.announcement.set(`${file.name} envoyé.`);
          if (created) this.changed.emit({ action: 'upload', entries: [created] });
          finish();
        },
      });
      patch({ subscription: upload.subscription });
    }
  }

  protected cancelUpload(upload: Upload): void {
    upload.subscription?.unsubscribe();
    this.uploads.update((list) => list.filter((u) => u.id !== upload.id));
    this.announcement.set(`Envoi de ${upload.name} annulé.`);
  }

  protected clearUploads(): void {
    this.uploads.update((list) => list.filter((u) => u.status === 'uploading'));
  }

  protected readonly uploadsDone = computed(() => this.uploads().some((u) => u.status !== 'uploading'));

  // ---------------------------------------------------------------- Menu contextuel

  protected onMenuOpened(event: UiContextMenuEvent): void {
    const entry = event.data as UiFileEntry | null;
    if (entry && !this.selectedIds().has(entry.id)) {
      this.setSelection([entry]);
      this.anchorId = entry.id;
    }
    if (entry) this.focusId.set(entry.id);
  }

  protected menuTargets(entry: UiFileEntry | null): readonly UiFileEntry[] {
    if (!entry) return [];
    return this.selectedIds().has(entry.id) ? this.selection() : [entry];
  }

  protected asEntry(data: unknown): UiFileEntry | null {
    return data && typeof data === 'object' && 'id' in data ? (data as UiFileEntry) : null;
  }

  // ---------------------------------------------------------------- Divers

  private done(action: UiFileManagerError['action'], entries: readonly UiFileEntry[], message: string, focus?: string | null): void {
    this.actionError.set(null);
    this.announcement.set(message);
    this.changed.emit({ action, entries });
    void this.load(this.source(), this.folder(), false).then(() => {
      if (focus !== undefined) {
        this.focusId.set(focus);
        if (focus) {
          const entry = this.items().find((e) => e.id === focus);
          if (entry && (action === 'createFolder' || action === 'rename')) this.setSelection([entry]);
        }
        afterNextRender(() => this.focusCurrent(), { injector: this.injector });
      }
    });
  }

  private fail(action: UiFileManagerError['action'], error: unknown, fallback: string): void {
    const message = errorMessage(error, fallback);
    this.actionError.set(message);
    this.failed.emit({ action, message });
  }

  protected setSort(value: string | null): void {
    const sort = SORTS.find((s) => s.value === value)?.sort;
    if (sort) this.sort.set(sort);
  }

  protected typeLabel(entry: UiFileEntry): string {
    return FAMILY_LABELS[fileFamily(entry)];
  }

  protected sizeLabel(entry: UiFileEntry): string {
    return entry.kind === 'file' && entry.size !== undefined ? formatFileSize(entry.size) : '';
  }

  protected dateLabel(entry: UiFileEntry): string {
    if (!entry.modifiedAt) return '';
    const date = new Date(entry.modifiedAt);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  protected thumbnail(entry: UiFileEntry): string | null {
    const family = fileFamily(entry);
    if (family === 'image') return entry.thumbnailUrl ?? entry.url ?? null;
    if (family === 'video') return entry.thumbnailUrl ?? null;
    return null;
  }

  protected isVideo(entry: UiFileEntry): boolean {
    return fileFamily(entry) === 'video';
  }
}
