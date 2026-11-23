import { Component } from '@angular/core';
import { UiAlert, UiAlertIcon } from 'ic-angular-uikit';

/**
 * Icône personnalisée (ng-template)
 * `ng-template uiAlertIcon` remplace l'icône ; le ton est transmis dans le contexte (`let-tone`).
 * @order 3
 */
@Component({
  selector: 'doc-alert-icon-template-example',
  imports: [UiAlert, UiAlertIcon],
  template: `
    <div class="ex-stack" style="max-width: 36rem">
      @for (tone of tones; track tone) {
        <ui-alert [tone]="tone">
          <ng-template uiAlertIcon let-t>
            <span class="emoji">{{ emoji[t] }}</span>
          </ng-template>
          Alerte « {{ tone }} » avec une icône fournie par le parent.
        </ui-alert>
      }
    </div>
  `,
  styles: `.emoji { font-size: 1.1rem; line-height: 1.2; }`,
})
export class AlertIconTemplateExample {
  protected readonly tones = ['info', 'success', 'warning'] as const;
  protected readonly emoji: Record<string, string> = { info: '💡', success: '🎉', warning: '🔥', danger: '⛔' };
}
