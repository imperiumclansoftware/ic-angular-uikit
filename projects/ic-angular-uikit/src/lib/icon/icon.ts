import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  viewChild,
} from '@angular/core';
import { UI_ICON_REGISTRY_ROOT, UiIconRegistry, UiSvgNode } from './icon-sets';

/** Balises et attributs SVG autorisés : uniquement de la géométrie et de la présentation (pas de script, lien ni style). */
const SVG_TAGS = new Set(['g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect']);
const SVG_ATTRS = new Set([
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'points', 'transform',
  'fill', 'fill-rule', 'fill-opacity', 'clip-rule', 'opacity', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'pathLength',
]);

const SIZES: Record<string, string> = { xs: '0.75em', sm: '0.875em', md: '1em', lg: '1.25em', xl: '1.5em', '2x': '2em', '3x': '3em' };

/**
 * Icône issue d'un jeu déclaré avec `provideUiIcons()` : Font Awesome, Material Symbols, Bootstrap Icons, Lucide,
 * icônes SVG maison… `name` vaut `préfixe:icône` (`fa:house`, `material:home`, `lucide:search`).
 *
 * L'icône prend la taille et la couleur du texte (`1em`, `currentColor`). Décorative par défaut (`aria-hidden`) ;
 * renseignez `label` si elle porte seule une information.
 *
 * @cssprop --ui-icon-fill - Material Symbols : `1` pour la version pleine (défaut `0`).
 * @cssprop --ui-icon-weight - Material Symbols : graisse de 100 à 700 (défaut `400`).
 * @category Affichage
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-icon',
    '[style.font-size]': 'fontSize()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  template: `
    @switch (resolved().kind) {
      @case ('font') {
        <i class="ui-icon__font" [class]="fontClasses()">{{ ligature() }}</i>
      }
      @case ('svg') {
        <svg #svg class="ui-icon__svg" focusable="false" [attr.viewBox]="viewBox()"></svg>
      }
      @default {
        <span class="ui-icon__missing"></span>
      }
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 1em;
      height: 1em;
      line-height: 1;
      vertical-align: -0.125em;
      color: inherit;
    }
    :host > .ui-icon__font {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      font-size: 1em;
      line-height: 1;
      font-style: normal;
    }
    /* Material Symbols : axes de la police variable pilotables par variables CSS. */
    :host > .ui-icon--material {
      font-variation-settings: 'FILL' var(--ui-icon-fill, 0), 'wght' var(--ui-icon-weight, 400), 'GRAD' 0, 'opsz' 24;
      overflow: hidden;
    }
    :host > .ui-icon__svg { width: 100%; height: 100%; overflow: visible; }
    :host > .ui-icon__missing { width: 0.8em; height: 0.8em; border: 1px dashed currentColor; border-radius: 2px; opacity: 0.5; }
  `,
})
export class UiIcon {
  /** Icône à afficher : `préfixe:nom` (`fa:house`, `material:home`, `lucide:search`, `bi:house`), ou `nom` avec le jeu par défaut. */
  readonly name = input.required<string>();
  /** Nom accessible : rend l'icône significative (`role="img"`). Sans label, elle est décorative et ignorée des lecteurs d'écran. */
  readonly label = input<string>();
  /** Taille : `xs`, `sm`, `md`, `lg`, `xl`, `2x`, `3x` ou toute longueur CSS (`24px`, `1.5rem`). Par défaut, la taille du texte. */
  readonly size = input<string>();

  private readonly registry = inject(UiIconRegistry, { optional: true }) ?? inject(UI_ICON_REGISTRY_ROOT);
  private readonly renderer = inject(Renderer2);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svg');

  protected readonly resolved = computed(() => this.registry.resolve(this.name()));
  protected readonly fontSize = computed(() => {
    const size = this.size();
    return size ? (SIZES[size] ?? size) : null;
  });
  protected readonly fontClasses = computed(() => {
    const icon = this.resolved();
    return icon.kind === 'font' ? `ui-icon__font ${icon.classes}` : '';
  });
  protected readonly ligature = computed(() => {
    const icon = this.resolved();
    return icon.kind === 'font' ? icon.ligature : null;
  });
  protected readonly viewBox = computed(() => {
    const icon = this.resolved();
    return icon.kind === 'svg' ? icon.icon.viewBox : null;
  });

  constructor() {
    effect(() => {
      const icon = this.resolved();
      const svg = this.svgRef()?.nativeElement;
      if (icon.kind === 'missing' && isDevMode()) {
        console.warn(`[ic-angular-uikit] Icône introuvable : « ${icon.name} ». Déclarez son jeu avec provideUiIcons().`, this.host);
      }
      if (!svg || icon.kind !== 'svg') {
        return;
      }
      for (const child of Array.from(svg.childNodes)) {
        this.renderer.removeChild(svg, child);
      }
      for (const [key, value] of Object.entries(icon.icon.attrs ?? {})) {
        this.setAttr(svg, key, value);
      }
      for (const node of icon.icon.nodes) {
        this.append(svg, node);
      }
    });
  }

  private append(parent: Element, [tag, attrs, children]: UiSvgNode): void {
    if (!SVG_TAGS.has(tag)) {
      return;
    }
    const el = this.renderer.createElement(tag, 'svg') as Element;
    for (const [key, value] of Object.entries(attrs)) {
      this.setAttr(el, key, value);
    }
    for (const child of children ?? []) {
      this.append(el, child);
    }
    this.renderer.appendChild(parent, el);
  }

  private setAttr(el: Element, key: string, value: string | number | undefined): void {
    if (value !== undefined && SVG_ATTRS.has(key)) {
      this.renderer.setAttribute(el, key, String(value));
    }
  }
}
