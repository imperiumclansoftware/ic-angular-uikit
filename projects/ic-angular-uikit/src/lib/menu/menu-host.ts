import { InjectionToken, Signal } from '@angular/core';

/**
 * Conteneur capable de replier les menus horizontaux (barre d'application en mode compact).
 * Fourni par `ui-app-bar` ; lu par `ui-menu`, qui passe alors en vertical.
 * @internal
 */
export const UI_MENU_HOST = new InjectionToken<{ readonly compact: Signal<boolean> }>('UI_MENU_HOST');

/**
 * Menu contextuel parent (`ui-context-menu`) : les éléments prennent les rôles ARIA de menu
 * (`menuitem`, `menuitemcheckbox`…), les sous-menus s'ouvrent à côté et choisir un élément ferme le menu.
 * @internal
 */
export const UI_CONTEXT_MENU = new InjectionToken<{ close(restoreFocus?: boolean): void }>('UI_CONTEXT_MENU');
