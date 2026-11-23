import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { UI_SEASON_LABELS, UiSeason } from '../core/season';
import { ThemeService } from '../core/theme';

interface Particle {
  id: number;
  x: number; // position horizontale (%)
  y: number; // position verticale (%) — étoiles
  size: number; // px
  duration: number; // s
  delay: number; // s
  drift: number; // px
  color: string;
  height: number; // fleurs : hauteur de tige (px)
}

const COUNTS = { low: 14, medium: 26, high: 44 } as const;
const LEAF_COLORS = ['#b45309', '#c2410c', '#a16207', '#9a3412', '#d97706', '#7c2d12'];
/** Automne sombre (forêt & terracotta) : feuillage roux et rouge, sans jaune ni brun. */
const LEAF_COLORS_DARK = ['#ef8354', '#e2582c', '#c2410c', '#dc2626', '#f97316', '#b91c1c'];
const FLOWER_COLORS = ['#f472b6', '#facc15', '#c084fc', '#fb7185', '#ffffff', '#60a5fa'];

/** Générateur pseudo-aléatoire déterministe (mulberry32) : décor reproductible, sans Math.random. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Animations des thèmes saisonniers : neige en hiver, fleurs qui poussent au printemps, soleil en été,
 * feuilles qui tombent en automne. À placer une fois, à la racine de l'application. Rien n'est affiché
 * si le thème n'est pas `season-light` ou `season-dark`.
 *
 * Décor purement visuel : ignoré des lecteurs d'écran, il laisse passer les clics. Un bouton permet de mettre
 * les animations en pause (WCAG 2.2.2), choix mémorisé ; elles sont désactivées par défaut si l'utilisateur a
 * demandé moins d'animations (`prefers-reduced-motion`), et figées dans ce cas même si on les réactive.
 *
 * @cssprop --ui-season-effects-z - Niveau d'empilement de la couche (défaut : `900`).
 * @category Affichage
 */
@Component({
  selector: 'ui-season-effects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './season-effects.html',
  styleUrl: './season-effects.css',
})
export class UiSeasonEffects {
  /** Densité des particules. */
  readonly intensity = input<'low' | 'medium' | 'high'>('medium');
  /** Coin du bouton pause / reprise (choisissez un coin sans commande fixe de votre application). */
  readonly controlPosition = input<'bottom-right' | 'bottom-left'>('bottom-right');
  /** Affiche le bouton pause / reprise. */
  readonly showControl = input(true, { transform: booleanAttribute });
  /** Occupe la fenêtre (`fixed`) ou seulement son conteneur positionné (`absolute`). */
  readonly contained = input(false, { transform: booleanAttribute });

  /** Saison à afficher (sinon celle de `ThemeService`, d'après la date). */
  readonly season = input<UiSeason>();
  /** Variante du décor (l'été sombre est une nuit étoilée) ; par défaut, celle du thème courant. */
  readonly mode = input<'light' | 'dark'>();
  /** Affiche le décor même si le thème courant n'est pas saisonnier (démonstrations, zones d'accueil). */
  readonly force = input(false, { transform: booleanAttribute });

  protected readonly theme = inject(ThemeService);
  protected readonly currentSeason = computed(() => this.season() ?? this.theme.season());
  protected readonly dark = computed(() => (this.mode() ?? (this.theme.isDark() ? 'dark' : 'light')) === 'dark');
  /** Nuit d'été : étoiles et croissant de lune à la place du soleil. */
  protected readonly night = computed(() => this.currentSeason() === 'summer' && this.dark());
  protected readonly label = computed(() => (this.night() ? 'Nuit d’été' : UI_SEASON_LABELS[this.currentSeason()]));
  protected readonly visible = computed(() => this.force() || this.theme.isSeasonal());
  protected readonly active = computed(() => this.visible() && this.theme.seasonEffects());

  /** Particules de la saison courante (positions reproductibles). */
  protected readonly particles = computed<Particle[]>(() => {
    const season = this.currentSeason();
    const random = prng({ winter: 11, spring: 23, summer: 37, autumn: 53 }[season]);
    const night = this.night();
    const count = night ? COUNTS[this.intensity()] * 2 : season === 'spring' ? Math.round(COUNTS[this.intensity()] * 0.6) : season === 'summer' ? 10 : COUNTS[this.intensity()];
    return Array.from({ length: count }, (_, id) => {
      const colors = season === 'spring' ? FLOWER_COLORS : this.dark() ? LEAF_COLORS_DARK : LEAF_COLORS;
      return {
        id,
        x: Math.round(random() * 1000) / 10,
        y: Math.round(random() * 1000) / 10,
        size: season === 'winter' ? 3 + random() * 6 : season === 'autumn' ? 14 + random() * 12 : 10 + random() * 8,
        duration: season === 'winter' ? 9 + random() * 10 : season === 'autumn' ? 10 + random() * 9 : 5 + random() * 6,
        delay: -random() * 18,
        drift: (random() - 0.5) * (season === 'autumn' ? 220 : 90),
        color: colors[Math.floor(random() * colors.length)],
        height: 30 + random() * 70,
      };
    });
  });

  protected toggle(): void {
    this.theme.setSeasonEffects(!this.theme.seasonEffects());
  }
}
