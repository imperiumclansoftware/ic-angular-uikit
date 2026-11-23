import { Component, signal } from '@angular/core';
import { UiBadge, UiButton, UiCard, UiCardHeader, UiLayout, UiLayoutFooter, UiLayoutHeader } from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';

/**
 * Page simple : largeur fixe ou pleine largeur
 * `ui-layout` occupe toute la hauteur (`100dvh`) ; seul le contenu défile, l'en-tête et le pied restent visibles. `content="fixed"` centre le contenu sur une largeur maximale (`--ui-layout-content-max`, ici 40rem), `content="full"` utilise toute la largeur ; la marge s'adapte sur mobile. Dans une vraie application : `<ui-layout>` à la racine, sans `[fullscreen]="false"`.
 * @order 1
 */
@Component({
  selector: 'doc-layout-page-example',
  imports: [UiLayout, UiLayoutHeader, UiLayoutFooter, UiButton, UiCard, UiCardHeader, UiBadge, DemoFrame],
  template: `
    <doc-demo-frame>
      <ui-layout class="demo" [fullscreen]="false" [landmarks]="false" contentLabel="Contenu (page simple)" [content]="width()">
        <header uiLayoutHeader>
          <strong>Mon application</strong>
          <span class="spacer"></span>
          <div class="switch" role="group" aria-label="Largeur du contenu">
            <button uiButton size="sm" [variant]="width() === 'fixed' ? 'primary' : 'outline'" [attr.aria-pressed]="width() === 'fixed'" (click)="width.set('fixed')">
              Largeur fixe
            </button>
            <button uiButton size="sm" [variant]="width() === 'full' ? 'primary' : 'outline'" [attr.aria-pressed]="width() === 'full'" (click)="width.set('full')">
              Pleine largeur
            </button>
          </div>
        </header>

        <h2 class="title">Tableau de bord <ui-badge tone="neutral">content="{{ width() }}"</ui-badge></h2>
        <div class="grid">
          @for (card of cards; track card) {
            <ui-card appearance="outlined">
              <strong uiCardHeader>{{ card }}</strong>
              Contenu de la carte.
            </ui-card>
          }
        </div>
        <p class="long">Faites défiler : l'en-tête et le pied restent en place, seul le contenu défile.</p>

        <footer uiLayoutFooter>© 2026 · Pied de page</footer>
      </ui-layout>
    </doc-demo-frame>
  `,
  styles: `
    /* Largeur maximale réduite pour que l'écart soit visible dans l'aperçu (défaut : 72rem). */
    .demo { --ui-layout-content-max: 40rem; }
    .spacer { flex: 1; }
    .switch { display: flex; gap: 0.25rem; }
    .title { display: flex; align-items: center; gap: 0.75rem; margin: 0 0 1rem; font-size: 1.25rem; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); }
    .long { min-height: 30rem; color: var(--ui-color-text-muted); }
  `,
})
export class LayoutPageExample {
  protected readonly width = signal<'fixed' | 'full'>('fixed');
  protected readonly cards = ['Ventes', 'Visites', 'Commandes', 'Retours', 'Stock', 'Avis'];
}
