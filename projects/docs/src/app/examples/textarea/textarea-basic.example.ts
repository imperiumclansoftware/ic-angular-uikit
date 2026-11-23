import { Component, signal } from '@angular/core';
import { UiTextarea } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Libellé, compteur et événements
 * `[(value)]` lie le texte ; `maxLength` affiche un compteur ; `rows` fixe la hauteur. `(focusChange)` signale l'entrée et la sortie du champ.
 * @order 1
 */
@Component({
  selector: 'doc-textarea-basic-example',
  imports: [UiTextarea, EventLogView],
  template: `
    <div class="ex-stack">
      <ui-textarea
        label="Biographie"
        hint="Visible sur votre profil public"
        placeholder="Parlez-nous de vous…"
        maxLength="280"
        [(value)]="bio"
        (focusChange)="log.add('focusChange', $event)"
      />
      <ui-textarea label="Désactivé" disabled value="Texte non modifiable" rows="2" />
    </div>
    <p>{{ bio().length }} caractère(s)</p>
    <doc-event-log [log]="log" />
  `,
})
export class TextareaBasicExample {
  protected readonly bio = signal('');
  protected readonly log = new EventLog();
}
