import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, isObservable, map } from 'rxjs';

/** Élément d'une bibliothèque de fichiers : dossier ou fichier. */
export interface UiFileEntry {
  /** Identifiant opaque fourni par le serveur (jamais un chemin du disque). */
  id: string;
  /** Nom affiché. */
  name: string;
  kind: 'folder' | 'file';
  /** Type MIME (`image/png`, `video/mp4`…). */
  mimeType?: string;
  /** Taille en octets. */
  size?: number;
  /** Date de dernière modification (ISO 8601 ou Date). */
  modifiedAt?: string | Date;
  /** Adresse du fichier (affichage, téléchargement). */
  url?: string;
  /** Vignette (images, affiche de vidéo). */
  thumbnailUrl?: string;
  /** Dimensions intrinsèques (images, vidéos). */
  width?: number;
  height?: number;
  /** Texte alternatif enregistré pour une image. */
  alt?: string;
}

/** Contenu d'un dossier : ses éléments et le chemin depuis la racine (dossier courant compris). */
export interface UiFileListing {
  items: UiFileEntry[];
  path: { id: string | null; name: string }[];
}

/** Résultat d'une opération : valeur, Promise ou Observable (première valeur). */
export type UiFileResult<T> = T | Promise<T> | Observable<T>;

/** Progression d'un envoi : pourcentage, événement HTTP, ou l'élément créé à la fin. */
export type UiFileUploadEvent = number | HttpEvent<unknown> | UiFileEntry;

/**
 * Source d'une bibliothèque de fichiers (`ui-file-manager`, `ui-media-picker`). Seul `list` est obligatoire : les
 * actions dont l'opération manque sont masquées (bibliothèque en lecture seule).
 *
 * Le serveur reste maître : il vérifie les droits, le type réel des fichiers envoyés et ne reçoit que des
 * identifiants, jamais de chemins (onglet « Côté serveur »).
 */
export interface UiFileSource {
  /** Contenu d'un dossier (`null` : racine). */
  list(folderId: string | null): UiFileResult<UiFileListing>;
  createFolder?(parentId: string | null, name: string): UiFileResult<UiFileEntry>;
  rename?(entry: UiFileEntry, name: string): UiFileResult<UiFileEntry>;
  remove?(entries: readonly UiFileEntry[]): UiFileResult<void>;
  move?(entries: readonly UiFileEntry[], targetId: string | null): UiFileResult<void>;
  /** Envoie un fichier dans un dossier ; émet la progression puis l'élément créé. */
  upload?(parentId: string | null, file: File): Observable<UiFileUploadEvent>;
}

/** @internal Valeur d'un `UiFileResult`. */
export function resolveFileResult<T>(result: UiFileResult<T>): Promise<T> {
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

/** Famille d'un élément, pour l'icône et le filtrage. */
export type UiFileFamily = 'folder' | 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'sheet' | 'archive' | 'code' | 'file';

const EXTENSIONS: Record<string, UiFileFamily> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image', svg: 'image', bmp: 'image',
  mp4: 'video', webm: 'video', mov: 'video', mkv: 'video', ogv: 'video', m4v: 'video',
  mp3: 'audio', ogg: 'audio', oga: 'audio', wav: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio',
  pdf: 'pdf',
  txt: 'text', md: 'text', rtf: 'text', doc: 'text', docx: 'text', odt: 'text',
  csv: 'sheet', xls: 'sheet', xlsx: 'sheet', ods: 'sheet',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  js: 'code', ts: 'code', json: 'code', html: 'code', css: 'code', php: 'code', py: 'code', xml: 'code', yml: 'code', yaml: 'code',
};

/** Famille d'un élément (type MIME, sinon extension). */
export function fileFamily(entry: Pick<UiFileEntry, 'kind' | 'name' | 'mimeType'>): UiFileFamily {
  if (entry.kind === 'folder') return 'folder';
  const type = (entry.mimeType ?? '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf') return 'pdf';
  const ext = entry.name.toLowerCase().split('.').pop() ?? '';
  return EXTENSIONS[ext] ?? (type.startsWith('text/') ? 'text' : 'file');
}

/** L'élément correspond à `accept` (`'image/*,video/*,.pdf'`) ; les dossiers correspondent toujours. */
export function entryMatchesAccept(entry: UiFileEntry, accept: string | null | undefined): boolean {
  if (entry.kind === 'folder') return true;
  const tokens = (accept ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length) return true;
  const name = entry.name.toLowerCase();
  const family = fileFamily(entry);
  const type = (entry.mimeType ?? '').toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type ? type.startsWith(token.slice(0, -1)) : family === token.slice(0, -2);
    return type === token;
  });
}

/** Nom de fichier ou de dossier valide : non vide, sans `/ \ : * ? " < > |` ni caractère de contrôle, ≤ 120 caractères. */
export function validateFileName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Le nom est obligatoire.';
  if (value.length > 120) return '120 caractères au plus.';
  // eslint-disable-next-line no-control-regex -- caractères de contrôle refusés volontairement
  if (/[/\\:*?"<>|\u0000-\u001f]/.test(value)) return 'Caractères interdits : / \\ : * ? " < > |';
  if (value === '.' || value === '..') return 'Nom réservé.';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------

/** Nœud d'une bibliothèque en mémoire. */
export interface UiMemoryFileNode extends Partial<Omit<UiFileEntry, 'id' | 'kind' | 'name'>> {
  name: string;
  /** Présent : c'est un dossier. */
  children?: UiMemoryFileNode[];
}

/** Options de `uiMemoryFileSource`. */
export interface UiMemoryFileSourceOptions {
  /** Lecture seule : seules les opérations de lecture sont fournies. */
  readonly?: boolean;
  /** Latence simulée en ms (démonstration des états de chargement). */
  latency?: number;
}

interface MemoryNode {
  entry: UiFileEntry;
  parent: string | null;
}

/**
 * Bibliothèque en mémoire (démonstrations, tests, prototypes) : rien n'est envoyé ni conservé. Les fichiers envoyés
 * sont lus localement (aperçu `data:` pour les images).
 */
export function uiMemoryFileSource(tree: readonly UiMemoryFileNode[], options: UiMemoryFileSourceOptions = {}): UiFileSource {
  const nodes = new Map<string, MemoryNode>();
  let counter = 0;
  const nextId = () => `m${++counter}`;
  const add = (node: UiMemoryFileNode, parent: string | null) => {
    const id = nextId();
    const { children, ...rest } = node;
    nodes.set(id, { entry: { ...rest, id, kind: children ? 'folder' : 'file' }, parent });
    children?.forEach((child) => add(child, id));
  };
  tree.forEach((node) => add(node, null));

  const wait = <T>(value: () => T): Promise<T> =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(value());
        } catch (error) {
          reject(error);
        }
      }, options.latency ?? 0),
    );
  const children = (id: string | null) => [...nodes.values()].filter((n) => n.parent === id).map((n) => ({ ...n.entry }));
  const ensureFolder = (id: string | null) => {
    if (id !== null && nodes.get(id)?.entry.kind !== 'folder') throw new Error('Dossier introuvable.');
  };
  const ensureUnique = (parent: string | null, name: string, except?: string) => {
    if (children(parent).some((c) => c.id !== except && c.name.toLowerCase() === name.toLowerCase())) throw new Error(`« ${name} » existe déjà dans ce dossier.`);
  };
  const checkName = (name: string) => {
    const error = validateFileName(name);
    if (error) throw new Error(error);
    return name.trim();
  };

  const source: UiFileSource = {
    list: (folderId) =>
      wait(() => {
        ensureFolder(folderId);
        const path: UiFileListing['path'] = [];
        for (let id = folderId; id !== null; id = nodes.get(id)?.parent ?? null) path.unshift({ id, name: nodes.get(id)?.entry.name ?? '' });
        path.unshift({ id: null, name: 'Racine' });
        return { items: children(folderId), path };
      }),
  };
  if (options.readonly) return source;

  source.createFolder = (parentId, name) =>
    wait(() => {
      ensureFolder(parentId);
      const clean = checkName(name);
      ensureUnique(parentId, clean);
      const entry: UiFileEntry = { id: nextId(), name: clean, kind: 'folder', modifiedAt: new Date().toISOString() };
      nodes.set(entry.id, { entry, parent: parentId });
      return { ...entry };
    });
  source.rename = (target, name) =>
    wait(() => {
      const node = nodes.get(target.id);
      if (!node) throw new Error('Élément introuvable.');
      const clean = checkName(name);
      ensureUnique(node.parent, clean, target.id);
      node.entry = { ...node.entry, name: clean, modifiedAt: new Date().toISOString() };
      return { ...node.entry };
    });
  source.remove = (entries) =>
    wait(() => {
      const drop = (id: string) => {
        [...nodes.entries()].filter(([, n]) => n.parent === id).forEach(([childId]) => drop(childId));
        nodes.delete(id);
      };
      entries.forEach((e) => drop(e.id));
    });
  source.move = (entries, targetId) =>
    wait(() => {
      ensureFolder(targetId);
      for (const e of entries) {
        // Un dossier ne peut pas être déplacé dans lui-même ni dans un de ses descendants.
        for (let id = targetId; id !== null; id = nodes.get(id)?.parent ?? null) {
          if (id === e.id) throw new Error(`Impossible de déplacer « ${e.name} » dans lui-même.`);
        }
        ensureUnique(targetId, e.name, e.id);
      }
      entries.forEach((e) => {
        const node = nodes.get(e.id);
        if (node) node.parent = targetId;
      });
    });
  source.upload = (parentId, file) =>
    new Observable<UiFileUploadEvent>((subscriber) => {
      let progress = 0;
      const timer = setInterval(() => {
        progress = Math.min(100, progress + 25);
        subscriber.next(progress);
        if (progress < 100) return;
        clearInterval(timer);
        const finish = (url?: string) => {
          try {
            ensureFolder(parentId);
            let name = file.name;
            for (let n = 2; children(parentId).some((c) => c.name.toLowerCase() === name.toLowerCase()); n++) name = file.name.replace(/(\.[^.]*)?$/, ` (${n})$1`);
            const entry: UiFileEntry = { id: nextId(), name, kind: 'file', mimeType: file.type, size: file.size, modifiedAt: new Date().toISOString(), url, thumbnailUrl: url };
            nodes.set(entry.id, { entry, parent: parentId });
            subscriber.next({ ...entry });
            subscriber.complete();
          } catch (error) {
            subscriber.error(error);
          }
        };
        if (file.type.startsWith('image/') && typeof FileReader !== 'undefined' && file.size < 5 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = () => finish(String(reader.result));
          reader.onerror = () => finish();
          reader.readAsDataURL(file);
        } else finish();
      }, Math.max(30, (options.latency ?? 0) / 2));
      return () => clearInterval(timer);
    });
  return source;
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * Source HTTP (API REST du serveur, voir l'onglet « Côté serveur ») :
 * `GET base?folder=id` → `UiFileListing` ; `POST base/folders` `{ parentId, name }` ; `PATCH base/:id` `{ name }` ;
 * `POST base/move` `{ ids, targetId }` ; `POST base/delete` `{ ids }` ; `POST base/upload` (multipart `file`,
 * `folder`) → `UiFileEntry`. Passe par `HttpClient` : jeton CSRF et intercepteurs compris.
 */
export function uiHttpFileSource(http: HttpClient, baseUrl: string): UiFileSource {
  const base = baseUrl.replace(/\/$/, '');
  return {
    list: (folderId) => http.get<UiFileListing>(base, { params: folderId ? { folder: folderId } : {} }),
    createFolder: (parentId, name) => http.post<UiFileEntry>(`${base}/folders`, { parentId, name }),
    rename: (entry, name) => http.patch<UiFileEntry>(`${base}/${encodeURIComponent(entry.id)}`, { name }),
    move: (entries, targetId) => http.post<void>(`${base}/move`, { ids: entries.map((e) => e.id), targetId }),
    remove: (entries) => http.post<void>(`${base}/delete`, { ids: entries.map((e) => e.id) }),
    upload: (parentId, file) => {
      const body = new FormData();
      body.append('file', file, file.name);
      if (parentId) body.append('folder', parentId);
      return http.post<UiFileEntry>(`${base}/upload`, body, { reportProgress: true, observe: 'events' }).pipe(
        map((event): UiFileUploadEvent => {
          if (event.type === HttpEventType.Sent) return 0;
          if (event.type === HttpEventType.UploadProgress) return event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          if (event.type === HttpEventType.Response) return event.body as UiFileEntry;
          return event;
        }),
      );
    },
  };
}
