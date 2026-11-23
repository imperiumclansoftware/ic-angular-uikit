import {
  ChangeDetectionStrategy,
  Component,
  Directive,
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
import { UiIcon } from '../icon/icon';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';

export type UiTextFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'date' | 'datetime-local' | 'time';

/** Contenu affiché au début du champ (icône, unité…). */
@Directive({ selector: '[uiPrefix]', host: { class: 'ui-text-field__affix' } })
export class UiPrefix {}

/** Contenu affiché à la fin du champ (icône, unité, bouton…). */
@Directive({ selector: '[uiSuffix]', host: { class: 'ui-text-field__affix' } })
export class UiSuffix {}

/**
 * Champ de saisie avec libellé, aide, message d'erreur et zones préfixe / suffixe.
 * Utilisable avec `[(value)]` ou les formulaires Angular (`formControl`, `ngModel`).
 *
 * @slot [uiPrefix] - Contenu affiché au début du champ.
 * @slot [uiSuffix] - Contenu affiché à la fin du champ.
 * @cssprop --ui-field-radius - Rayon des coins, commun à tous les champs (défaut : `--ui-radius-md`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-text-field',
  imports: [UiFieldMessage, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-field ui-text-field ui-field--" + size()',
    '[class.ui-field--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-field--valid]': 'validation.state().status === "valid"',
    '[class.ui-field--pending]': 'validation.state().status === "pending"',
    '[class.ui-field--disabled]': 'isDisabled()',
    '[class.ui-field--focused]': 'focused()',
    '[class.ui-text-field--clearable]': 'clearable()',
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
    <div class="ui-field__control">
      @if (prefixIcon(); as name) {
        <ui-icon [name]="name" />
      }
      <ng-content select="[uiPrefix]" />
      <input
        #input
        class="ui-text-field__input"
        [id]="inputId"
        [type]="type()"
        [value]="value()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [readOnly]="readonly()"
        [required]="isRequired()"
        [attr.maxlength]="maxLength() ?? null"
        [attr.autocomplete]="autocomplete() ?? null"
        [attr.aria-invalid]="validation.state().status === 'invalid'"
        [attr.aria-describedby]="messageId"
        [attr.aria-label]="label() ? null : (ariaLabel() ?? null)"
        (input)="onInput($event)"
        (focus)="setFocused(true)"
        (blur)="setFocused(false)"
      />
      @if (clearable() && value() && !isDisabled() && !readonly()) {
        <button type="button" class="ui-text-field__clear" [attr.aria-label]="clearLabel()" (click)="clear()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      }
      <ng-content select="[uiSuffix]" />
      @if (suffixIcon(); as name) {
        <ui-icon [name]="name" />
      }
      @if (validation.state().status === 'valid') {
        <svg class="ui-field__status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      }
    </div>
    <ui-field-message [messageId]="messageId" [state]="validation.state()" [hint]="hint()" [counter]="counterText()" />
  `,
  styleUrls: ['../core/field.css', './text-field.css'],
})
export class UiTextField implements ControlValueAccessor {
  /** Valeur du champ (liaison bidirectionnelle `[(value)]`). */
  readonly value = model('');
  /** Libellé affiché au-dessus du champ. */
  readonly label = input<string>();
  /** Nom accessible quand aucun `label` visible n'est affiché (ex. champ de recherche dans une barre d'outils). */
  readonly ariaLabel = input<string>();
  /** Type HTML de l'input. */
  readonly type = input<UiTextFieldType>('text');
  /** Texte indicatif affiché quand le champ est vide. */
  readonly placeholder = input('');
  /** Texte d'aide sous le champ. */
  readonly hint = input<string>();
  /** Taille. */
  readonly size = input<UiSize>('md');
  /** Champ obligatoire (ajoute un astérisque et l'attribut `required`). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactive le champ. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Lecture seule. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Affiche un bouton pour vider le champ. */
  readonly clearable = input(false, { transform: booleanAttribute });
  /** Libellé accessible du bouton d'effacement. */
  readonly clearLabel = input('Effacer');
  /** Longueur maximale ; affiche un compteur de caractères. */
  readonly maxLength = input<number | undefined, number | string | null | undefined>(undefined, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v)),
  });
  /** Icône décorative au début du champ (`préfixe:nom`, voir `provideUiIcons()`). */
  readonly prefixIcon = input<string>();
  /** Icône décorative à la fin du champ. */
  readonly suffixIcon = input<string>();
  /** Valeur de l'attribut HTML `autocomplete`. */
  readonly autocomplete = input<string>();

  /** Émis quand le champ est vidé via le bouton d'effacement. */
  readonly cleared = output<void>();
  /** Émis quand le champ gagne (`true`) ou perd (`false`) le focus. */
  readonly focusChange = output<boolean>();

  protected readonly inputId = uniqueId('ui-text-field');
  protected readonly messageId = `${this.inputId}-message`;
  protected readonly focused = signal(false);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

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
    warnIfUnlabelled('ui-text-field', () => !!(this.label() || this.ariaLabel()));
  }

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Donne le focus au champ. */
  focus(): void {
    this.inputRef().nativeElement.focus();
  }

  /** Vide le champ, émet `cleared` et redonne le focus. */
  clear(): void {
    this.updateValue('');
    this.cleared.emit();
    this.focus();
  }

  protected onInput(event: Event): void {
    this.updateValue((event.target as HTMLInputElement).value);
  }

  protected setFocused(focused: boolean): void {
    this.focused.set(focused);
    this.focusChange.emit(focused);
    if (!focused) {
      this.onTouched();
    }
  }

  private updateValue(value: string): void {
    this.value.set(value);
    this.onChange(value);
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
