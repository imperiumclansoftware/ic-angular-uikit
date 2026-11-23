import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiArabesqueFrame } from './arabesque-frame/arabesque-frame';
import { UiBannerHeader } from './banner-header/banner-header';
import { UiBranchBadge } from './branch-badge/branch-badge';
import { UI_IMPERIUM_BRANCHES } from './branch-badge/branches';
import { UiEventCard } from './event-card/event-card';
import { UiFeedPost, relativeTimeFr } from './feed-post/feed-post';
import { UiFramedAvatar } from './member-card/framed-avatar';
import { UiMemberCard } from './member-card/member-card';
import { UiSectionDivider } from './section-divider/section-divider';
import { UiStatBlock } from './stat-block/stat-block';
import { ThemeService, provideUiKit } from '../core/theme';

const NOW = new Date(2026, 10, 23, 16, 0);

@Component({
  imports: [UiBranchBadge, UiArabesqueFrame, UiSectionDivider, UiBannerHeader, UiMemberCard, UiFramedAvatar, UiEventCard, UiFeedPost, UiStatBlock],
  template: `
    <ui-branch-badge id="b-full" branch="developpeurs" />
    <ui-branch-badge id="b-icon" branch="cine" display="icon" />
    <ui-arabesque-frame id="f-std" heading="Chroniques" [headingLevel]="3">x</ui-arabesque-frame>
    <ui-arabesque-frame id="f-branch" variant="joueurs" ornament="none">y</ui-arabesque-frame>
    <ui-section-divider id="d-sep" />
    <ui-section-divider id="d-head" label="Hauts faits" [headingLevel]="3" />
    <ui-banner-header id="banner" heading="Imperium Clan" motto="Façonner la légende" image="/fond.jpg" />
    <ui-member-card id="m" pseudo="Valkyrie" role="Officière" [branches]="['joueurs', 'cine']" presence="busy" href="/membres/valkyrie" />
    <ui-framed-avatar id="a" name="Byte Forge" src="/absent.png" />
    <ui-event-card id="e-live" heading="Marathon" start="2026-11-23T14:00" end="2026-11-23T23:00" [now]="now" [attendees]="9" [capacity]="20" />
    <ui-event-card id="e-up" heading="Tournoi" start="2026-12-05T20:00" [now]="now" />
    <ui-event-card id="e-past" heading="Hackathon" start="2026-11-08T10:00" [now]="now" />
    <ui-event-card id="e-cancel" heading="Live" start="2026-12-12T19:00" status="cancelled" [now]="now" />
    <ui-feed-post id="p" author="Aurelius" [date]="date()" [now]="now" heading="Saison d'hiver" kind="announcement" pinned />
    <ui-stat-block id="s-up" label="Membres" [value]="1342" [trend]="12" trendPeriod="sur 30 jours" />
    <ui-stat-block id="s-inv" label="Build" [value]="3.8" [decimals]="1" unit="min" [trend]="-18" inverse />
  `,
})
class Host {
  now = NOW;
  date = signal(new Date(NOW.getTime() - 3 * 3600_000));
}

describe('Imperium', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const q = (sel: string) => el.querySelector(sel) as HTMLElement;
    const text = (sel: string) => q(sel).textContent?.replace(/\s+/g, ' ').trim();
    return { fixture, el, q, text };
  }

  it('branches : 4 branches ; badge avec libellé, ou icône seule nommée', async () => {
    const { q, text } = await setup();
    expect(UI_IMPERIUM_BRANCHES.map((b) => b.id)).toEqual(['joueurs', 'developpeurs', 'communicants', 'cine']);
    expect(text('#b-full')).toBe('Développeurs');
    expect(q('#b-full').getAttribute('role')).toBeNull();
    expect(q('#b-icon').getAttribute('role')).toBe('img');
    expect(q('#b-icon').getAttribute('aria-label')).toBe('Branche Ciné & séries');
    expect(q('#b-icon').style.getPropertyValue('--_c')).toBe('var(--ui-branch-cine)');
  });

  it('cadre, séparateur, bannière : ornements décoratifs et titres structurés', async () => {
    const { q, text } = await setup();
    expect(q('#f-std').querySelectorAll('ui-ornament.ui-arabesque-frame__corner')).toHaveLength(4);
    expect(q('#f-std').querySelector('[role="heading"]')?.getAttribute('aria-level')).toBe('3');
    expect([...q('#f-std').querySelectorAll('ui-ornament')].every((o) => o.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(q('#f-branch').querySelectorAll('ui-ornament')).toHaveLength(0);
    expect(q('#f-branch').style.getPropertyValue('--_c')).toBe('var(--ui-branch-joueurs)');
    expect(q('#d-sep').getAttribute('role')).toBe('separator');
    expect(q('#d-head').getAttribute('role')).toBe('heading');
    expect(q('#d-head').getAttribute('aria-level')).toBe('3');
    expect(text('#d-head')).toBe('Hauts faits');
    expect(q('#banner').querySelector('[role="heading"]')?.getAttribute('aria-level')).toBe('1');
    expect(q('#banner').querySelector('img')?.getAttribute('alt')).toBe('');
    expect(text('#banner .ui-banner-header__motto')).toBe('« Façonner la légende »');
  });

  it('carte membre : plusieurs branches, présence en texte, lien de profil', async () => {
    const { q, text } = await setup();
    expect([...q('#m').querySelectorAll('ui-branch-badge')].map((b) => b.textContent?.trim())).toEqual(['Joueurs', 'Ciné']);
    expect(text('#m .ui-member-card__presence')).toBe('Occupé');
    expect(q('#m').querySelector('a')?.getAttribute('href')).toBe('/membres/valkyrie');
    expect(q('#m').querySelector('ui-framed-avatar')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('avatar : initiales si l’image échoue', async () => {
    const { fixture, q } = await setup();
    expect(q('#a img')).not.toBeNull();
    q('#a img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(q('#a img')).toBeNull();
    expect(q('#a').textContent?.trim()).toBe('BF');
  });

  it('événements : statut calculé ou forcé, date en toutes lettres, places', async () => {
    const { text } = await setup();
    expect(text('#e-live .ui-event-card__status')).toBe('En cours');
    expect(text('#e-up .ui-event-card__status')).toBe('À venir');
    expect(text('#e-past .ui-event-card__status')).toBe('Terminé');
    expect(text('#e-cancel .ui-event-card__status')).toBe('Annulé');
    expect(text('#e-live .ui-event-card__meta')).toContain('lundi 23 novembre 2026, 14:00 – 23:00');
    expect(text('#e-live .ui-event-card__meta')).toContain('9 / 20');
  });

  it('publication : date relative avec datetime, étiquette, durées en français', async () => {
    const { q, text } = await setup();
    const time = q('#p time');
    expect(time.textContent?.trim()).toBe('il y a 3 heures');
    expect(time.getAttribute('datetime')).toBe(new Date(NOW.getTime() - 3 * 3600_000).toISOString());
    expect(text('#p .ui-feed-post__tag')).toBe('Épinglée');
    expect(relativeTimeFr(new Date(NOW.getTime() - 26 * 3600_000), NOW)).toBe('hier');
    expect(relativeTimeFr(new Date(NOW.getTime() - 20_000), NOW)).toBe('à l’instant');
  });

  it('indicateurs : nombres à la française, tendance en texte et phrase accessible', async () => {
    const { text } = await setup();
    expect(text('#s-up .ui-stat-block__value')).toBe('1 342');
    expect(text('#s-up .ui-stat-block__sr')).toBe('en hausse de 12 % sur 30 jours');
    expect(text('#s-inv .ui-stat-block__value')).toBe('3,8 min');
    expect(document.querySelector('#s-inv .ui-stat-block__trend')?.className).toContain('--good');
    expect(text('#s-inv .ui-stat-block__sr')).toBe('en baisse de 18 %');
  });

  it('thème imperium-dark : proposé et reconnu comme sombre', () => {
    TestBed.configureTestingModule({ providers: [provideUiKit({ storageKey: null, defaultTheme: 'imperium-dark' })] });
    const theme = TestBed.inject(ThemeService);
    expect(theme.themes).toContain('imperium-dark');
    expect(theme.isDark()).toBe(true);
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-ui-theme')).toBe('imperium-dark');
  });
});
