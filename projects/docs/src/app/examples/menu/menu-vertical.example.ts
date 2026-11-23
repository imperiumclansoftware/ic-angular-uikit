import { Component, signal } from '@angular/core';
import { UiBadge, UiMenu, UiMenuGroup, UiMenuItem, UiSubmenu } from 'ic-angular-uikit';

/**
 * Menu vertical en accordéon
 * Par défaut (`orientation="vertical"`), les sous-menus se déplient sur place, avec un retrait et un filet par niveau. Celui qui contient la page courante s'ouvre tout seul. Clavier : ↑ / ↓ parcourent les éléments visibles, → déplie ou entre, ← replie ou remonte au parent. `[(expanded)]` pilote un sous-menu depuis le code.
 * @order 2
 */
@Component({
  selector: 'doc-menu-vertical-example',
  imports: [UiMenu, UiMenuItem, UiMenuGroup, UiSubmenu, UiBadge],
  template: `
    <div class="box">
      <ui-menu ariaLabel="Navigation (démo verticale)">
        <button uiMenuItem icon="lucide:layout-dashboard" [active]="current() === 'Tableau de bord'" (click)="current.set('Tableau de bord')">Tableau de bord</button>
        <ui-submenu label="Messages" icon="lucide:inbox" [(expanded)]="messagesOpen">
          <ui-badge uiMenuBadge tone="primary" appearance="solid" pill>6</ui-badge>
          <button uiMenuItem [active]="current() === 'Reçus'" (click)="current.set('Reçus')">
            Reçus <ui-badge uiMenuBadge tone="primary" pill>4</ui-badge>
          </button>
          <button uiMenuItem [active]="current() === 'Envoyés'" (click)="current.set('Envoyés')">Envoyés</button>
          <ui-submenu label="Dossiers">
            <button uiMenuItem [active]="current() === 'Factures'" (click)="current.set('Factures')">Factures</button>
            <button uiMenuItem [active]="current() === 'Clients'" (click)="current.set('Clients')">
              Clients <ui-badge uiMenuBadge tone="primary" pill>2</ui-badge>
            </button>
          </ui-submenu>
        </ui-submenu>
        <ui-menu-group label="Administration">
          <ui-submenu label="Utilisateurs" icon="lucide:users">
            <button uiMenuItem [active]="current() === 'Comptes'" (click)="current.set('Comptes')">Comptes</button>
            <ui-submenu label="Droits">
              <button uiMenuItem [active]="current() === 'Rôles'" (click)="current.set('Rôles')">Rôles</button>
              <button uiMenuItem [active]="current() === 'Équipes'" (click)="current.set('Équipes')">Équipes</button>
            </ui-submenu>
          </ui-submenu>
          <button uiMenuItem icon="lucide:settings" [active]="current() === 'Réglages'" (click)="current.set('Réglages')">Réglages</button>
        </ui-menu-group>
      </ui-menu>
    </div>
    <p>
      Page courante : <strong>{{ current() }}</strong> — sous-menu « Messages » {{ messagesOpen() ? 'ouvert' : 'fermé' }}
      <button type="button" class="link" (click)="messagesOpen.set(!messagesOpen())">basculer</button>
    </p>
  `,
  styles: `
    .box { width: 17rem; max-width: 100%; padding: 0.5rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); background: var(--ui-color-surface); }
    p { margin: 1rem 0 0; }
    .link { padding: 0; border: 0; background: none; color: var(--ui-color-primary-text); font: inherit; text-decoration: underline; cursor: pointer; }
  `,
})
export class MenuVerticalExample {
  protected readonly current = signal('Rôles');
  protected readonly messagesOpen = signal(false);
}
