import {
  AfterContentInit,
  DestroyRef,
  Directive,
  DoCheck,
  Signal,
  computed,
  inject,
  input,
  booleanAttribute,
  signal,
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormGroupDirective, NgControl, NgForm, Validators } from '@angular/forms';
import { Subscription, merge } from 'rxjs';
import {
  UI_VALIDATION_CONFIG,
  UiErrorMessages,
  UiShowErrorsWhen,
  formatErrorMessage,
} from './messages';

/** État visuel d'un champ. */
export interface UiFieldState {
  /** `invalid` (erreur affichée), `pending` (validation asynchrone), `valid` (succès affiché) ou `none`. */
  status: 'none' | 'invalid' | 'pending' | 'valid';
  /** Message à afficher, s'il y en a un. */
  message: string | null;
  /** Clé de l'erreur affichée (`required`, `minlength`…), ou `manual` pour l'input `error`. */
  errorKey: string | null;
}

const NONE: UiFieldState = { status: 'none', message: null, errorKey: null };

/**
 * Validation graphique partagée par tous les champs de formulaire de la librairie
 * (`ui-text-field`, `ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio-group`, `ui-switch`).
 * Ses entrées sont disponibles directement sur ces composants.
 *
 * Elle lit le contrôle Angular attaché au champ (`formControlName`, `[formControl]`, `ngModel`) :
 * erreurs, état touché / modifié, soumission du formulaire parent et validation asynchrone.
 * Le message affiché est choisi dans cet ordre : `errorMessages` du champ, propriété `message` fournie par
 * le validateur (`{ clé: { message: '…' } }`), messages de `provideUiValidation`, messages par défaut.
 */
@Directive({ selector: '[uiFieldValidation]' })
export class UiFieldValidation implements DoCheck, AfterContentInit {
  /** Message d'erreur imposé : prioritaire sur la validation du contrôle (utile sans formulaire Angular). */
  readonly error = input<string | null>();
  /** Messages propres à ce champ, par clé d'erreur (`{ pattern: 'Format attendu : AA-123' }`). */
  readonly errorMessages = input<UiErrorMessages>();
  /** Moment d'affichage des erreurs pour ce champ (sinon : configuration globale, `touched` par défaut). */
  readonly showErrorsWhen = input<UiShowErrorsWhen>();
  /** Affiche l'état « valide » (bordure et message verts) une fois le champ modifié et valide. */
  readonly showSuccess = input<boolean | undefined, boolean | string | undefined>(undefined, {
    transform: (v: unknown) => (v === undefined ? undefined : booleanAttribute(v)),
  });
  /** Message affiché dans l'état « valide » (aucun par défaut, seule la bordure change). */
  readonly successMessage = input<string>();

  private readonly config = inject(UI_VALIDATION_CONFIG);
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly parentForm = inject(FormGroupDirective, { optional: true }) ?? inject(NgForm, { optional: true });
  private readonly version = signal(0);
  private subscribed: AbstractControl | null = null;
  private subscription: Subscription | null = null;
  private label: Signal<string | undefined> = signal(undefined);
  private componentMessages: UiErrorMessages = {};

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  /**
   * Branche le composant hôte comme `ControlValueAccessor` du contrôle Angular.
   * @internal
   */
  attach(accessor: ControlValueAccessor, options: { label?: Signal<string | undefined>; messages?: UiErrorMessages } = {}): void {
    if (this.ngControl) {
      this.ngControl.valueAccessor = accessor;
    }
    this.label = options.label ?? this.label;
    this.componentMessages = options.messages ?? {};
  }

  /** Contrôle Angular attaché, `null` si le champ est utilisé sans formulaire. */
  get control(): AbstractControl | null {
    return this.ngControl?.control ?? null;
  }

  /** `true` si le contrôle porte `Validators.required` ou `Validators.requiredTrue`. */
  readonly required = computed(() => {
    this.version();
    const control = this.control;
    return !!control && (control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue));
  });

  /** État visuel courant (erreur, attente, valide) et message associé. */
  readonly state = computed<UiFieldState>(() => {
    this.version();
    const manual = this.error();
    if (manual) {
      return { status: 'invalid', message: manual, errorKey: 'manual' };
    }
    const control = this.control;
    if (!control) {
      return NONE;
    }
    if (control.pending) {
      return { status: 'pending', message: this.config.pendingMessage, errorKey: null };
    }
    const submitted = !!this.parentForm?.submitted;
    if (control.invalid && this.shouldShowErrors(control, submitted)) {
      return this.errorState(control);
    }
    const showSuccess = this.showSuccess() ?? this.config.showSuccess;
    if (showSuccess && control.valid && control.enabled && (control.dirty || submitted)) {
      return { status: 'valid', message: this.successMessage() ?? null, errorKey: null };
    }
    return NONE;
  });

  ngDoCheck(): void {
    // Le contrôle peut changer ([formControl] remplacé) ou n'être créé qu'après l'hôte (formControlName).
    if (this.control !== this.subscribed) {
      this.connect();
    }
  }

  ngAfterContentInit(): void {
    this.connect();
  }

  private connect(): void {
    const control = this.control;
    if (control === this.subscribed) {
      return;
    }
    this.subscription?.unsubscribe();
    this.subscribed = control;
    if (control) {
      const sources = [control.events];
      if (this.parentForm) {
        sources.push(this.parentForm.form.events);
      }
      this.subscription = merge(...sources).subscribe(() => this.version.update((v) => v + 1));
    }
    this.version.update((v) => v + 1);
  }

  private shouldShowErrors(control: AbstractControl, submitted: boolean): boolean {
    switch (this.showErrorsWhen() ?? this.config.showErrorsWhen) {
      case 'immediate':
        return true;
      case 'submitted':
        return submitted;
      case 'dirty':
        return control.dirty || submitted;
      default:
        return control.touched || submitted;
    }
  }

  private errorState(control: AbstractControl): UiFieldState {
    const errors = control.errors ?? {};
    const key = Object.keys(errors)[0];
    if (!key) {
      return { status: 'invalid', message: this.config.fallbackMessage, errorKey: null };
    }
    const error = errors[key];
    const context = { label: this.label(), control };
    const own = this.errorMessages()?.[key];
    const fromValidator = error !== null && typeof error === 'object' && typeof error.message === 'string' ? (error.message as string) : null;
    const template = own ?? fromValidator ?? this.componentMessages[key] ?? this.config.messages[key] ?? this.config.fallbackMessage;
    return { status: 'invalid', message: formatErrorMessage(template, error, context), errorKey: key };
  }
}
