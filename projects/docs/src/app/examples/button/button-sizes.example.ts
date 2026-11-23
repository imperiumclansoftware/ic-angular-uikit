import { Component } from '@angular/core';
import { UiButton } from 'ic-angular-uikit';

/**
 * Tailles, icônes et lien
 * Les icônes se projettent avec `uiButtonIcon` / `uiButtonIconEnd`. `uiButton` s'applique aussi sur un `<a>`.
 * @order 2
 */
@Component({
  selector: 'doc-button-sizes-example',
  imports: [UiButton],
  template: `
    <div class="ex-row">
      <button uiButton size="sm">Small</button>
      <button uiButton>Medium</button>
      <button uiButton size="lg">Large</button>
    </div>
    <div class="ex-row" style="margin-top: 1rem">
      <button uiButton variant="outline">
        <svg uiButtonIcon class="ex-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Ajouter
      </button>
      <a uiButton variant="ghost" href="https://angular.dev" target="_blank" rel="noopener">
        Documentation Angular
        <svg uiButtonIconEnd class="ex-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </a>
      <button uiButton iconOnly variant="secondary" aria-label="Paramètres">
        <svg class="ex-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      </button>
    </div>
  `,
})
export class ButtonSizesExample {}
