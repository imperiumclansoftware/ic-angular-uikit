import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiTextarea } from './textarea';

@Component({
  imports: [UiTextarea],
  template: `<ui-textarea label="Bio" maxLength="10" [error]="error()" [(value)]="value" />`,
})
class Host {
  value = signal('abc');
  error = signal<string | null>(null);
}

describe('UiTextarea', () => {
  it('lie la valeur, affiche le compteur et relie le libellé', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    expect((el.querySelector('label') as HTMLLabelElement).htmlFor).toBe(textarea.id);
    expect(el.querySelector('.ui-field-message__counter')?.textContent).toContain('3 / 10');
    textarea.value = 'abcdef';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('abcdef');
    expect(el.querySelector('.ui-field-message__counter')?.textContent).toContain('6 / 10');
  });

  it('passe en état invalide avec un message d’erreur', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.error.set('Trop court');
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(textarea.getAttribute('aria-describedby') ?? '')?.textContent).toContain('Trop court');
  });
});
