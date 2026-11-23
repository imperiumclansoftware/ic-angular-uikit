import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiSwitch } from './switch';

@Component({
  imports: [UiSwitch, ReactiveFormsModule],
  template: `
    <ui-switch [(checked)]="on" (changed)="events.push($event)">Wi-Fi</ui-switch>
    <ui-switch [formControl]="control">Form</ui-switch>
  `,
})
class Host {
  on = signal(false);
  events: boolean[] = [];
  control = new FormControl(true, { nonNullable: true });
}

describe('UiSwitch', () => {
  it('bascule, met à jour le model et émet changed', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[role=switch]');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(fixture.componentInstance.events).toEqual([true]);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('fonctionne avec un FormControl, y compris désactivé', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button[role=switch]')[1];
    expect(button.getAttribute('aria-checked')).toBe('true');
    button.click();
    expect(fixture.componentInstance.control.value).toBe(false);
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });
});
