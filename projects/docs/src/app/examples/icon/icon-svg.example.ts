import { Component } from '@angular/core';
import { faBolt, faRocket } from '@fortawesome/free-solid-svg-icons';
import { faAngular, faGithub } from '@fortawesome/free-brands-svg-icons';
import { UiButton, UiIcon, fontAwesomeSvg, provideUiIcons, svgIcons } from 'ic-angular-uikit';

/**
 * Font Awesome en SVG, icônes maison et accessibilité
 * `provideUiIcons()` peut aussi se déclarer sur un composant. Ici, Font Awesome en SVG (seules les icônes importées entrent dans le bundle) et un logo maison. Une icône est décorative par défaut ; avec `label`, elle devient une image nommée. Taille : `size`, couleur : `color` CSS. Material Symbols : `--ui-icon-fill: 1` pour la version pleine.
 * @order 4
 */
@Component({
  selector: 'doc-icon-svg-example',
  imports: [UiIcon, UiButton],
  providers: [
    provideUiIcons([
      fontAwesomeSvg([faRocket, faBolt, faGithub, faAngular], 'fasvg'),
      svgIcons({ logo: 'M12 2 3 7v10l9 5 9-5V7Zm0 2.3 6.8 3.8L12 11.9 5.2 8.1ZM5 9.8l6 3.4v6.6l-6-3.4Zm8 10v-6.6l6-3.4v6.6Z' }, 'app'),
    ]),
  ],
  template: `
    <div class="ex-row">
      <ui-icon name="fasvg:rocket" size="2x" />
      <ui-icon name="fasvg:bolt" size="2x" class="warning" />
      <ui-icon name="fasvg:angular" size="2x" class="danger" />
      <ui-icon name="app:logo" size="2x" class="primary" label="Logo IC Angular UiKit" />
      <span class="material">
        <ui-icon name="material:favorite" size="2x" />
        <ui-icon name="material:favorite" size="2x" class="filled" />
      </span>
    </div>
    <div class="ex-row" style="margin-top: 1rem">
      <button uiButton icon="fasvg:github" variant="outline">Voir sur GitHub</button>
      <p class="sr">L'icône « Logo IC Angular UiKit » a un <code>label</code> : elle est annoncée comme une image. Les autres sont ignorées des lecteurs d'écran.</p>
    </div>
  `,
  styles: `
    .warning { color: var(--ui-color-warning-text); }
    .danger { color: var(--ui-color-danger-text); }
    .primary { color: var(--ui-color-primary-text); }
    .material { display: inline-flex; gap: 0.5rem; color: var(--ui-color-danger-text); }
    .filled { --ui-icon-fill: 1; }
    .sr { margin: 0; font-size: 0.8rem; color: var(--ui-color-text-muted); max-width: 32rem; }
  `,
})
export class IconSvgExample {}
