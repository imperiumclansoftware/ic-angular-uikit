import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiFieldState } from './field-validation';

/**
 * Ligne de message sous un champ : erreur, attente, succès ou aide, avec compteur optionnel.
 * La zone de texte est une région `aria-live` : les erreurs qui apparaissent sont annoncées.
 * @internal
 */
@Component({
  selector: 'ui-field-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"ui-field-message ui-field-message--" + state().status' },
  template: `
    <p class="ui-field-message__line" [id]="messageId()" [hidden]="!state().message && !hint() && !counter()">
      <span class="ui-field-message__text" aria-live="polite">
        @if (state().message; as message) {
          <svg class="ui-field-message__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            @switch (state().status) {
              @case ('invalid') { <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /> }
              @case ('valid') { <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /> }
              @default { <path d="M21 12a9 9 0 1 1-6.2-8.6" class="ui-field-message__spin" /> }
            }
          </svg>
          {{ message }}
        } @else {
          {{ hint() }}
        }
      </span>
      @if (counter()) {
        <span class="ui-field-message__counter">{{ counter() }}</span>
      }
    </p>
  `,
  styles: `
    :host { display: block; font-size: var(--ui-font-size-xs); color: var(--ui-color-text-muted); }
    .ui-field-message__line { display: flex; justify-content: space-between; gap: var(--ui-space-2); margin: 0; }
    .ui-field-message__line[hidden] { display: none; }
    .ui-field-message__text { display: inline-flex; align-items: flex-start; gap: var(--ui-space-1); }
    .ui-field-message__icon { flex: none; width: 1.1em; height: 1.1em; margin-top: 0.15em; }
    .ui-field-message__counter { margin-left: auto; font-variant-numeric: tabular-nums; }
    :host(.ui-field-message--invalid) .ui-field-message__text { color: var(--ui-color-danger-text); }
    :host(.ui-field-message--valid) .ui-field-message__text { color: var(--ui-color-success-text); }
    :host(.ui-field-message--pending) .ui-field-message__text { color: var(--ui-color-text-muted); }
    .ui-field-message__spin { transform-origin: center; animation: ui-field-spin 0.8s linear infinite; }
    @keyframes ui-field-spin { to { transform: rotate(360deg); } }
  `,
})
export class UiFieldMessage {
  readonly messageId = input.required<string>();
  readonly state = input.required<UiFieldState>();
  readonly hint = input<string>();
  readonly counter = input<string | null>(null);
}
