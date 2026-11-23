import { HttpEvent, HttpEventType } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';
import { UiErrorMessage, formatErrorMessage } from '../validation/messages';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';
import { UiFileSize, describeAccept, formatFileSize, matchesAccept, parseFileSize } from './file-utils';

/** Raison du refus d'un fichier. */
export type UiFileRejectionReason = 'fileType' | 'maxFileSize' | 'minFileSize' | 'maxFiles' | 'maxTotalSize';

/** Fichier refusé à la sélection. */
export interface UiFileRejection {
  file: File;
  reason: UiFileRejectionReason;
  /** Message affiché (personnalisable avec `rejectionMessages`). */
  message: string;
}

/** État d'envoi d'un fichier. */
export type UiFileStatus = 'ready' | 'uploading' | 'done' | 'error';

/** Fichier sélectionné et son état. */
export interface UiFileItem {
  id: string;
  file: File;
  status: UiFileStatus;
  /** Progression de l'envoi, de 0 à 100. */
  progress: number;
  /** Aperçu (`data:` URL) pour les images PNG, JPEG, GIF et WebP. */
  preview?: string;
  error?: string;
  /** Réponse du serveur une fois l'envoi terminé. */
  response?: unknown;
}

/**
 * Fonction d'envoi d'un fichier. Elle renvoie un Observable de progression : soit les événements de `HttpClient`
 * (`reportProgress: true, observe: 'events'`), soit des pourcentages (0 à 100). La fin de l'Observable vaut succès.
 */
export type UiFileUploader = (file: File) => Observable<HttpEvent<unknown> | number>;

/** Payload de `(uploaded)`. */
export interface UiFileUploaded {
  file: File;
  response: unknown;
}

/** Payload de `(uploadFailed)`. */
export interface UiFileUploadFailed {
  file: File;
  error: unknown;
}

const DEFAULT_REJECTIONS: Record<UiFileRejectionReason, UiErrorMessage> = {
  fileType: '« {name} » : type de fichier non autorisé (attendu : {accept}).',
  maxFileSize: '« {name} » ({size}) dépasse la taille maximale de {max}.',
  minFileSize: '« {name} » ({size}) est trop petit : minimum {min}.',
  maxFiles: '« {name} » n’a pas été ajouté : {maxFiles} fichier(s) au maximum.',
  maxTotalSize: '« {name} » n’a pas été ajouté : la taille totale est limitée à {maxTotal}.',
};

const PREVIEWABLE = /^image\/(png|jpe?g|gif|webp)$/;

/**
 * Sélection et envoi de fichiers, en champ (`mode="field"`) ou en zone de glisser-déposer (`mode="dropzone"`).
 * Nombre de fichiers, tailles minimale / maximale / totale et types (`accept`) sont vérifiés à la sélection :
 * les fichiers refusés sont listés avec la raison. Avec `[upload]`, chaque fichier est envoyé avec sa progression.
 *
 * Utilisable avec `[(files)]` ou les formulaires Angular (valeur : `File[]`, compatible `Validators.required`).
 *
 * Sécurité : ces contrôles améliorent l'expérience mais ne protègent rien. Le serveur doit revérifier le type réel
 * (contenu du fichier), la taille, renommer le fichier et le stocker hors de la racine web.
 *
 * @cssprop --ui-file-upload-min-height - Hauteur minimale de la zone de dépôt (défaut : `9rem`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-file-upload',
  imports: [UiFieldMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-field ui-file-upload ui-field--md ui-file-upload--" + mode()',
    '[class.ui-field--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-field--valid]': 'validation.state().status === "valid"',
    '[class.ui-field--disabled]': 'isDisabled()',
    '[class.ui-field--focused]': 'focused()',
    '[class.ui-file-upload--dragging]': 'dragging()',
  },
  templateUrl: './file-upload.html',
  styleUrls: ['../core/field.css', './file-upload.css'],
})
export class UiFileUpload implements ControlValueAccessor {
  /** Fichiers retenus (liaison bidirectionnelle `[(files)]`). */
  readonly files = model<File[]>([]);
  /** Libellé du champ. */
  readonly label = input<string>();
  /** Nom accessible quand aucun `label` visible n'est affiché. */
  readonly ariaLabel = input<string>();
  /** Présentation : champ avec bouton, ou zone de glisser-déposer. */
  readonly mode = input<'field' | 'dropzone'>('dropzone');
  /** Types acceptés, comme l'attribut HTML `accept` : `'image/*,.pdf'`. Vérifié aussi pour les fichiers déposés. */
  readonly accept = input<string>('');
  /** Texte décrivant les types acceptés (sinon déduit de `accept` : « images ou PDF »). */
  readonly acceptLabel = input<string>();
  /** Nombre maximal de fichiers. À 1, une nouvelle sélection remplace le fichier courant. */
  readonly maxFiles = input(1, { transform: numberAttribute });
  /** Taille maximale par fichier (`5 * 1024 * 1024`, `'5 Mo'`). */
  readonly maxFileSize = input<UiFileSize>();
  /** Taille minimale par fichier (ex. `'1 Ko'` pour écarter les fichiers vides). */
  readonly minFileSize = input<UiFileSize>();
  /** Taille cumulée maximale de tous les fichiers. */
  readonly maxTotalSize = input<UiFileSize>();
  /** Texte d'aide ; les contraintes (types, tailles, nombre) sont ajoutées automatiquement. */
  readonly hint = input<string>();
  /** Masque le rappel automatique des contraintes. */
  readonly hideConstraints = input(false, { transform: booleanAttribute });
  /** Affiche une vignette pour les images. */
  readonly showPreview = input(true, { transform: booleanAttribute });
  /** Champ obligatoire (astérisque et attribut `required`). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactive le champ. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Messages de refus par raison (`fileType`, `maxFileSize`, `minFileSize`, `maxFiles`, `maxTotalSize`). Paramètres : `{name}`, `{size}`, `{max}`, `{min}`, `{maxFiles}`, `{maxTotal}`, `{accept}`. */
  readonly rejectionMessages = input<Partial<Record<UiFileRejectionReason, UiErrorMessage>>>();
  /** Fonction d'envoi ; sans elle, le composant ne fait que la sélection. */
  readonly upload = input<UiFileUploader>();
  /** Envoie chaque fichier dès qu'il est ajouté (sinon, appelez `uploadAll()`). */
  readonly autoUpload = input(true, { transform: booleanAttribute });

  /** Émis quand des fichiers sont refusés à la sélection. */
  readonly rejected = output<UiFileRejection[]>();
  /** Émis quand un fichier est retiré par l'utilisateur. */
  readonly removed = output<File>();
  /** Émis à la fin de l'envoi d'un fichier. */
  readonly uploaded = output<UiFileUploaded>();
  /** Émis quand l'envoi d'un fichier échoue. */
  readonly uploadFailed = output<UiFileUploadFailed>();

  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  protected readonly inputId = uniqueId('ui-file-upload');
  protected readonly messageId = `${this.inputId}-message`;
  protected readonly constraintsId = `${this.inputId}-constraints`;
  protected readonly focused = signal(false);
  protected readonly dragging = signal(false);
  /** Fichiers et état d'envoi. */
  readonly items = signal<UiFileItem[]>([]);
  /** Refus de la dernière sélection. */
  readonly rejections = signal<UiFileRejection[]>([]);
  protected readonly announcement = signal('');

  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly isRequired = computed(() => this.required() || this.validation.required());
  protected readonly multiple = computed(() => this.maxFiles() !== 1);
  /** Limite atteinte : on ne peut plus ajouter (sauf en mode remplacement, maxFiles = 1). */
  protected readonly full = computed(() => this.multiple() && this.items().length >= this.maxFiles());
  protected readonly totalSize = computed(() => this.items().reduce((sum, item) => sum + item.file.size, 0));

  /** Rappel des contraintes : « Images ou PDF · 5 Mo max par fichier · 3 fichiers max ». */
  protected readonly constraints = computed(() => {
    const parts: string[] = [];
    const types = this.acceptLabel() ?? describeAccept(this.accept());
    if (types) parts.push(types.charAt(0).toUpperCase() + types.slice(1));
    const max = parseFileSize(this.maxFileSize());
    const min = parseFileSize(this.minFileSize());
    const total = parseFileSize(this.maxTotalSize());
    if (max !== undefined) parts.push(`${formatFileSize(max)} max par fichier`);
    if (min !== undefined) parts.push(`${formatFileSize(min)} min`);
    if (total !== undefined) parts.push(`${formatFileSize(total)} au total`);
    if (this.multiple()) parts.push(`${this.maxFiles()} fichiers max`);
    return parts.join(' · ');
  });

  protected readonly summary = computed(() => {
    const items = this.items();
    if (!items.length) return 'Aucun fichier sélectionné';
    return items.length === 1 ? items[0].file.name : `${items.length} fichiers (${formatFileSize(this.totalSize())})`;
  });

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly subscriptions = new Map<string, Subscription>();
  private dragDepth = 0;
  private onChange: (value: File[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.validation.attach(this, { label: this.label });
    warnIfUnlabelled('ui-file-upload', () => !!(this.label() || this.ariaLabel()));
    inject(DestroyRef).onDestroy(() => this.subscriptions.forEach((s) => s.unsubscribe()));
  }

  /** Ouvre le sélecteur de fichiers du navigateur. */
  open(): void {
    if (!this.isDisabled()) this.inputRef().nativeElement.click();
  }

  /** Ajoute des fichiers comme si l'utilisateur les avait choisis (contrôles compris). */
  addFiles(files: FileList | readonly File[]): void {
    if (this.isDisabled()) return;
    const incoming = Array.from(files);
    const replace = !this.multiple();
    let current = replace ? [] : [...this.items()];
    const rejections: UiFileRejection[] = [];
    const accepted: UiFileItem[] = [];
    const max = parseFileSize(this.maxFileSize());
    const min = parseFileSize(this.minFileSize());
    const maxTotal = parseFileSize(this.maxTotalSize());
    let total = current.reduce((sum, item) => sum + item.file.size, 0);

    for (const file of replace ? incoming.slice(0, 1) : incoming) {
      let reason: UiFileRejectionReason | null = null;
      if (!matchesAccept(file, this.accept())) reason = 'fileType';
      else if (max !== undefined && file.size > max) reason = 'maxFileSize';
      else if (min !== undefined && file.size < min) reason = 'minFileSize';
      else if (current.length + accepted.length >= this.maxFiles()) reason = 'maxFiles';
      else if (maxTotal !== undefined && total + file.size > maxTotal) reason = 'maxTotalSize';
      if (reason) {
        rejections.push({ file, reason, message: this.rejectionMessage(reason, file) });
      } else {
        total += file.size;
        accepted.push({ id: uniqueId('ui-file'), file, status: 'ready', progress: 0 });
      }
    }
    if (replace && accepted.length) {
      this.items().forEach((item) => this.cancel(item.id));
      current = [];
    }
    if (replace && incoming.length > 1) {
      rejections.push(...incoming.slice(1).map((file) => ({ file, reason: 'maxFiles' as const, message: this.rejectionMessage('maxFiles', file) })));
    }

    this.rejections.set(rejections);
    if (rejections.length) this.rejected.emit(rejections);
    if (accepted.length) {
      this.setItems([...current, ...accepted]);
      accepted.forEach((item) => this.loadPreview(item));
      if (this.upload() && this.autoUpload()) accepted.forEach((item) => this.startUpload(item.id));
    }
    this.announce(accepted.length, rejections.length);
    this.onTouched();
  }

  /** Retire un fichier (annule son envoi éventuel). */
  remove(id: string): void {
    const item = this.items().find((i) => i.id === id);
    if (!item) return;
    this.cancel(id);
    this.setItems(this.items().filter((i) => i.id !== id));
    this.removed.emit(item.file);
    this.announcement.set(`${item.file.name} retiré.`);
  }

  /** Retire tous les fichiers. */
  clear(): void {
    this.items().forEach((item) => this.cancel(item.id));
    this.setItems([]);
    this.rejections.set([]);
  }

  /** Envoie tous les fichiers prêts ou en erreur. */
  uploadAll(): void {
    this.items()
      .filter((item) => item.status === 'ready' || item.status === 'error')
      .forEach((item) => this.startUpload(item.id));
  }

  /** Relance l'envoi d'un fichier en erreur. */
  retry(id: string): void {
    this.startUpload(id);
  }

  /** Image illisible : on revient à l'icône générique. */
  protected dropPreview(id: string): void {
    this.patch(id, { preview: undefined });
  }

  protected dismissRejections(): void {
    this.rejections.set([]);
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.addFiles(input.files);
    input.value = ''; // permet de re-sélectionner le même fichier
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.acceptsDrag(event)) return;
    event.preventDefault();
    this.dragDepth += 1;
    this.dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.acceptsDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!this.acceptsDrag(event)) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    if (event.dataTransfer?.files.length) this.addFiles(event.dataTransfer.files);
  }

  protected setFocused(focused: boolean): void {
    this.focused.set(focused);
    if (!focused) this.onTouched();
  }

  protected size(bytes: number): string {
    return formatFileSize(bytes);
  }

  protected isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private acceptsDrag(event: DragEvent): boolean {
    return !this.isDisabled() && !this.full() && !!event.dataTransfer?.types.includes('Files');
  }

  private rejectionMessage(reason: UiFileRejectionReason, file: File): string {
    const template = this.rejectionMessages()?.[reason] ?? DEFAULT_REJECTIONS[reason];
    const max = parseFileSize(this.maxFileSize());
    const min = parseFileSize(this.minFileSize());
    const total = parseFileSize(this.maxTotalSize());
    const params = {
      name: file.name,
      size: formatFileSize(file.size),
      max: max !== undefined ? formatFileSize(max) : '',
      min: min !== undefined ? formatFileSize(min) : '',
      maxTotal: total !== undefined ? formatFileSize(total) : '',
      maxFiles: this.maxFiles(),
      accept: this.acceptLabel() ?? describeAccept(this.accept()),
    };
    return formatErrorMessage(template, params, { label: this.label(), control: this.validation.control });
  }

  private setItems(items: UiFileItem[]): void {
    this.items.set(items);
    const files = items.map((item) => item.file);
    this.files.set(files);
    this.onChange(files);
  }

  private patch(id: string, changes: Partial<UiFileItem>): void {
    this.items.update((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  private loadPreview(item: UiFileItem): void {
    if (!this.showPreview() || !PREVIEWABLE.test(item.file.type) || item.file.size > 10 * 1024 * 1024) return;
    // data: URL (et non blob:) : autorisée par la CSP img-src 'self' data:, et acceptée par le sanitizer d'Angular.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.patch(item.id, { preview: reader.result });
    };
    reader.readAsDataURL(item.file);
  }

  private startUpload(id: string): void {
    const uploader = this.upload();
    const item = this.items().find((i) => i.id === id);
    if (!uploader || !item) return;
    this.cancel(id);
    this.patch(id, { status: 'uploading', progress: 0, error: undefined });
    let response: unknown;
    const subscription = uploader(item.file).subscribe({
      next: (event) => {
        if (typeof event === 'number') {
          this.patch(id, { progress: Math.max(0, Math.min(100, Math.round(event))) });
        } else if (event.type === HttpEventType.UploadProgress) {
          this.patch(id, { progress: event.total ? Math.round((100 * event.loaded) / event.total) : 0 });
        } else if (event.type === HttpEventType.Response) {
          response = event.body;
        }
      },
      error: (error: unknown) => {
        this.subscriptions.delete(id);
        this.patch(id, { status: 'error', error: 'Échec de l’envoi.' });
        this.uploadFailed.emit({ file: item.file, error });
        this.announcement.set(`Échec de l’envoi de ${item.file.name}.`);
      },
      complete: () => {
        this.subscriptions.delete(id);
        this.patch(id, { status: 'done', progress: 100, response });
        this.uploaded.emit({ file: item.file, response });
        this.announcement.set(`${item.file.name} envoyé.`);
      },
    });
    if (!subscription.closed) this.subscriptions.set(id, subscription);
  }

  private cancel(id: string): void {
    this.subscriptions.get(id)?.unsubscribe();
    this.subscriptions.delete(id);
  }

  private announce(added: number, refused: number): void {
    const parts: string[] = [];
    if (added) parts.push(`${added} fichier${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}`);
    if (refused) parts.push(`${refused} refusé${refused > 1 ? 's' : ''}`);
    if (parts.length) this.announcement.set(parts.join(', ') + '.');
  }

  writeValue(value: unknown): void {
    const files = Array.isArray(value) ? (value.filter((f) => f instanceof File) as File[]) : [];
    untracked(() => {
      const existing = this.items();
      this.items.set(files.map((file) => existing.find((i) => i.file === file) ?? { id: uniqueId('ui-file'), file, status: 'ready', progress: 0 }));
      this.files.set(files);
      if (!files.length) this.rejections.set([]);
    });
  }

  registerOnChange(fn: (value: File[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
