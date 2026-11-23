import { Component, signal } from '@angular/core';
import { UiMenu, UiMenuItem, UiSubmenu, UiSwitch } from 'ic-angular-uikit';

/**
 * Menu horizontal sur plusieurs niveaux
 * `orientation="horizontal"` : le premier niveau s'ouvre sous l'élément, les suivants à côté (ils se retournent près du bord de l'écran). Clavier : ← / → dans la barre, ↓ pour ouvrir, ↑ / ↓ dans un panneau, → / ← pour entrer dans un sous-niveau ou en sortir, Échap pour fermer. Le parent de la page courante est mis en évidence (graisse + barre). `openOnHover` ouvre aussi au survol.
 * @order 1
 */
@Component({
  selector: 'doc-menu-horizontal-example',
  imports: [UiMenu, UiMenuItem, UiSubmenu, UiSwitch],
  template: `
    <ui-switch size="sm" [(checked)]="hover">openOnHover</ui-switch>
    <div class="bar">
      <ui-menu orientation="horizontal" ariaLabel="Navigation (démo horizontale)" [openOnHover]="hover()">
        <button uiMenuItem icon="lucide:house" [active]="current() === 'Accueil'" (click)="go('Accueil')">Accueil</button>
        <ui-submenu label="Produits" icon="lucide:box">
          <button uiMenuItem [active]="current() === 'Nouveautés'" (click)="go('Nouveautés')">Nouveautés</button>
          <ui-submenu label="Catalogue" icon="lucide:package">
            <button uiMenuItem [active]="current() === 'Logiciels'" (click)="go('Logiciels')">Logiciels</button>
            <ui-submenu label="Matériel">
              <button uiMenuItem [active]="current() === 'Serveurs'" (click)="go('Serveurs')">Serveurs</button>
              <button uiMenuItem [active]="current() === 'Postes de travail'" (click)="go('Postes de travail')">Postes de travail</button>
            </ui-submenu>
            <button uiMenuItem [active]="current() === 'Services'" (click)="go('Services')">Services</button>
          </ui-submenu>
          <button uiMenuItem [active]="current() === 'Tarifs'" (click)="go('Tarifs')">Tarifs</button>
        </ui-submenu>
        <ui-submenu label="Ressources" icon="lucide:book-open">
          <button uiMenuItem icon="lucide:file-text" [active]="current() === 'Documentation'" (click)="go('Documentation')">Documentation</button>
          <button uiMenuItem icon="lucide:newspaper" [active]="current() === 'Blog'" (click)="go('Blog')">Blog</button>
          <button uiMenuItem icon="lucide:life-buoy" [active]="current() === 'Support'" (click)="go('Support')">Support</button>
        </ui-submenu>
        <button uiMenuItem icon="lucide:building-2" [active]="current() === 'Entreprise'" (click)="go('Entreprise')">Entreprise</button>
        <ui-submenu label="Archives" disabled>
          <button uiMenuItem>2025</button>
        </ui-submenu>
      </ui-menu>
    </div>
    <p>Page courante : <strong>{{ current() }}</strong></p>
  `,
  styles: `
    .bar { margin-top: 1rem; padding: 0.25rem 0.5rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); background: var(--ui-color-surface); }
    p { margin: 1rem 0 0; }
  `,
})
export class MenuHorizontalExample {
  protected readonly hover = signal(false);
  protected readonly current = signal('Serveurs');

  protected go(page: string): void {
    this.current.set(page);
  }
}
