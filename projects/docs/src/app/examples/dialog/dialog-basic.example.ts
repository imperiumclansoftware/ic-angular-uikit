import { Component, signal } from '@angular/core';
import { UiButton, UiDialog, UiDialogCloseReason, UiDialogFooter } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Dialogue de confirmation
 * `[(open)]` contrôle l'ouverture ; `(closed)` indique l'origine de la fermeture (`escape`, `backdrop`, `close-button`, `programmatic`).
 * @order 1
 */
@Component({
  selector: 'doc-dialog-basic-example',
  imports: [UiButton, UiDialog, UiDialogFooter, EventLogView],
  template: `
    <button uiButton variant="danger" (click)="open.set(true)">Supprimer le projet…</button>

    <ui-dialog
      title="Supprimer le projet ?"
      size="sm"
      [(open)]="open"
      (opened)="log.add('opened')"
      (closed)="onClosed($event)"
    >
      <p>Cette action est irréversible. Les 12 fichiers du projet seront supprimés.</p>
      <footer uiDialogFooter>
        <button uiButton variant="ghost" (click)="open.set(false)">Annuler</button>
        <button uiButton variant="danger" (click)="confirm()">Supprimer</button>
      </footer>
    </ui-dialog>
    <doc-event-log [log]="log" />
  `,
})
export class DialogBasicExample {
  protected readonly open = signal(false);
  protected readonly log = new EventLog();

  protected confirm(): void {
    this.log.add('confirm');
    this.open.set(false);
  }

  protected onClosed(reason: UiDialogCloseReason): void {
    this.log.add('closed', reason);
  }
}
