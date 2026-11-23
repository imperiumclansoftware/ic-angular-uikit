import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { UiButton } from '../button/button';
import { UiIcon } from '../icon/icon';
import { UiSelect, UiSelectOption } from '../select/select';
import { UiTextField } from '../text-field/text-field';
import {
  UiDashboardItem,
  UiDashboardLayout,
  clampItem,
  findFreeSpot,
  moveItem,
  resolveLayout,
  sortByPosition,
} from './dashboard-layout';
import { UiWidgetCategory, UiWidgetContext, UiWidgetDefinition } from './widget';

/** Contenu ajouté à la barre au-dessus de la grille (`<div uiDashboardToolbar>`) : titre, état de l'enregistrement… */
@Directive({ selector: '[uiDashboardToolbar]', host: { class: 'ui-dashboard__toolbar-slot' } })
export class UiDashboardToolbar {}

/** Réglages généraux ajoutés en bas de la colonne « Personnaliser » (`<section uiDashboardConfig>`). */
@Directive({ selector: '[uiDashboardConfig]', host: { class: 'ui-dashboard__config-slot' } })
export class UiDashboardConfig {}

/** Élément affiché : disposition + définition + contexte du widget. */
interface Entry {
  item: UiDashboardItem;
  definition: UiWidgetDefinition<object>;
  context: UiWidgetContext<object>;
  injector: Injector;
  column: string;
  row: string;
}

type DragMode = 'move' | 'resize';

/**
 * Cadre d'un widget : en-tête (poignée, titre, retourner, configurer, retirer), faces recto / verso, poignée de taille.
 * Interne au tableau de bord.
 */
@Component({
  selector: 'ui-dashboard-widget',
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-dashboard-widget',
    '[style.grid-column]': 'entry().column',
    '[style.grid-row]': 'entry().row',
    '[attr.data-widget-id]': 'entry().item.id',
  },
  template: `
    @let ctx = entry().context;
    @let title = ctx.title();
    @let back = ctx.templates.back();
    <article
      class="ui-widget"
      [attr.aria-labelledby]="titleId"
      [class.ui-widget--flipped]="ctx.flipped()"
      [class.ui-widget--selected]="selected()"
      [class.ui-widget--dragging]="dragging()"
    >
      <header class="ui-widget__header">
        @if (canEdit()) {
          <button
            type="button"
            class="ui-widget__handle ui-widget__move"
            data-handle="move"
            [attr.aria-label]="'Déplacer ' + title"
            [attr.aria-describedby]="helpId()"
            (pointerdown)="dashboard.startPointer($event, ctx.id, 'move')"
            (keydown)="dashboard.onHandleKey($event, ctx.id, 'move')"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
            </svg>
          </button>
        }
        <span class="ui-widget__title" role="heading" [attr.aria-level]="headingLevel()" [id]="titleId">{{ title }}</span>
        <div class="ui-widget__actions">
          @if (back) {
            <button
              type="button"
              class="ui-widget__action"
              [attr.aria-label]="(ctx.flipped() ? 'Afficher le recto de ' : 'Afficher le verso de ') + title"
              [attr.aria-pressed]="ctx.flipped()"
              (click)="ctx.flip()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" />
              </svg>
            </button>
          }
          @if (ctx.templates.settings() || dashboard.editing()) {
            <button
              type="button"
              class="ui-widget__action"
              [attr.aria-label]="'Configurer ' + title"
              [attr.aria-expanded]="selected() && dashboard.editing()"
              [attr.aria-controls]="dashboard.editing() ? dashboard.configId : null"
              (click)="dashboard.configure(ctx.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
              </svg>
            </button>
          }
          @if (dashboard.editing()) {
            <button type="button" class="ui-widget__action ui-widget__remove" [attr.aria-label]="'Retirer ' + title" (click)="dashboard.removeWidget(ctx.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          }
        </div>
      </header>

      <div class="ui-widget__flipper">
        <div
          class="ui-widget__face ui-widget__face--front"
          [attr.inert]="back && ctx.flipped() ? '' : null"
          [attr.tabindex]="scrollable().front ? 0 : null"
          [attr.role]="scrollable().front ? 'group' : null"
          [attr.aria-label]="scrollable().front ? title + (back ? ' (recto)' : '') : null"
        >
          @if (ctx.templates.front(); as front) {
            <ng-container [ngTemplateOutlet]="front" />
          }
        </div>
        @if (back) {
          <div
            class="ui-widget__face ui-widget__face--back"
            [attr.inert]="ctx.flipped() ? null : ''"
            [attr.tabindex]="scrollable().back ? 0 : null"
            [attr.role]="scrollable().back ? 'group' : null"
            [attr.aria-label]="scrollable().back ? title + ' (verso)' : null"
          >
            <ng-container [ngTemplateOutlet]="back" />
          </div>
        }
      </div>

      @if (canEdit()) {
        <button
          type="button"
          class="ui-widget__handle ui-widget__resize"
          data-handle="resize"
          [attr.aria-label]="'Redimensionner ' + title + ' (' + entry().item.w + ' × ' + entry().item.h + ')'"
          [attr.aria-describedby]="helpId()"
          (pointerdown)="dashboard.startPointer($event, ctx.id, 'resize')"
          (keydown)="dashboard.onHandleKey($event, ctx.id, 'resize')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 10v10H10M20 20 9 9" /></svg>
        </button>
      }
      <!-- Instance du composant de widget : il ne rend rien lui-même, ses faces sont affichées ci-dessus. -->
      <div hidden><ng-container *ngComponentOutlet="entry().definition.component; injector: entry().injector" /></div>
    </article>
  `,
  styleUrl: './widget.css',
})
class UiDashboardWidgetFrame {
  readonly entry = input.required<Entry>();
  readonly selected = input(false);
  readonly dragging = input(false);
  readonly canEdit = input(false);
  readonly headingLevel = input(3);
  readonly helpId = input('');
  protected readonly dashboard = inject(UiDashboard);
  protected readonly titleId = uniqueId('ui-widget-title');
  /** Faces dont le contenu déborde : focalisables pour défiler au clavier. */
  protected readonly scrollable = signal({ front: false, back: false });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const check = () => {
        const overflows = (selector: string) => {
          const face = this.host.querySelector<HTMLElement>(selector);
          return !!face && face.scrollHeight > face.clientHeight + 1;
        };
        const next = { front: overflows('.ui-widget__face--front'), back: overflows('.ui-widget__face--back') };
        const current = this.scrollable();
        if (next.front !== current.front || next.back !== current.back) this.scrollable.set(next);
      };
      // Taille du widget ou de son contenu modifiée → nouveau calcul.
      const observer = new ResizeObserver(check);
      const observeFaces = () => this.host.querySelectorAll('.ui-widget__face, .ui-widget__face > *').forEach((el) => observer.observe(el));
      observeFaces();
      const mutations = new MutationObserver(() => {
        observeFaces();
        check();
      });
      mutations.observe(this.host, { childList: true, subtree: true });
      destroyRef.onDestroy(() => {
        observer.disconnect();
        mutations.disconnect();
      });
    });
  }
}

/**
 * Tableau de bord personnalisable : widgets sur une grille, déplaçables et redimensionnables, à deux faces
 * (recto / verso, comme une carte qu'on retourne), avec une colonne « Personnaliser » à droite pour régler le widget
 * sélectionné et en ajouter d'autres.
 *
 * - **Disposition** : `[(items)]` (positions en colonnes × lignes) ; `layoutChange` émet une `UiDashboardLayout`
 *   sérialisable à chaque modification de l'utilisateur, à enregistrer côté serveur. Valider les données relues avec
 *   `sanitizeDashboardLayout()`.
 * - **Personnalisation** (`[(editing)]`) : poignées de déplacement et de taille, à la souris, au doigt ou au clavier
 *   (flèches sur les poignées, Échap pour annuler un glisser). Les autres widgets se poussent puis la grille se tasse.
 * - **Widgets** : un composant Angular par type (`UiWidgetDefinition.component`), qui déclare ses faces avec
 *   `uiWidgetFront`, `uiWidgetBack` (facultatif) et `uiWidgetSettings` (facultatif), et lit / modifie ses réglages
 *   avec `injectUiWidgetContext()`.
 * - **Petite largeur** (sous `breakpoint`, largeur du composant) : une colonne dans l'ordre de lecture, disposition
 *   conservée ; déplacement et redimensionnement désactivés.
 *
 * @slot [uiDashboardToolbar] - Contenu de la barre au-dessus de la grille (titre, état de l'enregistrement).
 * @slot [uiDashboardConfig] - Réglages généraux en bas de la colonne « Personnaliser ».
 * @cssprop --ui-dashboard-config-width - Largeur de la colonne « Personnaliser » (défaut : `18rem`).
 * @cssprop --ui-widget-bg - Fond des widgets (défaut : `--ui-color-surface`).
 * @category Affichage
 */
@Component({
  selector: 'ui-dashboard',
  imports: [UiDashboardWidgetFrame, NgTemplateOutlet, UiButton, UiIcon, UiTextField, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-dashboard',
    '[class.ui-dashboard--editing]': 'editing()',
    '[class.ui-dashboard--narrow]': 'narrow()',
    '[class.ui-dashboard--dragging]': '!!drag()',
    '[attr.role]': '"region"',
    '[attr.aria-label]': 'ariaLabel()',
  },
  template: `
    <div class="ui-dashboard__toolbar">
      <ng-content select="[uiDashboardToolbar]" />
      <button
        uiButton
        type="button"
        size="sm"
        class="ui-dashboard__customize"
        [variant]="editing() ? 'primary' : 'outline'"
        [icon]="editing() ? undefined : customizeIcon()"
        [attr.aria-pressed]="editing()"
        [attr.aria-controls]="editing() ? configId : null"
        (click)="toggleEditing()"
      >
        {{ editing() ? doneLabel() : customizeLabel() }}
      </button>
    </div>

    <div class="ui-dashboard__body">
      <div
        #grid
        class="ui-dashboard__grid"
        [style.--_columns]="narrow() ? 1 : columns()"
        [style.--_row]="rowHeight() + 'px'"
        [style.--_gap]="gap() + 'px'"
      >
        @for (entry of entries(); track entry.item.id) {
          <ui-dashboard-widget
            [entry]="entry"
            [selected]="selectedId() === entry.item.id"
            [dragging]="drag()?.id === entry.item.id"
            [canEdit]="editing() && !narrow()"
            [headingLevel]="headingLevel() + 1"
            [helpId]="helpId"
          />
        } @empty {
          <div class="ui-dashboard__empty">
            <p>{{ emptyLabel() }}</p>
            @if (!editing() && widgets().length) {
              <button uiButton type="button" variant="outline" size="sm" icon="lucide:plus" (click)="editing.set(true)">Ajouter un widget</button>
            }
          </div>
        }
      </div>

      @if (editing()) {
        <section class="ui-dashboard__config" [id]="configId" [attr.aria-labelledby]="configId + '-title'">
          <div class="ui-dashboard__config-head">
            <span class="ui-dashboard__config-title" role="heading" [attr.aria-level]="headingLevel()" [id]="configId + '-title'">{{ customizeLabel() }}</span>
            <button type="button" class="ui-dashboard__close" [attr.aria-label]="'Fermer : ' + customizeLabel()" (click)="toggleEditing()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          @if (selectedEntry(); as selected) {
            <section class="ui-dashboard__section" [attr.aria-labelledby]="configId + '-widget'">
              <span #widgetHeading class="ui-dashboard__section-title" role="heading" tabindex="-1" [attr.aria-level]="headingLevel() + 1" [id]="configId + '-widget'">
                {{ selected.context.title() }}
              </span>
              <ui-text-field
                label="Titre"
                size="sm"
                [placeholder]="selected.definition.title"
                [value]="selected.item.title ?? ''"
                (valueChange)="setTitle(selected.item.id, $event)"
              />
              <div class="ui-dashboard__size">
                <ui-select label="Largeur" size="sm" [options]="widthOptions(selected)" [value]="selected.item.w" (valueChange)="resize(selected.item.id, $event, null)" />
                <ui-select label="Hauteur" size="sm" [options]="heightOptions(selected)" [value]="selected.item.h" (valueChange)="resize(selected.item.id, null, $event)" />
              </div>
              @if (selected.context.templates.settings(); as settings) {
                <div class="ui-dashboard__widget-settings">
                  <ng-container [ngTemplateOutlet]="settings" />
                </div>
              }
              <button uiButton type="button" variant="ghost" size="sm" icon="lucide:trash-2" (click)="removeWidget(selected.item.id)">
                Retirer ce widget
              </button>
            </section>
          }

          <section class="ui-dashboard__section" [attr.aria-labelledby]="configId + '-catalog'">
            <span class="ui-dashboard__section-title" role="heading" [attr.aria-level]="headingLevel() + 1" [id]="configId + '-catalog'">Ajouter un widget</span>
            @let groups = catalogGroups();
            @if (groups.length === 1 && !groups[0].named) {
              <ng-container [ngTemplateOutlet]="catalogList" [ngTemplateOutletContext]="{ $implicit: groups[0].widgets }" />
            } @else {
              <!-- Tiroirs : <details> natifs (clavier, état ouvert / fermé annoncé), un seul ouvert en mode accordéon. -->
              <div class="ui-dashboard__drawers">
                @for (group of groups; track group.name) {
                  <details class="ui-dashboard__drawer" [open]="openCategories().has(group.name)" (toggle)="onCategoryToggle(group.name, $event)">
                    <summary class="ui-dashboard__drawer-summary">
                      @if (group.icon) {
                        <ui-icon class="ui-dashboard__drawer-icon" [name]="group.icon" />
                      }
                      <span class="ui-dashboard__drawer-text">
                        <span class="ui-dashboard__drawer-name">{{ group.label }}</span>
                        @if (group.description) {
                          <span class="ui-dashboard__drawer-description">{{ group.description }}</span>
                        }
                      </span>
                      <span class="ui-dashboard__drawer-count">{{ group.widgets.length }}<span class="ui-dashboard__sr"> widget{{ group.widgets.length > 1 ? 's' : '' }}</span></span>
                      <svg class="ui-dashboard__drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                    </summary>
                    <div class="ui-dashboard__drawer-body">
                      <ng-container [ngTemplateOutlet]="catalogList" [ngTemplateOutletContext]="{ $implicit: group.widgets }" />
                    </div>
                  </details>
                }
              </div>
            }
          </section>
          <ng-template #catalogList let-widgets>
            <ul class="ui-dashboard__catalog">
              @for (definition of asDefinitions(widgets); track definition.type) {
                @let full = isFull(definition);
                <li class="ui-dashboard__catalog-item">
                  @if (definition.icon) {
                    <ui-icon class="ui-dashboard__catalog-icon" [name]="definition.icon" />
                  }
                  <span class="ui-dashboard__catalog-text">
                    <strong>{{ definition.title }}</strong>
                    @if (definition.description) {
                      <span>{{ definition.description }}</span>
                    }
                    @if (full) {
                      <span>Déjà sur le tableau de bord.</span>
                    }
                  </span>
                  <button
                    uiButton
                    type="button"
                    size="sm"
                    variant="outline"
                    iconOnly
                    icon="lucide:plus"
                    [attr.aria-label]="'Ajouter ' + definition.title"
                    [disabled]="full"
                    (click)="addWidget(definition.type)"
                  ></button>
                </li>
              }
            </ul>
          </ng-template>
          <ng-content select="[uiDashboardConfig]" />
        </section>
      }
    </div>

    <p class="ui-dashboard__sr" [id]="helpId">
      Flèches : déplacer d'une case (poignée de déplacement) ou changer la taille (poignée de taille). Échap : annuler un glisser.
    </p>
    <p class="ui-dashboard__sr" aria-live="polite" aria-atomic="true">{{ announcement() }}</p>
  `,
  styleUrl: './dashboard.css',
})
export class UiDashboard {
  /** Types de widgets disponibles (catalogue). */
  readonly widgets = input<readonly UiWidgetDefinition<object>[]>([]);
  /**
   * Ordre et présentation des catégories du catalogue (icône, description). Les catégories non listées suivent,
   * dans l'ordre d'apparition ; les widgets sans catégorie sont rangés dans « Autres ».
   */
  readonly widgetCategories = input<readonly UiWidgetCategory[]>([]);
  /** Tiroirs du catalogue en accordéon : ouvrir une catégorie referme les autres. */
  readonly catalogAccordion = input(true, { transform: booleanAttribute });
  /** Nom de la catégorie des widgets qui n'en déclarent pas. */
  readonly otherCategoryLabel = input('Autres');
  /** Widgets placés (liaison bidirectionnelle `[(items)]`). */
  readonly items = model<UiDashboardItem[]>([]);
  /** Mode personnalisation : poignées et colonne « Personnaliser » (liaison `[(editing)]`). */
  readonly editing = model(false);
  /** Widget sélectionné dans la colonne « Personnaliser » (liaison `[(selectedId)]`). */
  readonly selectedId = model<string | null>(null);
  /** Nombre de colonnes de la grille. */
  readonly columns = input(12, { transform: numberAttribute });
  /** Hauteur d'une ligne de grille, en pixels. */
  readonly rowHeight = input(88, { transform: numberAttribute });
  /** Espace entre widgets, en pixels. */
  readonly gap = input(16, { transform: numberAttribute });
  /** Remonte les widgets dans les espaces libres (gravité verticale). */
  readonly compact = input(true, { transform: booleanAttribute });
  /** Largeur du composant (px) sous laquelle les widgets s'empilent sur une colonne (disposition conservée). */
  readonly breakpoint = input(640, { transform: numberAttribute });
  /** Niveau de titre de la colonne « Personnaliser » ; les titres des widgets sont au niveau suivant. */
  readonly headingLevel = input(2, { transform: numberAttribute });
  /** Nom accessible du tableau de bord. */
  readonly ariaLabel = input('Tableau de bord');
  /** Libellé du bouton de personnalisation (et titre de la colonne). */
  readonly customizeLabel = input('Personnaliser');
  /** Icône du bouton de personnalisation. */
  readonly customizeIcon = input<string | undefined>('lucide:settings');
  /** Libellé du bouton qui termine la personnalisation. */
  readonly doneLabel = input('Terminer');
  /** Message quand aucun widget n'est placé. */
  readonly emptyLabel = input('Aucun widget pour le moment.');

  /** Émis après chaque modification de l'utilisateur (déplacement, taille, ajout, retrait, réglages, titre). */
  readonly layoutChange = output<UiDashboardLayout>();

  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly gridRef = viewChild.required<ElementRef<HTMLElement>>('grid');
  private readonly widgetHeading = viewChild<ElementRef<HTMLElement>>('widgetHeading');
  /** @internal */
  readonly configId = uniqueId('ui-dashboard-config');
  protected readonly helpId = `${this.configId}-help`;
  protected readonly announcement = signal('');
  private readonly width = signal<number | null>(null);
  private readonly flipped = signal<ReadonlySet<string>>(new Set());
  /** Glisser en cours. */
  protected readonly drag = signal<{ id: string; mode: DragMode } | null>(null);
  /** Disposition provisoire pendant un glisser. */
  private readonly preview = signal<UiDashboardItem[] | null>(null);
  private readonly contexts = new Map<string, { context: UiWidgetContext<object>; injector: Injector }>();

  /** `true` sous `breakpoint` : une seule colonne, édition de la disposition désactivée. */
  readonly narrow = computed(() => {
    const width = this.width();
    return width !== null && width < this.breakpoint();
  });

  private readonly definitions = computed(() => new Map(this.widgets().map((d) => [d.type, d])));

  /** Disposition normalisée (bornée, sans chevauchement) : base de toutes les opérations. */
  private readonly layout = computed(() => {
    const columns = this.columns();
    const known = this.items()
      .filter((item) => this.definitions().has(item.type))
      .map((item) => clampItem(item, columns, this.definitions().get(item.type)));
    return resolveLayout(known, null, this.compact());
  });

  protected readonly entries = computed<Entry[]>(() => {
    const narrow = this.narrow();
    const committed = this.layout();
    // Pendant un glisser, l'ordre du DOM ne bouge pas (déplacer l'élément ferait perdre la capture du pointeur) :
    // seules les positions viennent de la disposition provisoire.
    const preview = new Map((this.preview() ?? []).map((item) => [item.id, item]));
    for (const id of [...this.contexts.keys()]) if (!committed.some((item) => item.id === id)) this.contexts.delete(id);
    return sortByPosition(committed).map((committedItem) => {
      const item = preview.get(committedItem.id) ?? committedItem;
      const definition = this.definitions().get(item.type) as UiWidgetDefinition<object>;
      const { context, injector } = this.contextFor(item.id, definition);
      return {
        item,
        definition,
        context,
        injector,
        column: narrow ? '1 / -1' : `${item.x + 1} / span ${item.w}`,
        row: narrow ? `auto / span ${item.h}` : `${item.y + 1} / span ${item.h}`,
      };
    });
  });

  /** Catalogue regroupé par catégorie, dans l'ordre de `widgetCategories` puis d'apparition ; « Autres » en dernier. */
  protected readonly catalogGroups = computed(() => {
    const byName = new Map<string, UiWidgetDefinition<object>[]>();
    for (const definition of this.widgets()) {
      const name = definition.category?.trim() ?? '';
      const list = byName.get(name) ?? [];
      list.push(definition);
      byName.set(name, list);
    }
    const known = this.widgetCategories();
    const names = [
      ...known.map((c) => c.name).filter((name) => byName.has(name)),
      ...[...byName.keys()].filter((name) => name && !known.some((c) => c.name === name)),
      ...(byName.has('') ? [''] : []),
    ];
    return names.map((name) => {
      const meta = known.find((c) => c.name === name);
      return {
        name,
        named: name !== '',
        label: name || this.otherCategoryLabel(),
        icon: meta?.icon,
        description: meta?.description,
        widgets: byName.get(name) ?? [],
      };
    });
  });

  /** Tiroirs ouverts choisis par l'utilisateur (par défaut : le premier). */
  private readonly openedCategories = signal<ReadonlySet<string> | null>(null);
  protected readonly openCategories = computed<ReadonlySet<string>>(
    () => this.openedCategories() ?? new Set(this.catalogGroups().slice(0, 1).map((g) => g.name)),
  );

  protected readonly selectedEntry = computed(() => this.entries().find((e) => e.item.id === this.selectedId()) ?? null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Largeur du composant (pas de la grille, qui rétrécit quand la colonne « Personnaliser » s'ouvre).
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    afterNextRender(() => {
      const measure = (w: number) => {
        if (w > 0) this.width.set(w);
      };
      measure(host.getBoundingClientRect().width);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    if (isDevMode()) {
      afterNextRender(() => {
        const unknown = this.items().filter((item) => !this.definitions().has(item.type)).map((item) => item.type);
        if (unknown.length) console.warn(`[ic-angular-uikit] ui-dashboard : types de widgets inconnus ignorés : ${[...new Set(unknown)].join(', ')}`);
      });
    }
  }

  /** Disposition sérialisable courante. */
  getLayout(): UiDashboardLayout {
    return { version: 1, columns: this.columns(), items: this.layout().map((item) => ({ ...item })) };
  }

  /** Ajoute un widget à la première place libre et le sélectionne. Renvoie son identifiant (ou `null`). */
  addWidget(type: string): string | null {
    const definition = this.definitions().get(type);
    if (!definition || this.isFull(definition)) return null;
    const columns = this.columns();
    const base = clampItem({ id: '', type, x: 0, y: 0, ...definition.defaultSize }, columns, definition);
    const spot = findFreeSpot(this.layout(), base.w, base.h, columns);
    const id = `${type.slice(0, 40)}-${randomId()}`;
    const item: UiDashboardItem = { ...base, ...spot, id };
    this.commit(resolveLayout([...this.layout(), item], id, this.compact()));
    this.selectedId.set(id);
    this.announce(`${definition.title} ajouté.`);
    afterNextRender(
      () => this.gridRef().nativeElement.querySelector(`[data-widget-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      { injector: this.injector },
    );
    return id;
  }

  /** Retire un widget. */
  removeWidget(id: string): void {
    const entries = this.entries();
    const index = entries.findIndex((e) => e.item.id === id);
    if (index < 0) return;
    const title = entries[index].context.title();
    const focusWasInside = this.gridRef().nativeElement.querySelector(`[data-widget-id="${id}"]`)?.contains(this.document.activeElement);
    this.commit(resolveLayout(this.layout().filter((item) => item.id !== id), null, this.compact()));
    if (this.selectedId() === id) this.selectedId.set(null);
    this.announce(`${title} retiré.`);
    // Le bouton cliqué disparaît : focus sur le widget voisin, sinon sur le bouton de personnalisation.
    if (focusWasInside || this.document.activeElement === this.document.body) {
      const neighbour = entries[index + 1] ?? entries[index - 1];
      afterNextRender(
        () => {
          const host = this.gridRef().nativeElement.parentElement?.parentElement;
          const target = neighbour
            ? this.gridRef().nativeElement.querySelector<HTMLElement>(`[data-widget-id="${neighbour.item.id}"] .ui-widget__move, [data-widget-id="${neighbour.item.id}"] button`)
            : host?.querySelector<HTMLElement>('.ui-dashboard__customize');
          target?.focus();
        },
        { injector: this.injector },
      );
    }
  }

  /** Ouvre la colonne « Personnaliser » sur un widget. */
  configure(id: string): void {
    this.selectedId.set(id);
    this.editing.set(true);
    afterNextRender(() => this.widgetHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Bascule le mode personnalisation. */
  toggleEditing(): void {
    this.editing.update((editing) => !editing);
    if (!this.editing()) this.cancelDrag();
  }

  /** @internal */
  isFull(definition: UiWidgetDefinition<object>): boolean {
    return definition.maxInstances !== undefined && this.layout().filter((i) => i.type === definition.type).length >= definition.maxInstances;
  }

  /** @internal Mise à jour d'un élément (réglages, titre) sans changer la disposition. */
  updateItem(id: string, change: Partial<UiDashboardItem>): void {
    this.commit(this.layout().map((item) => (item.id === id ? { ...item, ...change, id } : item)), false);
  }

  /** @internal */
  setFlipped(id: string, flipped: boolean): void {
    this.flipped.update((set) => {
      const next = new Set(set);
      if (flipped) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected onCategoryToggle(name: string, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    const current = this.openCategories();
    if (open === current.has(name)) return;
    if (open) this.openedCategories.set(this.catalogAccordion() ? new Set([name]) : new Set([...current, name]));
    else this.openedCategories.set(new Set([...current].filter((n) => n !== name)));
  }

  protected asDefinitions(value: unknown): UiWidgetDefinition<object>[] {
    return value as UiWidgetDefinition<object>[];
  }

  protected setTitle(id: string, title: string): void {
    const trimmed = title.trim().slice(0, 120);
    this.updateItem(id, { title: trimmed || undefined });
  }

  protected resize(id: string, w: number | null, h: number | null): void {
    const item = this.layout().find((i) => i.id === id);
    if (!item) return;
    this.commit(moveItem(this.layout(), id, { w: w ?? item.w, h: h ?? item.h }, this.columns(), this.definitions().get(item.type), this.compact()));
  }

  protected widthOptions(entry: Entry): UiSelectOption<number>[] {
    const max = Math.min(this.columns(), entry.definition.maxW ?? this.columns());
    const min = Math.min(max, entry.definition.minW ?? 1);
    return range(min, max).map((n) => ({ value: n, label: `${n} colonne${n > 1 ? 's' : ''} sur ${this.columns()}` }));
  }

  protected heightOptions(entry: Entry): UiSelectOption<number>[] {
    const max = entry.definition.maxH ?? Math.max(8, entry.item.h);
    const min = Math.min(max, entry.definition.minH ?? 1);
    return range(min, max).map((n) => ({ value: n, label: `${n} ligne${n > 1 ? 's' : ''}` }));
  }

  /** @internal Glisser à la souris / au doigt depuis une poignée. */
  startPointer(event: PointerEvent, id: string, mode: DragMode): void {
    if (event.button !== 0 || !this.editing() || this.narrow()) return;
    const origin = this.layout().find((item) => item.id === id);
    if (!origin) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    handle.focus({ preventScroll: true });
    const grid = this.gridRef().nativeElement;
    const style = getComputedStyle(grid);
    const gap = parseFloat(style.columnGap) || 0;
    const columns = this.columns();
    const stepX = (grid.clientWidth - gap * (columns - 1)) / columns + gap;
    const stepY = this.rowHeight() + gap;
    const rtl = style.direction === 'rtl';
    const startX = event.clientX;
    const startY = event.clientY;
    const limits = this.definitions().get(origin.type);
    this.drag.set({ id, mode });
    this.selectedId.set(id);

    const move = (e: PointerEvent) => {
      const dx = Math.round(((rtl ? -1 : 1) * (e.clientX - startX)) / stepX);
      const dy = Math.round((e.clientY - startY) / stepY);
      const change = mode === 'move' ? { x: origin.x + dx, y: origin.y + dy } : { w: origin.w + dx, h: origin.h + dy };
      this.preview.set(moveItem(this.layout(), id, change, columns, limits, this.compact()));
      // Défilement de la page près des bords (le pointeur capturé ne fait pas défiler).
      const view = this.document.defaultView;
      if (view) {
        if (e.clientY > view.innerHeight - 48) view.scrollBy(0, 16);
        else if (e.clientY < 48) view.scrollBy(0, -16);
      }
    };
    const end = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      handle.removeEventListener('lostpointercapture', end);
      if (!this.drag()) return; // déjà annulé (Échap)
      const preview = this.preview();
      // Capture perdue sans pointerup (élément retiré, fenêtre quittée) : on garde la dernière position vue.
      if (e.type !== 'pointercancel' && preview) this.commit(preview);
      this.preview.set(null);
      this.drag.set(null);
      this.announcePosition(id, mode);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
  }

  /** @internal Clavier sur les poignées : flèches = une case ; Échap annule un glisser. */
  onHandleKey(event: KeyboardEvent, id: string, mode: DragMode): void {
    if (event.key === 'Escape' && this.drag()) {
      event.preventDefault();
      this.cancelDrag();
      return;
    }
    const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === 'rtl';
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [rtl ? 1 : -1, 0],
      ArrowRight: [rtl ? -1 : 1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = deltas[event.key];
    const item = this.layout().find((i) => i.id === id);
    if (!delta || !item || this.drag()) return;
    event.preventDefault();
    const [dx, dy] = delta;
    const change = mode === 'move' ? { x: item.x + dx, y: item.y + dy } : { w: item.w + dx, h: item.h + dy };
    this.commit(moveItem(this.layout(), id, change, this.columns(), this.definitions().get(item.type), this.compact()));
    this.announcePosition(id, mode);
  }

  private cancelDrag(): void {
    if (!this.drag()) return;
    this.preview.set(null);
    this.drag.set(null);
    this.announce('Déplacement annulé.');
  }

  private announcePosition(id: string, mode: DragMode): void {
    const entry = this.entries().find((e) => e.item.id === id);
    if (!entry) return;
    const { x, y, w, h } = entry.item;
    this.announce(
      mode === 'move'
        ? `${entry.context.title()} : colonne ${x + 1}, ligne ${y + 1}.`
        : `${entry.context.title()} : ${w} colonne${w > 1 ? 's' : ''} de large, ${h} ligne${h > 1 ? 's' : ''} de haut.`,
    );
  }

  private announce(message: string): void {
    // Même message deux fois de suite : on le modifie pour qu'il soit relu.
    this.announcement.set(this.announcement() === message ? `${message} ` : message);
  }

  /** Enregistre une nouvelle disposition (ordre du DOM = ordre de lecture) et notifie. */
  private commit(items: UiDashboardItem[], relayout = true): void {
    const active = this.document.activeElement as HTMLElement | null;
    const grid = this.gridRef().nativeElement;
    const next = relayout ? sortByPosition(items) : items;
    this.items.set(next);
    this.layoutChange.emit({ version: 1, columns: this.columns(), items: next.map((item) => ({ ...item })) });
    // Réordonner le DOM fait perdre le focus à l'élément déplacé : on le lui rend.
    if (active && grid.contains(active)) {
      afterNextRender(
        () => {
          if (this.document.activeElement !== active && active.isConnected) active.focus({ preventScroll: true });
        },
        { injector: this.injector },
      );
    }
  }

  private contextFor(id: string, definition: UiWidgetDefinition<object>): { context: UiWidgetContext<object>; injector: Injector } {
    const cached = this.contexts.get(id);
    if (cached && cached.context.definition === definition) return cached;
    // Dernière valeur connue conservée : le widget peut encore lire son état pendant sa destruction.
    let last: UiDashboardItem | undefined;
    const item: Signal<UiDashboardItem> = computed(() => {
      const found = (this.preview() ?? this.layout()).find((i) => i.id === id);
      if (found) last = found;
      return (found ?? last) as UiDashboardItem;
    });
    const context = new UiWidgetContext<object>(id, item, definition, computed(() => this.flipped().has(id)), this.editing, this);
    const injector = Injector.create({ providers: [{ provide: UiWidgetContext, useValue: context }], parent: this.injector });
    const created = { context, injector };
    this.contexts.set(id, created);
    return created;
  }
}

function range(min: number, max: number): number[] {
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
}

/** Identifiant aléatoire court (crypto, pas Math.random). */
function randomId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
