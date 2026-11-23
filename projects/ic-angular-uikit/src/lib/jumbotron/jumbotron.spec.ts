import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiJumbotron, UiJumbotronBackground, UiJumbotronMedia, UiJumbotronTitle } from './jumbotron';

@Component({
  imports: [UiJumbotron, UiJumbotronBackground, UiJumbotronMedia, UiJumbotronTitle],
  template: `
    <ui-jumbotron id="simple" heading="Bienvenue" lead="Intro" eyebrow="Nouveau" [headingLevel]="level()" [tone]="'primary'" />
    <ui-jumbotron id="rich" [overlay]="overlay()">
      <img uiJumbotronBackground src="x.svg" alt="" />
      <h2 uiJumbotronTitle>Titre <em>riche</em></h2>
    </ui-jumbotron>
    <ui-jumbotron id="split" heading="Côte à côte" [landmark]="false">
      <img uiJumbotronMedia src="y.svg" alt="Aperçu" />
    </ui-jumbotron>
  `,
})
class Host {
  level = signal(1);
  overlay = signal(0.55);
}

describe('UiJumbotron', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, host: fixture.componentInstance, $: (s: string) => el.querySelector(s) as HTMLElement };
  }

  it('titre au niveau demandé, qui nomme la région', () => {
    const { fixture, host, $ } = setup();
    const heading = $('#simple h1');
    expect(heading.textContent?.trim()).toBe('Bienvenue');
    expect($('#simple').getAttribute('role')).toBe('region');
    expect($('#simple').getAttribute('aria-labelledby')).toBe(heading.id);
    expect($('#simple .ui-jumbotron__eyebrow').textContent).toBe('Nouveau');
    expect($('#simple .ui-jumbotron__lead').textContent).toBe('Intro');
    expect($('#simple').classList).toContain('ui-jumbotron--on-color');

    host.level.set(3);
    fixture.detectChanges();
    expect($('#simple h1')).toBeNull();
    expect($('#simple h3').id).toBe($('#simple').getAttribute('aria-labelledby'));
  });

  it('titre riche et image de fond : voile, texte clair, opacité bornée', () => {
    const { fixture, host, $ } = setup();
    expect($('#rich').getAttribute('aria-labelledby')).toBe($('#rich h2').id);
    expect($('#rich .ui-jumbotron__overlay')).not.toBeNull();
    expect($('#rich').classList).toContain('ui-jumbotron--image');
    expect($('#rich').classList).toContain('ui-jumbotron--on-color');
    expect($('#rich').style.getPropertyValue('--_overlay')).toBe('0.55');
    host.overlay.set(2);
    fixture.detectChanges();
    expect($('#rich').style.getPropertyValue('--_overlay')).toBe('0.9');
  });

  it('illustration à côté ; landmark désactivable', () => {
    const { $ } = setup();
    expect($('#split').classList).toContain('ui-jumbotron--split');
    expect($('#split').hasAttribute('role')).toBe(false);
    expect($('#split').hasAttribute('aria-labelledby')).toBe(false);
    expect($('#split h1')).not.toBeNull();
  });
});
