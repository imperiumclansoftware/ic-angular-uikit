import { Component, signal } from '@angular/core';
import { UiBadge, UiButton, UiLayout, UiLayoutHeader, UiSidebar, UiSidebarHeader, UiSidebarState, UiSidebarToggle } from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';

/**
 * Colonne droite au-dessus du contenu
 * Un panneau de notifications : `position="right"`, `mode="over"` (il se superpose au contenu, avec un voile) et masqué par défaut (`state="closed"`). Échap ou un clic sur le voile le ferme et rend le focus au bouton d'ouverture ; pendant qu'il est ouvert, le contenu est inerte.
 * @order 3
 */
@Component({
  selector: 'doc-layout-right-example',
  imports: [UiLayout, UiLayoutHeader, UiSidebar, UiSidebarHeader, UiSidebarToggle, UiButton, UiBadge, DemoFrame],
  template: `
    <doc-demo-frame>
      <ui-layout [fullscreen]="false" [landmarks]="false" contentLabel="Contenu (colonne droite)" content="fixed">
        <header uiLayoutHeader>
          <strong>Boutique</strong>
          <span class="spacer"></span>
          <button uiButton variant="ghost" icon="lucide:bell" [uiSidebarToggle]="notifications">
            Notifications <ui-badge tone="danger" appearance="solid" pill>3</ui-badge>
          </button>
        </header>

        <ui-sidebar #notifications position="right" mode="over" ariaLabel="Notifications" [width]="320" [(state)]="state">
          <div uiSidebarHeader class="head">
            <strong>Notifications</strong>
            <button uiButton variant="ghost" size="sm" iconOnly icon="lucide:x" aria-label="Fermer les notifications" (click)="notifications.close()"></button>
          </div>
          <ul class="list">
            @for (n of items; track n.title) {
              <li><strong>{{ n.title }}</strong><span>{{ n.text }}</span></li>
            }
          </ul>
        </ui-sidebar>

        <h2>Catalogue</h2>
        <p>Le panneau s'ouvre par-dessus ce contenu, sans le déplacer. state = <code>{{ state() }}</code></p>
        <p class="filler">…</p>
      </ui-layout>
    </doc-demo-frame>
  `,
  styles: `
    .spacer { flex: 1; }
    .head { justify-content: space-between; border-bottom: 1px solid var(--ui-color-border); }
    .list { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; padding: 0; list-style: none; font-size: 0.875rem; }
    .list li { display: flex; flex-direction: column; padding: 0.5rem 0.75rem; border-radius: var(--ui-radius-md); background: var(--ui-color-surface-sunken); }
    .list span { color: var(--ui-color-text-muted); }
    h2 { margin-top: 0; }
    .filler { min-height: 20rem; }
  `,
})
export class LayoutRightExample {
  protected readonly state = signal<UiSidebarState>('closed');
  protected readonly items = [
    { title: 'Commande expédiée', text: 'La commande #1042 est en route.' },
    { title: 'Nouveau message', text: 'Ada vous a écrit au sujet du retour.' },
    { title: 'Stock faible', text: 'Plus que 3 exemplaires de « Lampe Atlas ».' },
  ];
}
