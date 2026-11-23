import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Subject, firstValueFrom } from 'rxjs';
import { UiCheckbox } from '../checkbox/checkbox';
import { UiRadio, UiRadioGroup } from '../radio-group/radio-group';
import { UiSelect } from '../select/select';
import { UiTextField } from '../text-field/text-field';
import { UiErrorMessages, UiShowErrorsWhen, provideUiValidation } from './messages';

const forbidden = (control: AbstractControl): ValidationErrors | null =>
  control.value === 'admin' ? { reserved: { message: 'Ce pseudo est réservé.' } } : null;

@Component({
  imports: [ReactiveFormsModule, UiTextField, UiCheckbox, UiSelect, UiRadioGroup, UiRadio],
  template: `
    <form [formGroup]="form" (ngSubmit)="(0)">
      <ui-text-field label="Pseudo" formControlName="name" [errorMessages]="messages()" [showErrorsWhen]="when()" showSuccess successMessage="Disponible" />
      <ui-checkbox formControlName="terms">Conditions</ui-checkbox>
      <ui-select label="Pays" formControlName="country" [options]="[{ value: 'fr', label: 'France' }]" />
      <ui-radio-group label="Plan" formControlName="plan">
        <ui-radio value="a">A</ui-radio>
      </ui-radio-group>
      <button type="submit">Envoyer</button>
    </form>
  `,
})
class Host {
  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4), forbidden] }),
    terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    country: new FormControl<string | null>(null, { validators: [Validators.required] }),
    plan: new FormControl<string | null>(null, { validators: [Validators.required] }),
  });
  messages = signal<UiErrorMessages | undefined>(undefined);
  when = signal<UiShowErrorsWhen | undefined>(undefined);
}

function setup(providers: unknown[] = []) {
  TestBed.configureTestingModule({ providers: providers as never[] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  const field = el.querySelector('ui-text-field') as HTMLElement;
  const input = field.querySelector('input') as HTMLInputElement;
  const message = (host: Element | null) => host?.querySelector('.ui-field-message__text')?.textContent?.trim() ?? '';
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const blur = () => {
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  return { fixture, el, field, input, message, type, blur, host: fixture.componentInstance };
}

describe('Validation des champs', () => {
  it('n’affiche rien avant interaction, puis l’erreur après blur (touched)', () => {
    const { field, input, message, blur } = setup();
    expect(field.classList).not.toContain('ui-field--invalid');
    expect(message(field)).toBe('');
    blur();
    expect(field.classList).toContain('ui-field--invalid');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(message(field)).toBe('Ce champ est obligatoire.');
  });

  it('ajoute l’astérisque et required à partir de Validators.required', () => {
    const { field, input } = setup();
    expect(field.querySelector('.ui-field__required')).not.toBeNull();
    expect(input.required).toBe(true);
  });

  it('interpole les paramètres de l’erreur (minlength)', () => {
    const { field, message, type, blur } = setup();
    type('ab');
    blur();
    expect(message(field)).toBe('Au moins 4 caractères (2 actuellement).');
  });

  it('utilise le message fourni par le validateur, puis l’override du champ', () => {
    const { field, message, type, blur, host, fixture } = setup();
    type('admin');
    blur();
    expect(message(field)).toBe('Ce pseudo est réservé.');
    host.messages.set({ reserved: (_e, ctx) => `${ctx.label} : déjà pris` });
    fixture.detectChanges();
    expect(message(field)).toBe('Pseudo : déjà pris');
  });

  it('affiche l’état valide et le message de succès', () => {
    const { field, message, type, blur } = setup();
    type('ada.l');
    blur();
    expect(field.classList).toContain('ui-field--valid');
    expect(message(field)).toBe('Disponible');
  });

  it('affiche toutes les erreurs à la soumission, avec les messages propres à chaque composant', () => {
    const { el, fixture, message } = setup();
    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(message(el.querySelector('ui-checkbox'))).toBe('Cette case doit être cochée.');
    expect(message(el.querySelector('ui-select'))).toBe('Ce champ est obligatoire.');
    expect(message(el.querySelector('ui-radio-group'))).toBe('Choisissez une option.');
    expect(el.querySelector('ui-radio input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('mode « submitted » : rien au blur, erreurs à la soumission', () => {
    const { el, field, fixture, message, blur, host } = setup();
    host.when.set('submitted');
    fixture.detectChanges();
    blur();
    expect(message(field)).toBe('');
    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(message(field)).toBe('Ce champ est obligatoire.');
  });

  it('provideUiValidation remplace les messages et le mode par défaut', () => {
    const { field, message, fixture } = setup([provideUiValidation({ messages: { required: '{label} est requis' }, showErrorsWhen: 'immediate' })]);
    fixture.detectChanges();
    expect(message(field)).toBe('Pseudo est requis');
  });
});

@Component({
  imports: [ReactiveFormsModule, UiTextField],
  template: `<ui-text-field label="E-mail" [formControl]="email" />`,
})
class AsyncHost {
  readonly check = new Subject<ValidationErrors | null>();
  email = new FormControl('x', { nonNullable: true, asyncValidators: [() => firstValueFrom(this.check)] });
}

describe('Validation asynchrone', () => {
  it('affiche l’état « vérification » puis l’erreur', async () => {
    const fixture = TestBed.createComponent(AsyncHost);
    fixture.detectChanges();
    const field = fixture.nativeElement.querySelector('ui-text-field') as HTMLElement;
    fixture.componentInstance.email.setValue('pris@example.com');
    fixture.componentInstance.email.markAsTouched();
    fixture.detectChanges();
    expect(field.classList).toContain('ui-field--pending');
    expect(field.textContent).toContain('Vérification…');
    fixture.componentInstance.check.next({ taken: { message: 'Adresse déjà utilisée.' } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(field.classList).toContain('ui-field--invalid');
    expect(field.textContent).toContain('Adresse déjà utilisée.');
  });
});
