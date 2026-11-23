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
 * Interrupteur on/off. Utilisable en liaison bidirectionnelle (`[(checked)]`)
 * ou avec les formulaires Angular (`formControl`, `ngModel`).
 *
 * @slot default - Libellé de l'interrupteur (cliquable).
 * @cssprop --ui-switch-on-color - Couleur de la piste activée (défaut : `--ui-color-primary`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-switch',
  imports: [UiFieldMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-switch ui-switch--" + size()',
    '[class.ui-switch--disabled]': 'isDisabled()',
    '[class.ui-switch--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-switch--label-start]': 'labelPosition() === "start"',
  },
  template: `
    <button
      type="button"
      role="switch"
      class="ui-switch__track"
      [id]="inputId"
      [attr.aria-checked]="checked()"
      [attr.aria-labelledby]="labelId"
      [attr.aria-describedby]="(description() ? descriptionId + ' ' : '') + messageId"
      [attr.aria-invalid]="validation.state().status === 'invalid' || null"
      [disabled]="isDisabled()"
      (click)="toggle()"
      (blur)="onTouched()"
    >
      <span class="ui-switch__thumb"></span>
    </button>
    <span class="ui-switch__text">
      <label class="ui-switch__label" [id]="labelId" [for]="inputId"><ng-content /></label>
      @if (description()) {
        <span class="ui-switch__description" [id]="descriptionId">{{ description() }}</span>
      }
      <ui-field-message [messageId]="messageId" [state]="validation.state()" />
    </span>
  `,
  styleUrl: './switch.css',
})
export class UiSwitch implements ControlValueAccessor {
  /** État de l'interrupteur (liaison bidirectionnelle `[(checked)]`). */
  readonly checked = model(false);
  /** Désactive l'interrupteur. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Taille. */
  readonly size = input<UiSize>('md');
  /** Position du libellé par rapport à l'interrupteur. */
  readonly labelPosition = input<'start' | 'end'>('end');
  /** Texte d'aide affiché sous le libellé (relié par `aria-describedby`). */
  readonly description = input<string>();

  /** Émis à chaque changement provoqué par l'utilisateur, avec le nouvel état. */
  readonly changed = output<boolean>();

  protected readonly inputId = uniqueId('ui-switch');
  protected readonly labelId = `${this.inputId}-label`;
  protected readonly descriptionId = `${this.inputId}-description`;
  protected readonly messageId = `${this.inputId}-message`;
  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  constructor() {
    this.validation.attach(this, { messages: { required: 'Cette option doit être activée.' } });
  }

  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  /** Inverse l'état (sans effet si désactivé). */
  toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.changed.emit(next);
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
