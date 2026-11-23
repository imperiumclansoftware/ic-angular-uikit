import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { ThemeService, provideUiKit } from './theme';

describe('ThemeService', () => {
  beforeEach(() => window.localStorage.clear());

  function setup(config: Parameters<typeof provideUiKit>[0] = {}) {
    TestBed.configureTestingModule({ providers: [provideUiKit(config)] });
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return { service, html: TestBed.inject(DOCUMENT).documentElement };
  }

  it('applique le thème par défaut sur <html>', () => {
    const { service, html } = setup({ defaultTheme: 'dark' });
    expect(service.theme()).toBe('dark');
    expect(html.getAttribute('data-ui-theme')).toBe('dark');
  });

  it('résout « system » en light ou dark', () => {
    const { service } = setup({ defaultTheme: 'system' });
    expect(['light', 'dark']).toContain(service.theme());
  });

  it('bascule et mémorise la préférence', () => {
    const { service, html } = setup({ defaultTheme: 'light', storageKey: 'test-theme' });
    service.toggle();
    TestBed.tick();
    expect(html.getAttribute('data-ui-theme')).toBe('dark');
    expect(window.localStorage.getItem('test-theme')).toBe('dark');
  });

  it('ignore une valeur mémorisée inconnue', () => {
    window.localStorage.setItem('test-theme', '<script>');
    const { service } = setup({ defaultTheme: 'light', storageKey: 'test-theme' });
    expect(service.preference()).toBe('light');
  });

  it('ne persiste rien si storageKey vaut null', () => {
    const { service } = setup({ defaultTheme: 'light', storageKey: null });
    service.setTheme('dark');
    expect(window.localStorage.length).toBe(0);
  });
});
