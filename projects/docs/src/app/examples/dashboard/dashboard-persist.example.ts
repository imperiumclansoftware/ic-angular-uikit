import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  UiAlert,
  UiButton,
  UiDashboard,
  UiDashboardConfig,
  UiDashboardItem,
  UiDashboardLayout,
  UiDashboardToolbar,
  sanitizeDashboardLayout,
} from 'ic-angular-uikit';
import { DEMO_WIDGETS } from './demo-widgets';

type SaveState = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

const DEFAULT_LAYOUT: UiDashboardItem[] = [
  { id: 'ca', type: 'kpi', x: 0, y: 0, w: 4, h: 2, config: { metric: 'revenue' } },
  { id: 'visiteurs', type: 'kpi', x: 4, y: 0, w: 4, h: 2, config: { metric: 'visitors' } },
  { id: 'note', type: 'note', x: 8, y: 0, w: 4, h: 2, config: { text: 'Déplacez-moi, puis rechargez la page de doc : la disposition revient.' } },
];

/**
 * Simulation d'API pour la démo (mémoire de la page, latence de 400 ms). Dans une application, remplacez-la par les
 * appels HTTP de l'onglet « Côté serveur » : GET / PUT / DELETE `/api/dashboards/{clé}`.
 */
const fakeServer = new Map<string, string>();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const api = {
  async load(key: string): Promise<unknown | null> {
    await delay(400);
    const json = fakeServer.get(key);
    return json ? JSON.parse(json) : null; // 404 → null : disposition par défaut
  },
  async save(key: string, layout: UiDashboardLayout): Promise<void> {
    await delay(400);
    fakeServer.set(key, JSON.stringify(layout));
  },
  async reset(key: string): Promise<void> {
    await delay(200);
    fakeServer.delete(key);
  },
};

/**
 * Enregistrer la configuration de l'utilisateur
 * Au chargement, la disposition enregistrée est relue puis **validée** avec `sanitizeDashboardLayout()` (types connus, tailles bornées, chevauchements résolus) — à faire aussi côté serveur. Chaque `layoutChange` déclenche un enregistrement différé (800 ms après la dernière modification, un seul appel pour une rafale de déplacements). Ici l'API est simulée en mémoire : modifiez le tableau de bord, changez de page de doc puis revenez. Le code HTTP et serveur (Angular, Symfony, Node.js, PHP) est dans l'onglet « Côté serveur ».
 * @order 3
 */
@Component({
  selector: 'doc-dashboard-persist-example',
  imports: [UiDashboard, UiDashboardToolbar, UiDashboardConfig, UiButton, UiAlert],
  template: `
    @if (state() === 'error') {
      <ui-alert tone="danger" class="alert">La disposition n'a pas pu être enregistrée. Vos modifications seront renvoyées à la prochaine action.</ui-alert>
    }
    <ui-dashboard ariaLabel="Mon tableau de bord (démo enregistrée)" [widgets]="widgets" [(items)]="items" (layoutChange)="scheduleSave($event)">
      <p uiDashboardToolbar class="status" role="status">{{ statusText() }}</p>
      <section uiDashboardConfig class="reset">
        <button uiButton type="button" variant="outline" size="sm" icon="lucide:undo-2" (click)="reset()">Revenir à la disposition par défaut</button>
      </section>
    </ui-dashboard>
  `,
  styles: `
    .alert { display: block; margin-bottom: 1rem; }
    .status { margin: 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }
    .reset { padding-top: 1rem; border-top: 1px solid var(--ui-color-border); }
  `,
})
export class DashboardPersistExample {
  private readonly key = 'accueil';
  protected readonly widgets = DEMO_WIDGETS;
  protected readonly items = signal<UiDashboardItem[]>([]);
  protected readonly state = signal<SaveState>('loading');
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: UiDashboardLayout | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      if (this.pending) void this.flush(); // ne pas perdre la dernière modification en quittant la page
    });
    void this.load();
  }

  protected statusText(): string {
    return { loading: 'Chargement…', idle: 'Disposition par défaut', saving: 'Enregistrement…', saved: 'Disposition enregistrée', error: 'Échec de l’enregistrement' }[this.state()];
  }

  private async load(): Promise<void> {
    const raw = await api.load(this.key);
    // Données venues de l'extérieur : jamais utilisées telles quelles.
    const items = raw ? sanitizeDashboardLayout(raw, { columns: 12, types: this.widgets }) : [];
    this.items.set(items.length ? items : DEFAULT_LAYOUT);
    this.state.set(raw ? 'saved' : 'idle');
  }

  protected scheduleSave(layout: UiDashboardLayout): void {
    this.pending = layout;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 800);
  }

  private async flush(): Promise<void> {
    const layout = this.pending;
    if (!layout) return;
    this.pending = null;
    this.state.set('saving');
    try {
      await api.save(this.key, layout);
      this.state.set(this.pending ? 'saving' : 'saved');
    } catch {
      this.pending ??= layout;
      this.state.set('error');
    }
  }

  protected async reset(): Promise<void> {
    clearTimeout(this.timer);
    this.pending = null;
    await api.reset(this.key);
    this.items.set(DEFAULT_LAYOUT);
    this.state.set('idle');
  }
}
