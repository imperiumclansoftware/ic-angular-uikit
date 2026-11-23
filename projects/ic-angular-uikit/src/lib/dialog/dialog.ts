import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../core/id';

/** Origine de la fermeture d'un dialogue. */
export type UiDialogCloseReason = 'escape' | 'backdrop' | 'close-button' | 'programmatic';

export type UiDialogSize = 'sm' | 'md' | 'lg';

/** En-tête personnalisé d'un dialogue (remplace `title`). */
@Directive({ selector: '[uiDialogHeader]', host: { class: 'ui-dialog__custom-header' } })
export class UiDialogHeader {}

/** Pied d'un dialogue, typiquement les boutons d'action. */
@Directive({
  selector: '[uiDialogFooter]',
  host: {
    class: 'ui-dialog__footer',
    style: 'display:flex;justify-content:flex-end;gap:var(--ui-space-2);padding:var(--ui-space-4) var(--ui-space-5);border-top:1px solid var(--ui-color-border)',
  },
})
export class UiDialogFooter {}

/**
 * Fenêtre modale basée sur l'élément natif `<dialog>` (focus piégé, touche Échap,
 * restauration du focus et couche supérieure gérés par le navigateur).
 *
 * @slot default - Corps du dialogue.
 * @slot [uiDialogHeader] - En-tête personnalisé, remplace `title`.
 * @slot [uiDialogFooter] - Pied (boutons d'action).
 * @cssprop --ui-dialog-width - Largeur maximale (sinon déterminée par `size`).
 * @category Retours & superpositions
 */
@Component({
  selector: 'ui-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Le clic sur le fond (::backdrop) ferme le dialogue ; au clavier, Échap fait de même via l'événement natif cancel. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      class="ui-dialog"
      [class]="'ui-dialog--' + size()"
      [attr.aria-labelledby]="title() ? titleId : null"
      (cancel)="onCancel($event)"
      (close)="onNativeClose()"
      (mousedown)="pressedOnBackdrop = $event.target === dialog"
      (click)="onClick($event)"
    >
      <div class="ui-dialog__surface">
        <ng-content select="[uiDialogHeader]" />
        @if (title() || showClose()) {
          <header class="ui-dialog__header">
            @if (title()) {
              <h2 class="ui-dialog__title" [id]="titleId">{{ title() }}</h2>
            }
            @if (showClose()) {
              <button type="button" class="ui-dialog__close" [attr.aria-label]="closeLabel()" (click)="close('close-button')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            }
          </header>
        }
        <div class="ui-dialog__body"><ng-content /></div>
        <ng-content select="[uiDialogFooter]" />
      </div>
    </dialog>
  `,
  styleUrl: './dialog.css',
})
export class UiDialog {
  /** Ouvre / ferme le dialogue (liaison bidirectionnelle `[(open)]`). */
  readonly open = model(false);
  /** Titre affiché dans l'en-tête et utilisé comme nom accessible. */
  readonly title = input<string>();
  /** Largeur du dialogue. */
  readonly size = input<UiDialogSize>('md');
  /** Ferme le dialogue au clic sur le fond. */
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute });
  /** Ferme le dialogue avec la touche Échap. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** Affiche le bouton de fermeture dans l'en-tête. */
  readonly showClose = input(true, { transform: booleanAttribute });
  /** Libellé accessible du bouton de fermeture. */
  readonly closeLabel = input('Fermer');

  /** Émis à l'ouverture du dialogue. */
  readonly opened = output<void>();
  /** Émis à la fermeture, avec son origine. */
  readonly closed = output<UiDialogCloseReason>();

  protected readonly titleId = uniqueId('ui-dialog-title');
  protected pressedOnBackdrop = false;
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private pendingReason: UiDialogCloseReason = 'programmatic';

  constructor() {
    effect(() => {
      const shouldOpen = this.open();
      const dialog = this.dialogRef().nativeElement;
      untracked(() => {
        if (shouldOpen && !dialog.open) {
          dialog.showModal();
          this.opened.emit();
        } else if (!shouldOpen && dialog.open) {
          dialog.close();
        }
      });
    });
  }

  /** Ouvre le dialogue. */
  show(): void {
    this.open.set(true);
  }

  /** Ferme le dialogue (émet `closed` avec la raison donnée). */
  close(reason: UiDialogCloseReason = 'programmatic'): void {
    this.pendingReason = reason;
    this.dialogRef().nativeElement.close();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    if (this.closeOnEscape()) {
      this.close('escape');
    }
  }

  protected onClick(event: MouseEvent): void {
    const backdropClick = event.target === this.dialogRef().nativeElement && this.pressedOnBackdrop;
    this.pressedOnBackdrop = false;
    if (backdropClick && this.closeOnBackdrop()) {
      this.close('backdrop');
    }
  }

  protected onNativeClose(): void {
    const reason = this.pendingReason;
    this.pendingReason = 'programmatic';
    if (this.open()) {
      this.open.set(false);
    }
    this.closed.emit(reason);
  }
}
