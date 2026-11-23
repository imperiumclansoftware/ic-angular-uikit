import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';
import { UiSize } from '../core/types';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';

const optionalNumber = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v));

/**
 * Zone de texte multiligne avec libellé, aide, erreur et compteur. Avec `autoResize`, elle grandit
 * avec son contenu entre `rows` et `maxRows` lignes (`field-sizing: content` ; hauteur fixe dans les navigateurs qui ne le gèrent pas).
 * Utilisable avec `[(value)]` ou les formulaires Angular (`formControl`, `ngModel`).
 *
 * @cssprop --ui-field-radius - Rayon des coins, commun à tous les champs (défaut : `--ui-radius-md`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-textarea',
  imports: [UiFieldMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-field ui-textarea ui-field--" + size()',
    '[class.ui-field--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-field--valid]': 'validation.state().status === "valid"',
    '[class.ui-field--pending]': 'validation.state().status === "pending"',
    '[class.ui-field--disabled]': 'isDisabled()',
    '[class.ui-field--focused]': 'focused()',
    '[class.ui-textarea--auto]': 'autoResize()',
    '[style.--_rows]': 'rows()',
    '[style.--_max-rows]': 'maxRows() ?? null',
  },
  template: `
    @if (label()) {
      <label class="ui-field__label" [for]="inputId">
        {{ label() }}
        @if (isRequired()) {
          <span class="ui-field__required" aria-hidden="true">*</span>
        }
      </label>
    }
    <div class="ui-field__control ui-textarea__control">
      <textarea
        #textarea
        class="ui-textarea__input"
        [id]="inputId"
        [value]="value()"
        [rows]="rows()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [readOnly]="readonly()"
        [required]="isRequired()"
        [style.resize]="autoResize() ? 'none' : resize()"
        [attr.maxlength]="maxLength() ?? null"
        [attr.aria-invalid]="validation.state().status === 'invalid'"
        [attr.aria-describedby]="messageId"
        [attr.aria-label]="label() ? null : (ariaLabel() ?? null)"
        (input)="onInput($event)"
        (focus)="setFocused(true)"
        (blur)="setFocused(false)"
      ></textarea>
      @if (validation.state().status === 'valid') {
        <svg class="ui-field__status-icon ui-textarea__status" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      }
    </div>
    <ui-field-message [messageId]="messageId" [state]="validation.state()" [hint]="hint()" [counter]="counterText()" />
  `,
  styleUrls: ['../core/field.css', './textarea.css'],
})
export class UiTextarea implements ControlValueAccessor {
  /** Texte saisi (liaison bidirectionnelle `[(value)]`). */
  readonly value = model('');
  /** Libellé affiché au-dessus du champ. */
  readonly label = input<string>();
  /** Nom accessible quand aucun `label` visible n'est affiché (ex. champ de recherche dans une barre d'outils). */
  readonly ariaLabel = input<string>();
  /** Texte indicatif affiché quand le champ est vide. */
  readonly placeholder = input('');
  /** Texte d'aide sous le champ. */
  readonly hint = input<string>();
  /** Taille du texte. */
  readonly size = input<UiSize>('md');
  /** Nombre de lignes visibles (hauteur minimale si `autoResize`). */
  readonly rows = input(3, { transform: numberAttribute });
  /** Hauteur maximale en lignes quand `autoResize` est actif ; au-delà, une barre de défilement apparaît. */
  readonly maxRows = input<number | undefined, number | string | null | undefined>(undefined, { transform: optionalNumber });
  /** La hauteur suit le contenu. */
  readonly autoResize = input(false, { transform: booleanAttribute });
  /** Redimensionnement manuel autorisé (ignoré si `autoResize`). */
  readonly resize = input<'vertical' | 'none'>('vertical');
  /** Champ obligatoire (astérisque et attribut `required`). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactive le champ. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Lecture seule. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Longueur maximale ; affiche un compteur de caractères. */
  readonly maxLength = input<number | undefined, number | string | null | undefined>(undefined, { transform: optionalNumber });

  /** Émis quand le champ gagne (`true`) ou perd (`false`) le focus. */
  readonly focusChange = output<boolean>();

  protected readonly inputId = uniqueId('ui-textarea');
  protected readonly messageId = `${this.inputId}-message`;
  protected readonly focused = signal(false);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  private readonly textareaRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  /** Obligatoire via l'input `required` ou un validateur `Validators.required` sur le contrôle. */
  protected readonly isRequired = computed(() => this.required() || this.validation.required());
  protected readonly counterText = computed(() => {
    const max = this.maxLength();
    return max ? `${this.value().length} / ${max}` : null;
  });

  constructor() {
    this.validation.attach(this, { label: this.label });
    warnIfUnlabelled('ui-textarea', () => !!(this.label() || this.ariaLabel()));
  }

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Donne le focus au champ. */
  focus(): void {
    this.textareaRef().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected setFocused(focused: boolean): void {
    this.focused.set(focused);
    this.focusChange.emit(focused);
    if (!focused) {
      this.onTouched();
    }
  }

  writeValue(value: unknown): void {
    this.value.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
