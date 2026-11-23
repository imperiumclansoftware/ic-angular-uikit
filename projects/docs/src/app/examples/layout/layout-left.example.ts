import { Component, signal } from '@angular/core';
import {
  UiBadge,
  UiButton,
  UiIcon,
  UiLayout,
  UiLayoutHeader,
  UiMenu,
  UiMenuGroup,
  UiMenuItem,
  UiRadio,
  UiRadioGroup,
  UiSidebar,
  UiSidebarFooter,
  UiSidebarHeader,
  UiSidebarMode,
  UiSidebarState,
  UiSidebarToggle,
  UiSwitch,
} from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';

/**
 * Colonne gauche avec menu (configurateur)
 * Essayez les combinaisons : `mode` (`static` toujours visible, `push` pousse le contenu, `over` passe au-dessus), `collapseTo` (rail d'icônes ou masquage complet) et `resizable` (faites glisser le bord droit de la colonne, ou utilisez les flèches du clavier sur la poignée). Le bouton ☰ appelle `toggle()` via `uiSidebarToggle`. Réduisez l'aperçu sous 768 px : la colonne devient un tiroir.
 * @order 2
 */
@Component({
  selector: 'doc-layout-left-example',
  imports: [
    UiLayout, UiLayoutHeader, UiSidebar, UiSidebarHeader, UiSidebarFooter, UiSidebarToggle,
    UiMenu, UiMenuGroup, UiMenuItem, UiButton, UiIcon, UiBadge, UiRadioGroup, UiRadio, UiSwitch, DemoFrame,
  ],
  template: `
    <div class="controls">
      <ui-radio-group label="mode" orientation="horizontal" size="sm" [(value)]="mode">
        <ui-radio value="static">static</ui-radio>
        <ui-radio value="push">push</ui-radio>
        <ui-radio value="over">over</ui-radio>
      </ui-radio-group>
      <ui-radio-group label="collapseTo" orientation="horizontal" size="sm" [(value)]="collapseTo">
        <ui-radio value="rail">rail (icônes)</ui-radio>
        <ui-radio value="closed">closed (masquée)</ui-radio>
      </ui-radio-group>
      <ui-switch size="sm" [(checked)]="resizable">resizable</ui-switch>
    </div>

    <doc-demo-frame>
      <ui-layout [fullscreen]="false" [landmarks]="false" contentLabel="Contenu (colonne gauche)">
        <header uiLayoutHeader>
          <button uiButton variant="ghost" iconOnly icon="lucide:menu" aria-label="Menu principal" [uiSidebarToggle]="nav"></button>
          <strong>Back-office</strong>
          <span class="spacer"></span>
          <ui-badge tone="neutral">state = {{ state() }}</ui-badge>
        </header>

        <ui-sidebar
          #nav
          position="left"
          ariaLabel="Colonne de navigation (démo gauche)"
          [mode]="mode()"
          [collapseTo]="collapseTo()"
          [resizable]="resizable()"
          [(state)]="state"
          [(width)]="width"
        >
          <div uiSidebarHeader class="brand">
            <span class="logo" aria-hidden="true">IC</span>
            @if (!nav.isRail()) {
              <strong>IC Angular UiKit</strong>
            }
          </div>
          <ui-menu ariaLabel="Navigation principale">
            @for (item of main; track item.label) {
              <button uiMenuItem [icon]="item.icon" [active]="current() === item.label" (click)="current.set(item.label)">
                {{ item.label }}
                @if (item.count) {
                  <ui-badge uiMenuBadge tone="primary" appearance="solid" pill>{{ item.count }}</ui-badge>
                }
              </button>
            }
            <ui-menu-group label="Administration">
              <button uiMenuItem icon="lucide:users" [active]="current() === 'Utilisateurs'" (click)="current.set('Utilisateurs')">Utilisateurs</button>
              <button uiMenuItem icon="lucide:settings" [active]="current() === 'Réglages'" (click)="current.set('Réglages')">Réglages</button>
              <button uiMenuItem [active]="current() === 'Journal'" (click)="current.set('Journal')">Journal (sans icône)</button>
            </ui-menu-group>
          </ui-menu>
          <div uiSidebarFooter>
            <button uiMenuItem icon="lucide:circle-help">Aide</button>
            <button uiMenuItem icon="lucide:log-out">Déconnexion</button>
          </div>
        </ui-sidebar>

        <h2 class="title"><ui-icon name="lucide:layout-dashboard" /> {{ current() }}</h2>
        <p>Colonne : <code>mode="{{ mode() }}"</code>, <code>collapseTo="{{ collapseTo() }}"</code>, largeur {{ width() }} px.</p>
        <div class="actions">
          <button uiButton size="sm" variant="outline" (click)="nav.open()">open()</button>
          <button uiButton size="sm" variant="outline" (click)="nav.rail()">rail()</button>
          <button uiButton size="sm" variant="outline" (click)="nav.hide()">hide()</button>
        </div>
        <p class="filler">Contenu de la page…</p>
      </ui-layout>
    </doc-demo-frame>
  `,
  styles: `
    .controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem 2rem; margin-bottom: 1rem; }
    .spacer { flex: 1; }
    .brand { overflow: hidden; }
    .logo { display: grid; place-items: center; flex: none; width: 2.25rem; height: 2.25rem; margin-left: 0.25rem; border-radius: var(--ui-radius-md); background: linear-gradient(135deg, var(--ui-color-primary), #8b5cf6); color: #fff; font-size: 0.8rem; font-weight: 700; }
    .title { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem; font-size: 1.25rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .filler { min-height: 20rem; color: var(--ui-color-text-muted); }
  `,
})
export class LayoutLeftExample {
  protected readonly mode = signal<UiSidebarMode>('push');
  protected readonly collapseTo = signal<'rail' | 'closed'>('rail');
  protected readonly resizable = signal(true);
  protected readonly state = signal<UiSidebarState>('open');
  protected readonly width = signal(240);
  protected readonly current = signal('Tableau de bord');
  protected readonly main = [
    { label: 'Tableau de bord', icon: 'lucide:layout-dashboard', count: 0 },
    { label: 'Messages', icon: 'lucide:inbox', count: 4 },
    { label: 'Agenda', icon: 'lucide:calendar', count: 0 },
    { label: 'Documents', icon: 'lucide:folder', count: 0 },
    { label: 'Statistiques', icon: 'lucide:chart-column', count: 0 },
  ];
}
