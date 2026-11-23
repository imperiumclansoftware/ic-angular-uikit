import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';
import { UiOrnament } from '../ornament/ornament';
import { UiImperiumBranch } from '../branch-badge/branches';

/** Variante de couleur du cadre. */
export type UiArabesqueFrameVariant = 'standard' | 'imperial' | UiImperiumBranch;

/**
 * Cadre à arabesques : panneau avec filet doré et volutes aux quatre coins. `imperial` double le filet, ajoute un
 * fleuron et une lueur ; les variantes de branche prennent la couleur de la branche. Pour les zones denses
 * (formulaires, tableaux), préférez `ornament="corners"` (volutes réduites) ou `none`.
 *
 * ```html
 * <ui-arabesque-frame variant="imperial" heading="Conseil de guerre">…</ui-arabesque-frame>
 * ```
 * @slot [uiFrameHeader] - En-tête sur mesure (remplace `heading`).
 * @cssprop --ui-frame-padding - Marge intérieure.
 * @cssprop --ui-frame-ornament-size - Taille des volutes de coin (défaut 3.5rem, 2.25rem en `corners`).
 * @category Imperium
 */
@Component({
  selector: 'ui-arabesque-frame',
  imports: [UiOrnament],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-arabesque-frame',
    '[class]': "'ui-arabesque-frame--' + variant() + ' ui-arabesque-frame--ornament-' + ornament()",
    '[style.--_c]': 'accent()',
  },
  template: `
    @if (ornament() !== 'none') {
      <ui-ornament kind="corner" class="ui-arabesque-frame__corner ui-arabesque-frame__corner--tl" />
      <ui-ornament kind="corner" class="ui-arabesque-frame__corner ui-arabesque-frame__corner--tr" />
      <ui-ornament kind="corner" class="ui-arabesque-frame__corner ui-arabesque-frame__corner--bl" />
      <ui-ornament kind="corner" class="ui-arabesque-frame__corner ui-arabesque-frame__corner--br" />
    }
    <ng-content select="[uiFrameHeader]" />
    @if (heading()) {
      <div class="ui-arabesque-frame__head">
        @if (variant() === 'imperial' && ornament() === 'full') {
          <ui-ornament kind="flourish" class="ui-arabesque-frame__flourish" />
        }
        <span class="ui-arabesque-frame__heading" role="heading" [attr.aria-level]="headingLevel()">{{ heading() }}</span>
      </div>
    }
    <ng-content />
  `,
  styleUrl: './arabesque-frame.css',
})
export class UiArabesqueFrame {
  /** Variante de couleur. */
  readonly variant = input<UiArabesqueFrameVariant>('standard');
  /** `full` : volutes complètes ; `corners` : volutes réduites (zones denses) ; `none` : filet seul. */
  readonly ornament = input<'full' | 'corners' | 'none'>('full');
  /** Titre du panneau (Cinzel en capitales dans le thème `imperium-dark`). */
  readonly heading = input<string>();
  /** Niveau de titre (`aria-level`). */
  readonly headingLevel = input(2, { transform: numberAttribute });

  protected readonly accent = computed(() => {
    const variant = this.variant();
    return variant === 'standard' || variant === 'imperial' ? null : `var(--ui-branch-${variant})`;
  });
}
