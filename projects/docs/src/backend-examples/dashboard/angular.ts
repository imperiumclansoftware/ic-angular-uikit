// app.config.ts — le jeton CSRF (cookie XSRF-TOKEN) est renvoyé automatiquement dans l'en-tête X-XSRF-TOKEN.
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))],
};

// dashboard-store.ts — lecture, enregistrement différé et réinitialisation de la disposition d'un tableau de bord.
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, catchError, debounceTime, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { UiDashboardItem, UiDashboardLayout, UiWidgetDefinition, sanitizeDashboardLayout } from 'ic-angular-uikit';

export type SaveState = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

@Injectable()
export class DashboardStore {
  private readonly http = inject(HttpClient);
  private readonly changes = new Subject<UiDashboardLayout>();
  private pending: UiDashboardLayout | null = null;
  private key = '';

  /** État de l'enregistrement, à afficher (role="status"). */
  readonly state = signal<SaveState>('loading');

  constructor() {
    // Un seul PUT pour une rafale de modifications ; switchMap abandonne une requête devenue obsolète.
    const subscription = this.changes
      .pipe(
        debounceTime(800),
        tap(() => this.state.set('saving')),
        switchMap((layout) =>
          this.http.put<{ updatedAt: string }>(this.url(), layout).pipe(
            map(() => 'saved' as const),
            catchError((error: HttpErrorResponse) => {
              this.pending = layout; // renvoyée à la prochaine modification
              console.error('Enregistrement du tableau de bord impossible', error.status);
              return of('error' as const);
            }),
          ),
        ),
      )
      .subscribe((state) => {
        if (state === 'saved') this.pending = null;
        this.state.set(state);
      });
    inject(DestroyRef).onDestroy(() => {
      if (this.pending) this.http.put(this.url(), this.pending).subscribe(); // dernière modification
      subscription.unsubscribe();
    });
  }

  /** Charge la disposition enregistrée (validée), ou `fallback` si aucune (404) ou si elle est invalide. */
  async load(key: string, widgets: readonly UiWidgetDefinition<object>[], fallback: UiDashboardItem[]): Promise<UiDashboardItem[]> {
    this.key = key;
    this.state.set('loading');
    try {
      const raw = await firstValueFrom(this.http.get<unknown>(this.url()));
      // Données venues du réseau : on ne garde que ce qui est valide pour l'application.
      const items = sanitizeDashboardLayout(raw, { columns: 12, types: widgets });
      this.state.set('saved');
      return items.length ? items : fallback;
    } catch (error) {
      this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'idle' : 'error');
      return fallback;
    }
  }

  /** À appeler sur `(layoutChange)`. */
  save(layout: UiDashboardLayout): void {
    this.pending = layout;
    this.changes.next(layout);
  }

  /** Supprime la disposition enregistrée (retour à celle par défaut). */
  async reset(): Promise<void> {
    this.pending = null;
    await firstValueFrom(this.http.delete(this.url()));
    this.state.set('idle');
  }

  private url(): string {
    return `/api/dashboards/${encodeURIComponent(this.key)}`;
  }
}

// home-dashboard.ts — le tableau de bord de la page d'accueil.
import { Component } from '@angular/core';
import { UiButton, UiDashboard, UiDashboardConfig, UiDashboardToolbar } from 'ic-angular-uikit';
import { APP_WIDGETS } from './widgets'; // vos UiWidgetDefinition

const DEFAULT_LAYOUT: UiDashboardItem[] = [
  { id: 'ca', type: 'kpi', x: 0, y: 0, w: 4, h: 2, config: { metric: 'revenue' } },
  { id: 'taches', type: 'tasks', x: 4, y: 0, w: 8, h: 3 },
];

@Component({
  selector: 'app-home-dashboard',
  imports: [UiDashboard, UiDashboardToolbar, UiDashboardConfig, UiButton],
  providers: [DashboardStore],
  template: `
    <ui-dashboard ariaLabel="Mon tableau de bord" [widgets]="widgets" [(items)]="items" (layoutChange)="store.save($event)">
      <h1 uiDashboardToolbar>Accueil</h1>
      <p uiDashboardToolbar role="status">{{ labels[store.state()] }}</p>
      <section uiDashboardConfig>
        <button uiButton variant="outline" size="sm" (click)="reset()">Revenir à la disposition par défaut</button>
      </section>
    </ui-dashboard>
  `,
})
export class HomeDashboard {
  protected readonly store = inject(DashboardStore);
  protected readonly widgets = APP_WIDGETS;
  protected readonly items = signal<UiDashboardItem[]>([]);
  protected readonly labels: Record<SaveState, string> = {
    loading: 'Chargement…',
    idle: '',
    saving: 'Enregistrement…',
    saved: 'Disposition enregistrée',
    error: 'Échec de l’enregistrement',
  };

  constructor() {
    void this.store.load('accueil', this.widgets, DEFAULT_LAYOUT).then((items) => this.items.set(items));
  }

  protected async reset(): Promise<void> {
    await this.store.reset();
    this.items.set(DEFAULT_LAYOUT);
  }
}
