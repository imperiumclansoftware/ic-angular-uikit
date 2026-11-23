import { InjectionToken, Signal } from '@angular/core';

/**
 * Conteneur capable de replier les menus horizontaux (barre d'application en mode compact).
 * Fourni par `ui-app-bar` ; lu par `ui-menu`, qui passe alors en vertical.
 * @internal
 */
export const UI_MENU_HOST = new InjectionToken<{ readonly compact: Signal<boolean> }>('UI_MENU_HOST');
