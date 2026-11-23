import {
  DOCUMENT,
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
  DestroyRef,
} from '@angular/core';
import { UiSeason, seasonOf } from './season';

/**
 * Thèmes fournis par la librairie. `season-light` et `season-dark` changent de couleurs selon la saison
 * (date du jour). Un thème personnalisé peut être ajouté via `UiKitConfig.themes`.
 */
export type UiBuiltInTheme = 'light' | 'dark' | 'season-light' | 'season-dark';

/** Préférence de thème : un thème concret, ou `system` pour suivre `prefers-color-scheme`. */
export type UiThemePreference = string;

export interface UiKitConfig {
  /** Préférence appliquée quand aucune n'est mémorisée. Défaut : `system`. */
  defaultTheme?: UiThemePreference;
  /** Liste des thèmes disponibles (pour les sélecteurs). Défaut : `['light', 'dark']`. */
  themes?: readonly string[];
  /**
   * Clé localStorage où mémoriser la préférence (simple préférence d'affichage, jamais de donnée personnelle).
   * `null` désactive la persistance. Défaut : `ic-angular-uikit-theme`.
   */
  storageKey?: string | null;
  /** Hémisphère pour le calcul des saisons (thèmes `season-*`). Défaut : `north`. */
  hemisphere?: 'north' | 'south';
  /**
   * Animations saisonnières (neige, feuilles, soleil, fleurs) des thèmes `season-*` :
   * `auto` les active sauf si l'utilisateur a demandé moins d'animations (`prefers-reduced-motion`). Défaut : `auto`.
   */
  seasonEffects?: 'auto' | boolean;
}

export const UI_KIT_CONFIG = new InjectionToken<Required<UiKitConfig>>('UI_KIT_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    defaultTheme: 'system',
    themes: ['light', 'dark', 'season-light', 'season-dark'],
    storageKey: 'ic-angular-uikit-theme',
    hemisphere: 'north',
    seasonEffects: 'auto',
  }),
});

/**
 * Pilote le thème global de l'application : pose `data-ui-theme` sur `<html>`,
 * suit `prefers-color-scheme` en mode `system` et mémorise la préférence.
 *
 * Pour thémer seulement une zone, posez directement l'attribut `data-ui-theme="dark"` sur un élément.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(UI_KIT_CONFIG);
  private readonly window = this.document.defaultView;
  private readonly media = this.window?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  private readonly systemDark = signal(this.media?.matches ?? false);

  /** Thèmes disponibles (hors `system`). */
  readonly themes: readonly string[] = this.config.themes;

  /** Préférence courante (`light`, `dark`, `system` ou un thème personnalisé). */
  readonly preference = signal<UiThemePreference>(this.readStoredPreference() ?? this.config.defaultTheme);

  /** Thème réellement appliqué (jamais `system`). */
  readonly theme = computed(() => {
    const preference = this.preference();
    if (preference === 'system') {
      return this.systemDark() ? 'dark' : 'light';
    }
    return preference;
  });

  /** `true` si le thème appliqué est sombre (`dark`, `season-dark`, ou tout thème nommé `…-dark`). */
  readonly isDark = computed(() => this.theme() === 'dark' || this.theme().endsWith('-dark'));

  /** `true` si un thème saisonnier est appliqué. */
  readonly isSeasonal = computed(() => this.theme().startsWith('season-'));

  private readonly now = signal(new Date());
  private readonly seasonOverride = signal<UiSeason | null>(null);
  /** Saison courante (date du jour, ou saison forcée par `previewSeason()`). */
  readonly season = computed<UiSeason>(() => this.seasonOverride() ?? seasonOf(this.now(), this.config.hemisphere));

  private readonly reducedMotion = this.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /** Animations saisonnières actives (choix mémorisé ; par défaut, désactivées si l'utilisateur réduit les animations). */
  readonly seasonEffects = signal<boolean>(this.readStoredEffects() ?? (this.config.seasonEffects === 'auto' ? !this.reducedMotion : this.config.seasonEffects));

  constructor() {
    this.media?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => {
      const root = this.document.documentElement;
      root.setAttribute('data-ui-theme', this.theme());
      if (this.isSeasonal()) root.setAttribute('data-ui-season', this.season());
      else root.removeAttribute('data-ui-season');
    });
    // La saison peut changer pendant que l'application reste ouverte : on revérifie toutes les heures.
    const timer = this.window?.setInterval(() => this.now.set(new Date()), 60 * 60 * 1000);
    inject(DestroyRef).onDestroy(() => this.window?.clearInterval(timer));
  }

  /** Force une saison (démonstration, tests) ; `null` revient à la date du jour. */
  previewSeason(season: UiSeason | null): void {
    this.seasonOverride.set(season);
  }

  /** Active ou met en pause les animations saisonnières (choix mémorisé). */
  setSeasonEffects(enabled: boolean): void {
    this.seasonEffects.set(enabled);
    try {
      this.storage()?.setItem(`${this.config.storageKey}-effects`, enabled ? 'on' : 'off');
    } catch {
      // stockage indisponible : le choix reste en mémoire.
    }
  }

  /** Change la préférence de thème et la mémorise si la persistance est active. */
  setTheme(preference: UiThemePreference): void {
    this.preference.set(preference);
    this.writeStoredPreference(preference);
  }

  /** Bascule entre clair et sombre (à partir du thème appliqué ; reste saisonnier si on l'est). */
  toggle(): void {
    const prefix = this.isSeasonal() ? 'season-' : '';
    this.setTheme(prefix + (this.isDark() ? 'light' : 'dark'));
  }

  private storage(): Storage | null {
    if (!this.config.storageKey) {
      return null;
    }
    try {
      return this.window?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private readStoredEffects(): boolean | null {
    try {
      const value = this.storage()?.getItem(`${this.config.storageKey}-effects`);
      return value === 'on' ? true : value === 'off' ? false : null;
    } catch {
      return null;
    }
  }

  private readStoredPreference(): string | null {
    try {
      const value = this.storage()?.getItem(this.config.storageKey ?? '') ?? null;
      return value && (value === 'system' || this.config.themes.includes(value)) ? value : null;
    } catch {
      return null;
    }
  }

  private writeStoredPreference(value: string): void {
    try {
      this.storage()?.setItem(this.config.storageKey ?? '', value);
    } catch {
      // stockage indisponible (navigation privée, quota) : la préférence reste en mémoire.
    }
  }
}

/**
 * Configure IC Angular UiKit et applique le thème dès le démarrage.
 *
 * ```ts
 * bootstrapApplication(App, { providers: [provideUiKit({ defaultTheme: 'system' })] });
 * ```
 */
export function provideUiKit(config: UiKitConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UI_KIT_CONFIG,
      useValue: {
        defaultTheme: config.defaultTheme ?? 'system',
        themes: config.themes ?? ['light', 'dark', 'season-light', 'season-dark'],
        storageKey: config.storageKey === undefined ? 'ic-angular-uikit-theme' : config.storageKey,
        hemisphere: config.hemisphere ?? 'north',
        seasonEffects: config.seasonEffects ?? 'auto',
      },
    },
    provideEnvironmentInitializer(() => inject(ThemeService)),
  ]);
}
