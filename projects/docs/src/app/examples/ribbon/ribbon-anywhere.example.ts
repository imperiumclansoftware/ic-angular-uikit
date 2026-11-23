import { Component } from '@angular/core';
import { UiRibbon, UiRibbonContainer } from 'ic-angular-uikit';

/**
 * Sur n'importe quel élément, tailles et tons
 * `uiRibbonContainer` rend tout élément capable d'accueillir un ruban (image, bloc, en-tête…). Trois tailles : `sm`, `md`, `lg` ; ou une taille libre avec `--ui-ribbon-size`.
 * @order 3
 */
@Component({
  selector: 'doc-ribbon-anywhere-example',
  imports: [UiRibbon, UiRibbonContainer],
  template: `
    <div class="row">
      @for (item of items; track item.tone) {
        <div uiRibbonContainer class="tile" [style.background]="item.bg">
          <ui-ribbon [tone]="item.tone" [size]="item.size">{{ item.label }}</ui-ribbon>
          <span class="caption">size="{{ item.size }}" · tone="{{ item.tone }}"</span>
        </div>
      }
    </div>
  `,
  styles: `
    .row { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
    .tile { display: grid; place-items: end start; height: 8rem; padding: 0.75rem; border-radius: var(--ui-radius-lg); color: #fff; }
    .caption { font-size: 0.75rem; font-family: var(--ui-font-family-mono); background: rgb(0 0 0 / 0.45); padding: 0.1rem 0.4rem; border-radius: 4px; }
  `,
})
export class RibbonAnywhereExample {
  protected readonly items = [
    { tone: 'primary', size: 'sm', label: 'Pro', bg: 'linear-gradient(135deg,#1e3a8a,#6d28d9)' },
    { tone: 'success', size: 'md', label: 'En ligne', bg: 'linear-gradient(135deg,#065f46,#0e7490)' },
    { tone: 'warning', size: 'md', label: 'Bêta', bg: 'linear-gradient(135deg,#7c2d12,#a16207)' },
    { tone: 'danger', size: 'lg', label: 'Live', bg: 'linear-gradient(135deg,#7f1d1d,#9d174d)' },
    { tone: 'neutral', size: 'lg', label: 'Archivé', bg: 'linear-gradient(135deg,#1f2937,#475569)' },
  ] as const;
}
