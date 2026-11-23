import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiCarousel, UiCarouselChange, UiCarouselSlide } from './carousel';

@Component({
  imports: [UiCarousel, UiCarouselSlide],
  template: `
    <ui-carousel ariaLabel="À la une" [loop]="loop()" [autoplay]="autoplay()" [(index)]="index" (slideChange)="changes.push($event)">
      <ui-carousel-slide label="Un"><button id="b0">Un</button></ui-carousel-slide>
      <ui-carousel-slide><button id="b1">Deux</button></ui-carousel-slide>
      <ui-carousel-slide><button id="b2">Trois</button></ui-carousel-slide>
    </ui-carousel>
  `,
})
class Host {
  loop = signal(false);
  autoplay = signal(0);
  index = signal(0);
  changes: UiCarouselChange[] = [];
}

describe('UiCarousel', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const $ = (s: string) => el.querySelector(s) as HTMLElement;
    const slides = () => Array.from(el.querySelectorAll<HTMLElement>('ui-carousel-slide'));
    const click = (s: string) => {
      $(s).click();
      fixture.detectChanges();
    };
    return { fixture, el, host: fixture.componentInstance, $, slides, click };
  }

  afterEach(() => vi.useRealTimers());

  it('rôles et noms : région « carrousel », diapositives « n sur N »', () => {
    const { $, slides } = setup();
    expect($('ui-carousel').getAttribute('role')).toBe('region');
    expect($('ui-carousel').getAttribute('aria-roledescription')).toBe('carrousel');
    expect($('ui-carousel').getAttribute('aria-label')).toBe('À la une');
    expect(slides().map((s) => s.getAttribute('aria-label'))).toEqual(['Un — 1 sur 3', '2 sur 3', '3 sur 3']);
    expect(slides()[0].getAttribute('aria-roledescription')).toBe('diapositive');
  });

  it('seule la diapositive visible est active (les autres sont inertes)', () => {
    const { fixture, host, slides } = setup();
    expect(slides().map((s) => s.hasAttribute('inert'))).toEqual([false, true, true]);
    host.index.set(2);
    fixture.detectChanges();
    expect(slides().map((s) => s.hasAttribute('inert'))).toEqual([true, true, false]);
  });

  it('flèches et pastilles ; bornes sans loop (aria-disabled), bouclage avec loop', () => {
    const { fixture, host, $, click, el } = setup();
    const previous = '.ui-carousel__arrow--previous';
    const next = '.ui-carousel__arrow--next';
    expect($(previous).getAttribute('aria-disabled')).toBe('true');
    click(next);
    expect(host.index()).toBe(1);
    expect(host.changes.at(-1)).toEqual({ index: 1, previousIndex: 0, source: 'user' });
    click(next);
    click(next);
    expect(host.index()).toBe(2);
    expect($(next).getAttribute('aria-disabled')).toBe('true');

    const dots = el.querySelectorAll<HTMLElement>('.ui-carousel__dot');
    expect(dots.length).toBe(3);
    expect(dots[2].getAttribute('aria-current')).toBe('true');
    dots[0].click();
    fixture.detectChanges();
    expect(host.index()).toBe(0);
    expect($('.ui-carousel__status').textContent).toContain('Diapositive 1 sur 3 : Un');

    host.loop.set(true);
    fixture.detectChanges();
    click(previous);
    expect(host.index()).toBe(2);
  });

  it('clavier sur la zone des diapositives', () => {
    const { fixture, host, $ } = setup();
    const key = (k: string) => {
      $('.ui-carousel__track').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      fixture.detectChanges();
    };
    key('ArrowRight');
    expect(host.index()).toBe(1);
    key('End');
    expect(host.index()).toBe(2);
    key('ArrowLeft');
    expect(host.index()).toBe(1);
    key('Home');
    expect(host.index()).toBe(0);
  });

  it('défilement automatique : avance, boucle, pause au survol, arrêt au focus, bouton Pause / Lecture', () => {
    vi.useFakeTimers();
    const { fixture, host, $, click } = setup();
    host.autoplay.set(5000);
    fixture.detectChanges();
    expect($('.ui-carousel__play').textContent).toContain('Pause');
    expect($('.ui-carousel__status').textContent).toBe('');

    vi.advanceTimersByTime(5000);
    fixture.detectChanges();
    expect(host.index()).toBe(1);
    expect(host.changes.at(-1)?.source).toBe('autoplay');
    vi.advanceTimersByTime(10000);
    fixture.detectChanges();
    expect(host.index()).toBe(0);

    $('ui-carousel').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    vi.advanceTimersByTime(10000);
    expect(host.index()).toBe(0);
    $('ui-carousel').dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    click('.ui-carousel__play');
    expect($('.ui-carousel__play').textContent).toContain('Lecture');
    vi.advanceTimersByTime(10000);
    expect(host.index()).toBe(0);
    click('.ui-carousel__play');

    $('#b0').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    expect($('.ui-carousel__play').textContent).toContain('Lecture');
    vi.advanceTimersByTime(10000);
    expect(host.index()).toBe(0);
  });
});
