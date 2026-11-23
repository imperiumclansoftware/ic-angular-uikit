import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiImperiumBranch, imperiumBranch } from './branches';

/**
 * Badge d'appartenance à une branche d'Imperium Clan : icône, libellé et couleur dédiée. La couleur n'est jamais
 * seule porteuse de l'information (libellé visible, ou nom accessible en mode `icon`). Un membre pouvant appartenir à
 * plusieurs branches, affichez un badge par branche.
 *
 * ```html
 * <ui-branch-badge branch="developpeurs" />
 * <ui-branch-badge branch="cine" display="icon" />
 * ```
 * @category Imperium
 */
@Component({
  selector: 'ui-branch-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-branch-badge',
    '[class]': "'ui-branch-badge--' + appearance() + ' ui-branch-badge--' + size() + ' ui-branch-badge--' + display()",
    '[style.--_c]': 'info().color',
    '[style.--_t]': 'info().text',
    '[style.--_on]': 'info().on',
    '[attr.role]': "display() === 'icon' ? 'img' : null",
    '[attr.aria-label]': "display() === 'icon' ? 'Branche ' + info().label : null",
    '[attr.title]': "display() === 'full' ? null : 'Branche ' + info().label",
  },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @for (d of info().icon; track $index) {
        <path [attr.d]="d" />
      }
    </svg>
    @if (display() !== 'icon') {
      <span>{{ display() === 'short' ? info().short : info().label }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      box-sizing: border-box;
      min-height: 1.75rem;
      padding: 0 0.6em 0 0.45em;
      border: 1px solid color-mix(in srgb, var(--_c) 70%, transparent);
      border-radius: var(--ui-radius-sm);
      background: color-mix(in srgb, var(--_c) 14%, transparent);
      color: var(--_t);
      font-family: var(--ui-font-family-display, inherit);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1;
      white-space: nowrap;
      vertical-align: middle;
    }
    svg { flex: none; width: 1.15em; height: 1.15em; }
    :host(.ui-branch-badge--solid) { border-color: var(--_c); background: var(--_c); color: var(--_on); }
    :host(.ui-branch-badge--md) { min-height: 2rem; font-size: 0.8125rem; }
    :host(.ui-branch-badge--icon) { justify-content: center; width: 1.75rem; padding: 0; }
    :host(.ui-branch-badge--md.ui-branch-badge--icon) { width: 2rem; }
  `,
})
export class UiBranchBadge {
  /** Branche. */
  readonly branch = input.required<UiImperiumBranch>();
  /** `full` : nom complet ; `short` : nom court ; `icon` : icône seule (nom accessible et infobulle). */
  readonly display = input<'full' | 'short' | 'icon'>('full');
  /** `soft` : teinte légère et liseré ; `solid` : couleur pleine. */
  readonly appearance = input<'soft' | 'solid'>('soft');
  /** Taille. */
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly info = computed(() => imperiumBranch(this.branch()));
}
