import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiCard, UiCardFooter, UiCardHeader, UiCardMedia } from './card';

@Component({
  imports: [UiCard, UiCardMedia, UiCardHeader, UiCardFooter],
  template: `
    <ui-card [orientation]="orientation()">
      <div uiCardMedia>media</div>
      <h3 uiCardHeader>Titre</h3>
      <p>Corps</p>
      <footer uiCardFooter>Actions</footer>
    </ui-card>
  `,
})
class Host {
  orientation = signal<'vertical' | 'horizontal'>('vertical');
}

describe('UiCard', () => {
  it('garde les zones dans l’ordre du source, dans un seul conteneur de mise en page', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const layout = fixture.nativeElement.querySelector('.ui-card__layout') as HTMLElement;
    expect(Array.from(layout.children).map((c) => c.className.split(' ')[0])).toEqual([
      'ui-card__media',
      'ui-card__header',
      'ui-card__body',
      'ui-card__footer',
    ]);
  });

  it('applique la classe de disposition horizontale', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('ui-card') as HTMLElement;
    expect(card.classList).not.toContain('ui-card--horizontal');
    fixture.componentInstance.orientation.set('horizontal');
    fixture.detectChanges();
    expect(card.classList).toContain('ui-card--horizontal');
    expect(card.classList).toContain('ui-card--elevated');
  });
});
