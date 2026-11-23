import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UiButton, UiSwitch } from 'ic-angular-uikit';

/**
 * Formulaires réactifs
 * `ui-switch` implémente `ControlValueAccessor` : `formControlName`, `ngModel` et l'état désactivé du contrôle fonctionnent.
 * @order 2
 */
@Component({
  selector: 'doc-switch-forms-example',
  imports: [ReactiveFormsModule, JsonPipe, UiSwitch, UiButton],
  template: `
    <form class="ex-stack" [formGroup]="form">
      <ui-switch formControlName="newsletter">Newsletter</ui-switch>
      <ui-switch formControlName="sms">Alertes SMS</ui-switch>
      <div class="ex-row">
        <button uiButton type="button" variant="outline" size="sm" (click)="toggleSms()">
          {{ form.controls.sms.disabled ? 'Activer' : 'Désactiver' }} le contrôle SMS
        </button>
      </div>
    </form>
    <p><code>form.value</code> = {{ form.getRawValue() | json }}</p>
  `,
})
export class SwitchFormsExample {
  protected readonly form = new FormGroup({
    newsletter: new FormControl(true, { nonNullable: true }),
    sms: new FormControl(false, { nonNullable: true }),
  });

  protected toggleSms(): void {
    const sms = this.form.controls.sms;
    if (sms.disabled) {
      sms.enable();
    } else {
      sms.disable();
    }
  }
}
