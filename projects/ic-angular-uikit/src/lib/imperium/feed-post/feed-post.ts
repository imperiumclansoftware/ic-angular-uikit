import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';
import { UiBranchBadge } from '../branch-badge/branch-badge';
import { UiImperiumBranch } from '../branch-badge/branches';
import { UiFramedAvatar } from '../member-card/framed-avatar';
import { UiOrnament } from '../ornament/ornament';

function toDate(value: Date | string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** Durée relative en français (« il y a 3 heures »). */
export function relativeTimeFr(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return 'à l’instant';
}

/**
 * Publication ou annonce du fil : auteur (avatar encadré, rôle), date relative (date complète en infobulle et en
 * `datetime`), titre, contenu, branches et actions. `kind="announcement"` met l'annonce en valeur (filet d'or,
 * fleuron, étiquette « Annonce ») ; `pinned` l'indique épinglée.
 *
 * ```html
 * <ui-feed-post author="Aurelius" authorRole="Empereur" [date]="post.date" heading="Nouvelle saison" kind="announcement">
 *   <p>…</p>
 * </ui-feed-post>
 * ```
 * @slot (défaut) - Contenu de la publication.
 * @slot [uiPostMedia] - Image ou média sous le texte.
 * @slot [uiPostActions] - Actions (réagir, commenter, partager).
 * @category Imperium
 */
@Component({
  selector: 'ui-feed-post',
  imports: [UiFramedAvatar, UiBranchBadge, UiOrnament],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-feed-post', '[class.ui-feed-post--announcement]': "kind() === 'announcement'" },
  template: `
    @if (kind() === 'announcement') {
      <ui-ornament kind="flourish" class="ui-feed-post__flourish" />
    }
    <header class="ui-feed-post__header">
      <ui-framed-avatar [name]="author()" [src]="avatar()" size="sm" />
      <div class="ui-feed-post__by">
        <span class="ui-feed-post__author">{{ author() }}</span>
        <span class="ui-feed-post__sub">
          @if (authorRole()) {
            <span>{{ authorRole() }}</span><span aria-hidden="true"> · </span>
          }
          @if (published(); as d) {
            <time [attr.datetime]="d.toISOString()" [attr.title]="fullDate()">{{ relative() }}</time>
          }
        </span>
      </div>
      @if (kind() === 'announcement' || pinned()) {
        <span class="ui-feed-post__tag">{{ pinned() ? 'Épinglée' : 'Annonce' }}</span>
      }
    </header>
    @if (heading()) {
      <span class="ui-feed-post__title" role="heading" [attr.aria-level]="headingLevel()">{{ heading() }}</span>
    }
    <div class="ui-feed-post__content"><ng-content /></div>
    <ng-content select="[uiPostMedia]" />
    @if (branches().length) {
      <ul class="ui-feed-post__branches" aria-label="Branches">
        @for (branch of branches(); track branch) {
          <li><ui-branch-badge [branch]="branch" display="short" /></li>
        }
      </ul>
    }
    <footer class="ui-feed-post__actions"><ng-content select="[uiPostActions]" /></footer>
  `,
  styleUrl: './feed-post.css',
})
export class UiFeedPost {
  /** Auteur. */
  readonly author = input.required<string>();
  /** Rôle de l'auteur. */
  readonly authorRole = input<string>();
  /** Avatar de l'auteur. */
  readonly avatar = input<string>();
  /** Date de publication. */
  readonly date = input<Date | string | number>();
  /** Titre. */
  readonly heading = input<string>();
  /** Niveau de titre (`aria-level`). */
  readonly headingLevel = input(3, { transform: numberAttribute });
  /** `post` : publication ; `announcement` : annonce officielle mise en valeur. */
  readonly kind = input<'post' | 'announcement'>('post');
  /** Publication épinglée. */
  readonly pinned = input(false, { transform: booleanAttribute });
  /** Branches concernées. */
  readonly branches = input<readonly UiImperiumBranch[]>([]);
  /** Date de référence pour la durée relative (tests, démonstrations). */
  readonly now = input<Date>();

  protected readonly published = computed(() => toDate(this.date()));
  protected readonly relative = computed(() => {
    const date = this.published();
    return date ? relativeTimeFr(date, this.now() ?? new Date()) : '';
  });
  protected readonly fullDate = computed(() => {
    const date = this.published();
    return date ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(date) : '';
  });
}
