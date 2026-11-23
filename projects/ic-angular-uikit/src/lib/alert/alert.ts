import { NgTemplateOutlet } from '@angular/common';
import { UiIcon } from '../icon/icon';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  booleanAttribute,
  contentChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export type UiAlertTone = 'info' | 'success' | 'warning' | 'danger';

/** Contexte passé au template d'icône `ng-template uiAlertIcon`. */
export interface UiAlertIconContext {
  /** Ton de l'alerte. */
  $implicit: UiAlertTone;
}

/**
 * Remplace l'icône par défaut d'une alerte.
 *
 * ```html
 * <ng-template uiAlertIcon let-tone>…</ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[uiAlertIcon]' })
export class UiAlertIcon {
  readonly template = inject<TemplateRef<UiAlertIconContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: UiAlertIcon, _ctx: unknown): _ctx is UiAlertIconContext {
    return true;
  }
}

/** Zone d'actions d'une alerte (boutons, liens). */
@Directive({
  selector: '[uiAlertActions]',
  host: { class: 'ui-alert__actions', style: 'display:flex;flex-wrap:wrap;gap:var(--ui-space-2);margin-top:var(--ui-space-3)' },
})
export class UiAlertActions {}

/**
 * Message contextuel (information, succès, avertissement, erreur), éventuellement refermable.
 *
 * @slot default - Contenu du message.
 * @slot ng-template[uiAlertIcon] - Template remplaçant l'icône ; reçoit le ton en contexte (`let-tone`).
 * @slot [uiAlertActions] - Actions affichées sous le message.
 * @category Retours & superpositions
 */
@Component({
  selector: 'ui-alert',
  imports: [NgTemplateOutlet, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-alert ui-alert--" + tone()',
    '[attr.role]': 'tone() === "danger" || tone() === "warning" ? "alert" : "status"',
    '[hidden]': 'isDismissed()',
  },
  template: `
    @if (!hideIcon()) {
      <span class="ui-alert__icon" aria-hidden="true">
        @if (iconTemplate(); as custom) {
          <ng-container *ngTemplateOutlet="custom.template; context: { $implicit: tone() }" />
        } @else if (icon(); as name) {
          <ui-icon class="ui-alert__ui-icon" [name]="name" />
        } @else {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            @switch (tone()) {
              @case ('success') { <path d="M20 6 9 17l-5-5" /> }
              @case ('warning') { <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /> }
              @case ('danger') { <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /> }
              @default { <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /> }
            }
          </svg>
        }
      </span>
    }
    <div class="ui-alert__content">
      @if (title()) {
        <p class="ui-alert__title">{{ title() }}</p>
      }
      <div class="ui-alert__message"><ng-content /></div>
      <ng-content select="[uiAlertActions]" />
    </div>
    @if (dismissible()) {
      <button type="button" class="ui-alert__close" [attr.aria-label]="dismissLabel()" (click)="dismiss()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    }
  `,
  styleUrl: './alert.css',
})
export class UiAlert {
  /** Ton sémantique (définit la couleur, l'icône et le rôle ARIA). */
  readonly tone = input<UiAlertTone>('info');
  /** Titre optionnel affiché en gras au-dessus du message. */
  readonly title = input<string>();
  /** Affiche un bouton de fermeture. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Libellé accessible du bouton de fermeture. */
  readonly dismissLabel = input('Fermer');
  /** Icône d'un jeu déclaré avec `provideUiIcons()`, à la place de l'icône par défaut du ton. */
  readonly icon = input<string>();
  /** Masque l'icône. */
  readonly hideIcon = input(false, { transform: booleanAttribute });
  /**
   * Masque automatiquement l'alerte quand elle est fermée.
   * Passez `false` pour gérer vous-même l'affichage via `(dismissed)`.
   */
  readonly autoHide = input(true, { transform: booleanAttribute });

  /** Émis quand l'utilisateur ferme l'alerte. */
  readonly dismissed = output<void>();

  protected readonly iconTemplate = contentChild(UiAlertIcon);
  protected readonly isDismissed = signal(false);

  /** Ferme l'alerte par programme (émet `dismissed`). */
  dismiss(): void {
    if (this.autoHide()) {
      this.isDismissed.set(true);
    }
    this.dismissed.emit();
  }

  /** Réaffiche une alerte fermée. */
  show(): void {
    this.isDismissed.set(false);
  }
}
