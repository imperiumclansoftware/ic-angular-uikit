import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiCheckbox } from './checkbox';

@Component({
  imports: [UiCheckbox, ReactiveFormsModule],
  template: `
    <ui-checkbox [(checked)]="checked" [(indeterminate)]="partial" (changed)="events.push($event)">Tout</ui-checkbox>
    <ui-checkbox [formControl]="control">Form</ui-checkbox>
  `,
})
class Host {
  checked = signal(false);
  partial = signal(true);
  events: boolean[] = [];
  control = new FormControl(false, { nonNullable: true });
}

describe('UiCheckbox', () => {
  it('reflète indeterminate puis le lève au clic', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.indeterminate).toBe(true);
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(fixture.componentInstance.partial()).toBe(false);
    expect(fixture.componentInstance.events).toEqual([true]);
  });

  it('se lie à un FormControl et suit son état désactivé', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelectorAll('input')[1];
    input.click();
    expect(fixture.componentInstance.control.value).toBe(true);
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });

  it('cliquer sur le libellé coche la case', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.ui-checkbox__label') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
  });
});
