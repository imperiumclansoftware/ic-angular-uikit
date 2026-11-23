import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';
import { UiBranchBadge } from '../branch-badge/branch-badge';
import { UiImperiumBranch } from '../branch-badge/branches';
import { UiFramedAvatar } from './framed-avatar';

/** Statut de présence d'un membre. */
export type UiPresence = 'online' | 'away' | 'busy' | 'offline';

const PRESENCE: Record<UiPresence, string> = { online: 'En ligne', away: 'Absent', busy: 'Occupé', offline: 'Hors ligne' };

/**
 * Carte membre : avatar encadré, pseudo, rôle, badges de branches (un membre peut en avoir plusieurs) et statut de
 * présence (pastille de forme différente **et** texte). Avec `href`, le pseudo devient le lien du profil et toute
 * la carte est cliquable.
 *
 * ```html
 * <ui-member-card pseudo="Valkyrie" role="Officière" [branches]="['joueurs', 'cine']" presence="online" />
 * ```
 * @slot [uiMemberActions] - Actions (boutons) en pied de carte.
 * @category Imperium
 */
@Component({
  selector: 'ui-member-card',
  imports: [UiFramedAvatar, UiBranchBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-member-card', '[class.ui-member-card--link]': '!!href()' },
  template: `
    <ui-framed-avatar [name]="pseudo()" [src]="avatar()" size="lg" />
    <div class="ui-member-card__body">
      <span class="ui-member-card__pseudo" role="heading" [attr.aria-level]="headingLevel()">
        @if (href(); as link) {
          <a [href]="link">{{ pseudo() }}</a>
        } @else {
          {{ pseudo() }}
        }
      </span>
      @if (role()) {
        <span class="ui-member-card__role">{{ role() }}</span>
      }
      @if (presence(); as status) {
        <span class="ui-member-card__presence" [class]="'ui-member-card__presence--' + status">
          <span class="ui-member-card__dot" aria-hidden="true"></span>{{ presenceLabel() }}
        </span>
      }
    </div>
    @if (branches().length) {
      <ul class="ui-member-card__branches" aria-label="Branches">
        @for (branch of branches(); track branch) {
          <li><ui-branch-badge [branch]="branch" display="short" /></li>
        }
      </ul>
    }
    <div class="ui-member-card__actions"><ng-content select="[uiMemberActions]" /></div>
  `,
  styleUrl: './member-card.css',
})
export class UiMemberCard {
  /** Pseudo. */
  readonly pseudo = input.required<string>();
  /** Rôle dans le clan (Empereur, Officier, Membre…). */
  readonly role = input<string>();
  /** Image de l'avatar (initiales sinon). */
  readonly avatar = input<string>();
  /** Branches du membre (plusieurs possibles). */
  readonly branches = input<readonly UiImperiumBranch[]>([]);
  /** Statut de présence. */
  readonly presence = input<UiPresence>();
  /** Lien vers le profil. */
  readonly href = input<string>();
  /** Niveau de titre du pseudo (`aria-level`). */
  readonly headingLevel = input(3, { transform: numberAttribute });

  protected readonly presenceLabel = computed(() => {
    const presence = this.presence();
    return presence ? PRESENCE[presence] : '';
  });
}
