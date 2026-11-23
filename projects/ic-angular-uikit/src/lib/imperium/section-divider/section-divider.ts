import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';
import { UiOrnament } from '../ornament/ornament';

/**
 * Séparateur horizontal fin à motif central (nœud d'arabesques, losange héraldique ou fleuron). Avec `label`, il
 * devient un titre de section encadré de filets (`role="heading"`), sinon un séparateur (`role="separator"`).
 *
 * ```html
 * <ui-section-divider />
 * <ui-section-divider label="Hauts faits" />
 * ```
 * @category Imperium
 */
@Component({
  selector: 'ui-section-divider',
  imports: [UiOrnament],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-section-divider',
    '[attr.role]': "label() ? 'heading' : 'separator'",
    '[attr.aria-level]': 'label() ? headingLevel() : null',
  },
  template: `
    <span class="ui-section-divider__line" aria-hidden="true"></span>
    @if (label()) {
      <ui-ornament kind="crest" class="ui-section-divider__mini" />
      <span class="ui-section-divider__label">{{ label() }}</span>
      <ui-ornament kind="crest" class="ui-section-divider__mini" />
    } @else if (emblemKind(); as kind) {
      <ui-ornament [kind]="kind" class="ui-section-divider__emblem" />
    }
    <span class="ui-section-divider__line ui-section-divider__line--end" aria-hidden="true"></span>
  `,
  styles: `
    :host { display: flex; align-items: center; gap: var(--ui-space-3); margin: var(--ui-space-6) 0; color: var(--ui-ornament-color, var(--ui-color-primary)); }
    .ui-section-divider__line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--ui-ornament-color-soft, color-mix(in srgb, currentColor 45%, transparent))); }
    .ui-section-divider__line--end { background: linear-gradient(270deg, transparent, var(--ui-ornament-color-soft, color-mix(in srgb, currentColor 45%, transparent))); }
    .ui-section-divider__mini { width: 0.6rem; height: 0.6rem; }
    .ui-section-divider__label {
      color: var(--ui-color-text);
      font-family: var(--ui-font-family-display, inherit);
      font-size: var(--ui-font-size-md);
      font-weight: 600;
      letter-spacing: var(--ui-display-letter-spacing, 0.04em);
      text-transform: var(--ui-display-transform, none);
      text-align: center;
    }
  `,
})
export class UiSectionDivider {
  /** Titre de section (le séparateur devient un titre). */
  readonly label = input<string>();
  /** Niveau de titre avec `label`. */
  readonly headingLevel = input(2, { transform: numberAttribute });
  /** Motif central sans `label`. */
  readonly emblem = input<'knot' | 'crest' | 'flourish' | 'none'>('knot');

  protected readonly emblemKind = computed(() => {
    const emblem = this.emblem();
    return emblem === 'none' ? null : emblem;
  });
}
