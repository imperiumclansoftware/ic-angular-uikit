import { ElementRef, afterNextRender, inject, isDevMode } from '@angular/core';

/**
 * En développement, avertit si un champ n'a aucun nom accessible (ni `label`, ni `ariaLabel`, ni `aria-labelledby`).
 * Un placeholder ne remplace pas un libellé : les lecteurs d'écran l'ignorent souvent.
 * @internal
 */
export function warnIfUnlabelled(component: string, hasName: () => boolean): void {
  if (!isDevMode()) {
    return;
  }
  const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  afterNextRender(() => {
    if (!hasName() && !host.hasAttribute('aria-labelledby')) {
      console.warn(
        `[ic-angular-uikit] <${component}> sans libellé : renseignez \`label\` (ou \`ariaLabel\` si le libellé visible est ailleurs). ` +
          'Un placeholder ne remplace pas un libellé.',
        host,
      );
    }
  });
}
