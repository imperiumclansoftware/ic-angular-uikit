import { InjectionToken, Provider, inject } from '@angular/core';

/** Nœud SVG : `[balise, attributs, enfants?]` (format de Lucide, réutilisable pour vos icônes). */
export type UiSvgNode = readonly [tag: string, attrs: Readonly<Record<string, string | number | undefined>>, children?: readonly UiSvgNode[]];

/** Icône vectorielle décrite par des données (jamais par du HTML). */
export interface UiSvgIcon {
  /** `viewBox` du SVG, ex. `0 0 24 24`. */
  viewBox: string;
  /** Formes de l'icône. */
  nodes: readonly UiSvgNode[];
  /** Attributs de présentation appliqués à l'élément `<svg>` (ex. `{ fill: 'none', stroke: 'currentColor' }`). */
  attrs?: Readonly<Record<string, string | number>>;
}

/** Jeu d'icônes fourni par une police (Font Awesome, Material Symbols, Bootstrap Icons…). */
export interface UiFontIconSet {
  kind: 'font';
  /** Préfixe utilisé dans `name="préfixe:icône"`. */
  name: string;
  /** Classes CSS à poser sur l'élément de l'icône. */
  classes: (icon: string) => string;
  /** Police à ligatures (Material) : le nom de l'icône est écrit en texte dans l'élément. */
  ligature?: boolean;
}

/** Jeu d'icônes SVG (Font Awesome SVG, Lucide, icônes maison…). */
export interface UiSvgIconSet {
  kind: 'svg';
  /** Préfixe utilisé dans `name="préfixe:icône"`. */
  name: string;
  /** Icônes par nom (kebab-case conseillé : `arrow-right`). */
  icons: Readonly<Record<string, UiSvgIcon>>;
}

export type UiIconSet = UiFontIconSet | UiSvgIconSet;

/** Icône résolue, prête à être rendue. */
export type UiResolvedIcon =
  | { kind: 'font'; classes: string; ligature: string | null }
  | { kind: 'svg'; icon: UiSvgIcon }
  | { kind: 'missing'; name: string };

export interface UiIconOptions {
  /** Jeu utilisé quand le nom n'a pas de préfixe (`name="home"`). */
  defaultSet?: string;
}

/**
 * Registre des jeux d'icônes. Chaque `provideUiIcons()` crée un niveau qui complète le niveau parent :
 * l'application déclare ses jeux, un composant peut en ajouter pour lui seul.
 */
export class UiIconRegistry {
  private readonly sets = new Map<string, UiIconSet>();

  constructor(
    sets: readonly UiIconSet[],
    private readonly options: UiIconOptions,
    private readonly parent: UiIconRegistry | null,
  ) {
    for (const set of sets) {
      this.sets.set(set.name, set);
    }
  }

  /** Jeu par défaut (celui de ce niveau, sinon celui du parent). */
  get defaultSet(): string | undefined {
    return this.options.defaultSet ?? this.parent?.defaultSet;
  }

  /** Cherche un jeu à ce niveau puis dans les niveaux parents. */
  getSet(name: string): UiIconSet | undefined {
    return this.sets.get(name) ?? this.parent?.getSet(name);
  }

  /** Résout `préfixe:icône` (ou `icône` avec le jeu par défaut). */
  resolve(fullName: string): UiResolvedIcon {
    const separator = fullName.indexOf(':');
    const setName = separator >= 0 ? fullName.slice(0, separator) : this.defaultSet;
    const icon = separator >= 0 ? fullName.slice(separator + 1) : fullName;
    const set = setName ? this.getSet(setName) : undefined;
    if (!set || !icon) {
      return { kind: 'missing', name: fullName };
    }
    if (set.kind === 'font') {
      return { kind: 'font', classes: set.classes(icon), ligature: set.ligature ? icon : null };
    }
    const svg = set.icons[icon];
    return svg ? { kind: 'svg', icon: svg } : { kind: 'missing', name: fullName };
  }
}

/** Registre vide utilisé quand aucun `provideUiIcons()` n'est déclaré. */
export const UI_ICON_REGISTRY_ROOT = new InjectionToken<UiIconRegistry>('UI_ICON_REGISTRY_ROOT', {
  providedIn: 'root',
  factory: () => new UiIconRegistry([], {}, null),
});

/**
 * Déclare des jeux d'icônes, pour toute l'application (`app.config.ts`) ou pour un composant (`providers`).
 *
 * ```ts
 * provideUiIcons([fontAwesomeFont(), materialSymbols(), lucideIcons({ Search, Bell })], { defaultSet: 'lucide' })
 * ```
 */
export function provideUiIcons(sets: readonly UiIconSet[] | readonly (UiIconSet | readonly UiIconSet[])[], options: UiIconOptions = {}): Provider {
  const flat = (sets as readonly (UiIconSet | readonly UiIconSet[])[]).flat() as UiIconSet[];
  return {
    provide: UiIconRegistry,
    useFactory: () => new UiIconRegistry(flat, options, inject(UiIconRegistry, { skipSelf: true, optional: true }) ?? inject(UI_ICON_REGISTRY_ROOT)),
  };
}

// ---------------------------------------------------------------------------
// Adaptateurs pour les principales librairies (aucune dépendance : vous installez celle de votre choix).
// ---------------------------------------------------------------------------

/**
 * Font Awesome en police (`@fortawesome/fontawesome-free`, CSS `all.min.css` dans angular.json).
 * Crée les jeux `fa` / `fas` (solid), `far` (regular) et `fab` (brands) : `fa:house`, `far:heart`, `fab:github`.
 */
export function fontAwesomeFont(): UiFontIconSet[] {
  const set = (name: string, style: string): UiFontIconSet => ({ kind: 'font', name, classes: (icon) => `${style} fa-${icon}` });
  return [set('fa', 'fa-solid'), set('fas', 'fa-solid'), set('far', 'fa-regular'), set('fab', 'fa-brands')];
}

/** Définition d'icône Font Awesome SVG (`faHouse` de `@fortawesome/free-solid-svg-icons`…). */
export interface UiFontAwesomeDefinition {
  iconName: string;
  icon: readonly [width: number, height: number, ligatures: readonly unknown[], unicode: string, path: string | readonly string[]];
}

/**
 * Font Awesome en SVG, importé icône par icône (seules les icônes utilisées sont dans le bundle).
 * `fontAwesomeSvg([faHouse, faUser])` → `fa:house`, `fa:user`.
 */
export function fontAwesomeSvg(definitions: readonly UiFontAwesomeDefinition[], name = 'fa'): UiSvgIconSet {
  const icons: Record<string, UiSvgIcon> = {};
  for (const def of definitions) {
    const [width, height, , , path] = def.icon;
    const paths = typeof path === 'string' ? [path] : path;
    icons[def.iconName] = {
      viewBox: `0 0 ${width} ${height}`,
      attrs: { fill: 'currentColor' },
      // Duotone : deux chemins, le premier (secondaire) atténué.
      nodes: paths.map((d, i): UiSvgNode => ['path', paths.length > 1 && i === 0 ? { d, opacity: 0.4 } : { d }]),
    };
  }
  return { kind: 'svg', name, icons };
}

/**
 * Google Material Symbols en police variable (`material-symbols`, CSS `outlined.css` dans angular.json).
 * `material:home`. Remplissage : `--ui-icon-fill: 1` sur l'icône.
 */
export function materialSymbols(options: { style?: 'outlined' | 'rounded' | 'sharp'; name?: string } = {}): UiFontIconSet {
  const style = options.style ?? 'outlined';
  return { kind: 'font', name: options.name ?? 'material', classes: () => `material-symbols-${style} ui-icon--material`, ligature: true };
}

/** Google Material Icons « classique » en police (`material-icons`). `mi:home`. */
export function materialIcons(options: { variant?: '' | 'outlined' | 'round' | 'sharp' | 'two-tone'; name?: string } = {}): UiFontIconSet {
  const cls = options.variant ? `material-icons-${options.variant}` : 'material-icons';
  return { kind: 'font', name: options.name ?? 'mi', classes: () => cls, ligature: true };
}

/** Bootstrap Icons en police (`bootstrap-icons`, CSS `font/bootstrap-icons.min.css`). `bi:house`. */
export function bootstrapIcons(name = 'bi'): UiFontIconSet {
  return { kind: 'font', name, classes: (icon) => `bi bi-${icon}` };
}

/** Nœuds d'une icône Lucide (`import { Search } from 'lucide'`). */
export type UiLucideIconNode = readonly (readonly [tag: string, attrs: Readonly<Record<string, string | number | undefined>>])[];

/**
 * Lucide en SVG, importé icône par icône : `lucideIcons({ Search, ArrowRight })` → `lucide:search`, `lucide:arrow-right`.
 */
export function lucideIcons(icons: Readonly<Record<string, UiLucideIconNode>>, name = 'lucide'): UiSvgIconSet {
  const result: Record<string, UiSvgIcon> = {};
  for (const [key, nodes] of Object.entries(icons)) {
    result[toKebab(key)] = {
      viewBox: '0 0 24 24',
      attrs: { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      nodes,
    };
  }
  return { kind: 'svg', name, icons: result };
}

/**
 * Icônes SVG maison. Une chaîne est un chemin `d` dans un viewBox `0 0 24 24` rempli en `currentColor`.
 * `svgIcons({ logo: 'M12 2 2 22h20Z' }, 'app')` → `app:logo`.
 */
export function svgIcons(icons: Readonly<Record<string, UiSvgIcon | string>>, name = 'custom'): UiSvgIconSet {
  const result: Record<string, UiSvgIcon> = {};
  for (const [key, icon] of Object.entries(icons)) {
    result[key] = typeof icon === 'string' ? { viewBox: '0 0 24 24', attrs: { fill: 'currentColor' }, nodes: [['path', { d: icon }]] } : icon;
  }
  return { kind: 'svg', name, icons: result };
}

/**
 * N'importe quelle police d'icônes à classes (Remix Icon, Tabler webfont, Ionicons…).
 * `fontIcons('ri', (icon) => 'ri-' + icon)` → `ri:home-line`.
 */
export function fontIcons(name: string, classes: (icon: string) => string, ligature = false): UiFontIconSet {
  return { kind: 'font', name, classes, ligature };
}

function toKebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])([0-9])/g, '$1-$2')
    .toLowerCase();
}
