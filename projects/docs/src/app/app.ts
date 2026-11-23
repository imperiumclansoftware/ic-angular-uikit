import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService, UiSeasonEffects, UiTextField } from 'ic-angular-uikit';
import { highlightParts } from './shared/highlight-text';
import { NAV_SECTIONS, NavItem, normalize } from './shared/nav';

@Component({
  selector: 'doc-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTextField, UiSeasonEffects],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
})
export class App {
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly query = signal('');
  private readonly searchField = viewChild.required(UiTextField);
  protected readonly themeOptions = [
    { value: 'light', label: 'Light', icon: 'M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' },
    { value: 'dark', label: 'Dark', icon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z' },
    { value: 'system', label: 'Système', icon: 'M3 5h18v11H3zM8 20h8M12 16v4' },
    {
      value: 'season-light',
      label: 'Saison (clair)',
      icon: 'M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z',
    },
    {
      value: 'season-dark',
      label: 'Saison (sombre)',
      icon: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6',
    },
    { value: 'imperium-dark', label: 'Imperium', icon: 'M2 18h20M4 18 2.5 7l5.5 4.5L12 4l4 7.5L21.5 7 20 18' },
  ];

  /** Sections filtrées : un élément est gardé si tous les mots de la recherche figurent dans ses mots-clés. */
  protected readonly sections = computed(() => {
    const words = normalize(this.query()).split(/\s+/).filter(Boolean);
    const matches = (item: NavItem) => {
      const haystack = normalize(item.keywords);
      return words.every((w) => haystack.includes(w));
    };
    return NAV_SECTIONS.map((section) => ({ ...section, items: words.length ? section.items.filter(matches) : section.items })).filter(
      (section) => section.items.length > 0,
    );
  });
  protected readonly resultCount = computed(() => this.sections().reduce((n, s) => n + s.items.length, 0));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.menuOpen.set(false);
      }
    });
  }

  /** Meilleur résultat pour Entrée : titre qui commence par la recherche, puis titre qui la contient, puis mots-clés. */
  private bestMatch(): NavItem | undefined {
    const q = normalize(this.query().trim());
    if (!q) return undefined;
    const items = this.sections().flatMap((section) => section.items);
    const score = (item: NavItem) => {
      const title = normalize(item.title);
      return title.startsWith(q) ? 0 : title.includes(q) ? 1 : 2;
    };
    return [...items].sort((a, b) => score(a) - score(b))[0];
  }

  protected parts(title: string) {
    return highlightParts(title, this.query());
  }

  protected sectionId(title: string): string {
    return 'nav-' + normalize(title).replace(/[^a-z0-9]+/g, '-');
  }

  /** Entrée : ouvre le premier résultat ; Échap : vide la recherche. */
  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const best = this.bestMatch();
      if (best) {
        event.preventDefault();
        void this.router.navigate(best.link);
      }
    } else if (event.key === 'Escape' && this.query()) {
      event.stopPropagation();
      this.query.set('');
    }
  }

  /** « / » donne le focus à la recherche (sauf pendant une saisie). */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
      return;
    }
    event.preventDefault();
    this.menuOpen.set(true);
    this.searchField().focus();
  }
}
