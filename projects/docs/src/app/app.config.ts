import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideUiIcons, provideUiKit } from 'ic-angular-uikit';
import { DOC_ICON_SETS } from './icons';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideUiKit({ defaultTheme: 'system', storageKey: 'ic-angular-uikit-docs-theme' }),
    provideUiIcons(DOC_ICON_SETS, { defaultSet: 'lucide' }),
  ],
};
