import { Component } from '@angular/core';
import { UiArabesqueFrame, UiButton, UiTextField } from 'ic-angular-uikit';

/**
 * Zones denses : ornements mesurés
 * Pour un formulaire, un tableau ou une longue liste, `ornament="corners"` réduit les volutes et la marge, `ornament="none"` ne garde que le filet. Les champs eux-mêmes restent sobres dans le thème : seules les couleurs changent, aucune arabesque ne gêne la lecture.
 * @order 2
 */
@Component({
  selector: 'doc-frame-dense-example',
  imports: [UiArabesqueFrame, UiTextField, UiButton],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <ui-arabesque-frame ornament="corners" heading="Candidature" [headingLevel]="3">
        <form class="form" (submit)="$event.preventDefault()">
          <ui-text-field label="Pseudo" placeholder="Valkyrie" />
          <ui-text-field label="Courriel" type="email" placeholder="toi@exemple.fr" />
          <ui-text-field label="Pourquoi nous rejoindre ?" />
          <button uiButton type="submit">Envoyer</button>
        </form>
      </ui-arabesque-frame>
      <ui-arabesque-frame ornament="none">
        <p>Filet seul (<code>ornament="none"</code>) : pour les listes longues.</p>
      </ui-arabesque-frame>
    </div>
  `,
  styles: `
    .imp { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1.5rem; align-items: start; padding: 1.5rem; border-radius: var(--ui-radius-lg); }
    .form { display: grid; gap: 0.75rem; }
    .form button { justify-self: start; }
    p { margin: 0; color: var(--ui-color-text-muted); }
  `,
})
export class FrameDenseExample {}
