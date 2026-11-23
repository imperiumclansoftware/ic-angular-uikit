import { Component } from '@angular/core';
import { UiBadge, UiCard, UiCardHeader, UiCardMedia } from 'ic-angular-uikit';

interface Article {
  title: string;
  excerpt: string;
  tag: string;
  minutes: number;
  hue: number;
}

/**
 * Liste d'articles
 * Des cartes horizontales empilées, média réduit avec `--ui-card-media-width`. La carte sans média reste sur une seule colonne, sans espace vide.
 * @order 4
 */
@Component({
  selector: 'doc-card-horizontal-list-example',
  imports: [UiCard, UiCardHeader, UiCardMedia, UiBadge],
  template: `
    <div class="list">
      @for (article of articles; track article.title) {
        <ui-card orientation="horizontal" appearance="outlined" class="item">
          <div uiCardMedia class="thumb" [style.background]="gradient(article.hue)" aria-hidden="true"></div>
          <header uiCardHeader>
            <ui-badge tone="neutral">{{ article.tag }}</ui-badge>
            <h4>{{ article.title }}</h4>
          </header>
          <p>{{ article.excerpt }}</p>
          <small>Lecture : {{ article.minutes }} min</small>
        </ui-card>
      }
      <ui-card orientation="horizontal" appearance="filled">
        <h4 uiCardHeader>Carte horizontale sans média</h4>
        <p>Elle garde une seule colonne : aucune place n'est réservée pour un média absent.</p>
      </ui-card>
    </div>
  `,
  styles: `
    .list { display: flex; flex-direction: column; gap: 1rem; max-width: 46rem; }
    .item { --ui-card-media-width: 9rem; --ui-card-padding: 1rem; }
    .thumb { min-height: 7rem; }
    h4 { margin: 0.35rem 0 0; font-size: 1rem; }
    p { margin: 0 0 0.35rem; color: var(--ui-color-text-muted); font-size: 0.875rem; }
    small { color: var(--ui-color-text-subtle); }
  `,
})
export class CardHorizontalListExample {
  protected readonly articles: Article[] = [
    { title: 'Les signaux dans Angular', excerpt: 'Comprendre signal, computed et effect pour un état réactif simple.', tag: 'Angular', minutes: 6, hue: 220 },
    { title: 'Requêtes de conteneur', excerpt: 'Adapter un composant à sa propre largeur plutôt qu’à celle de l’écran.', tag: 'CSS', minutes: 4, hue: 160 },
    { title: 'Concevoir pour tous', excerpt: 'Contraste, libellés, focus visible : les bases de la conception universelle.', tag: 'Accessibilité', minutes: 8, hue: 280 },
  ];

  protected gradient(hue: number): string {
    return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${hue + 40} 70% 60%))`;
  }
}
