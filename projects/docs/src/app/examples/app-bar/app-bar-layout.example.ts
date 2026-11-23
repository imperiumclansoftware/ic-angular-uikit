import { Component, signal } from '@angular/core';
import {
  UiAppBar,
  UiAppBarEnd,
  UiAppBarStart,
  UiButton,
  UiLayout,
  UiMenu,
  UiMenuItem,
  UiSidebar,
  UiSidebarToggle,
  UiSubmenu,
  UiToolbar,
  UiToolbarSeparator,
} from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';

/**
 * Dans un layout, avec une colonne et une barre d'outils
 * Placée directement dans un `ui-layout`, la barre prend la place de l'en-tête, au-dessus des colonnes. Ici, une `ui-sidebar` qui se réduit en rail (bouton du début) porte un menu vertical à sous-menus : en rail, ils s'ouvrent à côté de la colonne. Une `ui-toolbar` occupe la fin de la barre.
 * @order 2
 */
@Component({
  selector: 'doc-app-bar-layout-example',
  imports: [
    UiLayout, UiAppBar, UiAppBarStart, UiAppBarEnd, UiSidebar, UiSidebarToggle, UiMenu, UiMenuItem, UiSubmenu,
    UiButton, UiToolbar, UiToolbarSeparator, DemoFrame,
  ],
  template: `
    <doc-demo-frame [height]="460">
      <ui-layout [fullscreen]="false" [landmarks]="false" contentLabel="Contenu (barre et layout)">
        <ui-app-bar [landmark]="false" color="primary">
          <div uiAppBarStart>
            <button uiButton variant="ghost" iconOnly icon="lucide:menu" aria-label="Colonne de navigation" [uiSidebarToggle]="nav"></button>
            <strong>Back-office</strong>
          </div>
          <ui-menu orientation="horizontal" ariaLabel="Sections (démo layout)">
            <button uiMenuItem active>Gestion</button>
            <ui-submenu label="Rapports">
              <button uiMenuItem>Mensuels</button>
              <button uiMenuItem>Annuels</button>
            </ui-submenu>
          </ui-menu>
          <ui-toolbar uiAppBarEnd ariaLabel="Actions rapides">
            <button uiButton variant="ghost" iconOnly icon="lucide:plus" aria-label="Créer"></button>
            <button uiButton variant="ghost" iconOnly icon="lucide:bell" aria-label="Notifications"></button>
            <ui-toolbar-separator />
            <button uiButton variant="ghost" iconOnly icon="lucide:circle-help" aria-label="Aide"></button>
          </ui-toolbar>
        </ui-app-bar>

        <ui-sidebar #nav position="left" collapseTo="rail" ariaLabel="Colonne de navigation (démo barre)">
          <ui-menu ariaLabel="Navigation (démo layout)">
            <button uiMenuItem icon="lucide:layout-dashboard" [active]="current() === 'Tableau de bord'" (click)="current.set('Tableau de bord')">Tableau de bord</button>
            <ui-submenu label="Ventes" icon="lucide:shopping-cart">
              <button uiMenuItem [active]="current() === 'Commandes'" (click)="current.set('Commandes')">Commandes</button>
              <button uiMenuItem [active]="current() === 'Factures'" (click)="current.set('Factures')">Factures</button>
              <ui-submenu label="Catalogue">
                <button uiMenuItem [active]="current() === 'Produits'" (click)="current.set('Produits')">Produits</button>
                <button uiMenuItem [active]="current() === 'Tarifs'" (click)="current.set('Tarifs')">Tarifs</button>
              </ui-submenu>
            </ui-submenu>
            <ui-submenu label="Équipe" icon="lucide:users">
              <button uiMenuItem [active]="current() === 'Membres'" (click)="current.set('Membres')">Membres</button>
              <button uiMenuItem [active]="current() === 'Plannings'" (click)="current.set('Plannings')">Plannings</button>
            </ui-submenu>
            <button uiMenuItem icon="lucide:settings" [active]="current() === 'Réglages'" (click)="current.set('Réglages')">Réglages</button>
          </ui-menu>
        </ui-sidebar>

        <h3 class="title">{{ current() }}</h3>
        <p>Réduisez la colonne en rail avec le bouton ☰ du début de la barre, puis ouvrez « Ventes » : le sous-menu s'affiche à côté.</p>
        <p class="filler">Contenu de la page…</p>
      </ui-layout>
    </doc-demo-frame>
  `,
  styles: `
    .title { margin: 0 0 0.5rem; }
    .filler { min-height: 18rem; color: var(--ui-color-text-muted); }
  `,
})
export class AppBarLayoutExample {
  protected readonly current = signal('Factures');
}
