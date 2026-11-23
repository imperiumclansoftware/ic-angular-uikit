import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiLoader } from './loader';
import { UiLoaderDefaults, provideUiLoader } from './loader-config';
import { UiButton } from '../button/button';

@Component({
  selector: 'ui-test-brand-loader',
  template: `<span class="brand">IC</span>`,
})
class BrandLoader {}

@Component({
  selector: 'ui-test-zone',
  imports: [UiLoader],
  providers: [provideUiLoader({ type: 'bars', label: 'Zone…' })],
  template: `<ui-loader id="zone" /><ui-loader id="zone-local" type="grid" />`,
})
class Zone {
  readonly defaults = inject(UiLoaderDefaults);
}

@Component({
  imports: [UiLoader, Zone, UiButton],
  template: `
    <ui-loader id="global" />
    <ui-loader id="local" type="dots" size="lg" label="Envoi…" />
    <ui-loader id="deco" decorative />
    <ui-loader id="brand" type="marque" />
    <ui-loader id="unknown" type="inexistant" />
    <ui-loader id="slow" [delay]="delay()" />
    <ui-test-zone />
    <button uiButton id="btn" loading>Envoyer</button>
  `,
})
class Host {
  delay = signal<number | undefined>(undefined);
}

describe('UiLoader', () => {
  async function setup(config = {}) {
    TestBed.configureTestingModule({ providers: [provideUiLoader({ type: 'ring', loaders: { marque: BrandLoader }, ...config })] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const q = (id: string) => el.querySelector(`#${id}`) as HTMLElement;
    return { fixture, el, q };
  }

  it('global → zone → local : le plus proche l’emporte', async () => {
    const { q } = await setup();
    expect(q('global').className).toContain('ui-loader--ring');
    expect(q('local').className).toContain('ui-loader--dots');
    expect(q('local').querySelectorAll('.ui-loader__part')).toHaveLength(3);
    expect(q('local').style.getPropertyValue('--ui-loader-size')).toBe('3rem');
    expect(q('zone').className).toContain('ui-loader--bars');
    expect(q('zone').textContent?.trim()).toBe('Zone…');
    expect(q('zone-local').className).toContain('ui-loader--grid');
    expect(q('zone-local').querySelectorAll('.ui-loader__part')).toHaveLength(9);
  });

  it('accessibilité : role=status + texte, ou décoratif', async () => {
    const { q } = await setup();
    expect(q('global').getAttribute('role')).toBe('status');
    expect(q('global').textContent?.trim()).toBe('Chargement…');
    expect(q('local').textContent?.trim()).toBe('Envoi…');
    expect(q('deco').getAttribute('role')).toBeNull();
    expect(q('deco').getAttribute('aria-hidden')).toBe('true');
    expect(q('deco').textContent?.trim()).toBe('');
  });

  it('loader personnalisé enregistré, type inconnu → spinner (avertissement émis une fois)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { q } = await setup();
    expect(q('brand').querySelector('.brand')?.textContent).toBe('IC');
    expect(q('brand').className).toContain('ui-loader--custom');
    expect(q('unknown').className).toContain('ui-loader--spinner');
    warn.mockRestore();
  });

  it('changement à l’exécution, global et zone ; reset revient au parent', async () => {
    const { fixture, q } = await setup();
    TestBed.inject(UiLoaderDefaults).set({ type: 'pulse', speed: 2 });
    fixture.detectChanges();
    expect(q('global').className).toContain('ui-loader--pulse');
    expect(q('global').style.getPropertyValue('--ui-loader-duration-scale')).toBe('0.5');
    expect(q('zone').className).toContain('ui-loader--bars'); // la zone garde son choix
    const zone = fixture.debugElement.query((d) => d.name === 'ui-test-zone').componentInstance as Zone;
    zone.defaults.reset();
    fixture.detectChanges();
    expect(q('zone').className).toContain('ui-loader--pulse'); // hérite du global
    expect(q('zone').textContent?.trim()).toBe('Chargement…');
  });

  it('délai d’apparition', async () => {
    vi.useFakeTimers();
    try {
      TestBed.configureTestingModule({ providers: [provideUiLoader({ delay: 200 })] });
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      const slow = fixture.nativeElement.querySelector('#slow') as HTMLElement;
      expect(slow.className).toContain('ui-loader--hidden');
      expect(slow.textContent?.trim()).toBe('');
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      expect(slow.className).not.toContain('ui-loader--hidden');
      expect(slow.textContent?.trim()).toBe('Chargement…');
    } finally {
      vi.useRealTimers();
    }
  });

  it('le bouton suit le loader global, sauf line / skeleton remplacés par spinner', async () => {
    const { q } = await setup();
    const loader = q('btn').querySelector('ui-loader') as HTMLElement;
    expect(loader.className).toContain('ui-loader--ring');
    expect(loader.getAttribute('aria-hidden')).toBe('true');
    expect(q('btn').getAttribute('aria-busy')).toBe('true');
    TestBed.resetTestingModule();
    const second = await setup({ type: 'skeleton' });
    expect((second.q('btn').querySelector('ui-loader') as HTMLElement).className).toContain('ui-loader--spinner');
  });
});
