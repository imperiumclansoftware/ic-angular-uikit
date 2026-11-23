import { Component, signal, viewChild } from '@angular/core';
import { UiButton, UiDialog, UiDialogFooter, UiDialogHeader, UiTextField } from 'ic-angular-uikit';

/**
 * En-tête personnalisé et API impérative
 * `uiDialogHeader` remplace le titre ; la référence au composant donne accès à `show()` et `close()`. `closeOnBackdrop` est désactivé pour éviter de perdre la saisie.
 * @order 2
 */
@Component({
  selector: 'doc-dialog-form-example',
  imports: [UiButton, UiDialog, UiDialogHeader, UiDialogFooter, UiTextField],
  template: `
    <button uiButton (click)="dialog().show()">Inviter un membre</button>
    @if (invited()) {
      <p>Invitation envoyée à {{ invited() }}.</p>
    }

    <ui-dialog #dlg [closeOnBackdrop]="false" [showClose]="false">
      <div uiDialogHeader class="header">
        <span class="avatar" aria-hidden="true">+</span>
        <div>
          <h2>Inviter un membre</h2>
          <p>Il recevra un lien valable 7 jours.</p>
        </div>
      </div>
      <ui-text-field label="E-mail" type="email" [(value)]="email" />
      <footer uiDialogFooter>
        <button uiButton variant="ghost" (click)="dlg.close()">Annuler</button>
        <button uiButton [disabled]="!email()" (click)="send()">Envoyer</button>
      </footer>
    </ui-dialog>
  `,
  styles: `
    .header { display: flex; gap: 0.75rem; align-items: center; padding: 1.25rem 1.25rem 0; }
    .header h2 { margin: 0; font-size: 1.1rem; }
    .header p { margin: 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }
    .avatar { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--ui-color-primary-subtle); color: var(--ui-color-primary-text); font-size: 1.25rem; }
  `,
})
export class DialogFormExample {
  protected readonly dialog = viewChild.required<UiDialog>('dlg');
  protected readonly email = signal('');
  protected readonly invited = signal('');

  protected send(): void {
    this.invited.set(this.email());
    this.email.set('');
    this.dialog().close();
  }
}
