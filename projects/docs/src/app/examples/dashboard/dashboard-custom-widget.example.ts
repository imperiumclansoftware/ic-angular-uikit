import { Component, computed, signal } from '@angular/core';
import {
  UiDashboard,
  UiDashboardItem,
  UiTextField,
  UiWidgetBack,
  UiWidgetDefinition,
  UiWidgetFront,
  UiWidgetSettings,
  injectUiWidgetContext,
} from 'ic-angular-uikit';

// ---------------------------------------------------------------------------------------------
// 1. Les réglages du widget : un objet JSON simple, enregistré avec la disposition.
// ---------------------------------------------------------------------------------------------
interface GoalConfig {
  label: string;
  target: number;
  current: number;
}

// ---------------------------------------------------------------------------------------------
// 2. Le composant du widget : il ne rend rien lui-même, il déclare ses faces avec trois gabarits.
//    - uiWidgetFront    : recto (obligatoire) ;
//    - uiWidgetBack     : verso (facultatif — sans verso, pas de bouton « Retourner ») ;
//    - uiWidgetSettings : réglages, affichés dans la colonne « Personnaliser » (facultatif).
//    injectUiWidgetContext() donne les réglages (config), la taille, et updateConfig() pour les modifier.
// ---------------------------------------------------------------------------------------------
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- préfixe « app » : code à copier dans votre application.
  selector: 'app-goal-widget',
  imports: [UiWidgetFront, UiWidgetBack, UiWidgetSettings, UiTextField],
  template: `
    <ng-template uiWidgetFront>
      <div class="goal" [class.goal--wide]="ctx.size().w >= 4">
        <svg class="ring" viewBox="0 0 36 36" role="img" [attr.aria-label]="percent() + ' % de l’objectif atteint'">
          <circle cx="18" cy="18" r="15.9" class="track" />
          <circle cx="18" cy="18" r="15.9" class="fill" [attr.stroke-dasharray]="percent() + ' 100'" />
          <text x="18" y="21" text-anchor="middle">{{ percent() }} %</text>
        </svg>
        <div>
          <p class="label">{{ ctx.config().label }}</p>
          <p class="figures">{{ ctx.config().current }} / {{ ctx.config().target }}</p>
        </div>
      </div>
    </ng-template>

    <ng-template uiWidgetBack>
      <p>Reste <strong>{{ remaining() }}</strong> pour atteindre l’objectif « {{ ctx.config().label }} ».</p>
      <button type="button" class="link" (click)="ctx.updateConfig({ current: ctx.config().current + 1 })">+ 1</button>
    </ng-template>

    <ng-template uiWidgetSettings>
      <ui-text-field label="Intitulé" size="sm" [value]="ctx.config().label" (valueChange)="ctx.updateConfig({ label: $event })" />
      <ui-text-field label="Objectif" type="number" size="sm" [value]="'' + ctx.config().target" (valueChange)="setNumber('target', $event)" />
      <ui-text-field label="Réalisé" type="number" size="sm" [value]="'' + ctx.config().current" (valueChange)="setNumber('current', $event)" />
    </ng-template>
  `,
  styles: `
    .goal { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; height: 100%; justify-content: center; text-align: center; }
    .goal--wide { flex-direction: row; text-align: start; gap: 1rem; }
    .ring { width: 5.5rem; height: 5.5rem; transform: rotate(-90deg); }
    .ring text { transform: rotate(90deg); transform-origin: center; font-size: 0.5rem; font-weight: 700; fill: currentColor; }
    .track, .fill { fill: none; stroke-width: 3.5; }
    .track { stroke: var(--ui-color-surface-sunken); }
    .fill { stroke: var(--ui-color-success); stroke-linecap: round; }
    .label { margin: 0; font-weight: 600; }
    .figures { margin: 0; color: var(--ui-color-text-muted); font-variant-numeric: tabular-nums; }
    .link { padding: 0; border: 0; background: none; color: var(--ui-color-primary-text); font: inherit; text-decoration: underline; cursor: pointer; }
  `,
})
export class GoalWidget {
  protected readonly ctx = injectUiWidgetContext<GoalConfig>();
  protected readonly percent = computed(() => {
    const { target, current } = this.ctx.config();
    return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  });
  protected readonly remaining = computed(() => Math.max(0, this.ctx.config().target - this.ctx.config().current));

  protected setNumber(key: 'target' | 'current', value: string): void {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) this.ctx.updateConfig({ [key]: Math.round(n) });
  }
}

// ---------------------------------------------------------------------------------------------
// 3. La définition : type (clé enregistrée), titre et icône du catalogue, taille par défaut et bornes,
//    réglages initiaux. On la passe au tableau de bord avec les autres définitions.
// ---------------------------------------------------------------------------------------------
export const GOAL_WIDGET: UiWidgetDefinition<GoalConfig> = {
  type: 'goal',
  title: 'Objectif',
  description: 'Progression vers un objectif chiffré.',
  icon: 'lucide:star',
  component: GoalWidget,
  // Titre par défaut tiré des réglages (sinon tous les widgets s'appelleraient « Objectif »).
  titleFor: (config) => config.label || 'Objectif',
  defaultSize: { w: 3, h: 2 },
  minW: 2,
  minH: 2,
  maxH: 4,
  defaultConfig: { label: 'Nouveaux clients', target: 50, current: 0 },
};

/**
 * Créer son propre widget
 * Un widget est un composant Angular ordinaire qui déclare son recto, son verso et ses réglages avec trois `ng-template` (`uiWidgetFront`, `uiWidgetBack`, `uiWidgetSettings`) et lit ses réglages avec `injectUiWidgetContext<MaConfig>()`. Il suffit ensuite de le décrire dans une `UiWidgetDefinition` et de la passer à `[widgets]`. Ouvrez « Voir le code » : les trois étapes sont commentées. Essayez : « Configurer » le widget, changez l’objectif, retournez la carte.
 * @order 2
 */
@Component({
  selector: 'doc-dashboard-custom-widget-example',
  imports: [UiDashboard],
  template: `<ui-dashboard ariaLabel="Objectifs (démo)" [widgets]="widgets" [(items)]="items" />`,
})
export class DashboardCustomWidgetExample {
  protected readonly widgets = [GOAL_WIDGET];
  protected readonly items = signal<UiDashboardItem[]>([
    { id: 'clients', type: 'goal', x: 0, y: 0, w: 4, h: 2, config: { label: 'Nouveaux clients', target: 50, current: 32 } },
    { id: 'avis', type: 'goal', x: 4, y: 0, w: 3, h: 2, config: { label: 'Avis 5 étoiles', target: 20, current: 18 } },
  ]);
}
