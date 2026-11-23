import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { UiButton } from '../button/button';
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';
import { UiSelect, UiSelectOption } from '../select/select';
import { UiTextField } from '../text-field/text-field';
import { UiToolbar, UiToolbarSeparator } from '../toolbar/toolbar';
import { UiFieldMessage } from '../validation/field-message';
import { UiFieldValidation } from '../validation/field-validation';
import {
  UiRichTextBlock,
  parseRichText,
  richTextBlockName,
  richTextInlineName,
  richTextLength,
  safeRichTextUrl,
  serializeRichText,
} from './rich-text-html';

const optionalNumber = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v));

/** Libellés des types de bloc. */
const BLOCK_LABELS: Record<UiRichTextBlock, string> = {
  p: 'Paragraphe',
  h2: 'Titre 2',
  h3: 'Titre 3',
  h4: 'Titre 4',
  blockquote: 'Citation',
  pre: 'Code',
};

type Mark = 'bold' | 'italic' | 'underline' | 'strikeThrough';
const MARKS: readonly { id: Mark; tag: string; label: string; keys: string; glyph: string }[] = [
  { id: 'bold', tag: 'strong', label: 'Gras', keys: 'Ctrl+B', glyph: 'B' },
  { id: 'italic', tag: 'em', label: 'Italique', keys: 'Ctrl+I', glyph: 'I' },
  { id: 'underline', tag: 'u', label: 'Souligné', keys: 'Ctrl+U', glyph: 'U' },
  { id: 'strikeThrough', tag: 's', label: 'Barré', keys: 'Ctrl+Maj+X', glyph: 'S' },
];

interface Snapshot {
  html: string;
  start: number;
  end: number;
}

/**
 * Zone éditable du contenu riche (styles non encapsulés : les nœuds y sont créés dynamiquement).
 * @internal
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'div[uiRichTextContent]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ``,
  styleUrls: ['./prose.css', './rich-text-content.css'],
})
export class UiRichTextContent {}

/**
 * Éditeur de texte riche (WYSIWYG) : paragraphes, titres, citation, code, gras, italique, souligné, barré, listes,
 * liens, ligne horizontale, annuler / rétablir. La valeur est du **HTML nettoyé** (liste blanche, voir
 * `sanitizeRichText()`), ou une chaîne vide si rien n'est saisi ; affichez-la avec `ui-rich-text`.
 *
 * - **Sécurité** : aucun `innerHTML` ni `insertHTML` ; le collage et le glisser-déposer sont analysés par la même
 *   liste blanche (styles, scripts, images, attributs et liens `javascript:` retirés). Compatible CSP + Trusted
 *   Types. Le serveur doit **refaire** ce nettoyage (onglet « Côté serveur »).
 * - **Clavier** : barre d'outils au motif ARIA « toolbar » ; raccourcis Ctrl+B / I / U, Ctrl+Maj+X (barré),
 *   Ctrl+Maj+7 / 8 (listes), Ctrl+K (lien), Ctrl+Z / Ctrl+Y (historique). Tab sort de l'éditeur.
 * - **Formulaires** : `[(value)]`, `formControl`, `ngModel` ; `Validators.required` fonctionne (valeur vide),
 *   `richTextMaxLength(n)` compte le texte visible.
 *
 * Mise en forme appliquée par `document.execCommand` (obsolète mais sans remplacement, pris en charge par tous les
 * navigateurs) ; l'historique et le collage sont gérés par le composant.
 *
 * @cssprop --ui-rte-min-height - Hauteur minimale de la zone de saisie (défaut : `8rem`).
 * @cssprop --ui-rte-max-height - Hauteur maximale avant défilement (défaut : `32rem`).
 * @category Formulaires
 */
@Component({
  selector: 'ui-rich-text-editor',
  imports: [UiFieldMessage, UiToolbar, UiToolbarSeparator, UiSelect, UiTextField, UiButton, UiRichTextContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: UiFieldValidation,
      inputs: ['error', 'errorMessages', 'showErrorsWhen', 'showSuccess', 'successMessage'],
    },
  ],
  host: {
    '[class]': '"ui-field ui-rich-text-editor ui-field--md"',
    '[class.ui-field--invalid]': 'validation.state().status === "invalid"',
    '[class.ui-field--valid]': 'validation.state().status === "valid"',
    '[class.ui-field--pending]': 'validation.state().status === "pending"',
    '[class.ui-field--disabled]': 'isDisabled()',
    '[class.ui-field--focused]': 'focused()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (label()) {
      <span class="ui-field__label" [id]="labelId" (click)="focus()" aria-hidden="true">
        {{ label() }}
        @if (isRequired()) {
          <span class="ui-field__required">*</span>
        }
      </span>
    }
    <div class="ui-field__control ui-rte__control">
      @if (!readonly()) {
        <ui-toolbar class="ui-rte__toolbar" [ariaLabel]="'Mise en forme' + (label() ? ' : ' + label() : '')">
          @if (blockOptions().length > 1) {
            <ui-select
              class="ui-rte__block"
              size="sm"
              ariaLabel="Style du paragraphe"
              [options]="blockOptions()"
              [value]="block()"
              [disabled]="isDisabled()"
              (valueChange)="setBlock($event)"
            />
            <ui-toolbar-separator />
          }
          @for (mark of marks; track mark.id) {
            <button
              type="button"
              [class]="'ui-rte__btn ui-rte__btn--' + mark.id"
              [attr.aria-label]="mark.label"
              [attr.aria-keyshortcuts]="mark.keys.replace('Ctrl', 'Control').replace('Maj', 'Shift')"
              [attr.aria-pressed]="active().has(mark.tag)"
              [title]="mark.label + ' (' + mark.keys + ')'"
              [disabled]="isDisabled()"
              (mousedown)="$event.preventDefault()"
              (click)="exec(mark.id)"
            >
              <span aria-hidden="true">{{ mark.glyph }}</span>
            </button>
          }
          <ui-toolbar-separator />
          <button
            type="button"
            class="ui-rte__btn"
            aria-label="Liste à puces"
            aria-keyshortcuts="Control+Shift+8"
            title="Liste à puces (Ctrl+Maj+8)"
            [attr.aria-pressed]="list() === 'ul'"
            [disabled]="isDisabled()"
            (mousedown)="$event.preventDefault()"
            (click)="exec('insertUnorderedList')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M9 6h11M9 12h11M9 18h11" />
              <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            type="button"
            class="ui-rte__btn"
            aria-label="Liste numérotée"
            aria-keyshortcuts="Control+Shift+7"
            title="Liste numérotée (Ctrl+Maj+7)"
            [attr.aria-pressed]="list() === 'ol'"
            [disabled]="isDisabled()"
            (mousedown)="$event.preventDefault()"
            (click)="exec('insertOrderedList')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 6h10M10 12h10M10 18h10" />
              <path d="M4 4.5 5 4v4M4 8h2" stroke-width="1.5" />
              <path d="M4 11.5c.4-.5 1.9-.6 1.9.4 0 .8-1.9 1.4-1.9 2.6h2" stroke-width="1.5" />
              <path d="M4 16.5h1.8l-1 1.2c.8 0 1.2.4 1.2.9 0 1-1.6 1.1-2 .5" stroke-width="1.5" />
            </svg>
          </button>
          <ui-toolbar-separator />
          <button
            #linkButton
            type="button"
            class="ui-rte__btn"
            aria-label="Lien"
            aria-keyshortcuts="Control+K"
            title="Lien (Ctrl+K)"
            aria-haspopup="dialog"
            [attr.aria-pressed]="inLink()"
            [attr.aria-expanded]="linkOpen()"
            [attr.aria-controls]="linkPanelId"
            [style.anchor-name]="anchorName"
            [disabled]="isDisabled()"
            (mousedown)="$event.preventDefault()"
            (click)="openLink()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button
            type="button"
            class="ui-rte__btn"
            aria-label="Ligne horizontale"
            title="Ligne horizontale"
            [disabled]="isDisabled()"
            (mousedown)="$event.preventDefault()"
            (click)="exec('insertHorizontalRule')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12h18" /></svg>
          </button>
          <button
            type="button"
            class="ui-rte__btn"
            aria-label="Effacer la mise en forme"
            title="Effacer la mise en forme"
            [disabled]="isDisabled()"
            (mousedown)="$event.preventDefault()"
            (click)="clearFormatting()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 7V4h16v3M12 4v9M9 20h6M3 3l18 18" />
            </svg>
          </button>
          <ui-toolbar-separator />
          <button
            type="button"
            class="ui-rte__btn"
            aria-label="Annuler"
            aria-keyshortcuts="Control+Z"
            title="Annuler (Ctrl+Z)"
            [disabled]="isDisabled() || !canUndo()"
            (mousedown)="$event.preventDefault()"
            (click)="undo()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </svg>
          </button>
          <button
            type="button"
            class="ui-rte__btn"
            aria-label="Rétablir"
            aria-keyshortcuts="Control+Y"
            title="Rétablir (Ctrl+Y)"
            [disabled]="isDisabled() || !canRedo()"
            (mousedown)="$event.preventDefault()"
            (click)="redo()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
            </svg>
          </button>
        </ui-toolbar>
      }
      <!-- Contenu géré par le composant (nœuds créés à la volée), clavier natif de la zone éditable. -->
      <div
        #editable
        uiRichTextContent
        class="ui-rte__content ui-prose"
        role="textbox"
        aria-multiline="true"
        spellcheck="true"
        [class.ui-rte__content--empty]="empty()"
        [attr.data-placeholder]="placeholder() || null"
        [attr.contenteditable]="isDisabled() || readonly() ? 'false' : 'true'"
        [attr.tabindex]="isDisabled() ? null : 0"
        [attr.aria-labelledby]="label() ? labelId : null"
        [attr.aria-label]="label() ? null : (ariaLabel() ?? null)"
        [attr.aria-describedby]="messageId"
        [attr.aria-required]="isRequired() || null"
        [attr.aria-invalid]="validation.state().status === 'invalid'"
        [attr.aria-readonly]="readonly() || null"
        [attr.aria-disabled]="isDisabled() || null"
        (input)="onInput($event)"
        (beforeinput)="onBeforeInput($event)"
        (keydown)="onKeydown($event)"
        (paste)="onPaste($event)"
        (drop)="onDrop($event)"
        (dragstart)="dragInside = true"
        (dragend)="dragInside = false"
        (focus)="onEditableFocus()"
      ></div>
    </div>
    <ui-field-message [messageId]="messageId" [state]="validation.state()" [hint]="hint()" [counter]="counterText()" />

    <div
      #linkPanel
      class="ui-rte__link"
      popover="auto"
      role="dialog"
      [id]="linkPanelId"
      [attr.aria-labelledby]="linkPanelId + '-title'"
      [style.position-anchor]="anchorName"
      (toggle)="onLinkToggle($event)"
    >
      <p class="ui-rte__link-title" [id]="linkPanelId + '-title'">{{ inLink() ? 'Modifier le lien' : 'Insérer un lien' }}</p>
      <ui-text-field
        label="Adresse"
        type="url"
        size="sm"
        placeholder="https://…"
        hint="http(s), mailto:, tel: ou chemin du site"
        [value]="linkUrl()"
        [error]="linkError()"
        (valueChange)="linkUrl.set($event); linkError.set(null)"
        (keydown.enter)="$event.preventDefault(); applyLink()"
      />
      <div class="ui-rte__link-actions">
        @if (inLink()) {
          <button uiButton type="button" size="sm" variant="ghost" (click)="removeLink()">Retirer le lien</button>
        }
        <button uiButton type="button" size="sm" variant="outline" (click)="closeLink()">Annuler</button>
        <button uiButton type="button" size="sm" (click)="applyLink()">Appliquer</button>
      </div>
    </div>
  `,
  styleUrls: ['../core/field.css', './rich-text-editor.css'],
})
export class UiRichTextEditor implements ControlValueAccessor {
  /** Contenu HTML (liaison bidirectionnelle `[(value)]`) ; chaîne vide si rien n'est saisi. */
  readonly value = model('');
  /** Libellé affiché au-dessus de l'éditeur. */
  readonly label = input<string>();
  /** Nom accessible quand aucun `label` visible n'est affiché. */
  readonly ariaLabel = input<string>();
  /** Texte indicatif quand l'éditeur est vide. */
  readonly placeholder = input('');
  /** Texte d'aide sous l'éditeur. */
  readonly hint = input<string>();
  /** Champ obligatoire (astérisque, `aria-required`). */
  readonly required = input(false, { transform: booleanAttribute });
  /** Désactive l'éditeur. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Lecture seule : contenu affiché sans barre d'outils. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Longueur maximale du texte visible : affiche un compteur (à doubler de `richTextMaxLength()` pour valider). */
  readonly maxLength = input<number | undefined, number | string | null | undefined>(undefined, { transform: optionalNumber });
  /** Types de bloc proposés (le premier est le bloc par défaut). */
  readonly blocks = input<readonly UiRichTextBlock[]>(['p', 'h2', 'h3', 'blockquote', 'pre']);
  /** Garde la mise en forme du texte collé (nettoyée) ; sinon, colle du texte brut. */
  readonly pasteFormatting = input(true, { transform: booleanAttribute });

  /** Émis quand l'éditeur gagne (`true`) ou perd (`false`) le focus. */
  readonly focusChange = output<boolean>();

  protected readonly marks = MARKS;
  protected readonly labelId = uniqueId('ui-rte-label');
  protected readonly messageId = `${this.labelId}-message`;
  protected readonly linkPanelId = `${this.labelId}-link`;
  protected readonly anchorName = `--${this.labelId}-link`;
  protected readonly focused = signal(false);
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly validation = inject(UiFieldValidation);
  protected readonly isRequired = computed(() => this.required() || this.validation.required());

  /** Marques actives à la position du curseur (`strong`, `em`…), pour `aria-pressed`. */
  protected readonly active = signal<ReadonlySet<string>>(new Set());
  protected readonly block = signal<UiRichTextBlock>('p');
  protected readonly list = signal<'ul' | 'ol' | null>(null);
  protected readonly inLink = signal(false);
  protected readonly empty = signal(true);
  protected readonly textLength = signal(0);
  protected readonly linkOpen = signal(false);
  protected readonly linkUrl = signal('');
  protected readonly linkError = signal<string | null>(null);
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);
  protected dragInside = false;

  protected readonly blockOptions = computed<UiSelectOption<UiRichTextBlock>[]>(() =>
    this.blocks().map((value) => ({ value, label: BLOCK_LABELS[value] })),
  );
  protected readonly counterText = computed(() => {
    const max = this.maxLength();
    return max ? `${this.textLength()} / ${max}` : null;
  });

  private readonly editableRef = viewChild.required<string, ElementRef<HTMLElement>>('editable', { read: ElementRef });
  private readonly linkPanelRef = viewChild.required<ElementRef<HTMLElement>>('linkPanel');
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private viewReady = false;
  /** Dernier HTML rendu ou émis : évite de reconstruire le contenu pendant la saisie. */
  private lastHtml: string | null = null;
  private savedRange: Range | null = null;
  /** Sélection au moment d'ouvrir le panneau de lien (le focus rendu à l'éditeur remet le curseur au début). */
  private linkRange: Range | null = null;
  private history: Snapshot[] = [];
  private historyIndex = -1;
  private lastKind = '';
  private lastTime = 0;
  private paragraphModeSet = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.validation.attach(this, { label: this.label });
    warnIfUnlabelled('ui-rich-text-editor', () => !!(this.label() || this.ariaLabel()));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.viewReady = true;
      this.render(this.value(), true);
      const onSelection = () => this.onSelectionChange();
      this.document.addEventListener('selectionchange', onSelection);
      destroyRef.onDestroy(() => this.document.removeEventListener('selectionchange', onSelection));
    });

    // `[(value)]` ou `writeValue` modifiés de l'extérieur : nouveau contenu.
    effect(() => {
      const html = this.value();
      untracked(() => {
        if (this.viewReady && html !== this.lastHtml) this.render(html, true);
      });
    });
  }

  /** Donne le focus à la zone de saisie. */
  focus(): void {
    this.editableRef().nativeElement.focus();
  }

  /** Annule la dernière modification. */
  undo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restore(this.history[this.historyIndex]);
  }

  /** Rétablit la modification annulée. */
  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restore(this.history[this.historyIndex]);
  }

  // ---------------------------------------------------------------- Rendu et valeur

  private render(html: string, resetHistory: boolean): void {
    const root = this.editableRef().nativeElement;
    root.replaceChildren(parseRichText(html, this.document));
    this.lastHtml = html;
    this.refreshMeta();
    if (resetHistory) {
      this.history = [{ html: serializeRichText(root, this.document), start: 0, end: 0 }];
      this.historyIndex = 0;
      this.updateHistoryState();
    }
  }

  private refreshMeta(): void {
    const root = this.editableRef().nativeElement;
    const text = (root.textContent ?? '').replace(/[\u200b]/g, '');
    this.empty.set(text.trim() === '' && !root.querySelector('hr, li'));
    this.textLength.set(this.maxLength() ? richTextLength(serializeRichText(root, this.document)) : text.length);
  }

  /** Contenu modifié (saisie, commande, collage) : valeur émise et historique. */
  private contentChanged(kind: string): void {
    const root = this.editableRef().nativeElement;
    const html = serializeRichText(root, this.document);
    this.refreshMeta();
    this.record(html, kind);
    this.emit(html);
    this.updateState();
  }

  private emit(html: string): void {
    this.lastHtml = html;
    if (html !== this.value()) {
      this.value.set(html);
      this.onChange(html);
    }
  }

  // ---------------------------------------------------------------- Historique

  private record(html: string, kind: string): void {
    const { start, end } = this.selectionOffsets();
    const now = Date.now();
    const current = this.history[this.historyIndex];
    if (current && current.html === html) {
      current.start = start;
      current.end = end;
      return;
    }
    // Une rafale de frappe (même type, moins de 800 ms) forme une seule étape d'annulation.
    const typing = kind === 'insertText' || kind === 'deleteContentBackward' || kind === 'deleteContentForward';
    const merge = typing && kind === this.lastKind && now - this.lastTime < 800 && this.historyIndex > 0 && this.historyIndex === this.history.length - 1;
    this.history = this.history.slice(0, this.historyIndex + 1);
    if (merge) this.history[this.historyIndex] = { html, start, end };
    else this.history.push({ html, start, end });
    if (this.history.length > 100) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.lastKind = kind;
    this.lastTime = now;
    this.updateHistoryState();
  }

  private restore(snapshot: Snapshot): void {
    const root = this.editableRef().nativeElement;
    root.replaceChildren(parseRichText(snapshot.html, this.document));
    root.focus({ preventScroll: true });
    this.setSelectionOffsets(snapshot.start, snapshot.end);
    this.lastKind = '';
    this.refreshMeta();
    this.emit(serializeRichText(root, this.document));
    this.updateHistoryState();
    this.updateState();
  }

  private updateHistoryState(): void {
    this.canUndo.set(this.historyIndex > 0);
    this.canRedo.set(this.historyIndex < this.history.length - 1);
  }

  /** Position du curseur en nombre de caractères depuis le début (survit à la reconstruction du contenu). */
  private selectionOffsets(): { start: number; end: number } {
    const root = this.editableRef().nativeElement;
    const selection = this.document.getSelection();
    if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return { start: 0, end: 0 };
    const range = selection.getRangeAt(0);
    const measure = (node: Node, offset: number) => {
      const before = this.document.createRange();
      before.selectNodeContents(root);
      before.setEnd(node, offset);
      return before.toString().length;
    };
    return { start: measure(range.startContainer, range.startOffset), end: measure(range.endContainer, range.endOffset) };
  }

  private setSelectionOffsets(start: number, end: number): void {
    const root = this.editableRef().nativeElement;
    const find = (target: number): [Node, number] => {
      const walker = this.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let remaining = target;
      let last: Text | null = null;
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        if (remaining <= node.length) return [node, remaining];
        remaining -= node.length;
        last = node;
      }
      return last ? [last, last.length] : [root, root.childNodes.length];
    };
    const range = this.document.createRange();
    range.setStart(...find(start));
    range.setEnd(...find(end));
    const selection = this.document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  // ---------------------------------------------------------------- Sélection et état de la barre d'outils

  private onSelectionChange(): void {
    const root = this.editableRef().nativeElement;
    const selection = this.document.getSelection();
    if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return;
    this.savedRange = selection.getRangeAt(0).cloneRange();
    this.updateState();
  }

  private updateState(): void {
    const root = this.editableRef().nativeElement;
    const range = this.savedRange;
    const names = new Set<string>();
    let block: UiRichTextBlock | null = null;
    let list: 'ul' | 'ol' | null = null;
    const node: Node | null = range && root.contains(range.startContainer) ? range.startContainer : null;
    let element = node && node.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null);
    while (element && element !== root) {
      names.add(richTextInlineName(element));
      const blockName = richTextBlockName(element);
      if (!block && blockName && blockName in BLOCK_LABELS) block = blockName as UiRichTextBlock;
      if (!list && (blockName === 'ul' || blockName === 'ol')) list = blockName;
      element = element.parentElement;
    }
    this.active.set(names);
    this.block.set(block ?? 'p');
    this.list.set(list);
    this.inLink.set(names.has('a'));
  }

  /**
   * Remet la sélection mémorisée dans la zone éditable (après un clic dans la barre d'outils ou le panneau de lien).
   * `forced` : sélection à rétablir quoi qu'il arrive (celle capturée à l'ouverture du panneau de lien).
   */
  private restoreSelection(forced?: Range | null): Range | null {
    const root = this.editableRef().nativeElement;
    const selection = this.document.getSelection();
    if (!selection) return null;
    if (forced && root.contains(forced.startContainer)) {
      root.focus({ preventScroll: true });
      selection.removeAllRanges();
      selection.addRange(forced.cloneRange());
      this.savedRange = forced.cloneRange();
      return selection.getRangeAt(0);
    }
    // Curseur déjà dans l'éditeur (raccourci clavier, bouton qui ne prend pas le focus) : sélection réelle, à jour.
    if (this.document.activeElement === root && selection.rangeCount && root.contains(selection.anchorNode)) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
      return selection.getRangeAt(0);
    }
    root.focus({ preventScroll: true });
    if (this.savedRange && root.contains(this.savedRange.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    } else if (!selection.rangeCount || !root.contains(selection.anchorNode)) {
      const range = this.document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return selection.rangeCount ? selection.getRangeAt(0) : null;
  }

  // ---------------------------------------------------------------- Commandes

  /** Applique une commande de mise en forme à la sélection. */
  protected exec(command: Mark | 'insertUnorderedList' | 'insertOrderedList' | 'insertHorizontalRule'): void {
    if (this.isDisabled() || this.readonly()) return;
    const range = this.restoreSelection();
    this.useParagraphs();
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      // Listes gérées par le composant : la commande native crée <p><ul> et renvoie le curseur en début de ligne.
      if (range) this.toggleList(range, command === 'insertUnorderedList' ? 'ul' : 'ol');
    } else if (command === 'insertHorizontalRule') {
      if (range) this.insertRule(range);
    } else {
      this.command(command, false);
    }
    this.contentChanged(command);
  }

  /** Blocs de texte (paragraphe, titre, élément de liste) touchés par la sélection. */
  private selectedBlocks(range: Range): HTMLElement[] {
    const root = this.editableRef().nativeElement;
    const blockOf = (node: Node): HTMLElement | null => {
      let element = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
      while (element && element !== root) {
        if (/^(P|H2|H3|H4|LI|PRE)$/.test(element.tagName)) return element;
        if (element.parentElement === root || element.parentElement?.tagName === 'BLOCKQUOTE') {
          // Texte directement dans l'éditeur ou une citation : on l'enveloppe d'abord dans un paragraphe.
          if (/^(BLOCKQUOTE|UL|OL)$/.test(element.tagName)) return null;
          const p = this.document.createElement('p');
          element.before(p);
          p.append(element);
          return p;
        }
        element = element.parentElement;
      }
      if (node.parentNode === root && node.nodeType === 3) {
        const p = this.document.createElement('p');
        node.parentNode.insertBefore(p, node);
        p.append(node);
        return p;
      }
      return null;
    };
    const start = blockOf(range.startContainer);
    const end = blockOf(range.endContainer);
    if (!start) return [];
    if (!end || start === end) return [start];
    const all = Array.from(root.querySelectorAll<HTMLElement>('p, h2, h3, h4, li, pre'));
    const from = all.indexOf(start);
    const to = all.indexOf(end);
    return from >= 0 && to >= from ? all.slice(from, to + 1).filter((b) => !b.querySelector('p, li')) : [start];
  }

  /** Met les blocs sélectionnés en liste (ou les en sort s'ils y sont déjà), sans déplacer le curseur. */
  private toggleList(range: Range, type: 'ul' | 'ol'): void {
    const { start, end } = this.selectionOffsets();
    const blocks = this.selectedBlocks(range);
    if (!blocks.length) return;
    const tag = type.toUpperCase();
    const remove = blocks.every((b) => b.tagName === 'LI' && b.parentElement?.tagName === tag);
    if (remove) {
      for (const li of blocks) this.liftListItem(li);
    } else {
      for (const block of blocks) {
        if (block.tagName === 'LI') {
          const list = block.parentElement as HTMLElement;
          if (list.tagName !== tag) {
            const renamed = this.document.createElement(type);
            renamed.append(...Array.from(list.childNodes));
            list.replaceWith(renamed);
          }
          continue;
        }
        const li = this.document.createElement('li');
        li.append(...Array.from(block.childNodes));
        const previous = block.previousElementSibling;
        if (previous?.tagName === tag) {
          previous.append(li);
          block.remove();
        } else {
          const list = this.document.createElement(type);
          list.append(li);
          block.replaceWith(list);
        }
      }
      // Listes voisines du même type fusionnées.
      this.editableRef().nativeElement.querySelectorAll(type).forEach((list) => {
        const next = list.nextElementSibling;
        if (next?.tagName === tag) {
          list.append(...Array.from(next.childNodes));
          next.remove();
        }
      });
    }
    this.setSelectionOffsets(start, end);
  }

  /** Sort un élément de liste : il devient un paragraphe, la liste est coupée en deux autour de lui. */
  private liftListItem(li: HTMLElement): void {
    const list = li.parentElement;
    if (!list) return;
    const tail = this.document.createElement(list.tagName.toLowerCase());
    let next = li.nextSibling;
    while (next) {
      const following = next.nextSibling;
      tail.append(next);
      next = following;
    }
    const p = this.document.createElement('p');
    const nested = Array.from(li.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL');
    nested.forEach((n) => n.remove());
    p.append(...Array.from(li.childNodes));
    if (!p.firstChild) p.append(this.document.createElement('br'));
    li.remove();
    list.after(p, ...nested, ...(tail.childNodes.length ? [tail] : []));
    if (!list.childNodes.length) list.remove();
  }

  /** Ligne horizontale après le bloc courant, suivie d'un paragraphe où continuer la saisie. */
  private insertRule(range: Range): void {
    const root = this.editableRef().nativeElement;
    let block: Node | null = range.endContainer;
    while (block && block.parentNode !== root) block = block.parentNode;
    const hr = this.document.createElement('hr');
    const p = this.document.createElement('p');
    p.append(this.document.createElement('br'));
    if (block && block !== root) (block as Element).after(hr, p);
    else root.append(hr, p);
    const caret = this.document.createRange();
    caret.setStart(p, 0);
    caret.collapse(true);
    this.document.getSelection()?.removeAllRanges();
    this.document.getSelection()?.addRange(caret);
    this.savedRange = caret.cloneRange();
  }

  /** Change le type du bloc courant. */
  protected setBlock(block: UiRichTextBlock | null): void {
    if (!block || this.isDisabled() || this.readonly()) return;
    this.restoreSelection();
    this.useParagraphs();
    // Sortir d'une citation : formatBlock sur « blockquote » une seconde fois ne la retire pas partout.
    if (this.block() === 'blockquote' && block !== 'blockquote') this.command('outdent', false);
    this.command('formatBlock', false, `<${block}>`);
    this.contentChanged('formatBlock');
  }

  protected clearFormatting(): void {
    if (this.isDisabled() || this.readonly()) return;
    this.restoreSelection();
    this.command('removeFormat', false);
    this.command('unlink', false);
    this.command('formatBlock', false, '<p>');
    this.contentChanged('removeFormat');
  }

  /**
   * Seul point d'appel à `execCommand` : API obsolète mais sans remplacement standard pour l'édition riche,
   * prise en charge par tous les navigateurs. Les commandes utilisées ne prennent jamais de HTML (`insertHTML` exclu).
   */
  private command(name: string, ...args: [boolean, string?]): boolean {
    // Absent hors navigateur (rendu serveur, tests) : sans effet.
    return typeof this.document.execCommand === 'function' ? this.document.execCommand(name, ...args) : false;
  }

  private useParagraphs(): void {
    if (this.paragraphModeSet) return;
    this.paragraphModeSet = true;
    // Entrée crée un <p> (et non un <div>) dans tous les navigateurs.
    this.command('defaultParagraphSeparator', false, 'p');
    this.command('styleWithCSS', false, 'false');
  }

  // ---------------------------------------------------------------- Liens

  /** Ouvre le panneau d'insertion / modification de lien pour la sélection. */
  protected openLink(): void {
    if (this.isDisabled() || this.readonly()) return;
    this.linkRange = this.restoreSelection()?.cloneRange() ?? null;
    this.updateState();
    const link = this.currentLink();
    this.linkUrl.set(link?.getAttribute('href') ?? '');
    this.linkError.set(null);
    const panel = this.linkPanelRef().nativeElement;
    if (typeof panel.showPopover !== 'function') return;
    panel.showPopover();
    afterNextRender(() => panel.querySelector<HTMLInputElement>('input')?.focus(), { injector: this.injector });
  }

  protected closeLink(): void {
    const panel = this.linkPanelRef().nativeElement;
    if (panel.matches(':popover-open')) panel.hidePopover();
  }

  /** Lien appliqué : à la fermeture du panneau, le curseur reste après le lien (et non sur l'ancienne sélection). */
  private applied = false;

  protected applyLink(): void {
    const raw = this.linkUrl().trim();
    const candidate = raw && !/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[/?#.]/.test(raw) && /^[^\s/]+\.[^\s/]+/.test(raw) ? `https://${raw}` : raw;
    const url = safeRichTextUrl(candidate);
    if (!url) {
      this.linkError.set('Adresse non valide : http(s)://, mailto:, tel: ou chemin commençant par « / ».');
      return;
    }
    this.closeLink();
    const range = this.restoreSelection(this.linkRange);
    if (!range) return;
    const link = this.currentLink();
    if (range.collapsed && link) {
      link.setAttribute('href', url);
    } else if (range.collapsed) {
      // Pas de texte sélectionné : l'adresse devient le texte du lien.
      const anchor = this.document.createElement('a');
      anchor.setAttribute('href', url);
      anchor.textContent = url;
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      const selection = this.document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      this.command('createLink', false, url);
    }
    this.applied = true;
    this.savedRange = this.currentRange();
    this.contentChanged('createLink');
  }

  protected removeLink(): void {
    this.closeLink();
    const range = this.restoreSelection(this.linkRange);
    const link = this.currentLink();
    if (range?.collapsed && link) {
      range.selectNodeContents(link);
      const selection = this.document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    this.command('unlink', false);
    this.applied = true;
    this.savedRange = this.currentRange();
    this.contentChanged('unlink');
  }

  protected onLinkToggle(event: Event): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.linkOpen.set(open);
    if (open) return;
    // Fermeture (Échap, Annuler, lien appliqué) : retour dans le texte, à la même position — sauf si l'utilisateur
    // a cliqué ailleurs dans la page.
    const active = this.document.activeElement;
    const root = this.editableRef().nativeElement;
    if (this.linkRange && (!active || active === this.document.body || active === root || this.linkPanelRef().nativeElement.contains(active))) {
      this.restoreSelection(this.savedRange && root.contains(this.savedRange.startContainer) && this.applied ? this.savedRange : this.linkRange);
    }
    this.linkRange = null;
    this.applied = false;
  }

  private currentRange(): Range | null {
    const selection = this.document.getSelection();
    return selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  }

  private currentLink(): HTMLAnchorElement | null {
    const root = this.editableRef().nativeElement;
    const node = this.savedRange?.startContainer ?? null;
    const element = node && (node.nodeType === 1 ? (node as Element) : node.parentElement);
    const link = element?.closest('a');
    return link && root.contains(link) ? link : null;
  }

  // ---------------------------------------------------------------- Événements de la zone éditable

  protected onEditableFocus(): void {
    this.useParagraphs();
    const root = this.editableRef().nativeElement;
    if (!root.firstChild && !this.readonly()) {
      // Zone vide : un premier paragraphe, pour que la saisie et les commandes de bloc s'y appliquent.
      const p = this.document.createElement('p');
      p.append(this.document.createElement('br'));
      root.append(p);
      const range = this.document.createRange();
      range.setStart(p, 0);
      range.collapse(true);
      this.document.getSelection()?.removeAllRanges();
      this.document.getSelection()?.addRange(range);
    }
  }

  protected onInput(event: Event): void {
    this.contentChanged((event as InputEvent).inputType ?? 'input');
  }

  protected onBeforeInput(event: Event): void {
    const type = (event as InputEvent).inputType;
    if (type === 'historyUndo' || type === 'historyRedo') {
      event.preventDefault();
      if (type === 'historyUndo') this.undo();
      else this.redo();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const actions: Record<string, () => void> = {
      z: () => (event.shiftKey ? this.redo() : this.undo()),
      y: () => this.redo(),
      k: () => this.openLink(),
      b: () => this.exec('bold'),
      i: () => this.exec('italic'),
      u: () => this.exec('underline'),
    };
    let action = event.shiftKey && key !== 'z' ? undefined : actions[key];
    if (event.shiftKey) {
      // Avec Maj : barré et listes (touche physique, indépendante de la disposition du clavier).
      const shifted: Record<string, () => void> = {
        KeyX: () => this.exec('strikeThrough'),
        Digit8: () => this.exec('insertUnorderedList'),
        Digit7: () => this.exec('insertOrderedList'),
      };
      action = key === 'z' ? actions['z'] : shifted[event.code];
    }
    if (action) {
      event.preventDefault();
      action();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    if (this.isDisabled() || this.readonly()) return;
    event.preventDefault();
    const data = event.clipboardData;
    this.insertContent(this.pasteFormatting() ? (data?.getData('text/html') ?? '') : '', data?.getData('text/plain') ?? '');
  }

  protected onDrop(event: DragEvent): void {
    // Déplacement de texte à l'intérieur de l'éditeur : comportement natif.
    if (this.dragInside || this.isDisabled() || this.readonly()) return;
    event.preventDefault();
    const doc = this.document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const position = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
    const range = position ? this.document.createRange() : (doc.caretRangeFromPoint?.(event.clientX, event.clientY) ?? null);
    if (position && range) range.setStart(position.offsetNode, position.offset);
    if (range) {
      range.collapse(true);
      this.document.getSelection()?.removeAllRanges();
      this.document.getSelection()?.addRange(range);
      this.savedRange = range.cloneRange();
    }
    const data = event.dataTransfer;
    this.insertContent(this.pasteFormatting() ? (data?.getData('text/html') ?? '') : '', data?.getData('text/plain') ?? '');
  }

  /** Insère du contenu collé ou déposé, nettoyé par la liste blanche, à la position du curseur. */
  private insertContent(html: string, text: string): void {
    const root = this.editableRef().nativeElement;
    let fragment = html ? parseRichText(html, this.document) : null;
    if (!fragment?.textContent?.trim()) fragment = this.textFragment(text);
    if (!fragment.childNodes.length) return;
    const range = this.restoreSelection();
    if (!range) return;
    range.deleteContents();

    const nodes = Array.from(fragment.childNodes);
    const isBlock = (n: Node) => n.nodeType === 1 && !!richTextBlockName(n as Element);
    const isTextBlock = (n: Node) => n.nodeType === 1 && /^(P|H2|H3|H4)$/.test(n.nodeName);
    let current: Node | null = range.startContainer;
    while (current && current.parentNode !== root) current = current.parentNode;
    const block = current && current.nodeType === 1 ? (current as HTMLElement) : null;
    const insideListOrCode = !!range.startContainer.parentElement?.closest('li, pre');

    let last: Node | null;
    if (!nodes.some(isBlock) || (nodes.length === 1 && isTextBlock(nodes[0])) || insideListOrCode || !block) {
      // Contenu en ligne (ou un seul paragraphe, ou curseur dans une liste / un bloc de code) : inséré au curseur.
      const inline = insideListOrCode
        ? [this.document.createTextNode(nodes.map((n) => n.textContent).join(insideListOrCode && range.startContainer.parentElement?.closest('pre') ? '\n' : ' '))]
        : nodes.length === 1 && isTextBlock(nodes[0])
          ? Array.from(nodes[0].childNodes)
          : nodes;
      const holder = this.document.createDocumentFragment();
      holder.append(...inline);
      last = holder.lastChild;
      range.insertNode(holder);
    } else {
      // Blocs : le bloc courant est coupé au curseur, les blocs collés s'insèrent entre les deux moitiés.
      const tailRange = this.document.createRange();
      tailRange.setStart(range.startContainer, range.startOffset);
      tailRange.setEnd(block, block.childNodes.length);
      const tail = block.cloneNode(false) as HTMLElement;
      tail.append(tailRange.extractContents());
      let after: Node = block;
      if (isTextBlock(nodes[0]) && isTextBlock(block)) {
        block.append(...Array.from((nodes.shift() as Element).childNodes));
      }
      for (const node of nodes) {
        (after as Element).after(node);
        after = node;
      }
      last = after.lastChild ?? after;
      if ((tail.textContent ?? '').trim()) (after as Element).after(tail);
      if (!(block.textContent ?? '').trim() && !block.querySelector('hr') && block !== after) block.remove();
    }
    if (last?.parentNode) {
      const caret = this.document.createRange();
      caret.setStartAfter(last);
      caret.collapse(true);
      this.document.getSelection()?.removeAllRanges();
      this.document.getSelection()?.addRange(caret);
      this.savedRange = caret.cloneRange();
    }
    this.contentChanged('insertFromPaste');
  }

  /** Texte brut collé : une ligne reste en ligne, plusieurs lignes deviennent des paragraphes. */
  private textFragment(text: string): DocumentFragment {
    const fragment = this.document.createDocumentFragment();
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    if (lines.length === 1) {
      if (lines[0]) fragment.append(this.document.createTextNode(lines[0]));
      return fragment;
    }
    for (const line of lines) {
      const p = this.document.createElement('p');
      if (line) p.append(this.document.createTextNode(line));
      else p.append(this.document.createElement('br'));
      fragment.append(p);
    }
    return fragment;
  }

  protected onFocusIn(): void {
    if (this.focused()) return;
    this.focused.set(true);
    this.focusChange.emit(true);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    // Le panneau de lien est en couche supérieure mais fait partie de l'éditeur.
    if (next && this.host.contains(next)) return;
    this.focused.set(false);
    this.focusChange.emit(false);
    this.onTouched();
  }

  // ---------------------------------------------------------------- ControlValueAccessor

  writeValue(value: unknown): void {
    this.value.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
