import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

export interface EventLogEntry {
  id: number;
  time: string;
  name: string;
  payload: string;
}

/** Journal d'événements utilisé par les exemples pour montrer ce qu'émettent les composants. */
export class EventLog {
  private nextId = 0;
  readonly entries = signal<EventLogEntry[]>([]);

  /** Ajoute une entrée « (nom) payload ». */
  add(name: string, payload?: unknown): void {
    this.nextId += 1;
    const time = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    const entry = { id: this.nextId, time, name, payload: payload === undefined ? '' : JSON.stringify(payload) };
    this.entries.update((list) => [entry, ...list].slice(0, 8));
  }

  clear(): void {
    this.entries.set([]);
  }
}

@Component({
  selector: 'doc-event-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="log" aria-live="polite">
      <div class="log__head">
        <span>Événements émis</span>
        @if (log().entries().length) {
          <button type="button" (click)="log().clear()">Vider</button>
        }
      </div>
      @for (entry of log().entries(); track entry.id) {
        <div class="log__line">
          <span class="log__time">{{ entry.time }}</span>
          <span class="log__name">({{ entry.name }})</span>
          <span class="log__payload">{{ entry.payload }}</span>
        </div>
      } @empty {
        <div class="log__empty">Interagissez avec le composant…</div>
      }
    </div>
  `,
  styles: `
    .log {
      margin-top: var(--ui-space-4);
      padding: var(--ui-space-2) var(--ui-space-3);
      border: 1px dashed var(--ui-color-border-strong);
      border-radius: var(--ui-radius-md);
      font-family: var(--ui-font-family-mono);
      font-size: var(--ui-font-size-xs);
      min-height: 4.5rem;
    }
    .log__head {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--ui-space-1);
      color: var(--ui-color-text-subtle);
      font-family: var(--ui-font-family);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .log__head button { border: 0; background: none; color: var(--ui-color-primary-text); cursor: pointer; font: inherit; }
    .log__line { display: flex; gap: var(--ui-space-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .log__time { color: var(--ui-color-text-subtle); }
    .log__name { color: var(--ui-color-primary-text); font-weight: 600; }
    .log__payload { color: var(--ui-color-text-muted); overflow: hidden; text-overflow: ellipsis; }
    .log__empty { color: var(--ui-color-text-subtle); font-style: italic; }
  `,
})
export class EventLogView {
  readonly log = input.required<EventLog>();
}
