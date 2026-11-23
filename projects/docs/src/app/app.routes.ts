import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/getting-started'), title: 'Prise en main · IC Angular UiKit' },
  { path: 'theming', loadComponent: () => import('./pages/theming'), title: 'Thèmes · IC Angular UiKit' },
  { path: 'accessibility', loadComponent: () => import('./pages/accessibility'), title: 'Accessibilité · IC Angular UiKit' },
  { path: 'validation', loadComponent: () => import('./pages/validation'), title: 'Validation · IC Angular UiKit' },
  { path: 'components/:slug', loadComponent: () => import('./pages/component-page') },
  { path: '**', redirectTo: '' },
];
