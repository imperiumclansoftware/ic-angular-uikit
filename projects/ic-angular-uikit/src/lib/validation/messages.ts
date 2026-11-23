import { InjectionToken, Provider, inject } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Valeur associée à une clé d'erreur (ex. `{ requiredLength: 8, actualLength: 3 }` pour `minlength`). */
export type UiValidationErrorValue = ValidationErrors[string];

/** Contexte passé aux messages sous forme de fonction. */
export interface UiErrorContext {
  /** Libellé du champ, s'il en a un. */
  label?: string;
  /** Contrôle Angular validé. */
  control: AbstractControl | null;
}

/**
 * Un message d'erreur : texte avec paramètres `{nom}` remplacés par les propriétés de l'erreur
 * (`'Au moins {requiredLength} caractères'`) et `{label}`, ou fonction pour un contrôle total.
 */
export type UiErrorMessage = string | ((error: UiValidationErrorValue, context: UiErrorContext) => string);

/** Messages indexés par clé d'erreur (`required`, `email`, `minlength`, `pattern`, clés de vos validateurs…). */
export type UiErrorMessages = Record<string, UiErrorMessage>;

/**
 * Quand afficher les erreurs :
 * - `touched` : après que le champ a été quitté, ou après la soumission du formulaire (défaut) ;
 * - `dirty` : dès la première modification, ou après la soumission ;
 * - `submitted` : seulement après la soumission du formulaire parent ;
 * - `immediate` : tout de suite.
 */
export type UiShowErrorsWhen = 'touched' | 'dirty' | 'submitted' | 'immediate';

export interface UiValidationConfig {
  /** Messages par clé d'erreur ; complètent ou remplacent les messages par défaut. */
  messages?: UiErrorMessages;
  /** Moment d'affichage des erreurs. Défaut : `touched`. */
  showErrorsWhen?: UiShowErrorsWhen;
  /** Affiche l'état « valide » (bordure verte) une fois le champ modifié et valide. Défaut : `false`. */
  showSuccess?: boolean;
  /** Message affiché pendant une validation asynchrone. Défaut : `Vérification…`. */
  pendingMessage?: string;
  /** Message quand aucune règle ne correspond à l'erreur. Défaut : `Valeur invalide.` */
  fallbackMessage?: string;
}

/** Messages par défaut (français) des validateurs Angular. */
export const UI_DEFAULT_ERROR_MESSAGES: UiErrorMessages = {
  required: 'Ce champ est obligatoire.',
  email: 'Saisissez une adresse e-mail valide.',
  minlength: 'Au moins {requiredLength} caractères ({actualLength} actuellement).',
  maxlength: 'Au plus {requiredLength} caractères ({actualLength} actuellement).',
  min: 'La valeur minimale est {min}.',
  max: 'La valeur maximale est {max}.',
  pattern: 'Le format est invalide.',
};

const DEFAULT_CONFIG: Required<UiValidationConfig> = {
  messages: UI_DEFAULT_ERROR_MESSAGES,
  showErrorsWhen: 'touched',
  showSuccess: false,
  pendingMessage: 'Vérification…',
  fallbackMessage: 'Valeur invalide.',
};

export const UI_VALIDATION_CONFIG = new InjectionToken<Required<UiValidationConfig>>('UI_VALIDATION_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_CONFIG,
});

/**
 * Personnalise la validation des champs ui-kit : messages, moment d'affichage, état « valide ».
 * Utilisable dans `bootstrapApplication` (toute l'application) ou dans les `providers` d'un composant
 * (ce formulaire seulement) : la configuration se fusionne avec celle du niveau supérieur.
 *
 * ```ts
 * provideUiValidation({
 *   messages: { required: 'Obligatoire', minlength: '{requiredLength} caractères minimum' },
 *   showErrorsWhen: 'submitted',
 * })
 * ```
 */
export function provideUiValidation(config: UiValidationConfig): Provider {
  return {
    provide: UI_VALIDATION_CONFIG,
    useFactory: () => {
      const parent = inject(UI_VALIDATION_CONFIG, { skipSelf: true, optional: true }) ?? DEFAULT_CONFIG;
      return { ...parent, ...config, messages: { ...parent.messages, ...config.messages } };
    },
  };
}

/** Remplace `{nom}` par la propriété correspondante de l'erreur (ou `{label}`). */
export function formatErrorMessage(message: UiErrorMessage, error: UiValidationErrorValue, context: UiErrorContext): string {
  if (typeof message === 'function') {
    return message(error, context);
  }
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key === 'label') return context.label ?? match;
    const value = error !== null && typeof error === 'object' ? (error as Record<string, unknown>)[key] : undefined;
    return value === undefined || value === null ? match : String(value);
  });
}
