import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiMediaHub } from './media-hub';
import { UiMediaPlayer } from './media-player';
import { formatMediaTime, mediaEmbedUrl, resolveMediaSource, speakMediaTime, UiMediaSource } from './media-source';
import { UiMiniPlayer } from './mini-player';

describe('media-source', () => {
  it('reconnaît YouTube, Vimeo et les fichiers', () => {
    for (const src of [
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      'https://youtu.be/aqz-KE-bpKQ',
      'https://youtube.com/shorts/aqz-KE-bpKQ',
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
      'https://m.youtube.com/watch?v=aqz-KE-bpKQ&t=1m30s',
    ]) {
      expect(resolveMediaSource({ src })).toMatchObject({ provider: 'youtube', kind: 'video', id: 'aqz-KE-bpKQ' });
    }
    expect(resolveMediaSource({ src: 'https://youtu.be/aqz-KE-bpKQ?t=90' }).start).toBe(90);
    expect(resolveMediaSource({ src: 'https://m.youtube.com/watch?v=aqz-KE-bpKQ&t=1m30s' }).start).toBe(90);
    expect(resolveMediaSource({ src: 'https://vimeo.com/76979871' })).toMatchObject({ provider: 'vimeo', id: '76979871' });
    expect(resolveMediaSource({ src: 'musique/titre.mp3' })).toEqual({ provider: 'file', kind: 'audio' });
    expect(resolveMediaSource({ src: 'https://cdn.fr/a.ogg?token=1' }).kind).toBe('audio');
    expect(resolveMediaSource({ src: 'film.mp4' })).toEqual({ provider: 'file', kind: 'video' });
    expect(resolveMediaSource({ src: 'flux', type: 'audio' }).kind).toBe('audio');
    // Identifiant invalide : traité comme un fichier, jamais intégré.
    expect(resolveMediaSource({ src: 'https://youtube.com/watch?v=<script>' }).provider).toBe('file');
  });

  it('URL du lecteur intégré construite depuis l’identifiant validé', () => {
    const yt = resolveMediaSource({ src: 'https://youtu.be/aqz-KE-bpKQ?t=10' });
    const url = new URL(mediaEmbedUrl(yt, { autoplay: true, origin: 'https://site.fr' }) as string);
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/aqz-KE-bpKQ');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ enablejsapi: '1', autoplay: '1', origin: 'https://site.fr', start: '10' });
    expect(mediaEmbedUrl(resolveMediaSource({ src: 'https://vimeo.com/76979871' }))).toBe(
      'https://player.vimeo.com/video/76979871?dnt=1&api=1&title=0&byline=0',
    );
    expect(mediaEmbedUrl({ provider: 'youtube', kind: 'video', id: '../../evil' })).toBeNull();
    expect(mediaEmbedUrl(resolveMediaSource({ src: 'a.mp3' }))).toBeNull();
  });

  it('formats de durée', () => {
    expect(formatMediaTime(65)).toBe('1:05');
    expect(formatMediaTime(3729)).toBe('1:02:09');
    expect(formatMediaTime(Number.NaN)).toBe('--:--');
    expect(speakMediaTime(65)).toBe('1 minute 5 secondes');
    expect(speakMediaTime(Infinity)).toBe('durée inconnue');
  });
});

const TRACKS: UiMediaSource[] = [
  { src: 'a.mp3', title: 'Un', artist: 'Ada' },
  { src: 'b.mp3', title: 'Deux' },
  { src: 'https://youtu.be/aqz-KE-bpKQ', title: 'Vidéo' },
];

@Component({
  imports: [UiMediaPlayer, UiMiniPlayer],
  template: `
    <ui-media-player id="player" [sources]="tracks" [(index)]="index" visualization="none" />
    <ui-mini-player id="mini" />
  `,
})
class Host {
  tracks = TRACKS;
  index = signal(0);
}

describe('UiMediaPlayer / UiMiniPlayer', () => {
  async function setup() {
    // jsdom ne lit pas les médias : play / pause simulés par les événements de l'élément.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'));
    });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const player = fixture.debugElement.query((d) => d.name === 'ui-media-player').componentInstance as UiMediaPlayer;
    const render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, host: fixture.componentInstance, player, render, $: (s: string) => el.querySelector(s) as HTMLElement };
  }

  afterEach(() => vi.restoreAllMocks());

  it('région nommée, liste de lecture, commandes accessibles', async () => {
    const { el, $ } = await setup();
    expect($('#player').getAttribute('role')).toBe('region');
    expect($('#player').getAttribute('aria-label')).toBe('Lecteur : Un');
    expect($('#player video')?.getAttribute('src')).toBe('a.mp3');
    expect($('#player').classList).toContain('ui-media-player--audio');
    expect(el.querySelectorAll('.ui-mp__track').length).toBe(3);
    expect($('.ui-mp__track[aria-current="true"]').textContent).toContain('Un');
    expect($('.ui-mp__play').getAttribute('aria-label')).toBe('Lecture');
    expect($('.ui-mp__seek').getAttribute('aria-label')).toBe('Position');
    expect($('.ui-mp__track-badge').textContent).toBe('YouTube');
  });

  it('lecture, pause, piste suivante ; mini-lecteur synchronisé', async () => {
    const { player, host, render, $ } = await setup();
    ($('.ui-mp__play') as HTMLButtonElement).click();
    await render();
    expect(player.playing()).toBe(true);
    expect($('.ui-mp__play').getAttribute('aria-label')).toBe('Pause');
    expect($('#mini').getAttribute('aria-label')).toBe('Lecture en cours : Un');
    expect($('#mini .ui-mini__play').getAttribute('aria-label')).toBe('Pause');

    ($('#mini .ui-mini__play') as HTMLButtonElement).click();
    await render();
    expect(player.playing()).toBe(false);

    player.next();
    await render();
    expect(host.index()).toBe(1);
    expect($('#player video')?.getAttribute('src')).toBe('b.mp3');
    expect($('#mini .ui-mini__title').textContent).toBe('Deux');
  });

  it('fin de média : passage au suivant ; clavier', async () => {
    const { player, host, render, $ } = await setup();
    const video = $('#player video') as HTMLVideoElement;
    video.dispatchEvent(new Event('ended'));
    await render();
    expect(host.index()).toBe(1);
    expect(player.playing()).toBe(true); // enchaînement automatique
    $('#player').dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true }));
    await render();
    expect(player.playing()).toBe(false);
    $('#player').dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    await render();
    expect(player.muted()).toBe(true);
    expect($('[aria-label="Rétablir le son"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('YouTube : rien n’est chargé avant le clic, puis iframe sur youtube-nocookie', async () => {
    const { player, render, $, el } = await setup();
    player.goTo(2, false);
    await render();
    expect($('#player').classList).toContain('ui-media-player--embed');
    expect(el.querySelector('iframe')).toBeNull();
    const consent = $('.ui-mp__consent-play');
    expect(consent.textContent).toContain('Lire la vidéo YouTube');
    (consent as HTMLButtonElement).click();
    await render();
    const frame = el.querySelector('iframe') as HTMLIFrameElement;
    expect(new URL(frame.getAttribute('src') as string).origin).toBe('https://www.youtube-nocookie.com');
    expect(frame.getAttribute('title')).toBe('Lecteur YouTube : Vidéo');
    expect(TestBed.inject(UiMediaHub).active()).toBe(player);
  });
});
