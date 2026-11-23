import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';
import { UiArabesqueFrame, UiArabesqueFrameVariant } from '../arabesque-frame/arabesque-frame';
import { UiBranchBadge } from '../branch-badge/branch-badge';
import { UiImperiumBranch } from '../branch-badge/branches';

/** Statut d'un événement. */
export type UiEventStatus = 'upcoming' | 'live' | 'past' | 'cancelled';

const STATUS: Record<UiEventStatus, string> = { upcoming: 'À venir', live: 'En cours', past: 'Terminé', cancelled: 'Annulé' };

function toDate(value: Date | string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Carte d'événement ou de rencontre : médaillon de date, titre, horaire, lieu, branches, participants et statut
 * (calculé depuis les dates, ou forcé : `cancelled`). Cadre à volutes discrètes.
 *
 * ```html
 * <ui-event-card heading="Tournoi de printemps" [start]="'2026-04-12T18:00'" location="Discord" [branches]="['joueurs']" />
 * ```
 * @slot (défaut) - Description.
 * @slot [uiEventActions] - Actions (S'inscrire…).
 * @category Imperium
 */
@Component({
  selector: 'ui-event-card',
  imports: [UiArabesqueFrame, UiBranchBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-event-card', '[class]': "'ui-event-card--' + resolvedStatus()" },
  template: `
    <ui-arabesque-frame [variant]="variant()" ornament="corners" class="ui-event-card__frame">
      <div class="ui-event-card__layout">
        @if (startDate(); as date) {
          <time class="ui-event-card__date" [attr.datetime]="date.toISOString()" aria-hidden="true">
            <span class="ui-event-card__day">{{ date.getDate() }}</span>
            <span class="ui-event-card__month">{{ month(date) }}</span>
          </time>
        }
        <div class="ui-event-card__main">
          <span class="ui-event-card__status">{{ statusLabel() }}</span>
          <span class="ui-event-card__title" role="heading" [attr.aria-level]="headingLevel()">{{ heading() }}</span>
          <dl class="ui-event-card__meta">
            @if (when()) {
              <div><dt>Date</dt><dd>{{ when() }}</dd></div>
            }
            @if (location()) {
              <div><dt>Lieu</dt><dd>{{ location() }}</dd></div>
            }
            @if (attendees() !== undefined) {
              <div><dt>Participants</dt><dd>{{ attendees() }}{{ capacity() ? ' / ' + capacity() : '' }}</dd></div>
            }
          </dl>
          <div class="ui-event-card__description"><ng-content /></div>
          @if (branches().length) {
            <ul class="ui-event-card__branches" aria-label="Branches concernées">
              @for (branch of branches(); track branch) {
                <li><ui-branch-badge [branch]="branch" display="short" /></li>
              }
            </ul>
          }
          <div class="ui-event-card__actions"><ng-content select="[uiEventActions]" /></div>
        </div>
      </div>
    </ui-arabesque-frame>
  `,
  styleUrl: './event-card.css',
})
export class UiEventCard {
  /** Titre. */
  readonly heading = input.required<string>();
  /** Niveau de titre (`aria-level`). */
  readonly headingLevel = input(3, { transform: numberAttribute });
  /** Début (Date, chaîne ISO ou timestamp). */
  readonly start = input<Date | string | number>();
  /** Fin. */
  readonly end = input<Date | string | number>();
  /** Lieu (salle, serveur, ville…). */
  readonly location = input<string>();
  /** Branches concernées. */
  readonly branches = input<readonly UiImperiumBranch[]>([]);
  /** Nombre d'inscrits. */
  readonly attendees = input(undefined, { transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v)) });
  /** Nombre de places. */
  readonly capacity = input(undefined, { transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v)) });
  /** Statut forcé (sinon calculé depuis les dates). */
  readonly status = input<UiEventStatus>();
  /** Couleur du cadre (défaut : `standard`). */
  readonly variant = input<UiArabesqueFrameVariant>('standard');
  /** Date de référence pour le statut (tests, démonstrations). */
  readonly now = input<Date>();

  protected readonly startDate = computed(() => toDate(this.start()));
  private readonly endDate = computed(() => toDate(this.end()));
  protected readonly resolvedStatus = computed<UiEventStatus>(() => {
    const forced = this.status();
    if (forced) return forced;
    const now = (this.now() ?? new Date()).getTime();
    const start = this.startDate()?.getTime();
    const end = this.endDate()?.getTime() ?? (start !== undefined ? start + 2 * 3600_000 : undefined);
    if (start === undefined) return 'upcoming';
    if (now < start) return 'upcoming';
    return end !== undefined && now <= end ? 'live' : 'past';
  });
  protected readonly statusLabel = computed(() => STATUS[this.resolvedStatus()]);
  protected readonly when = computed(() => {
    const start = this.startDate();
    if (!start) return '';
    const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(start);
    const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const end = this.endDate();
    const sameDay = end && end.toDateString() === start.toDateString();
    return `${day}, ${time.format(start)}${end ? (sameDay ? ` – ${time.format(end)}` : ` – ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(end)}`) : ''}`;
  });

  protected month(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
  }
}
