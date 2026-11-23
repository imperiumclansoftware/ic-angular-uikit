import { Component } from '@angular/core';
import { UiArabesqueFrame, UiArabesqueFrameVariant } from 'ic-angular-uikit';

/**
 * Variantes du cadre
 * `standard` (filet doré discret), `imperial` (double filet, fleuron et lueur, pour les contenus d'honneur), et une variante par branche (`joueurs`, `developpeurs`, `communicants`, `cine`) qui reprend sa couleur. `heading` affiche un titre en Cinzel capitales (avec `headingLevel` pour la structure de la page).
 * @order 1
 */
@Component({
  selector: 'doc-frame-variants-example',
  imports: [UiArabesqueFrame],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      @for (v of variants; track v.variant) {
        <ui-arabesque-frame [variant]="v.variant" [heading]="v.heading" [headingLevel]="3">
          <p>{{ v.text }}</p>
          <code>variant="{{ v.variant }}"</code>
        </ui-arabesque-frame>
      }
    </div>
  `,
  styles: `
    .imp { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1.5rem; padding: 1.5rem; border-radius: var(--ui-radius-lg); }
    p { margin: 0 0 0.75rem; color: var(--ui-color-text-muted); }
    code { color: var(--ui-color-text-subtle); font-size: 0.75rem; }
  `,
})
export class FrameVariantsExample {
  protected readonly variants: { variant: UiArabesqueFrameVariant; heading: string; text: string }[] = [
    { variant: 'standard', heading: 'Chroniques', text: 'Les récits de nos campagnes passées.' },
    { variant: 'imperial', heading: 'Conseil impérial', text: 'Décisions et édits de l’Empereur.' },
    { variant: 'joueurs', heading: 'Arène', text: 'Tournois, classements et parties du soir.' },
    { variant: 'developpeurs', heading: 'Forge', text: 'Projets, dépôts et outils du clan.' },
    { variant: 'communicants', heading: 'Héraut', text: 'Annonces, réseaux et partenariats.' },
    { variant: 'cine', heading: 'Salle obscure', text: 'Séances, critiques et marathons.' },
  ];
}
