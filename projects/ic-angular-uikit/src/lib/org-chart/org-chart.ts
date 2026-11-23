import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  TemplateRef,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../core/id';
import { UiOrgLink, UiOrgNode, UiOrgPerson, UiOrgUnit, buildOrgTree, initials } from './org-model';

/** Contexte du template de carte `ng-template uiOrgUnit`. */
export interface UiOrgUnitContext {
  $implicit: UiOrgUnit;
  node: UiOrgNode;
}

/** Contexte du template de personne `ng-template uiOrgPerson`. */
export interface UiOrgPersonContext {
  $implicit: UiOrgPerson;
  unit: UiOrgUnit;
}

/** Remplace le contenu des cartes d'unité (`<ng-template uiOrgUnit let-unit>`). */
@Directive({ selector: 'ng-template[uiOrgUnit]' })
export class UiOrgUnitTemplate {
  readonly template = inject<TemplateRef<UiOrgUnitContext>>(TemplateRef);
  static ngTemplateContextGuard(_dir: UiOrgUnitTemplate, _ctx: unknown): _ctx is UiOrgUnitContext {
    return true;
  }
}

/** Remplace l'affichage d'une personne (`<ng-template uiOrgPerson let-person let-unit="unit">`). */
@Directive({ selector: 'ng-template[uiOrgPerson]' })
export class UiOrgPersonTemplate {
  readonly template = inject<TemplateRef<UiOrgPersonContext>>(TemplateRef);
  static ngTemplateContextGuard(_dir: UiOrgPersonTemplate, _ctx: unknown): _ctx is UiOrgPersonContext {
    return true;
  }
}

/** Payload de `(personSelect)`. */
export interface UiOrgPersonSelect {
  person: UiOrgPerson;
  unit: UiOrgUnit;
}

interface DrawnLink {
  key: string;
  d: string;
  label?: string;
  x: number;
  y: number;
}

const RELATION_LABELS = { attached: 'Rattaché', transverse: 'Fonctionnel' } as const;

/**
 * Organigramme construit à partir d'une liste plate d'unités (`parentId`), chacune pouvant contenir des personnes.
 * Trois relations : hiérarchique (sous le parent), rattachée (`attached`, sur le côté : secrétariat, assistant)
 * et transverse (`transverse`, lien fonctionnel en pointillés), plus des liens transverses libres (`links`).
 *
 * Unités repliables, zoom, sélection d'une unité ou d'une personne, cartes et personnes personnalisables par
 * `ng-template`. Sous `breakpoint` (largeur du composant), l'arbre devient une liste indentée. La structure est
 * faite de listes imbriquées ; chaque relation est aussi écrite en texte (les traits sont décoratifs).
 *
 * @slot ng-template[uiOrgUnit] - Contenu des cartes d'unité ; contexte `let-unit`, `node`.
 * @slot ng-template[uiOrgPerson] - Affichage d'une personne ; contexte `let-person`, `unit`.
 * @cssprop --ui-org-card-width - Largeur des cartes (défaut : `15rem`).
 * @cssprop --ui-org-line - Couleur des traits (défaut : `--ui-color-border-control`).
 * @category Affichage
 */
@Component({
  selector: 'ui-org-chart',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-org ui-org--" + (isList() ? "list" : "tree")',
  },
  templateUrl: './org-chart.html',
  styleUrl: './org-chart.css',
})
export class UiOrgChart {
  /** Unités (liste plate, reliées par `parentId`). */
  readonly units = input.required<readonly UiOrgUnit[]>();
  /** Liens transverses libres entre unités (pointillés). */
  readonly links = input<readonly UiOrgLink[]>([]);
  /** Nom accessible de l'organigramme. */
  readonly ariaLabel = input('Organigramme');
  /** Présentation : arbre, liste indentée, ou automatique selon la largeur. */
  readonly layout = input<'auto' | 'tree' | 'list'>('auto');
  /** Largeur (px) sous laquelle `layout="auto"` passe en liste. */
  readonly breakpoint = input(640, { transform: numberAttribute });
  /** Profondeur dépliée au départ (`Infinity` : tout). */
  readonly initialDepth = input(Infinity, { transform: numberAttribute });
  /** Nombre de personnes affichées par carte avant « + N ». */
  readonly maxPeople = input(4, { transform: numberAttribute });
  /** Unité sélectionnée (liaison bidirectionnelle `[(selectedId)]`). */
  readonly selectedId = model<string | null>(null);
  /** Les unités sont cliquables (sélection, `unitSelect`). */
  readonly selectable = input(true, { transform: booleanAttribute });
  /** Les personnes sont cliquables (`personSelect`). */
  readonly peopleSelectable = input(false, { transform: booleanAttribute });
  /** Affiche la barre d'outils (zoom, tout déplier / replier). */
  readonly toolbar = input(true, { transform: booleanAttribute });

  /** Émis au clic sur une unité. */
  readonly unitSelect = output<UiOrgUnit>();
  /** Émis au clic sur une personne (si `peopleSelectable`). */
  readonly personSelect = output<UiOrgPersonSelect>();

  protected readonly unitTemplate = contentChild(UiOrgUnitTemplate);
  protected readonly personTemplate = contentChild(UiOrgPersonTemplate);
  protected readonly baseId = uniqueId('ui-org');
  protected readonly initials = initials;

  private readonly tree = computed(() => buildOrgTree(this.units()));
  protected readonly roots = computed(() => this.tree().roots);
  /** Unités repliées (identifiants). */
  readonly collapsed = signal<ReadonlySet<string>>(new Set());
  /** Cartes dont toutes les personnes sont affichées. */
  protected readonly peopleExpanded = signal<ReadonlySet<string>>(new Set());
  /** Niveau de zoom (0,4 à 1,5). */
  readonly zoom = signal(1);
  protected readonly links$ = signal<DrawnLink[]>([]);
  protected readonly canvasSize = signal({ width: 0, height: 0 });

  private readonly width = signal<number | null>(null);
  /** Présentation en liste (choisie, ou automatique sous `breakpoint`). */
  readonly isList = computed(() => {
    const layout = this.layout();
    if (layout !== 'auto') return layout === 'list';
    const width = this.width();
    return width !== null && width < this.breakpoint();
  });

  /** Liens transverses lisibles en texte, par unité (pour les lecteurs d'écran et le mode liste). */
  protected readonly linksByUnit = computed(() => {
    const names = new Map(this.units().map((u) => [u.id, u.name]));
    const map = new Map<string, string[]>();
    for (const link of this.links()) {
      if (!names.has(link.from) || !names.has(link.to)) continue;
      const suffix = link.label ? ` (${link.label})` : '';
      map.set(link.from, [...(map.get(link.from) ?? []), `${names.get(link.to)}${suffix}`]);
      map.set(link.to, [...(map.get(link.to) ?? []), `${names.get(link.from)}${suffix}`]);
    }
    return map;
  });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  private readonly injector = inject(Injector);

  constructor() {
    // Profondeur initiale : on replie les unités au-delà.
    effect(() => {
      const depth = this.initialDepth();
      const roots = this.roots();
      untracked(() => {
        const ids = new Set<string>();
        const walk = (node: UiOrgNode) => {
          if (node.depth >= depth && this.hasSubtree(node)) ids.add(node.unit.id);
          [...node.children, ...node.staffLeft, ...node.staffRight].forEach(walk);
        };
        roots.forEach(walk);
        this.collapsed.set(ids);
      });
    });
    effect(() => {
      const warnings = this.tree().warnings;
      if (warnings.length && isDevMode()) console.warn('[ic-angular-uikit] ui-org-chart :', warnings.join(' '));
    });
    // Redessine les liens transverses quand la structure, le repli, le zoom ou la présentation changent.
    effect(() => {
      this.roots();
      this.collapsed();
      this.peopleExpanded();
      this.zoom();
      this.links();
      this.isList();
      untracked(() => afterNextRender(() => this.drawLinks(), { injector: this.injector }));
    });
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        this.measure();
        this.drawLinks();
      });
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Replie ou déplie une unité. */
  toggle(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Déplie toutes les unités. */
  expandAll(): void {
    this.collapsed.set(new Set());
  }

  /** Replie tout sous les racines. */
  collapseAll(): void {
    this.collapsed.set(new Set(this.roots().filter((n) => this.hasSubtree(n)).map((n) => n.unit.id)));
  }

  /** Modifie le zoom (borné entre 40 % et 150 %). */
  setZoom(value: number): void {
    this.zoom.set(Math.round(Math.min(1.5, Math.max(0.4, value)) * 10) / 10);
  }

  protected relationLabel(unit: UiOrgUnit): string {
    return unit.relation === 'attached' || unit.relation === 'transverse' ? RELATION_LABELS[unit.relation] : '';
  }

  protected hasSubtree(node: UiOrgNode): boolean {
    return node.children.length + node.staffLeft.length + node.staffRight.length > 0;
  }

  protected isCollapsed(id: string): boolean {
    return this.collapsed().has(id);
  }

  protected select(unit: UiOrgUnit): void {
    this.selectedId.set(unit.id);
    this.unitSelect.emit(unit);
  }

  protected selectPerson(person: UiOrgPerson, unit: UiOrgUnit): void {
    this.personSelect.emit({ person, unit });
  }

  protected heads(unit: UiOrgUnit): readonly UiOrgPerson[] {
    return (unit.people ?? []).filter((p) => p.head);
  }

  protected members(unit: UiOrgUnit): readonly UiOrgPerson[] {
    const members = (unit.people ?? []).filter((p) => !p.head);
    return this.peopleExpanded().has(unit.id) ? members : members.slice(0, this.maxPeople());
  }

  protected hiddenMembers(unit: UiOrgUnit): number {
    if (this.peopleExpanded().has(unit.id)) return 0;
    return Math.max(0, (unit.people ?? []).filter((p) => !p.head).length - this.maxPeople());
  }

  protected showAllPeople(id: string): void {
    this.peopleExpanded.update((set) => new Set(set).add(id));
  }

  protected childrenId(id: string): string {
    return `${this.baseId}-${id}-children`;
  }

  private measure(): void {
    const width = this.host.getBoundingClientRect().width;
    if (width > 0) this.width.set(width);
  }

  /** Calcule les tracés des liens transverses entre cartes visibles (coordonnées du canevas, hors zoom). */
  private drawLinks(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas || this.isList()) {
      this.links$.set([]);
      return;
    }
    const zoom = this.zoom();
    const origin = canvas.getBoundingClientRect();
    this.canvasSize.set({ width: canvas.scrollWidth, height: canvas.scrollHeight });
    const rectOf = (id: string) => {
      const el = canvas.querySelector<HTMLElement>(`[data-org-unit="${CSS.escape(id)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: (r.left - origin.left) / zoom, top: (r.top - origin.top) / zoom, width: r.width / zoom, height: r.height / zoom };
    };
    const drawn: DrawnLink[] = [];
    for (const link of this.links()) {
      const a = rectOf(link.from);
      const b = rectOf(link.to);
      if (!a || !b) continue;
      // Bords les plus proches : côtés si les cartes sont côte à côte, sinon haut / bas.
      const ax = a.left + a.width / 2;
      const bx = b.left + b.width / 2;
      const sideBySide = Math.abs(a.top - b.top) < Math.max(a.height, b.height);
      let x1: number, y1: number, x2: number, y2: number, d: string;
      if (sideBySide) {
        const leftFirst = ax < bx;
        x1 = leftFirst ? a.left + a.width : a.left;
        x2 = leftFirst ? b.left : b.left + b.width;
        y1 = a.top + a.height / 2;
        y2 = b.top + b.height / 2;
        const bend = (x2 - x1) / 2;
        d = `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`;
      } else {
        const aboveFirst = a.top < b.top;
        x1 = ax;
        x2 = bx;
        y1 = aboveFirst ? a.top + a.height : a.top;
        y2 = aboveFirst ? b.top : b.top + b.height;
        const bend = (y2 - y1) / 2;
        d = `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}`;
      }
      drawn.push({ key: `${link.from}->${link.to}`, d, label: link.label, x: (x1 + x2) / 2, y: (y1 + y2) / 2 });
    }
    this.links$.set(drawn);
  }
}
