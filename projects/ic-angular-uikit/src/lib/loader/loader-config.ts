import { Injectable, Provider, Signal, Type, computed, inject, signal } from '@angular/core';

/** Loaders prédéfinis. */
export const UI_LOADER_TYPES = ['spinner', 'ring', 'dots', 'pulse', 'bars', 'orbit', 'grid', 'line', 'skeleton'] as const;

/** Type de loader : un loader prédéfini, ou le nom d'un loader personnalisé enregistré avec `provideUiLoader({ loaders })`. */
export type UiLoaderType = (typeof UI_LOADER_TYPES)[number] | (string & {});

/** Taille : `sm` (1rem), `md` (2rem), `lg` (3rem) ou une longueur CSS (`'1em'`, `'40px'`…). */
export type UiLoaderSize = 'sm' | 'md' | 'lg' | (string & {});

/** Réglages des loaders (globaux, d'une zone de l'application, ou d'un composant). */
export interface UiLoaderConfig {
  /** Loader utilisé par défaut (défaut : `spinner`). */
  type?: UiLoaderType;
  /** Taille par défaut (défaut : `md`). */
  size?: UiLoaderSize;
  /** Vitesse de l'animation (1 = normale, 2 = deux fois plus rapide). */
  speed?: number;
  /** Texte lu par les lecteurs d'écran (défaut : « Chargement… »). */
  label?: string;
  /** Délai d'apparition en ms, pour ne pas faire clignoter un loader sur un chargement rapide (défaut : 0). */
  delay?: number;
  /**
   * Loaders personnalisés par nom. Le composant est affiché tel quel ; il peut utiliser les variables CSS
   * `--ui-loader-size`, `--ui-loader-color` et `--ui-loader-duration`.
   */
  loaders?: Record<string, Type<unknown>>;
}

/** Réglages résolus (valeurs par défaut appliquées). */
export interface UiLoaderResolvedConfig {
  type: UiLoaderType;
  size: UiLoaderSize;
  speed: number;
  label: string;
  delay: number;
  loaders: Record<string, Type<unknown>>;
}

const DEFAULTS: UiLoaderResolvedConfig = { type: 'spinner', size: 'md', speed: 1, label: 'Chargement…', delay: 0, loaders: {} };

function merge(parent: UiLoaderResolvedConfig, own: UiLoaderConfig): UiLoaderResolvedConfig {
  const defined = Object.fromEntries(Object.entries(own).filter(([, v]) => v !== undefined)) as UiLoaderConfig;
  return { ...parent, ...defined, loaders: { ...parent.loaders, ...own.loaders } };
}

/**
 * Loader par défaut de l'application ou d'une zone. Modifiable à l'exécution (préférence de l'utilisateur) :
 *
 * ```ts
 * inject(UiLoaderDefaults).set({ type: 'dots' });
 * ```
 * Les zones déclarées avec `provideUiLoader()` dans les `providers` d'un composant héritent de la configuration
 * parente et la complètent.
 */
@Injectable({ providedIn: 'root', useFactory: () => UiLoaderDefaults.create({}, null) })
export class UiLoaderDefaults {
  private readonly own = signal<UiLoaderConfig>({});
  private parent: UiLoaderDefaults | null = null;
  /** Réglages effectifs (parent + réglages de ce niveau). */
  readonly config: Signal<UiLoaderResolvedConfig> = computed(() => merge(this.parent?.config() ?? DEFAULTS, this.own()));

  /** Crée un niveau de réglages héritant de `parent`. */
  static create(config: UiLoaderConfig, parent: UiLoaderDefaults | null): UiLoaderDefaults {
    const defaults = new UiLoaderDefaults();
    defaults.parent = parent;
    defaults.own.set(config);
    return defaults;
  }

  /** Modifie les réglages de ce niveau (les valeurs non fournies sont conservées). */
  set(config: UiLoaderConfig): void {
    this.own.update((current) => ({ ...current, ...config, loaders: { ...current.loaders, ...config.loaders } }));
  }

  /** Revient aux réglages hérités du niveau parent. */
  reset(): void {
    this.own.set({});
  }
}

/**
 * Choisit les loaders de toute l'application (`bootstrapApplication(App, { providers: [provideUiLoader(...)] })`)
 * ou d'une zone (`providers` d'un composant : ses descendants l'utilisent).
 *
 * ```ts
 * provideUiLoader({ type: 'dots', delay: 150, loaders: { marque: BrandLoader } })
 * ```
 */
export function provideUiLoader(config: UiLoaderConfig = {}): Provider[] {
  return [
    {
      provide: UiLoaderDefaults,
      useFactory: () => UiLoaderDefaults.create(config, inject(UiLoaderDefaults, { skipSelf: true, optional: true })),
    },
  ];
}

/**
 * @internal Loader pour un petit emplacement (bouton, lecteur) : `line` et `skeleton`, qui remplissent leur
 * conteneur, y sont remplacés par `spinner`.
 */
export function compactLoaderType(type: UiLoaderType | undefined, defaults: UiLoaderDefaults): UiLoaderType {
  const resolved = type ?? defaults.config().type;
  return resolved === 'line' || resolved === 'skeleton' ? 'spinner' : resolved;
}
