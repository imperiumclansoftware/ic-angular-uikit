import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { UiOrnament } from '../ornament/ornament';

/**
 * Avatar encadré : médaillon à double anneau doré et losange héraldique. Initiales si l'image manque ou ne se
 * charge pas. Décoratif (`alt=""`) : le nom est affiché à côté.
 *
 * ```html
 * <ui-framed-avatar name="Valkyrie" src="/avatars/valkyrie.webp" />
 * ```
 * @category Imperium
 */
@Component({
  selector: 'ui-framed-avatar',
  imports: [UiOrnament],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-framed-avatar', '[class]': "'ui-framed-avatar--' + size()", 'aria-hidden': 'true' },
  template: `
    <span class="ui-framed-avatar__ring">
      @if (src() && !failed()) {
        <img [src]="src()" alt="" decoding="async" loading="lazy" (error)="failed.set(true)" />
      } @else {
        <span class="ui-framed-avatar__initials">{{ initials() }}</span>
      }
    </span>
    <ui-ornament kind="crest" class="ui-framed-avatar__crest" />
  `,
  styles: `
    :host { --_s: 3.5rem; position: relative; display: inline-block; flex: none; width: var(--_s); height: var(--_s); }
    :host(.ui-framed-avatar--sm) { --_s: 2.5rem; }
    :host(.ui-framed-avatar--lg) { --_s: 5rem; }
    .ui-framed-avatar__ring {
      display: grid;
      place-items: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border: 2px solid var(--ui-ornament-color, var(--ui-color-primary));
      border-radius: 50%;
      background: var(--ui-color-surface-raised);
      box-shadow: 0 0 0 3px var(--ui-color-surface), 0 0 0 4px var(--ui-ornament-color-soft, color-mix(in srgb, var(--ui-color-primary) 40%, transparent));
    }
    img { width: 100%; height: 100%; object-fit: cover; }
    .ui-framed-avatar__initials { color: var(--ui-color-text); font-family: var(--ui-font-family-display, inherit); font-size: calc(var(--_s) * 0.34); font-weight: 700; }
    .ui-framed-avatar__crest { position: absolute; bottom: -0.3rem; left: 50%; width: calc(var(--_s) * 0.24); height: calc(var(--_s) * 0.24); translate: -50% 0; background: var(--ui-color-surface); border-radius: 50%; }
    /* Petite taille : le losange masquerait les initiales. */
    :host(.ui-framed-avatar--sm) .ui-framed-avatar__crest { display: none; }
  `,
})
export class UiFramedAvatar {
  /** Nom (pour les initiales). */
  readonly name = input.required<string>();
  /** Image de l'avatar. */
  readonly src = input<string>();
  /** Taille. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly failed = signal(false);
  protected readonly initials = computed(() =>
    this.name()
      .trim()
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?',
  );
}
