import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Type, booleanAttribute, computed, effect, inject, input, isDevMode, numberAttribute, signal, untracked } from '@angular/core';
import { UI_LOADER_TYPES, UiLoaderDefaults, UiLoaderSize, UiLoaderType } from './loader-config';

const SIZES: Record<string, string> = { sm: '1rem', md: '2rem', lg: '3rem' };
/** Nombre d'éléments animés par loader prédéfini. */
const PARTS: Record<string, number> = { spinner: 0, ring: 0, dots: 3, pulse: 2, bars: 4, orbit: 2, grid: 9, line: 1, skeleton: 0 };
const warned = new Set<string>();

/**
 * Indicateur de chargement. Le loader utilisé vient, dans l'ordre : de l'attribut `type`, de la zone la plus proche
 * déclarée avec `provideUiLoader()`, puis de la configuration de l'application (défaut : `spinner`).
 *
 * Prédéfinis : `spinner`, `ring`, `dots`, `pulse`, `bars`, `orbit`, `grid`, `line` (barre indéterminée sur toute la
 * largeur) et `skeleton` (reflet qui remplit son conteneur). Annoncé aux lecteurs d'écran (`role="status"`) sauf
 * avec `decorative`, quand le composant parent signale déjà le chargement (`aria-busy`…). Animation adoucie si
 * l'utilisateur réduit les animations.
 *
 * ```html
 * <ui-loader />
 * <ui-loader type="dots" size="lg" label="Envoi en cours…" />
 * ```
 * @cssprop --ui-loader-color - Couleur (défaut : couleur principale).
 * @cssprop --ui-loader-track - Couleur de fond des loaders à piste (`spinner`, `ring`, `line`, `skeleton`).
 * @category Retours & superpositions
 */
@Component({
  selector: 'ui-loader',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-loader',
    '[class]': "'ui-loader--' + (custom() ? 'custom' : resolvedType())",
    '[class.ui-loader--hidden]': '!visible()',
    '[attr.role]': 'decorative() ? null : "status"',
    '[attr.aria-hidden]': 'decorative() || null',
    '[style.--ui-loader-size]': 'cssSize()',
    '[style.--ui-loader-duration-scale]': 'scale()',
  },
  template: `
    @if (visible()) {
      @if (custom(); as component) {
        <ng-container *ngComponentOutlet="component" />
      } @else {
        @for (part of parts(); track $index) {
          <span class="ui-loader__part" [style.--i]="part"></span>
        }
      }
    }
    @if (!decorative()) {
      <span class="ui-loader__sr">{{ visible() ? resolvedLabel() : '' }}</span>
    }
  `,
  styleUrl: './loader.css',
})
export class UiLoader {
  private readonly defaults = inject(UiLoaderDefaults);
  /** Loader à afficher (défaut : celui de la zone ou de l'application). */
  readonly type = input<UiLoaderType>();
  /** Taille (défaut : celle de la configuration, `md`). */
  readonly size = input<UiLoaderSize>();
  /** Vitesse (1 = normale). */
  readonly speed = input(undefined, { transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v, 1)) });
  /** Texte lu par les lecteurs d'écran. */
  readonly label = input<string>();
  /** Délai d'apparition en ms. */
  readonly delay = input(undefined, { transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v, 0)) });
  /** Purement visuel (`aria-hidden`) : le parent annonce déjà le chargement. */
  readonly decorative = input(false, { transform: booleanAttribute });

  private readonly config = this.defaults.config;
  /** Type effectif (attribut, sinon configuration). */
  readonly resolvedType = computed(() => {
    const type = this.type() ?? this.config().type;
    if (this.config().loaders[type] || (UI_LOADER_TYPES as readonly string[]).includes(type)) return type;
    if (isDevMode() && !warned.has(type)) {
      warned.add(type);
      console.warn(`[ic-angular-uikit] ui-loader : loader « ${type} » inconnu, « spinner » utilisé. Enregistrez-le avec provideUiLoader({ loaders }).`);
    }
    return 'spinner';
  });
  protected readonly custom = computed<Type<unknown> | null>(() => this.config().loaders[this.resolvedType()] ?? null);
  /** Éléments animés ; la valeur sert de rang de décalage (diagonale pour `grid`). */
  protected readonly parts = computed(() => {
    const type = this.resolvedType();
    return Array.from({ length: PARTS[type] ?? 0 }, (_, i) => (type === 'grid' ? (i % 3) + Math.floor(i / 3) : i));
  });
  protected readonly cssSize = computed(() => {
    const size = this.size() ?? this.config().size;
    return SIZES[size] ?? size;
  });
  protected readonly scale = computed(() => {
    const speed = this.speed() ?? this.config().speed;
    return String(speed > 0 ? 1 / speed : 1);
  });
  protected readonly resolvedLabel = computed(() => this.label() ?? this.config().label);

  protected readonly visible = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const delay = this.delay() ?? this.config().delay;
      untracked(() => {
        if (this.visible()) return;
        clearTimeout(timer);
        if (delay > 0) timer = setTimeout(() => this.visible.set(true), delay);
        else this.visible.set(true);
      });
    });
    destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
