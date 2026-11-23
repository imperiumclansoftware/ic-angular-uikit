import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton } from '../button/button';
import { UiIcon } from './icon';
import {
  UiFontAwesomeDefinition,
  UiSvgNode,
  bootstrapIcons,
  fontAwesomeFont,
  fontAwesomeSvg,
  lucideIcons,
  materialSymbols,
  provideUiIcons,
  svgIcons,
} from './icon-sets';

const faHouse: UiFontAwesomeDefinition = { iconName: 'house', icon: [512, 512, [], 'f015', 'M1 1h510v510H1Z'] };
const Search: readonly (readonly [string, Record<string, string>])[] = [['circle', { cx: '11', cy: '11', r: '8' }], ['path', { d: 'm21 21-4.3-4.3' }]];
const evil: UiSvgNode[] = [
  ['script', { src: 'x.js' }],
  ['path', { d: 'M0 0h1', onload: 'alert(1)', style: 'x' } as Record<string, string>],
];

@Component({
  imports: [UiIcon, UiButton],
  providers: [
    provideUiIcons(
      [fontAwesomeFont(), materialSymbols(), bootstrapIcons(), lucideIcons({ Search, ArrowRight2: Search }), fontAwesomeSvg([faHouse], 'fasvg'), svgIcons({ logo: 'M12 2 2 22h20Z', evil: { viewBox: '0 0 1 1', nodes: evil } }, 'app')],
      { defaultSet: 'lucide' },
    ),
  ],
  template: `
    <ui-icon id="fa" name="fab:github" />
    <ui-icon id="mat" name="material:home" size="2x" />
    <ui-icon id="bi" name="bi:house" />
    <ui-icon id="lucide" name="lucide:search" label="Rechercher" />
    <ui-icon id="default" name="search" />
    <ui-icon id="kebab" name="lucide:arrow-right-2" />
    <ui-icon id="fasvg" name="fasvg:house" size="24px" />
    <ui-icon id="custom" name="app:logo" />
    <ui-icon id="evil" name="app:evil" />
    <ui-icon id="missing" name="nope:x" />
    <button uiButton id="btn" icon="fa:plus" iconEnd="lucide:search">Ajouter</button>
  `,
})
class Host {}

describe('UiIcon', () => {
  function setup() {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return { el, q: (id: string) => el.querySelector(`#${id}`) as HTMLElement, warn };
  }

  it('rend les polices à classes (Font Awesome, Bootstrap Icons)', () => {
    const { q } = setup();
    expect(q('fa').querySelector('i')?.className).toContain('fa-brands fa-github');
    expect(q('bi').querySelector('i')?.className).toContain('bi bi-house');
  });

  it('rend les polices à ligatures (Material Symbols) et applique la taille', () => {
    const { q } = setup();
    const i = q('mat').querySelector('i') as HTMLElement;
    expect(i.className).toContain('material-symbols-outlined');
    expect(i.textContent?.trim()).toBe('home');
    expect(q('mat').style.fontSize).toBe('2em');
  });

  it('rend les SVG Lucide et Font Awesome, y compris via le jeu par défaut et en kebab-case', () => {
    const { q } = setup();
    expect(q('lucide').querySelectorAll('svg circle, svg path').length).toBe(2);
    expect(q('lucide').querySelector('svg')?.getAttribute('stroke')).toBe('currentColor');
    expect(q('default').querySelector('svg circle')).not.toBeNull();
    expect(q('kebab').querySelector('svg circle')).not.toBeNull();
    expect(q('fasvg').querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(q('fasvg').querySelector('path')?.getAttribute('d')).toBe('M1 1h510v510H1Z');
    expect(q('custom').querySelector('path')?.getAttribute('d')).toBe('M12 2 2 22h20Z');
  });

  it('ignore les balises et attributs non autorisés', () => {
    const { q } = setup();
    const svg = q('evil').querySelector('svg') as SVGElement;
    expect(svg.querySelector('script')).toBeNull();
    const path = svg.querySelector('path') as SVGPathElement;
    expect(path.getAttribute('d')).toBe('M0 0h1');
    expect(path.hasAttribute('onload')).toBe(false);
    expect(path.hasAttribute('style')).toBe(false);
  });

  it('est décorative par défaut et devient une image nommée avec label', () => {
    const { q } = setup();
    expect(q('fa').getAttribute('aria-hidden')).toBe('true');
    expect(q('lucide').getAttribute('role')).toBe('img');
    expect(q('lucide').getAttribute('aria-label')).toBe('Rechercher');
    expect(q('lucide').hasAttribute('aria-hidden')).toBe(false);
  });

  it('signale une icône introuvable', () => {
    const { q, warn } = setup();
    expect(q('missing').querySelector('.ui-icon__missing')).not.toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('les raccourcis icon / iconEnd du bouton rendent les icônes autour du libellé', () => {
    const { q } = setup();
    const icons = q('btn').querySelectorAll('ui-icon');
    expect(icons.length).toBe(2);
    expect(icons[0].querySelector('i')?.className).toContain('fa-plus');
    expect(icons[1].querySelector('svg')).not.toBeNull();
  });
});
