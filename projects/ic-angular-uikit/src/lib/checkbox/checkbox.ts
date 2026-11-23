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
import { uniqueId } from '../core/id';
import { UiSize } from '../core/types';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';

/**
 * Case à cocher basée sur `<input type="checkbox">` natif (clavier, formulaires, lecteurs d'écran),
 * avec état indéterminé (ex. « tout sélectionner » partiel).
 * Utilisable avec `[(checked)]` ou les formulaires Angular (`formControl`, `ngModel`).
 *
 * @slot default - Libellé (cliquable).
 * @cssprop --ui-checkbox-color - Couleur de la case cochée (défaut : `--ui-color-primary`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-checkbox',
  imports: [UiFieldMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-checkbox ui-checkbox--" + size()',
    '[class.ui-checkbox--disabled]': 'isDisabled()',
    '[class.ui-checkbox--invalid]': 'validation.state().status === "invalid"',
  },
  template: `
    <label class="ui-checkbox__row">
      <input
        type="checkbox"
        class="ui-checkbox__input"
        [id]="inputId"
        [checked]="checked()"
        [indeterminate]="indeterminate()"
        [disabled]="isDisabled()"
        [required]="isRequired()"
        [attr.name]="name() ?? null"
        [attr.aria-invalid]="validation.state().status === 'invalid' || null"
        [attr.aria-describedby]="(description() ? descriptionId + ' ' : '') + messageId"
        (change)="onToggle($event)"
        (blur)="onTouched()"
      />
      <span class="ui-checkbox__text">
        <span class="ui-checkbox__label"><ng-content /></span>
        @if (description()) {
          <span class="ui-checkbox__description" [id]="descriptionId">{{ description() }}</span>
        }
      </span>
    </label>
    <ui-field-message class="ui-checkbox__message" [messageId]="messageId" [state]="validation.state()" />
  `,
  styleUrl: './checkbox.css',
})
export class UiCheckbox implements ControlValueAccessor {
  /** État coché (liaison bidirectionnelle `[(checked)]`). */
  readonly checked = model(false);
  /** État indéterminé (liaison `[(indeterminate)]`) ; il est levé dès que l'utilisateur clique. */
  readonly indeterminate = model(false);
  /** Désactive la case. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Case obligatoire (attribut `required`, ex. acceptation des conditions). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Taille. */
  readonly size = input<UiSize>('md');
  /** Texte d'aide sous le libellé (relié par `aria-describedby`). */
  readonly description = input<string>();
  /** Attribut `name` de l'input (soumission de formulaire HTML classique). */
  readonly name = input<string>();

  /** Émis à chaque changement provoqué par l'utilisateur, avec le nouvel état. */
  readonly changed = output<boolean>();

  protected readonly inputId = uniqueId('ui-checkbox');
  protected readonly descriptionId = `${this.inputId}-description`;
  protected readonly messageId = `${this.inputId}-message`;
  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  protected readonly isRequired = computed(() => this.required() || this.validation.required());
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  constructor() {
    // Validators.required / requiredTrue sur une case : message adapté.
    this.validation.attach(this, { messages: { required: 'Cette case doit être cochée.' } });
  }

  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  /** Inverse l'état (sans effet si désactivée). */
  toggle(): void {
    if (!this.isDisabled()) {
      this.update(!this.checked());
    }
  }

  protected onToggle(event: Event): void {
    this.update((event.target as HTMLInputElement).checked);
  }

  private update(checked: boolean): void {
    this.indeterminate.set(false);
    this.checked.set(checked);
    this.onChange(checked);
    this.changed.emit(checked);
  }

  writeValue(value: unknown): void {
    this.checked.set(Boolean(value));
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
