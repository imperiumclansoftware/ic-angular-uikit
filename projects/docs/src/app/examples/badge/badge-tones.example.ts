import { Component } from '@angular/core';
import { UiBadge } from 'ic-angular-uikit';

/**
 * Tons et apparences
 * Combinez `tone` (couleur sémantique) et `appearance` (`soft`, `solid`, `outline`).
 * @order 1
 */
@Component({
  selector: 'doc-badge-tones-example',
  imports: [UiBadge],
  template: `
    @for (appearance of appearances; track appearance) {
      <div class="ex-row" style="margin-bottom: 0.75rem">
        @for (tone of tones; track tone) {
          <ui-badge [tone]="tone" [appearance]="appearance">{{ tone }}</ui-badge>
        }
      </div>
    }
  `,
})
export class BadgeTonesExample {
  protected readonly tones = ['primary', 'neutral', 'success', 'warning', 'danger'] as const;
  protected readonly appearances = ['soft', 'solid', 'outline'] as const;
}
