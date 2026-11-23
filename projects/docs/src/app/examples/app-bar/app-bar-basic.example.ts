import { Component, signal } from '@angular/core';
import {
  UiAppBar,
  UiAppBarColor,
  UiAppBarEnd,
  UiAppBarStart,
  UiButton,
  UiMenu,
  UiMenuItem,
  UiRadio,
  UiRadioGroup,
  UiSubmenu,
  UiSwitch,
} from 'ic-angular-uikit';
import { DemoFrame } from '../../shared/demo-frame';

/**
 * Barre d'application responsive
 * Marque (`uiAppBarStart`), navigation (contenu par défaut, ici un menu horizontal à plusieurs niveaux) et actions (`uiAppBarEnd`, avec un bouton de menu pour le profil). Réduisez l'aperçu sous 768 px : la navigation se replie derrière le bouton ☰ et le menu passe en vertical, ses sous-menus se dépliant sur place. Les actions restent visibles.
 * @order 1
 */
@Component({
  selector: 'doc-app-bar-basic-example',
  imports: [
    UiAppBar, UiAppBarStart, UiAppBarEnd, UiMenu, UiMenuItem, UiSubmenu, UiButton,
    UiRadioGroup, UiRadio, UiSwitch, DemoFrame,
  ],
  template: `
    <div class="controls">
      <ui-radio-group label="color" orientation="horizontal" size="sm" [(value)]="color">
        <ui-radio value="surface">surface</ui-radio>
        <ui-radio value="primary">primary</ui-radio>
      </ui-radio-group>
      <ui-switch size="sm" [(checked)]="elevated">elevated</ui-switch>
    </div>

    <doc-demo-frame [height]="360">
      <div class="page">
        <ui-app-bar [landmark]="false" [color]="color()" [elevated]="elevated()">
          <span uiAppBarStart class="brand"><span class="logo" aria-hidden="true">IC</span> Imperium</span>

          <ui-menu orientation="horizontal" ariaLabel="Navigation principale (démo barre)">
            <button uiMenuItem [active]="current() === 'Accueil'" (click)="current.set('Accueil')">Accueil</button>
            <ui-submenu label="Produits">
              <button uiMenuItem [active]="current() === 'Nouveautés'" (click)="current.set('Nouveautés')">Nouveautés</button>
              <ui-submenu label="Catalogue">
                <button uiMenuItem [active]="current() === 'Logiciels'" (click)="current.set('Logiciels')">Logiciels</button>
                <button uiMenuItem [active]="current() === 'Matériel'" (click)="current.set('Matériel')">Matériel</button>
              </ui-submenu>
            </ui-submenu>
            <ui-submenu label="Ressources">
              <button uiMenuItem [active]="current() === 'Documentation'" (click)="current.set('Documentation')">Documentation</button>
              <button uiMenuItem [active]="current() === 'Support'" (click)="current.set('Support')">Support</button>
            </ui-submenu>
            <button uiMenuItem [active]="current() === 'Contact'" (click)="current.set('Contact')">Contact</button>
          </ui-menu>

          <div uiAppBarEnd>
            <button uiButton variant="ghost" iconOnly icon="lucide:search" aria-label="Rechercher"></button>
            <button uiButton variant="ghost" iconOnly icon="lucide:bell" aria-label="Notifications"></button>
            <ui-submenu label="Marie" icon="lucide:user" placement="below">
              <button uiMenuItem icon="lucide:user">Mon profil</button>
              <button uiMenuItem icon="lucide:settings">Réglages</button>
              <button uiMenuItem icon="lucide:log-out">Déconnexion</button>
            </ui-submenu>
          </div>
        </ui-app-bar>
        <div class="content">
          <h3>{{ current() }}</h3>
          <p>Contenu de la page…</p>
        </div>
      </div>
    </doc-demo-frame>
  `,
  styles: `
    .controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem 2rem; margin-bottom: 1rem; }
    .page { height: 100%; background: var(--ui-color-bg); }
    .brand { font-weight: 700; white-space: nowrap; }
    .logo { display: inline-grid; place-items: center; width: 2rem; height: 2rem; margin-inline-end: 0.25rem; border-radius: var(--ui-radius-md); background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: #fff; font-size: 0.75rem; font-weight: 700; }
    .content { padding: 1.5rem; }
    .content h3 { margin: 0 0 0.5rem; }
  `,
})
export class AppBarBasicExample {
  protected readonly color = signal<UiAppBarColor>('surface');
  protected readonly elevated = signal(false);
  protected readonly current = signal('Accueil');
}
