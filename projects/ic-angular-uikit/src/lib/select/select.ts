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
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';
import { UiSize } from '../core/types';
import { UiIcon } from '../icon/icon';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';

/** Une option de `ui-select`. */
export interface UiSelectOption<T = unknown> {
  /** Valeur émise quand l'option est choisie (peut être un objet). */
  value: T;
  /** Texte de l'option, toujours affiché (et seul affiché si le navigateur ne gère pas les options riches). */
  label: string;
  /** Option non sélectionnable. */
  disabled?: boolean;
  /**
   * Nom du groupe (`<optgroup>`). Les options d'un même groupe sont rassemblées, les groupes apparaissent
   * dans l'ordre de leur première option et les options sans groupe forment un bloc sans titre.
   */
  group?: string;
}

/** Contexte du template d'option `ng-template uiSelectOption`. */
export interface UiSelectOptionContext<T> {
  /** L'option (`let-option`). */
  $implicit: UiSelectOption<T>;
  /** `true` si l'option est sélectionnée (`let-selected="selected"`). */
  selected: boolean;
}

/**
 * Contenu riche d'une option (icône, description…), affiché dans la liste déroulante.
 *
 * ```html
 * <ng-template uiSelectOption let-option>…</ng-template>
 * ```
 * Pris en charge par les navigateurs qui gèrent `appearance: base-select` ; ailleurs, seul `label` est affiché.
 */
@Directive({ selector: 'ng-template[uiSelectOption]' })
export class UiSelectOptionTemplate<T> {
  /** Options du select, uniquement pour typer le contexte (`[uiSelectOptionOf]="options"`). */
  readonly uiSelectOptionOf = input<readonly UiSelectOption<T>[]>();
  readonly template = inject<TemplateRef<UiSelectOptionContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: UiSelectOptionTemplate<T>, _ctx: unknown): _ctx is UiSelectOptionContext<T> {
    return true;
  }
}

interface OptionGroup<T> {
  label: string | null;
  items: { option: UiSelectOption<T>; index: number }[];
}

/**
 * Liste déroulante basée sur le `<select>` natif (clavier, lecteurs d'écran, sélecteur mobile et formulaires
 * gérés par le navigateur), stylée avec `appearance: base-select` là où c'est possible.
 * Les valeurs peuvent être de n'importe quel type, y compris des objets (voir `compareWith`).
 *
 * @slot ng-template[uiSelectOption] - Contenu riche des options ; contexte `let-option`, `selected`.
 * @cssprop --ui-field-radius - Rayon des coins, commun à tous les champs (défaut : `--ui-radius-md`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-select',
  imports: [NgTemplateOutlet, UiFieldMessage, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-field ui-select ui-field--" + size()',
    '[class.ui-field--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-field--valid]': 'validation.state().status === "valid"',
    '[class.ui-field--pending]': 'validation.state().status === "pending"',
    '[class.ui-field--disabled]': 'isDisabled()',
    '[class.ui-field--focused]': 'focused()',
  },
  templateUrl: './select.html',
  styleUrls: ['../core/field.css', './select.css'],
})
export class UiSelect<T> implements ControlValueAccessor {
  /** Valeur sélectionnée, `null` si aucune (liaison bidirectionnelle `[(value)]`). */
  readonly value = model<T | null>(null);
  /** Options proposées. */
  readonly options = input.required<readonly UiSelectOption<T>[]>();
  /** Libellé affiché au-dessus du champ. */
  readonly label = input<string>();
  /** Nom accessible quand aucun `label` visible n'est affiché (ex. champ de recherche dans une barre d'outils). */
  readonly ariaLabel = input<string>();
  /** Texte affiché quand aucune option n'est choisie. */
  readonly placeholder = input('Sélectionner…');
  /** Texte d'aide sous le champ. */
  readonly hint = input<string>();
  /** Taille. */
  readonly size = input<UiSize>('md');
  /** Champ obligatoire : le placeholder ne peut plus être re-sélectionné. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactive le champ. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Icône décorative au début du champ (`préfixe:nom`, voir `provideUiIcons()`). */
  readonly icon = input<string>();
  /** Attribut `name` du `<select>` (soumission de formulaire HTML classique). */
  readonly name = input<string>();
  /** Égalité entre deux valeurs (utile pour des objets venant d'une API). */
  readonly compareWith = input<(a: T | null, b: T | null) => boolean>(Object.is);

  /** Émis quand l'utilisateur choisit une option (`null` s'il revient au placeholder). */
  readonly selectionChange = output<UiSelectOption<T> | null>();
  /** Émis quand le champ gagne (`true`) ou perd (`false`) le focus. */
  readonly focusChange = output<boolean>();

  protected readonly optionTemplate = contentChild(UiSelectOptionTemplate);
  protected readonly inputId = uniqueId('ui-select');
  protected readonly messageId = `${this.inputId}-message`;
  protected readonly focused = signal(false);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  private readonly selectRef = viewChild.required<ElementRef<HTMLSelectElement>>('select');

  /** Index de l'option sélectionnée dans `options`, -1 si aucune. */
  protected readonly selectedIndex = computed(() => {
    const value = this.value();
    const compare = this.compareWith();
    return value === null ? -1 : this.options().findIndex((o) => compare(o.value, value));
  });

  /** Options regroupées (ordre d'apparition conservé). */
  protected readonly groups = computed(() => {
    const groups: OptionGroup<T>[] = [];
    this.options().forEach((option, index) => {
      const label = option.group ?? null;
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push({ option, index });
    });
    return groups;
  });

  /** Option sélectionnée, `null` si aucune. */
  readonly selectedOption = computed(() => this.options()[this.selectedIndex()] ?? null);

  /** @internal */
  protected readonly validation = inject(UiFieldValidation);
  /** Obligatoire via l'input `required` ou un validateur `Validators.required` sur le contrôle. */
  protected readonly isRequired = computed(() => this.required() || this.validation.required());

  constructor() {
    this.validation.attach(this, { label: this.label });
    warnIfUnlabelled('ui-select', () => !!(this.label() || this.ariaLabel()));
  }

  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Donne le focus au champ. */
  focus(): void {
    this.selectRef().nativeElement.focus();
  }

  protected onSelect(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const option = raw === '' ? null : (this.options()[Number(raw)] ?? null);
    const value = option ? option.value : null;
    this.value.set(value);
    this.onChange(value);
    this.selectionChange.emit(option);
  }

  protected setFocused(focused: boolean): void {
    this.focused.set(focused);
    this.focusChange.emit(focused);
    if (!focused) {
      this.onTouched();
    }
  }

  writeValue(value: unknown): void {
    this.value.set((value ?? null) as T | null);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
