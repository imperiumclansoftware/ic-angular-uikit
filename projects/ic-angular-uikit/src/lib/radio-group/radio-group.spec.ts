import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiRadio, UiRadioGroup } from './radio-group';

@Component({
  imports: [UiRadioGroup, UiRadio, ReactiveFormsModule],
  template: `
    <ui-radio-group label="Livraison" [(value)]="value" (selectionChange)="events.push($event)">
      <ui-radio value="a">A</ui-radio>
      <ui-radio value="b">B</ui-radio>
      <ui-radio value="c" disabled>C</ui-radio>
    </ui-radio-group>
    <ui-radio-group label="Form" [formControl]="control">
      <ui-radio [value]="1">Un</ui-radio>
      <ui-radio [value]="2">Deux</ui-radio>
    </ui-radio-group>
  `,
})
class Host {
  value = signal<string | null>('a');
  events: string[] = [];
  control = new FormControl<number | null>(2);
}

describe('UiRadioGroup', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const radios: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input[type=radio]'));
    return { fixture, host: fixture.componentInstance, radios };
  }

  it('rend un fieldset avec légende et un nom partagé', () => {
    const { fixture, radios } = setup();
    expect(fixture.nativeElement.querySelector('legend').textContent.trim()).toBe('Livraison');
    expect(radios[0].name).toBeTruthy();
    expect(radios[0].name).toBe(radios[1].name);
    expect(radios[0].name).not.toBe(radios[3].name);
    expect(radios[0].checked).toBe(true);
    expect(radios[2].disabled).toBe(true);
  });

  it('met à jour la valeur et émet selectionChange', () => {
    const { fixture, host, radios } = setup();
    radios[1].click();
    fixture.detectChanges();
    expect(host.value()).toBe('b');
    expect(host.events).toEqual(['b']);
  });

  it('fonctionne avec un FormControl (valeurs non textuelles)', () => {
    const { fixture, host, radios } = setup();
    expect(radios[4].checked).toBe(true);
    radios[3].click();
    expect(host.control.value).toBe(1);
    host.control.disable();
    fixture.detectChanges();
    expect(radios[3].disabled || (radios[3].closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
  });
});
