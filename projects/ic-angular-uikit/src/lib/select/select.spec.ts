import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiSelect, UiSelectOption } from './select';

interface Plan {
  id: number;
}

@Component({
  imports: [UiSelect, ReactiveFormsModule],
  template: `
    <ui-select label="Plan" [options]="options" [compareWith]="sameId" [(value)]="value" (selectionChange)="events.push($event)" />
    <ui-select label="Form" [options]="options" [formControl]="control" />
  `,
})
class Host {
  options: UiSelectOption<Plan>[] = [
    { value: { id: 1 }, label: 'Un' },
    { value: { id: 2 }, label: 'Deux', group: 'G' },
    { value: { id: 3 }, label: 'Trois', disabled: true },
  ];
  value = signal<Plan | null>({ id: 2 });
  events: (UiSelectOption<Plan> | null)[] = [];
  control = new FormControl<Plan | null>(null);
  sameId = (a: Plan | null, b: Plan | null) => a?.id === b?.id;
}

describe('UiSelect', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const selects: HTMLSelectElement[] = Array.from(fixture.nativeElement.querySelectorAll('select'));
    return { fixture, host: fixture.componentInstance, selects };
  }

  it('sélectionne l’option correspondant à la valeur via compareWith, avec optgroup', () => {
    const { selects } = setup();
    expect(selects[0].selectedOptions[0].textContent?.trim()).toBe('Deux');
    expect(selects[0].querySelector('optgroup')?.label).toBe('G');
    const trois = Array.from(selects[0].options).find((o) => o.textContent?.trim() === 'Trois');
    expect(trois?.disabled).toBe(true);
  });

  it('met à jour la valeur (objet) et émet selectionChange au choix de l’utilisateur', () => {
    const { fixture, host, selects } = setup();
    selects[0].value = '0';
    selects[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(host.value()).toEqual({ id: 1 });
    expect(host.events[0]?.label).toBe('Un');
  });

  it('fonctionne avec un FormControl', () => {
    const { fixture, host, selects } = setup();
    expect(selects[1].value).toBe('');
    host.control.setValue(host.options[1].value);
    fixture.detectChanges();
    expect(selects[1].selectedOptions[0].textContent?.trim()).toBe('Deux');
    selects[1].value = '0';
    selects[1].dispatchEvent(new Event('change'));
    expect(host.control.value).toEqual({ id: 1 });
  });
});
