import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { UiTone } from '../core/types';
import { UiIcon } from '../icon/icon';

export type UiBadgeAppearance = 'soft' | 'solid' | 'outline';

/**
 * Petite étiquette de statut ou de compteur.
 *
 * @slot default - Texte du badge.
 * @slot [uiBadgeIcon] - Icône placée avant le texte.
 * @category Affichage
 */
@Component({
  selector: 'ui-badge',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-badge',
    '[class]': '"ui-badge--" + tone() + " ui-badge--" + appearance()',
    '[class.ui-badge--pill]': 'pill()',
  },
  template: `
    @if (dot()) {
      <span class="ui-badge__dot" aria-hidden="true"></span>
    }
    @if (icon(); as name) {
      <ui-icon [name]="name" />
    }
    <ng-content select="[uiBadgeIcon]" />
    <ng-content />
  `,
  styles: `
    :host {
      --_bg: var(--ui-color-primary-subtle);
      --_fg: var(--ui-color-primary-text);
      --_border: transparent;
      display: inline-flex;
      align-items: center;
      gap: var(--ui-space-1);
      padding: 0.125rem var(--ui-space-2);
      border: 1px solid var(--_border);
      border-radius: var(--ui-radius-sm);
      background: var(--_bg);
      color: var(--_fg);
      font-size: var(--ui-font-size-xs);
      font-weight: var(--ui-font-weight-medium);
      line-height: 1.4;
      white-space: nowrap;
      vertical-align: middle;
    }
    :host(.ui-badge--pill) { border-radius: var(--ui-radius-full); padding-inline: var(--ui-space-3); }
    .ui-badge__dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; background: currentColor; }

    :host(.ui-badge--neutral) { --_bg: var(--ui-color-neutral-subtle); --_fg: var(--ui-color-neutral-text); }
    :host(.ui-badge--success) { --_bg: var(--ui-color-success-subtle); --_fg: var(--ui-color-success-text); }
    :host(.ui-badge--warning) { --_bg: var(--ui-color-warning-subtle); --_fg: var(--ui-color-warning-text); }
    :host(.ui-badge--danger) { --_bg: var(--ui-color-danger-subtle); --_fg: var(--ui-color-danger-text); }

    :host(.ui-badge--solid) { --_fg: var(--ui-color-on-primary); --_bg: var(--ui-color-primary); }
    :host(.ui-badge--solid.ui-badge--neutral) { --_bg: var(--ui-color-neutral); --_fg: var(--ui-color-on-neutral); }
    :host(.ui-badge--solid.ui-badge--success) { --_bg: var(--ui-color-success); --_fg: var(--ui-color-on-success); }
    :host(.ui-badge--solid.ui-badge--warning) { --_bg: var(--ui-color-warning); --_fg: var(--ui-color-on-warning); }
    :host(.ui-badge--solid.ui-badge--danger) { --_bg: var(--ui-color-danger); --_fg: var(--ui-color-on-danger); }

    :host(.ui-badge--outline) { --_bg: transparent; --_border: currentColor; }
  `,
})
export class UiBadge {
  /** Couleur sémantique. */
  readonly tone = input<UiTone>('primary');
  /** Remplissage : atténué, plein ou contour. */
  readonly appearance = input<UiBadgeAppearance>('soft');
  /** Coins entièrement arrondis. */
  readonly pill = input(false, { transform: booleanAttribute });
  /** Icône avant le texte (`préfixe:nom`, voir `provideUiIcons()`). */
  readonly icon = input<string>();
  /** Affiche une pastille de statut avant le texte. */
  readonly dot = input(false, { transform: booleanAttribute });
}
