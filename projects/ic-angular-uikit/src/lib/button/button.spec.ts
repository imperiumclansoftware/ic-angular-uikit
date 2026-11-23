import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton, UiButtonVariant } from './button';

@Component({
  imports: [UiButton],
  template: `<button uiButton class="custom" [variant]="variant()">OK</button>`,
})
class Host {
  variant = signal<UiButtonVariant>('primary');
}

describe('UiButton', () => {
  it.each<UiButtonVariant>(['primary', 'secondary', 'outline', 'ghost', 'success', 'warning', 'danger'])(
    'applique la classe de la variante %s sans écraser les classes existantes',
    (variant) => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      expect(button.classList).toContain(`ui-button--${variant}`);
      expect(button.classList).toContain('ui-button');
      expect(button.classList).toContain('custom');
    },
  );
});
