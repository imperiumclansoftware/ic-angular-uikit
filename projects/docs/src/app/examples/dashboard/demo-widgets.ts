import { Component, computed } from '@angular/core';
import {
  UiBadge,
  UiCheckbox,
  UiIcon,
  UiSelect,
  UiSelectOption,
  UiSwitch,
  UiTextarea,
  UiWidgetBack,
  UiWidgetCategory,
  UiWidgetDefinition,
  UiWidgetFront,
  UiWidgetSettings,
  injectUiWidgetContext,
} from 'ic-angular-uikit';

/* Widgets de démonstration du tableau de bord (données fictives). */

type Metric = 'revenue' | 'orders' | 'visitors';

const METRICS: Record<Metric, { label: string; unit: string; values: number[] }> = {
  revenue: { label: "Chiffre d'affaires", unit: ' €', values: [38200, 41500, 39800, 45100, 47900, 52300] },
  orders: { label: 'Commandes', unit: '', values: [812, 860, 790, 905, 948, 1012] },
  visitors: { label: 'Visiteurs', unit: '', values: [18400, 19900, 21300, 20800, 23500, 25100] },
};
const MONTHS = ['juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.'];
const format = (n: number, unit = '') => n.toLocaleString('fr-FR') + unit;
const METRIC_OPTIONS: UiSelectOption<Metric>[] = (Object.keys(METRICS) as Metric[]).map((m) => ({ value: m, label: METRICS[m].label }));

interface KpiConfig {
  metric: Metric;
}

/** Indicateur : valeur du mois et évolution ; au verso, l'historique. */
@Component({
  selector: 'doc-kpi-widget',
  imports: [UiWidgetFront, UiWidgetBack, UiWidgetSettings, UiSelect, UiBadge],
  template: `
    <ng-template uiWidgetFront>
      <p class="label">{{ data().label }} — {{ months.at(-1) }}</p>
      <p class="value">{{ format(last(), data().unit) }}</p>
      <ui-badge [tone]="trend() >= 0 ? 'success' : 'danger'" [icon]="trend() >= 0 ? 'lucide:arrow-right' : undefined">
        {{ trend() >= 0 ? '+' : '' }}{{ trend() }} % sur un mois
      </ui-badge>
    </ng-template>
    <ng-template uiWidgetBack>
      <table class="history">
        <caption>{{ data().label }}, 6 derniers mois</caption>
        <tbody>
          @for (value of data().values; track $index) {
            <tr><th scope="row">{{ months[$index] }}</th><td>{{ format(value, data().unit) }}</td></tr>
          }
        </tbody>
      </table>
    </ng-template>
    <ng-template uiWidgetSettings>
      <ui-select label="Indicateur" size="sm" [options]="options" [value]="ctx.config().metric" (valueChange)="ctx.updateConfig({ metric: $event ?? 'revenue' })" />
    </ng-template>
  `,
  styles: `
    .label { margin: 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }
    .value { margin: 0.25rem 0 0.75rem; font-size: 2rem; font-weight: 800; line-height: 1.1; }
    .history { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .history caption { margin-bottom: 0.5rem; text-align: start; font-weight: 600; }
    .history th, .history td { padding: 0.25rem 0; border-bottom: 1px solid var(--ui-color-border); text-align: start; font-weight: 400; }
    .history td { text-align: end; font-variant-numeric: tabular-nums; }
  `,
})
export class KpiWidget {
  protected readonly ctx = injectUiWidgetContext<KpiConfig>();
  protected readonly months = MONTHS;
  protected readonly options = METRIC_OPTIONS;
  protected readonly format = format;
  protected readonly data = computed(() => METRICS[this.ctx.config().metric] ?? METRICS.revenue);
  protected readonly last = computed(() => this.data().values.at(-1) ?? 0);
  protected readonly trend = computed(() => {
    const values = this.data().values;
    const previous = values.at(-2) ?? 1;
    return Math.round(((this.last() - previous) / previous) * 1000) / 10;
  });
}

interface ChartConfig {
  metric: Metric;
  showValues: boolean;
}

/** Graphique en barres ; au verso, les mêmes données en tableau (alternative accessible au graphique). */
@Component({
  selector: 'doc-chart-widget',
  imports: [UiWidgetFront, UiWidgetBack, UiWidgetSettings, UiSelect, UiSwitch],
  template: `
    <ng-template uiWidgetFront>
      <figure class="chart">
        <div class="bars" role="img" [attr.aria-label]="summary()">
          @for (value of data().values; track $index) {
            <div class="bar">
              @if (ctx.config().showValues) {
                <span class="bar-value">{{ short(value) }}</span>
              }
              <span class="bar-fill" [style.height.%]="(value / max()) * 100"></span>
              <span class="bar-label">{{ months[$index] }}</span>
            </div>
          }
        </div>
        <figcaption>{{ data().label }} — retournez la carte pour le tableau des valeurs.</figcaption>
      </figure>
    </ng-template>
    <ng-template uiWidgetBack>
      <table class="table">
        <caption>{{ data().label }}</caption>
        <thead><tr><th scope="col">Mois</th><th scope="col">Valeur</th></tr></thead>
        <tbody>
          @for (value of data().values; track $index) {
            <tr><td>{{ months[$index] }}</td><td>{{ format(value, data().unit) }}</td></tr>
          }
        </tbody>
      </table>
    </ng-template>
    <ng-template uiWidgetSettings>
      <ui-select label="Données" size="sm" [options]="options" [value]="ctx.config().metric" (valueChange)="ctx.updateConfig({ metric: $event ?? 'revenue' })" />
      <ui-switch size="sm" [checked]="ctx.config().showValues" (checkedChange)="ctx.updateConfig({ showValues: $event })">Afficher les valeurs</ui-switch>
    </ng-template>
  `,
  styles: `
    .chart { display: flex; flex-direction: column; height: 100%; margin: 0; }
    .bars { display: flex; flex: 1; align-items: stretch; gap: 0.5rem; min-height: 6rem; }
    .bar { display: flex; flex: 1; flex-direction: column; justify-content: flex-end; align-items: center; gap: 0.25rem; }
    .bar-fill { width: 100%; max-width: 3rem; min-height: 2px; border-radius: 4px 4px 0 0; background: var(--ui-color-primary); }
    .bar-value { font-size: 0.75rem; font-variant-numeric: tabular-nums; }
    .bar-label { color: var(--ui-color-text-muted); font-size: 0.75rem; }
    figcaption { margin-top: 0.5rem; color: var(--ui-color-text-muted); font-size: 0.75rem; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .table caption { margin-bottom: 0.5rem; text-align: start; font-weight: 600; }
    .table th, .table td { padding: 0.25rem 0.5rem; border-bottom: 1px solid var(--ui-color-border); text-align: start; }
    .table td:last-child, .table th:last-child { text-align: end; }
  `,
})
export class ChartWidget {
  protected readonly ctx = injectUiWidgetContext<ChartConfig>();
  protected readonly months = MONTHS;
  protected readonly options = METRIC_OPTIONS;
  protected readonly format = format;
  protected readonly data = computed(() => METRICS[this.ctx.config().metric] ?? METRICS.revenue);
  protected readonly max = computed(() => Math.max(...this.data().values));
  protected readonly summary = computed(
    () => `${this.data().label} de ${MONTHS[0]} à ${MONTHS.at(-1)} : de ${format(this.data().values[0], this.data().unit)} à ${format(this.data().values.at(-1) ?? 0, this.data().unit)}.`,
  );
  protected short(value: number): string {
    return value >= 1000 ? `${Math.round(value / 100) / 10} k` : String(value);
  }
}

interface TasksConfig {
  hideDone: boolean;
  done: string[];
}

const TASKS = ['Relancer les devis en attente', 'Préparer la revue mensuelle', 'Valider les congés', 'Mettre à jour le catalogue', 'Former les nouveaux arrivants'];

/** Liste de tâches ; les tâches cochées sont enregistrées dans les réglages du widget. */
@Component({
  selector: 'doc-tasks-widget',
  imports: [UiWidgetFront, UiWidgetBack, UiWidgetSettings, UiCheckbox, UiSwitch],
  template: `
    <ng-template uiWidgetFront>
      <ul class="tasks">
        @for (task of visible(); track task) {
          <li><ui-checkbox size="sm" [checked]="isDone(task)" (checkedChange)="toggle(task, $event)">{{ task }}</ui-checkbox></li>
        } @empty {
          <li class="empty">Tout est fait.</li>
        }
      </ul>
    </ng-template>
    <ng-template uiWidgetBack>
      <p class="stat"><strong>{{ ctx.config().done.length }}</strong> tâche(s) terminée(s) sur {{ tasks.length }}.</p>
      <progress [value]="ctx.config().done.length" [max]="tasks.length" aria-label="Avancement des tâches"></progress>
    </ng-template>
    <ng-template uiWidgetSettings>
      <ui-switch size="sm" [checked]="ctx.config().hideDone" (checkedChange)="ctx.updateConfig({ hideDone: $event })">Masquer les tâches terminées</ui-switch>
    </ng-template>
  `,
  styles: `
    .tasks { display: grid; gap: 0.25rem; margin: 0; padding: 0; list-style: none; }
    .empty { color: var(--ui-color-text-muted); }
    .stat { margin: 0 0 0.75rem; }
    progress { width: 100%; accent-color: var(--ui-color-primary); }
  `,
})
export class TasksWidget {
  protected readonly ctx = injectUiWidgetContext<TasksConfig>();
  protected readonly tasks = TASKS;
  protected readonly visible = computed(() => (this.ctx.config().hideDone ? TASKS.filter((t) => !this.isDone(t)) : TASKS));
  protected isDone(task: string): boolean {
    return this.ctx.config().done.includes(task);
  }
  protected toggle(task: string, done: boolean): void {
    const others = this.ctx.config().done.filter((t) => t !== task);
    this.ctx.updateConfig({ done: done ? [...others, task] : others });
  }
}

interface NoteConfig {
  text: string;
}

/** Note libre, modifiée dans la colonne « Personnaliser » (pas de verso). */
@Component({
  selector: 'doc-note-widget',
  imports: [UiWidgetFront, UiWidgetSettings, UiTextarea, UiIcon],
  template: `
    <ng-template uiWidgetFront>
      <p class="note"><ui-icon name="lucide:file-text" /> {{ ctx.config().text || 'Note vide : écrivez-la dans « Personnaliser ».' }}</p>
    </ng-template>
    <ng-template uiWidgetSettings>
      <ui-textarea label="Texte de la note" size="sm" [rows]="4" [value]="ctx.config().text" (valueChange)="ctx.updateConfig({ text: $event.slice(0, 500) })" hint="500 caractères maximum." />
    </ng-template>
  `,
  styles: `
    .note { margin: 0; white-space: pre-wrap; line-height: 1.5; }
    .note ui-icon { color: var(--ui-color-text-muted); vertical-align: -2px; }
  `,
})
export class NoteWidget {
  protected readonly ctx = injectUiWidgetContext<NoteConfig>();
}

/** Date du jour ; au verso, le numéro de semaine. */
@Component({
  selector: 'doc-today-widget',
  imports: [UiWidgetFront, UiWidgetBack, UiIcon],
  template: `
    <ng-template uiWidgetFront>
      <p class="day"><ui-icon name="lucide:calendar" /> {{ today }}</p>
    </ng-template>
    <ng-template uiWidgetBack>
      <p class="day">Semaine {{ week }}</p>
    </ng-template>
  `,
  styles: `
    .day { margin: 0; font-size: 1.125rem; font-weight: 600; text-transform: capitalize; }
    .day ui-icon { color: var(--ui-color-primary-text); vertical-align: -2px; }
  `,
})
export class TodayWidget {
  protected readonly today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  protected readonly week = (() => {
    const d = new Date();
    const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    return 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  })();
}

interface LinksConfig {
  showDescriptions: boolean;
}

const LINKS = [
  { label: 'Documentation', hint: 'Guides et API' },
  { label: 'Support', hint: 'Ouvrir un ticket' },
  { label: 'Facturation', hint: 'Factures et paiements' },
];

/** Raccourcis vers des pages fréquentes. */
@Component({
  selector: 'doc-links-widget',
  imports: [UiWidgetFront, UiWidgetSettings, UiSwitch],
  template: `
    <ng-template uiWidgetFront>
      <ul class="links">
        @for (link of links; track link.label) {
          <li>
            <a href="#" (click)="$event.preventDefault()">{{ link.label }}</a>
            @if (ctx.config().showDescriptions) {
              <span> — {{ link.hint }}</span>
            }
          </li>
        }
      </ul>
    </ng-template>
    <ng-template uiWidgetSettings>
      <ui-switch size="sm" [checked]="ctx.config().showDescriptions" (checkedChange)="ctx.updateConfig({ showDescriptions: $event })">Afficher les descriptions</ui-switch>
    </ng-template>
  `,
  styles: `
    .links { display: grid; gap: 0.375rem; margin: 0; padding: 0; list-style: none; font-size: 0.875rem; }
    .links a { color: var(--ui-color-primary-text); font-weight: 600; }
    .links span { color: var(--ui-color-text-muted); }
  `,
})
export class LinksWidget {
  protected readonly ctx = injectUiWidgetContext<LinksConfig>();
  protected readonly links = LINKS;
}

/** Catégories du catalogue : ordre, icône et description des tiroirs. */
export const DEMO_CATEGORIES: UiWidgetCategory[] = [
  { name: 'Indicateurs', icon: 'lucide:chart-column', description: 'Chiffres clés et graphiques' },
  { name: 'Organisation', icon: 'lucide:check', description: 'Tâches et notes' },
  { name: 'Outils', icon: 'lucide:settings', description: 'Date, raccourcis' },
];

/** Catalogue de la démo. */
export const DEMO_WIDGETS: UiWidgetDefinition<object>[] = [
  {
    type: 'kpi',
    category: 'Indicateurs',
    title: 'Indicateur',
    description: 'Valeur du mois et évolution.',
    icon: 'lucide:chart-column',
    component: KpiWidget,
    titleFor: (config: KpiConfig) => METRICS[config.metric]?.label ?? 'Indicateur',
    defaultSize: { w: 3, h: 2 },
    minW: 2,
    minH: 2,
    defaultConfig: { metric: 'revenue' } satisfies KpiConfig,
  },
  {
    type: 'chart',
    category: 'Indicateurs',
    title: 'Évolution',
    description: 'Graphique en barres, tableau au verso.',
    icon: 'lucide:chart-column',
    component: ChartWidget,
    defaultSize: { w: 6, h: 3 },
    minW: 3,
    minH: 3,
    defaultConfig: { metric: 'orders', showValues: true } satisfies ChartConfig,
  },
  {
    type: 'tasks',
    category: 'Organisation',
    title: 'Tâches',
    description: 'Liste à cocher.',
    icon: 'lucide:check',
    component: TasksWidget,
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    maxInstances: 1,
    defaultConfig: { hideDone: false, done: [] } satisfies TasksConfig,
  },
  {
    type: 'note',
    category: 'Organisation',
    title: 'Note',
    description: 'Texte libre.',
    icon: 'lucide:file-text',
    component: NoteWidget,
    defaultSize: { w: 3, h: 2 },
    minW: 2,
    defaultConfig: { text: '' } satisfies NoteConfig,
  },
  {
    type: 'today',
    category: 'Outils',
    title: 'Aujourd’hui',
    description: 'Date du jour, semaine au verso.',
    icon: 'lucide:calendar',
    component: TodayWidget,
    defaultSize: { w: 3, h: 1 },
    maxInstances: 1,
  },
  {
    type: 'links',
    category: 'Outils',
    title: 'Raccourcis',
    description: 'Liens vers les pages fréquentes.',
    icon: 'lucide:link',
    component: LinksWidget,
    defaultSize: { w: 3, h: 2 },
    minW: 2,
    defaultConfig: { showDescriptions: false } satisfies LinksConfig,
  },
];
