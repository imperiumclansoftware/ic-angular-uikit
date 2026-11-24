import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { UiButton } from '../button/button';
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';
import { UiDialog } from '../dialog/dialog';
import { UiFileIcon } from '../file-manager/file-icon';
import { UiFileManager } from '../file-manager/file-manager';
import { UiFileEntry, UiFileSource, fileFamily } from '../file-manager/file-source';
import { UiFileSize, describeAccept, formatFileSize } from '../file-upload/file-utils';
import { UiImage } from '../image/image';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';

/** Valeur du champ : un élément (ou `null`) en mode simple, un tableau en mode multiple. */
export type UiFilePickerValue = UiFileEntry | readonly UiFileEntry[] | null;

/**
 * Champ de formulaire pour choisir un ou plusieurs fichiers (ou médias) dans une bibliothèque : les éléments choisis
 * sont affichés (liste ou vignettes) avec un bouton pour les retirer ; « Choisir… » ouvre la bibliothèque
 * (`ui-file-manager`, envoi de nouveaux fichiers compris si la source le permet) dans un dialogue.
 *
 * Valeur : un `UiFileEntry` ou `null` (mode simple), un tableau en mode `multiple` (au plus `maxFiles`).
 * Compatible `[(value)]`, `formControl`, `ngModel` ; `Validators.required` fonctionne. Le serveur doit vérifier
 * que les identifiants reçus appartiennent bien à l'utilisateur.
 *
 * ```html
 * <ui-file-picker label="Photos de l'article" [source]="files" accept="image/*" multiple [maxFiles]="6" display="grid" [formControl]="photos" />
 * ```
 * @category Formulaires
 */
@Component({
  selector: 'ui-file-picker',
  imports: [UiFieldMessage, UiButton, UiDialog, UiFileManager, UiFileIcon, UiImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-field ui-file-picker ui-field--md ui-file-picker--" + display()',
    '[class.ui-field--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-field--valid]': 'validation.state().status === "valid"',
    '[class.ui-field--disabled]': 'isDisabled()',
  },
  templateUrl: './file-picker.html',
  styleUrls: ['../core/field.css', './file-picker.css'],
})
export class UiFilePicker implements ControlValueAccessor {
  /** Bibliothèque où choisir. */
  readonly source = input.required<UiFileSource>();
  /** Valeur (liaison `[(value)]`). */
  readonly value = model<UiFilePickerValue>(null);
  /** Libellé du champ. */
  readonly label = input<string>();
  /** Nom accessible sans libellé visible. */
  readonly ariaLabel = input<string>();
  /** Aide sous le champ. */
  readonly hint = input<string>();
  /** Plusieurs éléments (la valeur devient un tableau). */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Nombre maximal d'éléments en mode `multiple`. */
  readonly maxFiles = input(Infinity, { transform: (v: unknown) => (v === undefined || v === null || v === '' ? Infinity : numberAttribute(v, Infinity)) });
  /** Types proposés (`'image/*,video/*'`, `.pdf`…). */
  readonly accept = input('');
  /** Taille maximale des fichiers envoyés depuis la bibliothèque. */
  readonly maxFileSize = input<UiFileSize>();
  /** Présentation des éléments choisis : `list` (nom, taille) ou `grid` (vignettes). */
  readonly display = input<'list' | 'grid'>('list');
  /** Ordre modifiable (boutons « Placer avant / après »), en mode `multiple`. */
  readonly reorderable = input(false, { transform: booleanAttribute });
  /** Obligatoire (sans `Validators.required`). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactivé. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Titre du dialogue (défaut selon `accept` et `multiple`). */
  readonly dialogTitle = input<string>();

  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  protected readonly baseId = uniqueId('ui-file-picker');
  protected readonly labelId = `${this.baseId}-label`;
  protected readonly messageId = `${this.baseId}-message`;
  protected readonly constraintsId = `${this.baseId}-constraints`;
  protected readonly dialogOpen = signal(false);
  protected readonly dialogSelection = signal<readonly UiFileEntry[]>([]);
  protected readonly announcement = signal('');
  private readonly formDisabled = signal(false);
  private onChange: (value: UiFilePickerValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Éléments choisis, toujours sous forme de tableau. */
  readonly items = computed<readonly UiFileEntry[]>(() => {
    const value = this.value();
    return value === null || value === undefined ? [] : Array.isArray(value) ? (value as readonly UiFileEntry[]) : [value as UiFileEntry];
  });
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly isRequired = computed(() => this.required() || this.validation.required());
  protected readonly limit = computed(() => (this.multiple() ? Math.max(1, this.maxFiles()) : 1));
  protected readonly full = computed(() => this.multiple() && this.items().length >= this.limit());
  protected readonly remaining = computed(() => (this.multiple() ? this.limit() - this.items().length : 1));
  /** Sélection du dialogue sans les éléments déjà choisis. */
  protected readonly newSelection = computed(() => {
    const chosen = new Set(this.items().map((e) => e.id));
    return this.dialogSelection().filter((e) => e.kind === 'file' && !chosen.has(e.id));
  });
  protected readonly tooMany = computed(() => this.multiple() && this.newSelection().length > this.remaining());
  protected readonly media = computed(() => {
    const tokens = this.accept().split(',').map((t) => t.trim()).filter(Boolean);
    return tokens.length > 0 && tokens.every((t) => /^(image|video)\//.test(t));
  });
  protected readonly noun = computed(() => (this.media() ? 'média' : 'fichier'));
  protected readonly title = computed(() => this.dialogTitle() ?? `Choisir ${this.multiple() ? `des ${this.noun()}s` : `un ${this.noun()}`}`);
  protected readonly buttonLabel = computed(() => {
    if (this.multiple()) return this.items().length ? 'Ajouter…' : 'Choisir…';
    return this.items().length ? 'Remplacer…' : 'Choisir…';
  });
  protected readonly constraints = computed(() => {
    const parts: string[] = [];
    const types = describeAccept(this.accept());
    if (types) parts.push(types.charAt(0).toUpperCase() + types.slice(1));
    if (this.multiple() && Number.isFinite(this.limit())) parts.push(`${this.limit()} au plus`);
    return parts.join(' · ');
  });

  constructor() {
    this.validation.attach(this, { label: this.label });
    warnIfUnlabelled('ui-file-picker', () => !!(this.label() || this.ariaLabel()));
  }

  /** Ouvre la bibliothèque. */
  openDialog(): void {
    if (this.isDisabled() || this.full()) return;
    this.dialogSelection.set([]);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.onTouched();
  }

  /** Double clic ou Entrée sur un fichier du dialogue : il est ajouté et le dialogue se ferme. */
  protected onOpenEntry(entry: UiFileEntry): void {
    const selection = this.dialogSelection().some((e) => e.id === entry.id) ? this.dialogSelection() : [...this.dialogSelection(), entry];
    this.dialogSelection.set(this.multiple() ? selection : [entry]);
    this.confirm();
  }

  protected confirm(): void {
    const added = this.newSelection();
    if (!added.length && this.multiple()) return;
    if (this.tooMany()) return;
    if (this.multiple()) this.setValue([...this.items(), ...added]);
    else {
      const chosen = this.dialogSelection().find((e) => e.kind === 'file');
      if (!chosen) return;
      this.setValue(chosen);
    }
    this.announcement.set(
      this.multiple() ? `${added.length} ${this.noun()}${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''}.` : `${this.items()[0]?.name} choisi.`,
    );
    this.closeDialog();
  }

  /** Retire un élément. */
  remove(entry: UiFileEntry): void {
    if (this.isDisabled()) return;
    const rest = this.items().filter((e) => e.id !== entry.id);
    this.setValue(this.multiple() ? rest : null);
    this.announcement.set(`${entry.name} retiré.`);
    this.onTouched();
  }

  protected move(index: number, delta: number): void {
    const list = [...this.items()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.setValue(list);
    this.announcement.set(`${list[target].name} : position ${target + 1} sur ${list.length}.`);
  }

  private setValue(value: UiFilePickerValue): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected thumbnail(entry: UiFileEntry): string | null {
    const family = fileFamily(entry);
    if (family === 'image') return entry.thumbnailUrl ?? entry.url ?? null;
    return family === 'video' ? (entry.thumbnailUrl ?? null) : null;
  }

  protected isVideo(entry: UiFileEntry): boolean {
    return fileFamily(entry) === 'video';
  }

  protected size(entry: UiFileEntry): string {
    return entry.size !== undefined ? formatFileSize(entry.size) : '';
  }

  writeValue(value: unknown): void {
    untracked(() => {
      if (this.multiple()) this.value.set(Array.isArray(value) ? (value as UiFileEntry[]) : value ? [value as UiFileEntry] : []);
      else this.value.set(Array.isArray(value) ? ((value[0] as UiFileEntry | undefined) ?? null) : ((value as UiFileEntry | null) ?? null));
    });
  }

  registerOnChange(fn: (value: UiFilePickerValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
