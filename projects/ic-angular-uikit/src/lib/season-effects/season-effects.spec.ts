import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { ThemeService, provideUiKit } from '../core/theme';
import { UiSeason } from '../core/season';
import { UiSeasonEffects } from './season-effects';

@Component({
  imports: [UiSeasonEffects],
  template: `<ui-season-effects [season]="season()" intensity="low" />`,
})
class Host {
  season = signal<UiSeason | undefined>(undefined);
}

describe('Thèmes saisonniers', () => {
  beforeEach(() => window.localStorage.clear());

  function setup() {
    TestBed.configureTestingModule({ providers: [provideUiKit({ defaultTheme: 'light', storageKey: 'test', seasonEffects: true })] });
    const fixture = TestBed.createComponent(Host);
    const theme = TestBed.inject(ThemeService);
    const html = TestBed.inject(DOCUMENT).documentElement;
    fixture.detectChanges();
    return { fixture, theme, html, el: fixture.nativeElement as HTMLElement };
  }

  it('season-light pose data-ui-season ; un thème classique le retire', () => {
    const { fixture, theme, html } = setup();
    theme.setTheme('season-light');
    theme.previewSeason('spring');
    fixture.detectChanges();
    TestBed.tick();
    expect(html.getAttribute('data-ui-theme')).toBe('season-light');
    expect(html.getAttribute('data-ui-season')).toBe('spring');
    theme.setTheme('dark');
    TestBed.tick();
    expect(html.hasAttribute('data-ui-season')).toBe(false);
  });

  it('toggle() reste saisonnier et isDark suit season-dark', () => {
    const { theme } = setup();
    theme.setTheme('season-light');
    theme.toggle();
    expect(theme.preference()).toBe('season-dark');
    expect(theme.isDark()).toBe(true);
  });

  it('n’affiche rien hors thème saisonnier, puis le décor de la saison', () => {
    const { fixture, theme, el } = setup();
    expect(el.querySelector('.fx')).toBeNull();
    expect(el.querySelector('.fx-control')).toBeNull();
    theme.setTheme('season-light');
    theme.previewSeason('winter');
    fixture.detectChanges();
    expect(el.querySelectorAll('.flake').length).toBe(14);
    expect(el.querySelector('.fx')?.getAttribute('aria-hidden')).toBe('true');
    fixture.componentInstance.season.set('summer');
    fixture.detectChanges();
    expect(el.querySelector('.sun')).not.toBeNull();
    fixture.componentInstance.season.set('spring');
    fixture.detectChanges();
    expect(el.querySelectorAll('.flower').length).toBeGreaterThan(0);
    fixture.componentInstance.season.set('autumn');
    fixture.detectChanges();
    expect(el.querySelectorAll('.leaf').length).toBe(14);
  });

  it('le bouton met en pause (aria-pressed) et le choix est mémorisé', () => {
    const { fixture, theme, el } = setup();
    theme.setTheme('season-dark');
    fixture.detectChanges();
    const button = el.querySelector('.fx-control') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    fixture.detectChanges();
    expect(el.querySelector('.fx')).toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(window.localStorage.getItem('test-effects')).toBe('off');
  });
});
