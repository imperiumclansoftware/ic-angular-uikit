import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { UiIcon } from '../icon/icon';

/**
 * Libellé riche d'un onglet.
 *
 * ```html
 * <ui-tab><ng-template uiTabLabel>Messages <ui-badge>4</ui-badge></ng-template>…</ui-tab>
 * ```
 */
@Directive({ selector: 'ng-template[uiTabLabel]' })
export class UiTabLabel {
  readonly template = inject(TemplateRef);
}

/**
 * Contenu chargé paresseusement : il n'est créé qu'à la première activation de l'onglet.
 *
 * ```html
 * <ui-tab label="Stats"><ng-template uiTabContent><app-heavy-chart /></ng-template></ui-tab>
 * ```
 */
@Directive({ selector: 'ng-template[uiTabContent]' })
export class UiTabContent {
  readonly template = inject(TemplateRef);
}

/**
 * Un onglet de `ui-tabs`.
 *
 * @slot default - Contenu du panneau (créé immédiatement).
 * @slot ng-template[uiTabLabel] - Libellé riche, remplace `label`.
 * @slot ng-template[uiTabContent] - Contenu paresseux, créé à la première activation.
 */
@Component({
  selector: 'ui-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-template #body><ng-content /></ng-template>`,
})
export class UiTab {
  /** Libellé texte de l'onglet. */
  readonly label = input('');
  /** Icône avant le libellé (`préfixe:nom`, voir `provideUiIcons()`). */
  readonly icon = input<string>();
  /** Désactive l'onglet. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** @internal */
  readonly labelTemplate = contentChild(UiTabLabel);
  /** @internal */
  readonly lazyContent = contentChild(UiTabContent);
  /** @internal */
  readonly bodyTemplate = viewChild.required<TemplateRef<unknown>>('body');
  /** @internal */
  readonly contentTemplate = computed(() => this.lazyContent()?.template ?? this.bodyTemplate());
}

/** Payload de l'événement `tabChange`. */
export interface UiTabChange {
  /** Index du nouvel onglet actif. */
  index: number;
  /** Index de l'onglet précédemment actif. */
  previousIndex: number;
  /** Onglet devenu actif. */
  tab: UiTab;
}

export type UiTabsAppearance = 'line' | 'pills';

/**
 * Navigation par onglets accessible (motif ARIA « tabs » : flèches, Origine, Fin).
 *
 * Avec `orientation="vertical"`, la liste d'onglets passe à gauche du panneau (flèches haut / bas) quand le composant
 * fait au moins 30rem de large ; plus étroit, il revient à des onglets horizontaux. La règle dépend de la largeur du
 * composant, pas de l'écran.
 *
 * @slot ui-tab - Les onglets.
 * @cssprop --ui-tabs-list-width - Largeur de la liste en disposition verticale (défaut : `minmax(10rem, max-content)`).
 * @category Navigation
 */
@Component({
  selector: 'ui-tabs',
  imports: [NgTemplateOutlet, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-tabs ui-tabs--" + appearance()',
    '[class.ui-tabs--stretch]': 'stretch() && orientation() === "horizontal"',
    '[class.ui-tabs--vertical]': 'orientation() === "vertical"',
  },
  template: `
    <div class="ui-tabs__layout">
    <!-- Le clavier est délégué : keydown remonte depuis l'onglet focalisé (tabindex itinérant). -->
    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
    <div
      class="ui-tabs__list"
      role="tablist"
      [attr.aria-label]="ariaLabel() ?? null"
      [attr.aria-orientation]="orientation()"
      (keydown)="onKeydown($event)"
    >
      @for (tab of tabs(); track tab; let i = $index) {
        <button
          #tabButton
          type="button"
          role="tab"
          class="ui-tabs__tab"
          [id]="baseId + '-tab-' + i"
          [class.ui-tabs__tab--active]="i === activeIndex()"
          [attr.aria-selected]="i === activeIndex()"
          [attr.aria-controls]="baseId + '-panel-' + i"
          [tabIndex]="i === activeIndex() ? 0 : -1"
          [disabled]="tab.disabled()"
          (click)="select(i)"
        >
          @if (tab.labelTemplate(); as custom) {
            <ng-container *ngTemplateOutlet="custom.template" />
          } @else {
            @if (tab.icon(); as name) {
              <ui-icon [name]="name" />
            }
            {{ tab.label() }}
          }
        </button>
      }
    </div>
    @for (tab of tabs(); track tab; let i = $index) {
      @if (i === activeIndex()) {
        <div
          class="ui-tabs__panel"
          role="tabpanel"
          tabindex="0"
          [id]="baseId + '-panel-' + i"
          [attr.aria-labelledby]="baseId + '-tab-' + i"
        >
          <ng-container *ngTemplateOutlet="tab.contentTemplate()" />
        </div>
      }
    }
    </div>
  `,
  styleUrl: './tabs.css',
})
export class UiTabs {
  /** Index de l'onglet actif (liaison bidirectionnelle `[(selectedIndex)]`). */
  readonly selectedIndex = model(0);
  /** Style des onglets. */
  readonly appearance = input<UiTabsAppearance>('line');
  /** Onglets au-dessus du panneau (`horizontal`) ou à sa gauche (`vertical`, si la place le permet). */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Les onglets se partagent toute la largeur (disposition horizontale uniquement). */
  readonly stretch = input(false, { transform: booleanAttribute });
  /** Libellé accessible de la liste d'onglets. */
  readonly ariaLabel = input<string>();

  /** Émis quand l'utilisateur change d'onglet. */
  readonly tabChange = output<UiTabChange>();

  protected readonly tabs = contentChildren(UiTab);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  protected readonly baseId = uniqueId('ui-tabs');

  /** Index réellement affiché (borné au nombre d'onglets). */
  protected readonly activeIndex = computed(() => {
    const count = this.tabs().length;
    return count === 0 ? -1 : Math.min(Math.max(this.selectedIndex(), 0), count - 1);
  });

  /** Active l'onglet d'index donné (ignoré s'il est désactivé ou inexistant). */
  select(index: number): void {
    const tab = this.tabs()[index];
    const previousIndex = this.activeIndex();
    if (!tab || tab.disabled() || index === previousIndex) {
      return;
    }
    this.selectedIndex.set(index);
    this.tabChange.emit({ index, previousIndex, tab });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const enabled = tabs.map((tab, i) => (tab.disabled() ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) {
      return;
    }
    const position = enabled.indexOf(this.activeIndex());
    let target: number | undefined;
    // En vertical : haut / bas (motif ARIA), plus gauche / droite pour le repli horizontal sur petite largeur.
    const vertical = this.orientation() === 'vertical';
    const next = event.key === 'ArrowRight' || (vertical && event.key === 'ArrowDown');
    const previous = event.key === 'ArrowLeft' || (vertical && event.key === 'ArrowUp');
    switch (true) {
      case next:
        target = enabled[(position + 1) % enabled.length];
        break;
      case previous:
        target = enabled[(position - 1 + enabled.length) % enabled.length];
        break;
      case event.key === 'Home':
        target = enabled[0];
        break;
      case event.key === 'End':
        target = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target !== undefined) {
      this.select(target);
      this.buttons()[target]?.nativeElement.focus();
    }
  }
}
