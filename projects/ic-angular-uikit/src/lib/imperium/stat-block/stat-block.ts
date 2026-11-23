import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';
import { UiIcon } from '../../icon/icon';
import { UiImperiumBranch } from '../branch-badge/branches';

const optionalNumber = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v));

/**
 * Indicateur chiffré : libellé en petites capitales, valeur en grand (Cinzel dans le thème `imperium-dark`), unité,
 * icône et tendance. La tendance est donnée par une flèche **et** un texte (« +12 % »), avec une phrase complète
 * pour les lecteurs d'écran ; `inverse` quand une baisse est une bonne nouvelle.
 *
 * ```html
 * <ui-stat-block label="Membres actifs" [value]="128" [trend]="12" trendPeriod="sur 30 jours" icon="lucide:users" />
 * ```
 * @category Imperium
 */
@Component({
  selector: 'ui-stat-block',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-stat-block',
    '[style.--_c]': "accent() === 'gold' ? null : 'var(--ui-branch-' + accent() + ')'",
  },
  template: `
    <div class="ui-stat-block__head">
      <span class="ui-stat-block__label">{{ label() }}</span>
      @if (icon(); as name) {
        <ui-icon class="ui-stat-block__icon" [name]="name" />
      }
    </div>
    <p class="ui-stat-block__value">
      {{ formatted() }}@if (unit()) {<span class="ui-stat-block__unit"> {{ unit() }}</span>}
    </p>
    @if (trend() !== undefined) {
      <p class="ui-stat-block__trend" [class]="'ui-stat-block__trend--' + mood()">
        <span aria-hidden="true">{{ arrow() }} {{ trendText() }}</span>
        <span class="ui-stat-block__sr">{{ trendSentence() }}</span>
        @if (trendPeriod()) {
          <span class="ui-stat-block__period" aria-hidden="true">{{ trendPeriod() }}</span>
        }
      </p>
    }
  `,
  styleUrl: './stat-block.css',
})
export class UiStatBlock {
  /** Libellé. */
  readonly label = input.required<string>();
  /** Valeur (nombre formaté en français, ou texte). */
  readonly value = input.required<number | string>();
  /** Unité (« h », « parties »…). */
  readonly unit = input<string>();
  /** Décimales des nombres. */
  readonly decimals = input(0, { transform: numberAttribute });
  /** Variation en pourcentage (positive ou négative). */
  readonly trend = input(undefined, { transform: optionalNumber });
  /** Période de comparaison (« sur 30 jours »). */
  readonly trendPeriod = input<string>();
  /** Une baisse est une bonne nouvelle (temps de réponse, défaites…). */
  readonly inverse = input(false, { transform: booleanAttribute });
  /** Icône (`set:nom`, voir `ui-icon`). */
  readonly icon = input<string>();
  /** Couleur d'accent : or, ou couleur d'une branche. */
  readonly accent = input<'gold' | UiImperiumBranch>('gold');

  protected readonly formatted = computed(() => {
    const value = this.value();
    return typeof value === 'number'
      ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: this.decimals(), maximumFractionDigits: this.decimals() }).format(value)
      : value;
  });
  protected readonly mood = computed(() => {
    const trend = this.trend() ?? 0;
    if (trend === 0) return 'flat';
    return trend > 0 !== this.inverse() ? 'good' : 'bad';
  });
  protected readonly arrow = computed(() => {
    const trend = this.trend() ?? 0;
    return trend > 0 ? '▲' : trend < 0 ? '▼' : '▶';
  });
  protected readonly trendText = computed(() => {
    const trend = this.trend() ?? 0;
    const text = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(trend);
    return `${text}\u00a0%`;
  });
  protected readonly trendSentence = computed(() => {
    const trend = this.trend() ?? 0;
    const amount = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Math.abs(trend));
    const direction = trend > 0 ? `en hausse de ${amount}\u00a0%` : trend < 0 ? `en baisse de ${amount}\u00a0%` : 'stable';
    return `${direction}${this.trendPeriod() ? ' ' + this.trendPeriod() : ''}`;
  });
}
