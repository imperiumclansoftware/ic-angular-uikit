import { NgTemplateOutlet } from '@angular/common';
import { UiCheckbox } from '../checkbox/checkbox';
import { UiSelect } from '../select/select';
import { UiPrefix, UiTextField } from '../text-field/text-field';
import {
  UI_FILTER_OPERATORS,
  UI_FILTER_OPERATOR_LABELS,
  UiFilterOperator,
  UiTableCondition,
  UiTableFilter,
  UiTableFilters,
  UiTableRange,
  displayValue,
  operatorArity,
  distinctOptions,
  isFilterActive,
  matchesFilter,
  matchesSearch,
} from './table-filter';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
  ElementRef,
  DestroyRef,
  Injector,
  afterNextRender,
  effect,
  untracked,
} from '@angular/core';
import { uniqueId } from '../core/id';

/** Définition d'une colonne de `ui-table`. */
export interface UiTableColumn<T = unknown> {
  /** Identifiant de la colonne ; sert aussi de propriété lue sur la ligne si `value` est absent. */
  key: string;
  /** Libellé de l'en-tête. */
  header: string;
  /** Autorise le tri sur cette colonne. */
  sortable?: boolean;
  /** Alignement du contenu (utilisez `end` pour les nombres). */
  align?: 'start' | 'center' | 'end';
  /** Largeur CSS de la colonne (`'8rem'`, `'20%'`…). */
  width?: string;
  /** Accesseur de valeur, utilisé pour l'affichage par défaut, le tri, la recherche et les filtres. */
  value?: (row: T) => unknown;
  /** Filtre de la colonne (avec l'option `filterable` de la table). */
  filter?: UiTableFilter;
  /** Filtrage sur mesure : remplace la règle du type de filtre. */
  filterMatch?: (value: unknown, filterValue: unknown, row: T) => boolean;
  /** Prise en compte par la recherche globale (défaut : `true`). */
  searchable?: boolean;
  /** Peut être masquée avec l'option `columnToggle` (défaut : `true`). */
  hideable?: boolean;
  /** Masquée au départ (tant que `hiddenColumns` n'est pas fourni). */
  hidden?: boolean;
}

export type UiSortDirection = 'asc' | 'desc';

/** État de tri de `ui-table`. */
export interface UiTableSort {
  /** Colonne triée. */
  key: string;
  /** Sens du tri. */
  direction: UiSortDirection;
}

/** Payload de l'événement `rowClick`. */
export interface UiTableRowEvent<T = unknown> {
  /** Ligne cliquée. */
  row: T;
  /** Index de la ligne dans l'affichage trié et filtré, toutes pages confondues. */
  index: number;
}

/** Taille de page : un nombre de lignes, ou `'auto'` (autant de lignes que la hauteur disponible le permet, sans défilement). */
export type UiTablePageSize = number | 'auto';

/** Payload de l'événement `paginationChange`. */
export interface UiTablePage {
  /** Page affichée (à partir de 1). */
  page: number;
  /** Nombre de lignes par page (la taille calculée en mode `'auto'`). */
  pageSize: number;
}

/** Contexte des templates de cellule. */
export interface UiCellContext<T> {
  /** Ligne (`let-row`). */
  $implicit: T;
  /** Valeur de la cellule (`let-value="value"`). */
  value: unknown;
  /** Index de la ligne dans l'affichage trié et filtré, toutes pages confondues (`let-i="index"`). */
  index: number;
  /** Colonne (`let-column="column"`). */
  column: UiTableColumn<T>;
}

/** Contexte des templates d'en-tête. */
export interface UiHeaderContext<T> {
  /** Colonne (`let-column`). */
  $implicit: UiTableColumn<T>;
}

/**
 * Template de cellule pour une colonne.
 *
 * ```html
 * <ng-template uiCell="status" [uiCellOf]="users" let-user let-value="value">…</ng-template>
 * ```
 * `uiCellOf` est facultatif et ne sert qu'à typer `let-user`.
 */
@Directive({ selector: 'ng-template[uiCell]' })
export class UiCell<T> {
  /** Clé de la colonne ciblée. */
  readonly uiCell = input.required<string>();
  /** Données de la table, uniquement pour typer le contexte du template. */
  readonly uiCellOf = input<readonly T[]>();
  readonly template = inject<TemplateRef<UiCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: UiCell<T>, _ctx: unknown): _ctx is UiCellContext<T> {
    return true;
  }
}

/** Template d'en-tête pour une colonne (`<ng-template uiHeader="name" let-column>`). */
@Directive({ selector: 'ng-template[uiHeader]' })
export class UiHeader {
  /** Clé de la colonne ciblée. */
  readonly uiHeader = input.required<string>();
  readonly template = inject<TemplateRef<UiHeaderContext<unknown>>>(TemplateRef);

  static ngTemplateContextGuard(_dir: UiHeader, _ctx: unknown): _ctx is UiHeaderContext<unknown> {
    return true;
  }
}

/** Contenu affiché quand la table est vide (`<ng-template uiTableEmpty>`). */
@Directive({ selector: 'ng-template[uiTableEmpty]' })
export class UiTableEmpty {
  readonly template = inject(TemplateRef);
}

/**
 * Table de données avec colonnes déclaratives, tri et templates de cellule.
 *
 * @slot ng-template[uiCell] - Template de cellule d'une colonne ; contexte `UiCellContext` (`let-row`, `value`, `index`, `column`).
 * @slot ng-template[uiHeader] - Template d'en-tête d'une colonne ; contexte `let-column`.
 * @slot ng-template[uiTableEmpty] - Contenu affiché quand `data` est vide.
 * @slot ui-ribbon - Ruban dans un coin de la table.
 * @slot [uiTableToolbar] - Contenu ajouté à la barre d'outils (boutons d'action…).
 * @cssprop --ui-table-row-height - Hauteur minimale des lignes.
 * @category Affichage
 */
@Component({
  selector: 'ui-table',
  imports: [NgTemplateOutlet, UiTextField, UiPrefix, UiSelect, UiCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-table',
    '(document:click)': 'onDocumentClick($event)',
    '[class.ui-table--striped]': 'striped()',
    '[class.ui-table--dense]': 'dense()',
    '[class.ui-table--sticky]': 'stickyHeader()',
    '[class.ui-table--clickable]': 'clickableRows()',
    '[class.ui-table--auto-size]': "paginated() && pageSize() === 'auto'",
  },
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class UiTable<T> {
  /** Lignes à afficher. */
  readonly data = input<readonly T[]>([]);
  /** Colonnes à afficher, dans l'ordre. */
  readonly columns = input.required<readonly UiTableColumn<T>[]>();
  /** Tri courant, `null` si aucun. Liaison bidirectionnelle `[(sort)]` ; `(sortChange)` est émis à chaque clic de tri. */
  readonly sort = model<UiTableSort | null>(null);
  /** Tri géré par le parent (côté serveur) : la table émet `sortChange` sans réordonner `data`. */
  readonly manualSort = input(false, { transform: booleanAttribute });
  /** Fonction d'identité des lignes pour le suivi du DOM (défaut : la ligne elle-même). */
  readonly trackBy = input<(row: T, index: number) => unknown>((row) => row);
  /** Alterne la couleur de fond des lignes. */
  readonly striped = input(false, { transform: booleanAttribute });
  /** Réduit la hauteur des lignes. */
  readonly dense = input(false, { transform: booleanAttribute });
  /** Garde l'en-tête visible au défilement (donnez une hauteur à la table). */
  readonly stickyHeader = input(false, { transform: booleanAttribute });
  /** Rend les lignes cliquables et focusables (émet `rowClick`). */
  readonly clickableRows = input(false, { transform: booleanAttribute });
  /** Légende accessible de la table. */
  readonly caption = input<string>();
  /** Nom accessible de la zone défilante quand il n'y a pas de `caption` (la zone est focalisable pour défiler au clavier). */
  readonly regionLabel = input('Tableau');
  /** Texte affiché quand la table est vide et qu'aucun template `uiTableEmpty` n'est fourni. */
  readonly emptyText = input('Aucune donnée');

  /** Affiche un champ de recherche portant sur toutes les colonnes visibles. */
  readonly searchable = input(false, { transform: booleanAttribute });
  /** Texte de recherche (liaison bidirectionnelle `[(search)]`). */
  readonly search = model('');
  /** Texte indicatif du champ de recherche. */
  readonly searchPlaceholder = input('Rechercher…');
  /** Affiche une ligne de filtres sous les en-têtes, pour les colonnes qui déclarent un `filter`. */
  readonly filterable = input(false, { transform: booleanAttribute });
  /** Valeurs des filtres par clé de colonne (liaison bidirectionnelle `[(filters)]`). */
  readonly filters = model<UiTableFilters>({});
  /** Affiche le bouton « Colonnes » pour masquer / afficher des colonnes. */
  readonly columnToggle = input(false, { transform: booleanAttribute });
  /** Clés des colonnes masquées (liaison `[(hiddenColumns)]`) ; `null` : celles marquées `hidden`. */
  readonly hiddenColumns = model<readonly string[] | null>(null);
  /** Filtrage géré par le parent (côté serveur) : la table émet recherche et filtres sans filtrer `data`. */
  readonly manualFilter = input(false, { transform: booleanAttribute });

  /** Permet de réordonner les colonnes : glisser-déposer des en-têtes, ou boutons Monter / Descendre du menu « Colonnes ». */
  readonly reorderable = input(false, { transform: booleanAttribute });
  /** Ordre des colonnes par clé (liaison `[(columnOrder)]`) ; `null` : ordre de `columns`. Les clés inconnues sont ignorées, les colonnes absentes ajoutées à la fin. */
  readonly columnOrder = model<readonly string[] | null>(null);

  /** Découpe les lignes en pages et affiche la barre de pagination. */
  readonly paginated = input(false, { transform: booleanAttribute });
  /** Page affichée, à partir de 1 (liaison `[(page)]`). Revient à 1 quand la recherche, les filtres ou le tri changent. */
  readonly page = model(1);
  /**
   * Lignes par page (liaison `[(pageSize)]`). `'auto'` : autant de lignes que possible sans faire défiler
   * le conteneur défilant de la table (ou la fenêtre) ; recalculé au redimensionnement.
   */
  readonly pageSize = model<UiTablePageSize>(10);
  /** Choix proposés dans la liste « Lignes par page » (`'auto'` inclus) ; liste vide : pas de sélecteur. */
  readonly pageSizeOptions = input<readonly UiTablePageSize[]>([10, 25, 50, 100, 'auto']);
  /** Pagination gérée par le parent (côté serveur) : `data` contient déjà la page ; fournissez `totalItems`. */
  readonly manualPagination = input(false, { transform: booleanAttribute });
  /** Nombre total de lignes côté serveur (avec `manualPagination`). */
  readonly totalItems = input<number | null>(null);

  /** Émis au clic (ou Entrée) sur une ligne, si `clickableRows`. */
  readonly rowClick = output<UiTableRowEvent<T>>();
  /** Émis quand la page ou la taille de page effective change (y compris le premier calcul en mode `'auto'`). */
  readonly paginationChange = output<UiTablePage>();

  private readonly cellDefs = contentChildren(UiCell);
  private readonly headerDefs = contentChildren(UiHeader);
  protected readonly emptyDef = contentChild(UiTableEmpty);

  protected readonly cellTemplates = computed(
    () => new Map(this.cellDefs().map((def) => [def.uiCell(), def.template as TemplateRef<UiCellContext<T>>])),
  );
  protected readonly headerTemplates = computed(() => new Map(this.headerDefs().map((def) => [def.uiHeader(), def.template])));

  protected readonly baseId = uniqueId('ui-table');
  protected readonly columnsMenuOpen = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  /** Colonnes masquées (choix de l'utilisateur, sinon colonnes marquées `hidden`). */
  protected readonly hiddenKeys = computed(
    () => new Set(this.hiddenColumns() ?? this.columns().filter((c) => c.hidden).map((c) => c.key)),
  );
  /** Colonnes dans l'ordre choisi (`columnOrder`), masquées comprises. */
  protected readonly orderedColumns = computed(() => {
    const columns = this.columns();
    const order = this.columnOrder();
    if (!order) return columns;
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const ordered = order.flatMap((key) => {
      const column = byKey.get(key);
      byKey.delete(key);
      return column ? [column] : [];
    });
    return [...ordered, ...byKey.values()];
  });
  /** Colonnes affichées. */
  protected readonly visibleColumns = computed(() => this.orderedColumns().filter((c) => !this.hiddenKeys().has(c.key)));
  protected readonly hasFilters = computed(() => this.filterable() && this.visibleColumns().some((c) => c.filter));
  protected readonly hasColumnsMenu = computed(() => this.columnToggle() || this.reorderable());
  protected readonly hasToolbar = computed(() => this.searchable() || this.hasColumnsMenu());
  /** Ordre modifié par rapport à `columns`. */
  protected readonly isReordered = computed(() => this.orderedColumns().some((c, i) => c !== this.columns()[i]));
  /** Colonne en cours de glisser-déposer. */
  protected readonly dragKey = signal<string | null>(null);
  protected readonly dropKey = signal<string | null>(null);
  /** Message lu par les lecteurs d'écran après un déplacement de colonne. */
  protected readonly announcement = signal('');

  /** Opérateurs proposés par colonne (filtres avancés). */
  protected readonly operatorOptions = computed(() => {
    const map = new Map<string, { value: UiFilterOperator; label: string }[]>();
    for (const column of this.columns()) {
      const filter = column.filter;
      if (filter && (filter.type === 'text' || filter.type === 'number' || filter.type === 'date')) {
        const ops = (filter.operators ?? UI_FILTER_OPERATORS[filter.type]) as readonly UiFilterOperator[];
        map.set(column.key, ops.map((op) => ({ value: op, label: UI_FILTER_OPERATOR_LABELS[op] })));
      }
    }
    return map;
  });
  protected readonly operatorArity = operatorArity;

  /** Options des filtres `select` sans options fournies : valeurs distinctes de la colonne. */
  protected readonly filterOptions = computed(() => {
    const map = new Map<string, readonly { value: unknown; label: string }[]>();
    for (const column of this.columns()) {
      if (column.filter?.type === 'select') {
        map.set(column.key, column.filter.options ?? distinctOptions(this.data().map((row) => this.valueOf(row, column))));
      }
    }
    return map;
  });

  /** Recherche ou filtre actif. */
  readonly filtering = computed(
    () => this.search().trim() !== '' || Object.entries(this.filters()).some(([key, value]) => this.columns().some((c) => c.key === key) && isFilterActive(value)),
  );

  /** Lignes après recherche et filtres (avant tri). */
  protected readonly filteredRows = computed(() => {
    const data = this.data();
    if (this.manualFilter() || !this.filtering()) return data;
    const search = this.search();
    const filters = this.filters();
    const searchColumns = this.visibleColumns().filter((c) => c.searchable !== false);
    const filterColumns = this.columns().filter((c) => c.filter && isFilterActive(filters[c.key]));
    return data.filter((row) => {
      for (const column of filterColumns) {
        const value = this.valueOf(row, column);
        const filterValue = filters[column.key];
        const ok = column.filterMatch ? column.filterMatch(value, filterValue, row) : matchesFilter(column.filter as UiTableFilter, value, filterValue);
        if (!ok) return false;
      }
      return matchesSearch(searchColumns.map((c) => displayValue(this.valueOf(row, c))).join(' '), search);
    });
  });

  /** Lignes affichées : filtrées puis triées. */
  protected readonly rows = computed(() => {
    const data = this.filteredRows();
    const sort = this.sort();
    if (!sort || this.manualSort()) {
      return data;
    }
    const column = this.columns().find((c) => c.key === sort.key);
    if (!column) {
      return data;
    }
    const factor = sort.direction === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...data].sort((a, b) => factor * compare(this.valueOf(a, column), this.valueOf(b, column), collator));
  });

  /** Nombre de lignes calculé pour `pageSize = 'auto'`. */
  protected readonly autoSize = signal(10);
  /** Taille de page effective. */
  readonly effectivePageSize = computed(() => {
    const size = this.pageSize();
    return size === 'auto' ? this.autoSize() : Math.max(1, Math.floor(size) || 1);
  });
  /** Nombre total de lignes à paginer. */
  protected readonly totalCount = computed(() => (this.manualPagination() ? (this.totalItems() ?? this.data().length) : this.rows().length));
  /** Nombre de pages (au moins 1). */
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.effectivePageSize())));
  /** Page affichée, ramenée dans les bornes. */
  readonly currentPage = computed(() => Math.min(Math.max(1, Math.floor(this.page()) || 1), this.pageCount()));
  /** Index (0) de la première ligne de la page. */
  protected readonly pageStart = computed(() => (this.paginated() ? (this.currentPage() - 1) * this.effectivePageSize() : 0));
  /** Index (exclusif) de la dernière ligne de la page. */
  protected readonly pageEnd = computed(() => Math.min(this.pageStart() + this.effectivePageSize(), this.totalCount()));
  /** Lignes de la page affichée. */
  protected readonly pagedRows = computed(() => {
    const rows = this.rows();
    if (!this.paginated() || this.manualPagination()) return rows;
    const start = this.pageStart();
    return rows.slice(start, start + this.effectivePageSize());
  });
  /** Numéros de page affichés, `0` pour une ellipse (première, dernière, et voisines de la page courante). */
  protected readonly pageItems = computed(() => {
    const count = this.pageCount();
    const current = this.currentPage();
    const pages = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
    if (current <= 3) [2, 3, 4].forEach((p) => p <= count && pages.add(p));
    if (current >= count - 2) [count - 1, count - 2, count - 3].forEach((p) => p >= 1 && pages.add(p));
    const sorted = [...pages].sort((a, b) => a - b);
    return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [0, p] : [p]));
  });
  protected readonly pageSizeChoices = computed(() =>
    this.pageSizeOptions().map((size) => ({ value: size, label: size === 'auto' ? `Auto (${this.autoSize()})` : String(size) })),
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  constructor() {
    // Retour à la première page quand le jeu de lignes change (recherche, filtres, tri).
    let first = true;
    effect(() => {
      this.search();
      this.filters();
      this.sort();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.page() !== 1 && this.page.set(1));
    });

    let last = '';
    effect(() => {
      if (!this.paginated()) return;
      const state = { page: this.currentPage(), pageSize: this.effectivePageSize() };
      const key = `${state.page}/${state.pageSize}`;
      if (key !== last) {
        last = key;
        untracked(() => this.paginationChange.emit(state));
      }
    });

    afterNextRender(() => this.observeSize());
    // Nouvelles lignes affichées (données, page, colonnes) : leur hauteur peut changer.
    effect(() => {
      this.pagedRows();
      this.visibleColumns();
      if (this.paginated() && this.pageSize() === 'auto') queueMicrotask(() => this.measure());
    });
  }

  /** Va à une page (bornée). */
  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
  }

  /** Change la taille de page en gardant visible la première ligne de la page courante. */
  setPageSize(size: UiTablePageSize | null): void {
    if (size === null) return;
    const firstRow = this.pageStart();
    this.pageSize.set(size);
    this.page.set(Math.floor(firstRow / this.effectivePageSize()) + 1);
  }

  /** Déplace une colonne de `delta` positions (au clavier : boutons Monter / Descendre). */
  moveColumn(key: string, delta: number): void {
    const keys = this.orderedColumns().map((c) => c.key);
    const from = keys.indexOf(key);
    const to = Math.min(Math.max(0, from + delta), keys.length - 1);
    if (from < 0 || from === to) return;
    keys.splice(to, 0, ...keys.splice(from, 1));
    this.columnOrder.set(keys);
    this.announceMove(key, to);
  }

  /** Place la colonne `key` à la position de `target` (glisser-déposer). */
  moveColumnTo(key: string, target: string): void {
    const keys = this.orderedColumns().map((c) => c.key);
    const from = keys.indexOf(key);
    const to = keys.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    keys.splice(to, 0, ...keys.splice(from, 1));
    this.columnOrder.set(keys);
    this.announceMove(key, to);
  }

  /** Rétablit l'ordre de `columns`. */
  resetColumnOrder(): void {
    this.columnOrder.set(null);
    this.announcement.set('Ordre des colonnes réinitialisé');
  }

  private announceMove(key: string, index: number): void {
    const column = this.columns().find((c) => c.key === key);
    this.announcement.set(`${column?.header ?? key} : position ${index + 1} sur ${this.columns().length}`);
  }

  /** Bouton Monter / Descendre : garde le focus sur la colonne déplacée (son élément est déplacé dans le DOM). */
  protected onMoveClick(column: UiTableColumn<T>, delta: number): void {
    this.moveColumn(column.key, delta);
    const index = this.orderedColumns().indexOf(column);
    const last = this.orderedColumns().length - 1;
    const dir = (delta < 0 && index > 0) || (delta > 0 && index === last) ? 'up' : 'down';
    afterNextRender(
      () => (this.host.querySelector(`[data-move="${CSS.escape(column.key)}-${dir}"]`) as HTMLElement | null)?.focus(),
      { injector: this.injector },
    );
  }


  protected onDragStart(event: DragEvent, column: UiTableColumn<T>): void {
    if (!this.reorderable()) return;
    this.dragKey.set(column.key);
    event.dataTransfer?.setData('text/plain', column.key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onDragOver(event: DragEvent, column: UiTableColumn<T>): void {
    const dragged = this.dragKey();
    if (!dragged) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropKey.set(dragged === column.key ? null : column.key);
  }

  protected onDrop(event: DragEvent, column: UiTableColumn<T>): void {
    const dragged = this.dragKey();
    if (!dragged) return;
    event.preventDefault();
    this.moveColumnTo(dragged, column.key);
    this.onDragEnd();
  }

  protected onDragEnd(): void {
    this.dragKey.set(null);
    this.dropKey.set(null);
  }

  /** Observe la taille de la table et de son conteneur défilant pour le mode `'auto'`. */
  private observeSize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => this.measure());
    observer.observe(this.host);
    const container = scrollParent(this.host);
    if (container) observer.observe(container);
    const onResize = () => this.measure();
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    });
  }

  /**
   * Calcule le nombre de lignes qui tiennent sans défilement : hauteur visible du conteneur défilant
   * (ou de la fenêtre) sous le haut de la table, moins l'en-tête, les filtres, la barre d'outils et la pagination.
   */
  private measure(): void {
    if (!this.paginated() || this.pageSize() !== 'auto' || !this.host.isConnected) return;
    const tbody = this.host.querySelector('tbody');
    const rows = this.host.querySelectorAll<HTMLElement>('tbody > .ui-table__row');
    if (!tbody || !rows.length) return;
    let rowHeight = 0;
    rows.forEach((row) => (rowHeight = Math.max(rowHeight, row.getBoundingClientRect().height)));
    if (rowHeight <= 0) return;
    const hostRect = this.host.getBoundingClientRect();
    const chrome = hostRect.height - tbody.getBoundingClientRect().height;
    const container = scrollParent(this.host);
    let available: number;
    if (container) {
      const style = getComputedStyle(container);
      const box = container.getBoundingClientRect();
      const top = hostRect.top - box.top - container.clientTop + container.scrollTop;
      const height = container.clientHeight - parseFloat(style.paddingBottom || '0');
      available = height - top;
      // Table placée bas dans un long conteneur : on vise la hauteur visible entière.
      if (available < rowHeight * 3 + chrome) available = height - parseFloat(style.paddingTop || '0');
    } else {
      const top = hostRect.top + window.scrollY;
      available = window.innerHeight - top;
      if (available < rowHeight * 3 + chrome) available = window.innerHeight;
    }
    const size = Math.max(1, Math.floor((available - chrome - 1) / rowHeight));
    if (size !== this.autoSize()) this.autoSize.set(size);
  }

  /** Valeur d'une cellule (accesseur `value` ou propriété `key`). */
  valueOf(row: T, column: UiTableColumn<T>): unknown {
    return column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];
  }

  /** Cycle de tri d'une colonne : ascendant → descendant → aucun. */
  toggleSort(column: UiTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }
    const current = this.sort();
    let next: UiTableSort | null;
    if (current?.key !== column.key) {
      next = { key: column.key, direction: 'asc' };
    } else if (current.direction === 'asc') {
      next = { key: column.key, direction: 'desc' };
    } else {
      next = null;
    }
    this.sort.set(next);
  }

  protected ariaSort(column: UiTableColumn<T>): string | null {
    if (!column.sortable) {
      return null;
    }
    const sort = this.sort();
    if (sort?.key !== column.key) {
      return 'none';
    }
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected onRowActivate(row: T, index: number): void {
    if (this.clickableRows()) {
      this.rowClick.emit({ row, index });
    }
  }

  /** Modifie la valeur d'un filtre (`null` ou vide : filtre retiré). */
  setFilter(key: string, value: unknown): void {
    const others = Object.entries(this.filters()).filter(([k]) => k !== key);
    // Une condition avancée est conservée même sans valeur : l'opérateur choisi ne doit pas être perdu
    // avant la saisie (elle ne filtre qu'une fois active).
    const keep = isFilterActive(value) || (typeof value === 'object' && value !== null && 'op' in value);
    this.filters.set(Object.fromEntries(keep ? [...others, [key, value]] : others));
  }

  /** Efface la recherche et tous les filtres. */
  resetFilters(): void {
    this.search.set('');
    this.filters.set({});
  }

  /** Affiche ou masque une colonne (au moins une colonne reste visible). */
  toggleColumn(key: string, visible: boolean): void {
    const hidden = new Set(this.hiddenKeys());
    if (visible) hidden.delete(key);
    else if (this.visibleColumns().length > 1) hidden.add(key);
    this.hiddenColumns.set(this.columns().map((c) => c.key).filter((k) => hidden.has(k)));
  }

  /** Filtre avec choix de l'opérateur. */
  protected isAdvanced(filter: UiTableFilter): boolean {
    return (filter.type === 'text' || filter.type === 'number' || filter.type === 'date') && (!!filter.advanced || !!filter.operators?.length);
  }

  /** Condition courante d'une colonne (valeur simple convertie, ou opérateur par défaut). */
  protected conditionOf(column: UiTableColumn<T>): UiTableCondition {
    const current = this.filters()[column.key];
    if (typeof current === 'object' && current !== null && 'op' in current) return current as UiTableCondition;
    const filter = column.filter;
    const ops = this.operatorOptions().get(column.key) ?? [];
    if (filter?.type === 'number') {
      const range = (current as UiTableRange | undefined) ?? {};
      const op = this.isAdvanced(filter) ? (ops[0]?.value ?? 'between') : 'between';
      return { op, value: range.min ?? null, to: range.max ?? null };
    }
    if (filter?.type === 'date') return { op: this.isAdvanced(filter) ? (ops[0]?.value ?? 'between') : 'between', value: null, to: null };
    return { op: ops[0]?.value ?? 'contains', value: typeof current === 'string' ? current : null };
  }

  protected setOperator(column: UiTableColumn<T>, op: UiFilterOperator | null): void {
    const current = this.conditionOf(column);
    this.setFilter(column.key, { ...current, op: op ?? this.operatorOptions().get(column.key)?.[0]?.value ?? current.op });
  }

  protected setConditionValue(column: UiTableColumn<T>, field: 'value' | 'to', text: string): void {
    const parsed = column.filter?.type === 'number' ? (text.trim() === '' || !isFinite(Number(text)) ? null : Number(text)) : text === '' ? null : text;
    this.setFilter(column.key, { ...this.conditionOf(column), [field]: parsed });
  }

  protected conditionText(column: UiTableColumn<T>, field: 'value' | 'to'): string {
    const value = this.conditionOf(column)[field];
    return value === null || value === undefined ? '' : String(value);
  }

  /** Nom d'ancre CSS unique de la ligne d'un filtre (identifiant CSS valide). */
  protected anchorName(column: UiTableColumn<T>): string {
    return `--${this.baseId}-${column.key}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  protected operatorLabel(op: UiFilterOperator): string {
    return UI_FILTER_OPERATOR_LABELS[op];
  }

  /** Symbole court de l'opérateur, affiché devant la valeur (le libellé complet est dans le nom accessible). */
  protected operatorSymbol(op: UiFilterOperator): string {
    const symbols: Partial<Record<UiFilterOperator, string>> = {
      contains: '∋', notContains: '∌', equals: '=', notEquals: '≠', startsWith: 'a…', endsWith: '…a',
      eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', on: '=', before: '<', after: '>',
    };
    return symbols[op] ?? '';
  }

  protected defaultOperator(column: UiTableColumn<T>): UiFilterOperator {
    const filter = column.filter;
    if (filter && !this.isAdvanced(filter)) return filter.type === 'text' ? 'contains' : 'between';
    return this.operatorOptions().get(column.key)?.[0]?.value ?? 'contains';
  }

  protected isFilterActive(column: UiTableColumn<T>): boolean {
    return isFilterActive(this.filters()[column.key]);
  }

  /** Résumé d'un filtre à deux valeurs ou sans valeur (« 10 → 20 », « 7 derniers jours »). */
  protected summaryText(column: UiTableColumn<T>): string {
    const cond = this.conditionOf(column);
    const arity = operatorArity(cond.op);
    if (arity === 0) return UI_FILTER_OPERATOR_LABELS[cond.op];
    const format = (v: string | number | null | undefined) => {
      if (v === null || v === undefined || v === '') return '…';
      if (column.filter?.type === 'date' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        // Format compact (« 1 oct. ») ; l'année seulement si ce n'est pas l'année en cours.
        const date = new Date(v + 'T00:00:00');
        const sameYear = date.getFullYear() === new Date().getFullYear();
        return date.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return String(v);
    };
    if (!isFilterActive(cond)) return column.filter?.type === 'date' ? 'Toutes les dates' : 'Tous';
    return `${format(cond.value)} → ${format(cond.to)}`;
  }

  protected inputType(filter: UiTableFilter): 'text' | 'number' | 'date' {
    return filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text';
  }

  protected booleanOptions(filter: UiTableFilter): { value: boolean; label: string }[] {
    return filter.type === 'boolean' ? [{ value: true, label: filter.trueLabel ?? 'Oui' }, { value: false, label: filter.falseLabel ?? 'Non' }] : [];
  }

  protected filterPlaceholder(filter: UiTableFilter): string {
    return (filter.type === 'text' || filter.type === 'select') && filter.placeholder ? filter.placeholder : filter.type === 'text' ? 'Filtrer…' : 'Tous';
  }

  protected canHide(column: UiTableColumn<T>): boolean {
    return column.hideable !== false && !(this.visibleColumns().length === 1 && !this.hiddenKeys().has(column.key));
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.columnsMenuOpen()) return;
    const menu = this.host.querySelector('.ui-table__columns');
    if (menu && !menu.contains(event.target as Node)) this.columnsMenuOpen.set(false);
  }

  protected onColumnsKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.columnsMenuOpen()) {
      event.stopPropagation();
      this.columnsMenuOpen.set(false);
      (this.host.querySelector('.ui-table__columns-button') as HTMLElement | null)?.focus();
    }
  }

  protected display(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}

/** Premier ancêtre qui défile verticalement (`null` : la fenêtre). */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') return node;
  }
  return null;
}

function compare(a: unknown, b: unknown, collator: Intl.Collator): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return collator.compare(String(a), String(b));
}
