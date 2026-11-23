import { Component, signal } from '@angular/core';
import {
  UiButton,
  UiLayout,
  UiLayoutFooter,
  UiLayoutHeader,
  UiMenu,
  UiMenuItem,
  UiSidebar,
  UiSidebarHeader,
  UiSidebarToggle,
  UiTextField,
} from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';

/**
 * Deux colonnes
 * À gauche, un menu `static` qui se réduit en rail d'icônes (il ne peut pas être masqué) ; à droite, un panneau de propriétés `push`, redimensionnable, qui se masque complètement. Les deux boutons de l'en-tête pilotent chacun leur colonne. Sur mobile, les deux deviennent des tiroirs indépendants.
 * @order 4
 */
@Component({
  selector: 'doc-layout-both-example',
  imports: [UiLayout, UiLayoutHeader, UiLayoutFooter, UiSidebar, UiSidebarHeader, UiSidebarToggle, UiMenu, UiMenuItem, UiButton, UiTextField, DemoFrame],
  template: `
    <doc-demo-frame [height]="460">
      <ui-layout [fullscreen]="false" [landmarks]="false" contentLabel="Contenu (deux colonnes)">
        <header uiLayoutHeader>
          <button uiButton variant="ghost" iconOnly [icon]="nav.expanded() ? 'lucide:panel-left-close' : 'lucide:panel-left-open'" aria-label="Menu" [uiSidebarToggle]="nav"></button>
          <strong>Éditeur</strong>
          <span class="spacer"></span>
          <button uiButton variant="ghost" iconOnly [icon]="props.expanded() ? 'lucide:panel-right-close' : 'lucide:panel-right-open'" aria-label="Propriétés" [uiSidebarToggle]="props"></button>
        </header>

        <ui-sidebar #nav position="left" mode="static" collapseTo="rail" ariaLabel="Outils" [width]="200">
          <ui-menu ariaLabel="Outils">
            @for (tool of tools; track tool.label) {
              <button uiMenuItem [icon]="tool.icon" [active]="tool.label === current()" (click)="current.set(tool.label)">{{ tool.label }}</button>
            }
          </ui-menu>
        </ui-sidebar>

        <ui-sidebar #props position="right" mode="push" collapseTo="closed" resizable ariaLabel="Propriétés" [width]="280" [minWidth]="220" [maxWidth]="420">
          <div uiSidebarHeader><strong>Propriétés</strong></div>
          <div class="form">
            <ui-text-field label="Titre" size="sm" value="Rapport annuel" />
            <ui-text-field label="Auteur" size="sm" value="Ada Lovelace" />
          </div>
        </ui-sidebar>

        <h2>{{ current() }}</h2>
        <p>Zone de travail : elle s'élargit quand on réduit le menu ou masque les propriétés.</p>
        <div class="canvas" aria-hidden="true"></div>

        <footer uiLayoutFooter>Enregistré il y a 2 min</footer>
      </ui-layout>
    </doc-demo-frame>
  `,
  styles: `
    .spacer { flex: 1; }
    .form { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.25rem; }
    h2 { margin-top: 0; }
    .canvas { height: 14rem; border: 2px dashed var(--ui-color-border-control); border-radius: var(--ui-radius-lg); background: var(--ui-color-surface); }
  `,
})
export class LayoutBothExample {
  protected readonly current = signal('Documents');
  protected readonly tools = [
    { label: 'Documents', icon: 'lucide:file-text' },
    { label: 'Messages', icon: 'lucide:message-square' },
    { label: 'Équipe', icon: 'lucide:users' },
    { label: 'Réglages', icon: 'lucide:settings' },
  ];
}
