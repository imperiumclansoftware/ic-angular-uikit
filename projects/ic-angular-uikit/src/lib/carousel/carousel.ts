import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChildren,
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
import { warnIfUnlabelled } from '../core/a11y';
import { uniqueId } from '../core/id';

/** Position des flèches : sur les bords des diapositives, sous le carrousel, ou aucune. */
export type UiCarouselControls = 'overlay' | 'below' | 'none';

/** Payload de l'événement `slideChange`. */
export interface UiCarouselChange {
  /** Nouvelle position. */
  index: number;
  /** Position précédente. */
  previousIndex: number;
  /** Origine du changement. */
  source: 'user' | 'autoplay';
}

/**
 * Une diapositive de `ui-carousel` (rôle `group`, annoncée « diapositive n sur N »).
 * Les diapositives hors de la vue sont inertes : ni focus, ni lecture par les lecteurs d'écran.
 *
 * @slot default - Contenu de la diapositive (image, carte, `ui-jumbotron`…).
 */
@Component({
  selector: 'ui-carousel-slide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    'aria-roledescription': 'diapositive',
    class: 'ui-carousel-slide',
    '[attr.aria-label]': 'accessibleName()',
    '[attr.inert]': 'hidden() ? "" : null',
  },
  template: `<ng-content />`,
  styles: `
    :host {
      box-sizing: border-box;
      flex: 0 0 max(
        min(var(--ui-carousel-min-slide, 0px), 100%),
        calc((100% - (var(--ui-carousel-per-view, 1) - 1) * var(--ui-carousel-gap, var(--ui-space-4))) / var(--ui-carousel-per-view, 1))
      );
      min-width: 0;
      scroll-snap-align: start;
    }
  `,
})
export class UiCarouselSlide {
  /** Titre de la diapositive, ajouté à son nom accessible (« Offre d'été — 2 sur 5 »). */
  readonly label = input<string>();

  /** @internal */
  readonly element = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  /** @internal */
  readonly position = signal(0);
  /** @internal */
  readonly total = signal(0);
  /** @internal */
  readonly hidden = signal(false);

  protected readonly accessibleName = computed(() => {
    const where = `${this.position() + 1} sur ${this.total()}`;
    const label = this.label();
    return label ? `${label} — ${where}` : where;
  });
}

/**
 * Carrousel accessible (motif ARIA « carousel ») pour les pages d'accueil : une ou plusieurs diapositives visibles,
 * défilement au doigt, au pavé tactile et à la molette (défilement natif avec aimantation), flèches, pastilles.
 *
 * - **Clavier** : flèches gauche / droite, Origine / Fin sur la zone des diapositives (focalisable), boutons.
 * - **Défilement automatique** (`autoplay`) : bouton Pause / Lecture toujours visible ; arrêt au survol, et arrêt
 *   définitif dès qu'un élément du carrousel reçoit le focus ; désactivé d'office si l'utilisateur a demandé
 *   à réduire les animations. La position est annoncée aux lecteurs d'écran hors défilement automatique.
 * - **Plusieurs diapositives** : `slidesPerView` (décimal pour laisser deviner la suivante) et
 *   `--ui-carousel-min-slide` pour ne jamais descendre sous une largeur lisible.
 *
 * @slot ui-carousel-slide - Les diapositives.
 * @cssprop --ui-carousel-gap - Espace entre les diapositives (défaut : `--ui-space-4`).
 * @cssprop --ui-carousel-min-slide - Largeur minimale d'une diapositive (défaut : `0px`).
 * @cssprop --ui-carousel-radius - Rayon des coins de la zone des diapositives (défaut : `--ui-radius-lg`).
 * @category Affichage
 */
@Component({
  selector: 'ui-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    'aria-roledescription': 'carrousel',
    class: 'ui-carousel',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    '[style.--ui-carousel-per-view]': 'perView()',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '(focusin)': 'onFocusIn()',
  },
  template: `
    <div class="ui-carousel__viewport">
      <div
        #track
        class="ui-carousel__track"
        [id]="trackId"
        role="group"
        tabindex="0"
        [attr.aria-label]="trackLabel()"
        (keydown)="onTrackKeydown($event)"
        (scroll)="onScroll()"
        (scrollend)="onScrollEnd()"
      >
        <ng-content select="ui-carousel-slide" />
      </div>
      @if (controls() === 'overlay' && hasSeveral()) {
        <ng-container [ngTemplateOutlet]="previousButton" />
        <ng-container [ngTemplateOutlet]="nextButton" />
      }
    </div>

    @if (hasSeveral() && (autoplayEnabled() || indicators() || controls() === 'below')) {
      <div class="ui-carousel__footer">
        @if (autoplayEnabled()) {
          <button type="button" class="ui-carousel__play" (click)="togglePlay()">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              @if (userPaused()) {
                <path d="M8 5.5v13l11-6.5z" />
              } @else {
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              }
            </svg>
            {{ userPaused() ? playLabel() : pauseLabel() }}
          </button>
        }
        @if (controls() === 'below') {
          <ng-container [ngTemplateOutlet]="previousButton" />
        }
        @if (indicators()) {
          <div class="ui-carousel__dots" role="group" [attr.aria-label]="indicatorsLabel()">
            @for (dot of dots(); track dot) {
              <button
                type="button"
                class="ui-carousel__dot"
                [attr.aria-label]="'Diapositive ' + (dot + 1)"
                [attr.aria-current]="dot === current() ? 'true' : null"
                (click)="goTo(dot)"
              >
                <span aria-hidden="true"></span>
              </button>
            }
          </div>
        }
        @if (controls() === 'below') {
          <ng-container [ngTemplateOutlet]="nextButton" />
        }
      </div>
    }

    <p class="ui-carousel__status" aria-live="polite" aria-atomic="true">{{ status() }}</p>

    <ng-template #previousButton>
      <button
        type="button"
        class="ui-carousel__arrow ui-carousel__arrow--previous"
        [class.ui-carousel__arrow--overlay]="controls() === 'overlay'"
        [attr.aria-label]="previousLabel()"
        [attr.aria-disabled]="!canPrevious() ? 'true' : null"
        [attr.aria-controls]="trackId"
        (click)="previous()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
      </button>
    </ng-template>
    <ng-template #nextButton>
      <button
        type="button"
        class="ui-carousel__arrow ui-carousel__arrow--next"
        [class.ui-carousel__arrow--overlay]="controls() === 'overlay'"
        [attr.aria-label]="nextLabel()"
        [attr.aria-disabled]="!canNext() ? 'true' : null"
        [attr.aria-controls]="trackId"
        (click)="next()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </ng-template>
  `,
  styleUrl: './carousel.css',
  imports: [NgTemplateOutlet],
})
export class UiCarousel {
  /** Nom accessible, obligatoire (« Nos offres », « Témoignages »…). */
  readonly ariaLabel = input<string>();
  /** Position courante (liaison bidirectionnelle `[(index)]`). */
  readonly index = model(0);
  /** Diapositives visibles à la fois (décimal possible : `1.2` laisse deviner la suivante). */
  readonly slidesPerView = input(1, { transform: numberAttribute });
  /** Revient au début après la dernière diapositive (et inversement). */
  readonly loop = input(false, { transform: booleanAttribute });
  /** Défilement automatique : intervalle en millisecondes (`0` = désactivé ; 5000 ou plus conseillé). */
  readonly autoplay = input(0, { transform: numberAttribute });
  /** Flèches : `overlay` (sur les bords), `below` (sous le carrousel) ou `none`. */
  readonly controls = input<UiCarouselControls>('overlay');
  /** Pastilles de position sous le carrousel. */
  readonly indicators = input(true, { transform: booleanAttribute });
  /** Libellé du bouton précédent. */
  readonly previousLabel = input('Diapositive précédente');
  /** Libellé du bouton suivant. */
  readonly nextLabel = input('Diapositive suivante');
  /** Libellé du bouton qui arrête le défilement automatique. */
  readonly pauseLabel = input('Pause');
  /** Libellé du bouton qui relance le défilement automatique. */
  readonly playLabel = input('Lecture');
  /** Nom du groupe de pastilles. */
  readonly indicatorsLabel = input('Choisir une diapositive');

  /** Émis quand la position change (action de l'utilisateur ou défilement automatique). */
  readonly slideChange = output<UiCarouselChange>();

  protected readonly slides = contentChildren(UiCarouselSlide);
  private readonly trackRef = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly document = inject(DOCUMENT);
  protected readonly trackId = uniqueId('ui-carousel-track');

  /** Diapositives entièrement visibles, mesuré (dépend de la largeur et de `--ui-carousel-min-slide`). */
  private readonly visibleCount = signal(1);
  protected readonly hovered = signal(false);
  /** Arrêt voulu par l'utilisateur (bouton, focus) ou par `prefers-reduced-motion`. */
  protected readonly userPaused = signal(false);
  private readonly pageHidden = signal(false);
  /** Position réellement affichée (mise à jour par le défilement). */
  private shownIndex = -1;
  private programmaticTimer: ReturnType<typeof setTimeout> | undefined;
  private programmatic = false;
  private scrollFrame = 0;

  protected readonly perView = computed(() => {
    const value = this.slidesPerView();
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  /** Nombre de positions possibles (la dernière montre les dernières diapositives). */
  readonly positions = computed(() => Math.max(1, this.slides().length - this.visibleCount() + 1));
  /** Position courante, bornée. */
  readonly current = computed(() => Math.min(Math.max(0, Math.round(this.index())), this.positions() - 1));
  protected readonly hasSeveral = computed(() => this.positions() > 1);
  protected readonly dots = computed(() => Array.from({ length: this.positions() }, (_, i) => i));
  protected readonly canPrevious = computed(() => this.loop() || this.current() > 0);
  protected readonly canNext = computed(() => this.loop() || this.current() < this.positions() - 1);
  protected readonly autoplayEnabled = computed(() => this.autoplay() > 0);
  /** Le défilement automatique tourne. */
  readonly playing = computed(
    () => this.autoplayEnabled() && this.hasSeveral() && !this.userPaused() && !this.hovered() && !this.pageHidden(),
  );
  protected readonly trackLabel = computed(() => `Diapositives${this.ariaLabel() ? ` : ${this.ariaLabel()}` : ''}`);
  /** Annonce de la position (silencieuse pendant le défilement automatique). */
  protected readonly status = computed(() => {
    if (this.playing() || !this.hasSeveral()) return '';
    const slide = this.slides()[this.current()];
    const label = slide?.label();
    return `Diapositive ${this.current() + 1} sur ${this.positions()}${label ? ` : ${label}` : ''}`;
  });

  constructor() {
    warnIfUnlabelled('ui-carousel', () => !!this.ariaLabel());
    const destroyRef = inject(DestroyRef);
    const view = this.document.defaultView;
    if (view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.userPaused.set(true);

    // Numérotation et visibilité des diapositives.
    effect(() => {
      const slides = this.slides();
      const first = this.current();
      const count = this.visibleCount();
      untracked(() =>
        slides.forEach((slide, i) => {
          slide.position.set(i);
          slide.total.set(slides.length);
          slide.hidden.set(i < first || i >= first + count);
        }),
      );
    });

    // Largeur : nombre de diapositives visibles, puis réalignement sur la position courante.
    afterNextRender(() => {
      const track = this.trackRef().nativeElement;
      this.measure();
      this.scrollToIndex(this.current(), false);
      const onVisibility = () => this.pageHidden.set(this.document.visibilityState === 'hidden');
      this.document.addEventListener('visibilitychange', onVisibility);
      destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', onVisibility));
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        this.measure();
        this.scrollToIndex(this.current(), false);
      });
      observer.observe(track);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Position modifiée par le code (`[(index)]`, boutons) : défilement jusqu'à elle.
    afterRenderEffect(() => {
      const target = this.current();
      untracked(() => {
        if (target !== this.shownIndex) this.scrollToIndex(target, this.shownIndex !== -1);
      });
    });

    // Défilement automatique.
    effect((onCleanup) => {
      if (!this.playing()) return;
      const timer = setInterval(() => this.step(1, 'autoplay'), Math.max(1000, this.autoplay()));
      onCleanup(() => clearInterval(timer));
    });

    destroyRef.onDestroy(() => {
      clearTimeout(this.programmaticTimer);
      if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    });
  }

  /** Va à la position donnée. */
  goTo(index: number): void {
    this.setIndex(index, 'user');
  }

  /** Diapositive suivante (revient au début avec `loop`). */
  next(): void {
    this.step(1, 'user');
  }

  /** Diapositive précédente (va à la fin avec `loop`). */
  previous(): void {
    this.step(-1, 'user');
  }

  /** Lance le défilement automatique. */
  play(): void {
    this.userPaused.set(false);
  }

  /** Arrête le défilement automatique. */
  pause(): void {
    this.userPaused.set(true);
  }

  protected togglePlay(): void {
    this.userPaused.update((paused) => !paused);
  }

  protected onFocusIn(): void {
    // Motif ARIA : le focus dans le carrousel arrête la rotation, qui ne reprend que par le bouton Lecture.
    if (this.autoplayEnabled() && !this.userPaused()) this.userPaused.set(true);
  }

  protected onTrackKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    const rtl = getComputedStyle(this.trackRef().nativeElement).direction === 'rtl';
    const actions: Record<string, () => void> = {
      [rtl ? 'ArrowRight' : 'ArrowLeft']: () => this.previous(),
      [rtl ? 'ArrowLeft' : 'ArrowRight']: () => this.next(),
      Home: () => this.goTo(0),
      End: () => this.goTo(this.positions() - 1),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  protected onScroll(): void {
    if (this.programmatic || this.scrollFrame) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      if (!this.programmatic) this.syncFromScroll();
    });
  }

  protected onScrollEnd(): void {
    this.endProgrammatic();
    this.syncFromScroll();
  }

  /** Position réellement affichée → `index` (glissement au doigt, ou défilement arrêté avant la cible). */
  private syncFromScroll(): void {
    if (this.trackRef().nativeElement.clientWidth === 0) return;
    const nearest = Math.min(this.nearestIndex(), this.positions() - 1);
    if (nearest === this.shownIndex && nearest === this.current()) return;
    const previousIndex = this.current();
    this.shownIndex = nearest;
    this.index.set(nearest);
    if (nearest !== previousIndex) this.slideChange.emit({ index: nearest, previousIndex, source: 'user' });
  }

  private step(delta: 1 | -1, source: 'user' | 'autoplay'): void {
    const last = this.positions() - 1;
    let target = this.current() + delta;
    if (target > last) target = this.loop() || source === 'autoplay' ? 0 : last;
    if (target < 0) target = this.loop() ? last : 0;
    this.setIndex(target, source);
  }

  private setIndex(index: number, source: 'user' | 'autoplay'): void {
    const target = Math.min(Math.max(0, Math.round(index)), this.positions() - 1);
    const previousIndex = this.current();
    if (target === previousIndex) return;
    this.index.set(target);
    this.slideChange.emit({ index: target, previousIndex, source });
  }

  private measure(): void {
    const track = this.trackRef().nativeElement;
    const first = this.slides()[0]?.element;
    if (!first || track.clientWidth === 0) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const width = first.getBoundingClientRect().width;
    if (width <= 0) return;
    this.visibleCount.set(Math.max(1, Math.floor((track.clientWidth + gap + 1) / (width + gap))));
  }

  /** Diapositive dont le bord de début est le plus proche de celui de la zone visible. */
  private nearestIndex(): number {
    const track = this.trackRef().nativeElement;
    const rtl = getComputedStyle(track).direction === 'rtl';
    const box = track.getBoundingClientRect();
    let best = 0;
    let bestDistance = Infinity;
    this.slides().forEach((slide, i) => {
      const rect = slide.element.getBoundingClientRect();
      const distance = Math.abs(rtl ? rect.right - box.right : rect.left - box.left);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  private scrollToIndex(index: number, smooth: boolean): void {
    const track = this.trackRef().nativeElement;
    const slide = this.slides()[index]?.element;
    this.shownIndex = index;
    if (!slide || track.clientWidth === 0) return;
    const rtl = getComputedStyle(track).direction === 'rtl';
    const box = track.getBoundingClientRect();
    const rect = slide.getBoundingClientRect();
    const delta = rtl ? rect.right - box.right : rect.left - box.left;
    if (Math.abs(delta) < 1) return;
    const reduced = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.programmatic = true;
    clearTimeout(this.programmaticTimer);
    // Repli si `scrollend` n'est pas émis (navigateur ancien, défilement interrompu).
    this.programmaticTimer = setTimeout(() => this.endProgrammatic(), 900);
    if (typeof track.scrollBy === 'function') {
      track.scrollBy({ left: delta, behavior: smooth && !reduced ? 'smooth' : 'auto' });
    }
    if (!smooth || reduced) this.endProgrammatic();
  }

  private endProgrammatic(): void {
    clearTimeout(this.programmaticTimer);
    this.programmatic = false;
  }
}
