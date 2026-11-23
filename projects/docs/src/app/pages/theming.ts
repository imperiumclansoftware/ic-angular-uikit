import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService, UI_SEASON_LABELS, UiAlert, UiButton, UiSeason, UiSwitch, seasonOf } from 'ic-angular-uikit';
import { TOKENS } from '../generated/tokens';
import { ApiView } from '../shared/api-view';
import { CodeBlock } from '../shared/code-block';
import { CORE_GROUP } from '../shared/nav';

@Component({
  selector: 'doc-theming',
  imports: [ApiView, CodeBlock, UiButton, UiAlert, UiSwitch, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theming.html',
  styleUrl: './theming.css',
})
export default class ThemingPage {
  protected readonly themeService = inject(ThemeService);
  protected readonly tokens = TOKENS;
  protected readonly coreEntries = CORE_GROUP?.entries ?? [];
  protected readonly coreTypes = CORE_GROUP?.types ?? [];

  protected readonly serviceSnippet = `import { Component, inject } from '@angular/core';
import { ThemeService, UiButton } from 'ic-angular-uikit';

@Component({
  selector: 'app-theme-toggle',
  imports: [UiButton],
  template: \`
    <button uiButton variant="outline" (click)="theme.toggle()">
      {{ theme.isDark() ? 'Passer en clair' : 'Passer en sombre' }}
    </button>
  \`,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}`;

  protected readonly subtreeSnippet = `<!-- Toute la page suit ThemeService, mais ce panneau reste sombre -->
<aside data-ui-theme="dark">
  <ui-card>…</ui-card>
</aside>`;

  protected readonly customSnippet = `/* src/themes/ocean.css — chargé après ic-angular-uikit.css */
[data-ui-theme='ocean'] {
  color-scheme: dark;
  --ui-color-bg: #04202c;
  --ui-color-surface: #072f3f;
  --ui-color-text: #e0f7fa;
  --ui-color-primary: #14b8a6;
  --ui-color-primary-hover: #2dd4bf;
  /* … reprenez la liste complète des jetons --ui-color-* ci-dessous */
}`;

  protected readonly customConfigSnippet = `provideUiKit({ themes: ['light', 'dark', 'ocean'] });

// puis
inject(ThemeService).setTheme('ocean');`;

  protected readonly overrideSnippet = `/* Ajuster un jeton pour tous les thèmes, ou un composant précis */
:root { --ui-radius-md: 4px; }
.checkout button[uiButton] { --ui-button-radius: 999px; }`;

  protected readonly today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  protected readonly seasons = (['winter', 'spring', 'summer', 'autumn'] as UiSeason[]).map((id) => ({ id, label: UI_SEASON_LABELS[id] }));
  protected readonly previewed = signal<UiSeason | null>(null);
  /** Saison réelle du jour (indépendante de l'aperçu). */
  protected readonly todayLabel = UI_SEASON_LABELS[seasonOf(new Date())];
  protected readonly seasonLabel = computed(() => UI_SEASON_LABELS[this.themeService.season()]);

  protected readonly seasonConfigSnippet = `provideUiKit({
  defaultTheme: 'season-light', // ou laisser le choix à l'utilisateur
  hemisphere: 'north',          // 'south' : saisons inversées
  seasonEffects: 'auto',        // désactivées si l'utilisateur réduit les animations
});

<!-- à la racine de l'application, une seule fois -->
<ui-season-effects intensity="low" />`;

  protected preview(season: UiSeason | null): void {
    this.previewed.set(season);
    this.themeService.previewSeason(season);
  }

  protected primaryOf(mode: string, season: string): string {
    return this.tokens.seasons.find((s) => s.mode === mode && s.season === season)?.tokens['--ui-color-primary'] ?? '';
  }

  protected isColor(value: string): boolean {
    return /^(#|rgb|hsl)/.test(value);
  }
}
