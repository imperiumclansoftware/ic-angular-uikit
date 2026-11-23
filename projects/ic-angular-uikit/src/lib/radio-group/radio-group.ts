import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';
import { UiSize } from '../core/types';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';

/**
 * Groupe de boutons radio : un seul choix parmi plusieurs. Rendu dans un `<fieldset>` avec sa légende ;
 * les flèches du clavier déplacent la sélection (comportement natif). Les valeurs peuvent être de n'importe quel type.
 * Utilisable avec `[(value)]` ou les formulaires Angular (`formControl`, `ngModel`).
 *
 * @slot ui-radio - Les options du groupe.
 * @cssprop --ui-radio-color - Couleur de l'option choisie (défaut : `--ui-color-primary`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-radio-group',
  imports: [UiFieldMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-radio-group ui-radio-group--" + size() + " ui-radio-group--" + orientation()',
    '[class.ui-radio-group--invalid]': 'invalid()',
  },
  template: `
    <fieldset class="ui-radio-group__fieldset" [disabled]="isDisabled()" [attr.aria-describedby]="messageId" [attr.aria-label]="label() ? null : (ariaLabel() ?? null)">
      @if (label()) {
        <legend class="ui-radio-group__legend">
          {{ label() }}
          @if (isRequired()) {
            <span class="ui-radio-group__required" aria-hidden="true">*</span>
          }
        </legend>
      }
      <div class="ui-radio-group__options" role="presentation"><ng-content /></div>
    </fieldset>
    <ui-field-message class="ui-radio-group__message" [messageId]="messageId" [state]="validation.state()" [hint]="hint()" />
  `,
  styleUrl: './radio-group.css',
})
export class UiRadioGroup<T = unknown> implements ControlValueAccessor {
  /** Valeur de l'option choisie, `null` si aucune (liaison bidirectionnelle `[(value)]`). */
  readonly value = model<T | null>(null);
  /** Légende du groupe (nom accessible). */
  readonly label = input<string>();
  /** Nom accessible quand aucune légende visible n'est affichée. */
  readonly ariaLabel = input<string>();
  /** Disposition des options. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  /** Taille. */
  readonly size = input<UiSize>('md');
  /** Texte d'aide sous le groupe. */
  readonly hint = input<string>();
  /** Choix obligatoire (astérisque et attribut `required`). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactive tout le groupe. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Attribut `name` partagé par les radios (généré si absent). */
  readonly name = input<string>();
  /** Égalité entre deux valeurs (utile pour des objets venant d'une API). */
  readonly compareWith = input<(a: T | null, b: T | null) => boolean>(Object.is);

  /** Émis quand l'utilisateur choisit une option. */
  readonly selectionChange = output<T>();

  /** @internal */
  readonly messageId = uniqueId('ui-radio-group-message');
  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  /** @internal */
  readonly isRequired = computed(() => this.required() || this.validation.required());
  /** @internal */
  readonly invalid = computed(() => this.validation.state().status === 'invalid');
  private readonly generatedName = uniqueId('ui-radio-group');
  private readonly formDisabled = signal(false);
  /** @internal */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  /** @internal */
  readonly groupName = computed(() => this.name() ?? this.generatedName);

  constructor() {
    this.validation.attach(this, { label: this.label, messages: { required: 'Choisissez une option.' } });
    warnIfUnlabelled('ui-radio-group', () => !!(this.label() || this.ariaLabel()));
  }

  private onChange: (value: T | null) => void = () => undefined;
  /** @internal */
  onTouched: () => void = () => undefined;

  /** @internal */
  isSelected(value: T): boolean {
    const current = this.value();
    return current !== null && this.compareWith()(current, value);
  }

  /** Sélectionne une valeur comme si l'utilisateur l'avait choisie. */
  select(value: T): void {
    this.value.set(value);
    this.onChange(value);
    this.selectionChange.emit(value);
  }

  writeValue(value: unknown): void {
    this.value.set((value ?? null) as T | null);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}

/**
 * Une option de `ui-radio-group`.
 *
 * @slot default - Libellé (cliquable).
 */
@Component({
  selector: 'ui-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-radio',
    '[class.ui-radio--disabled]': 'isDisabled()',
  },
  template: `
    <label class="ui-radio__row">
      <input
        type="radio"
        class="ui-radio__input"
        [name]="group.groupName()"
        [checked]="group.isSelected(value())"
        [disabled]="isDisabled()"
        [required]="group.isRequired()"
        [attr.aria-invalid]="group.invalid() || null"
        [attr.aria-describedby]="(description() ? descriptionId + ' ' : '') + group.messageId"
        (change)="group.select(value())"
        (blur)="group.onTouched()"
      />
      <span class="ui-radio__text">
        <span class="ui-radio__label"><ng-content /></span>
        @if (description()) {
          <span class="ui-radio__description" [id]="descriptionId">{{ description() }}</span>
        }
      </span>
    </label>
  `,
  styleUrl: './radio.css',
})
export class UiRadio<T = unknown> {
  /** Valeur transmise au groupe quand l'option est choisie. */
  readonly value = input.required<T>();
  /** Désactive cette option. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Texte d'aide sous le libellé. */
  readonly description = input<string>();

  protected readonly group = inject<UiRadioGroup<T>>(UiRadioGroup);
  protected readonly descriptionId = uniqueId('ui-radio-description');
  protected readonly isDisabled = computed(() => this.disabled() || this.group.isDisabled());
}
