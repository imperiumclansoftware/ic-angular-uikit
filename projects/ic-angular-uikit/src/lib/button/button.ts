import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { UiSize } from '../core/types';
import { UiIcon } from '../icon/icon';

export type UiButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'danger';

/**
 * Bouton d'action. S'applique sur un `<button>` ou un `<a>` natif pour garder la sémantique,
 * le focus clavier et les événements natifs (`(click)`).
 *
 * @slot default - Libellé du bouton.
 * @slot [uiButtonIcon] - Icône placée avant le libellé (ou utilisez l'input `icon`).
 * @slot [uiButtonIconEnd] - Icône placée après le libellé.
 * @cssprop --ui-button-radius - Rayon des coins (défaut : `--ui-radius-md`).
 * @cssprop --ui-button-font-weight - Graisse du libellé (défaut : `--ui-font-weight-medium`).
 * @category Actions
 */
@Component({
  // Sélecteur d'attribut volontaire : on garde le <button>/<a> natif (sémantique, focus, formulaires).
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[uiButton], a[uiButton]',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-button',
    '[class]': '"ui-button--" + variant() + " ui-button--" + size()',
    '[class.ui-button--block]': 'block()',
    '[class.ui-button--loading]': 'loading()',
    '[class.ui-button--icon-only]': 'iconOnly()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.aria-disabled]': 'loading() || null',
  },
  template: `
    @if (loading()) {
      <span class="ui-button__spinner" aria-hidden="true"></span>
    }
    @if (icon(); as name) {
      <ui-icon [name]="name" />
    }
    <ng-content select="[uiButtonIcon]" />
    <span class="ui-button__label"><ng-content /></span>
    <ng-content select="[uiButtonIconEnd]" />
    @if (iconEnd(); as name) {
      <ui-icon [name]="name" />
    }
  `,
  styleUrl: './button.css',
})
export class UiButton {
  /**
   * Style visuel du bouton : `primary`, `secondary`, `outline`, `ghost`, ou une couleur sémantique
   * `success` (validation), `warning` (action à risque), `danger` (action destructrice).
   */
  readonly variant = input<UiButtonVariant>('primary');
  /** Taille du bouton. */
  readonly size = input<UiSize>('md');
  /** Affiche un indicateur de chargement et bloque les clics (`aria-busy`). */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Occupe toute la largeur disponible. */
  readonly block = input(false, { transform: booleanAttribute });
  /** Icône avant le libellé : `préfixe:nom` d'un jeu déclaré avec `provideUiIcons()` (`fa:plus`, `material:add`…). */
  readonly icon = input<string>();
  /** Icône après le libellé. */
  readonly iconEnd = input<string>();
  /** Bouton carré ne contenant qu'une icône (pensez à `aria-label`). */
  readonly iconOnly = input(false, { transform: booleanAttribute });
}
