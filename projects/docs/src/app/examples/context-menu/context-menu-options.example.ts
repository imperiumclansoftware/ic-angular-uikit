import { Component, signal } from '@angular/core';
import {
  UiContextMenu,
  UiContextMenuEvent,
  UiContextMenuTrigger,
  UiMenuGroup,
  UiMenuItem,
  UiMenuSeparator,
  UiSubmenu,
} from 'ic-angular-uikit';

type View = 'list' | 'grid' | 'details';

/**
 * Éléments cochables et groupes
 * `checked` + `checkMode="radio"` pour un choix exclusif (rôle `menuitemradio`), `checked` seul pour une case (rôle `menuitemcheckbox`), `ui-menu-group` pour nommer un groupe. L'événement `opened` indique l'origine de l'ouverture (`pointer`, `touch`, `keyboard`, `api`) : faites un clic droit dans la zone, ou placez-y le focus et utilisez la touche Menu.
 * @order 2
 */
@Component({
  selector: 'doc-context-menu-options-example',
  imports: [UiContextMenu, UiContextMenuTrigger, UiMenuItem, UiMenuSeparator, UiMenuGroup, UiSubmenu],
  template: `
    <div class="area" tabindex="0" role="region" aria-label="Zone d'affichage (menu contextuel)" [uiContextMenuTrigger]="menu">
      <p><strong>Affichage :</strong> {{ labels[view()] }} — aperçus {{ previews() ? 'affichés' : 'masqués' }} — tri {{ sortByDate() ? 'par date' : 'par nom' }}</p>
      <p class="hint">Clic droit ici, ou touche Menu / Maj+F10 quand la zone a le focus.</p>
      <p class="hint">Dernière ouverture : {{ source() }}</p>
    </div>

    <ui-context-menu #menu ariaLabel="Options d'affichage" (opened)="onOpened($event)">
      <ui-menu-group label="Disposition">
        @for (option of views; track option) {
          <button uiMenuItem checkMode="radio" [checked]="view() === option" (click)="view.set(option)">{{ labels[option] }}</button>
        }
      </ui-menu-group>
      <ui-menu-separator />
      <button uiMenuItem [checked]="previews()" (click)="previews.set(!previews())">Afficher les aperçus</button>
      <ui-submenu label="Trier">
        <button uiMenuItem checkMode="radio" [checked]="!sortByDate()" (click)="sortByDate.set(false)">Par nom</button>
        <button uiMenuItem checkMode="radio" [checked]="sortByDate()" (click)="sortByDate.set(true)">Par date</button>
      </ui-submenu>
    </ui-context-menu>
  `,
  styles: `
    .area { display: grid; align-content: center; gap: 0.25rem; min-height: 10rem; padding: 1.5rem; border: 2px dashed var(--ui-color-border-strong); border-radius: var(--ui-radius-lg); background: var(--ui-color-surface); }
    .area:focus-visible { outline: 2px solid var(--ui-color-focus-ring); outline-offset: 2px; }
    .area p { margin: 0; }
    .hint { color: var(--ui-color-text-muted); font-size: 0.875rem; }
  `,
})
export class ContextMenuOptionsExample {
  protected readonly views: View[] = ['list', 'grid', 'details'];
  protected readonly labels: Record<View, string> = { list: 'Liste', grid: 'Grille', details: 'Détails' };
  protected readonly view = signal<View>('grid');
  protected readonly previews = signal(true);
  protected readonly sortByDate = signal(false);
  protected readonly source = signal('—');

  protected onOpened(event: UiContextMenuEvent): void {
    this.source.set(event.source);
  }
}
