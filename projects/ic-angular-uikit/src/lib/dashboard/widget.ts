import { DestroyRef, Directive, Signal, TemplateRef, Type, computed, inject, signal } from '@angular/core';
import { UiDashboardItem, UiWidgetConfig, UiWidgetSizeLimits } from './dashboard-layout';

/** Déclaration d'un type de widget, à fournir au tableau de bord (`[widgets]`). */
export interface UiWidgetDefinition<C extends object = UiWidgetConfig> extends UiWidgetSizeLimits {
  /** Clé unique du type, enregistrée dans la disposition (`[A-Za-z0-9_-]`). */
  type: string;
  /** Titre par défaut, aussi affiché dans le catalogue. */
  title: string;
  /** Description du catalogue. */
  description?: string;
  /** Icône du catalogue (`préfixe:nom`). */
  icon?: string;
  /** Catégorie du catalogue (tiroir de la colonne « Personnaliser »). Sans catégorie : « Autres ». */
  category?: string;
  /** Composant du widget : il déclare ses faces avec `uiWidgetFront`, `uiWidgetBack`, `uiWidgetSettings`. */
  component: Type<unknown>;
  /** Taille à l'ajout, en colonnes × lignes. */
  defaultSize: { w: number; h: number };
  /** Réglages initiaux (fusionnés avec ceux enregistrés). */
  defaultConfig?: C;
  /** Titre par défaut calculé d'après les réglages (ex. nom de l'indicateur affiché), si l'utilisateur n'en a pas choisi. */
  titleFor?(config: C): string;
  /** Nombre maximal d'exemplaires sur un même tableau de bord. */
  maxInstances?: number;
}

/** Présentation d'une catégorie du catalogue (ordre, icône, description). */
export interface UiWidgetCategory {
  /** Nom de la catégorie, identique à `UiWidgetDefinition.category`. */
  name: string;
  /** Icône du tiroir. */
  icon?: string;
  /** Courte description, sous le nom. */
  description?: string;
}

/** Face d'un widget. */
export type UiWidgetFace = 'front' | 'back' | 'settings';

/**
 * Pont entre le tableau de bord et le composant d'un widget : lecture de sa disposition et de ses réglages,
 * mise à jour des réglages, retournement. Obtenu dans le widget avec `injectUiWidgetContext<MaConfig>()`.
 */
export class UiWidgetContext<C extends object = UiWidgetConfig> {
  /** @internal */
  readonly templates = {
    front: signal<TemplateRef<unknown> | null>(null),
    back: signal<TemplateRef<unknown> | null>(null),
    settings: signal<TemplateRef<unknown> | null>(null),
  };

  /** Réglages courants : `defaultConfig` de la définition, complétés par ceux de l'utilisateur. */
  readonly config: Signal<C>;
  /** Taille courante en colonnes × lignes (pour adapter l'affichage). */
  readonly size: Signal<{ w: number; h: number }>;
  /** Titre affiché. */
  readonly title: Signal<string>;

  constructor(
    /** Identifiant de l'élément dans le tableau de bord. */
    readonly id: string,
    /** Élément de la disposition. */
    readonly item: Signal<UiDashboardItem<C> | UiDashboardItem>,
    /** Définition du type de widget. */
    readonly definition: UiWidgetDefinition<C>,
    /** Le widget montre son verso. */
    readonly flipped: Signal<boolean>,
    /** Le tableau de bord est en mode personnalisation. */
    readonly editing: Signal<boolean>,
    private readonly host: {
      updateItem(id: string, change: Partial<UiDashboardItem>): void;
      setFlipped(id: string, flipped: boolean): void;
    },
  ) {
    this.config = computed(() => ({ ...(definition.defaultConfig ?? {}), ...(this.item().config ?? {}) }) as C);
    this.size = computed(() => ({ w: this.item().w, h: this.item().h }));
    this.title = computed(() => this.item().title || definition.titleFor?.(this.config()) || definition.title);
  }

  /** Fusionne des réglages et enregistre la disposition (`layoutChange`). */
  updateConfig(patch: Partial<C>): void {
    this.host.updateItem(this.id, { config: { ...(this.item().config ?? {}), ...patch } as UiWidgetConfig });
  }

  /** Remplace tous les réglages. */
  setConfig(config: Partial<C>): void {
    this.host.updateItem(this.id, { config: { ...config } as UiWidgetConfig });
  }

  /** Retourne le widget (verso / recto), ou force une face. */
  flip(toBack?: boolean): void {
    this.host.setFlipped(this.id, toBack ?? !this.flipped());
  }

  /** @internal */
  register(face: UiWidgetFace, template: TemplateRef<unknown> | null): void {
    this.templates[face].set(template);
  }
}

/** Contexte du widget courant (à appeler dans le constructeur ou un initialiseur de champ du composant de widget). */
export function injectUiWidgetContext<C extends object = UiWidgetConfig>(): UiWidgetContext<C> {
  return inject(UiWidgetContext) as unknown as UiWidgetContext<C>;
}

function registerFace(face: UiWidgetFace): void {
  const context = inject(UiWidgetContext);
  context.register(face, inject(TemplateRef));
  inject(DestroyRef).onDestroy(() => context.register(face, null));
}

/** Recto du widget (obligatoire) : `<ng-template uiWidgetFront>…</ng-template>`. */
@Directive({ selector: 'ng-template[uiWidgetFront]' })
export class UiWidgetFront {
  constructor() {
    registerFace('front');
  }
}

/** Verso du widget (facultatif : sans verso, pas de bouton « Retourner ») : `<ng-template uiWidgetBack>`. */
@Directive({ selector: 'ng-template[uiWidgetBack]' })
export class UiWidgetBack {
  constructor() {
    registerFace('back');
  }
}

/** Réglages du widget, affichés dans la colonne « Personnaliser » : `<ng-template uiWidgetSettings>`. */
@Directive({ selector: 'ng-template[uiWidgetSettings]' })
export class UiWidgetSettings {
  constructor() {
    registerFace('settings');
  }
}
