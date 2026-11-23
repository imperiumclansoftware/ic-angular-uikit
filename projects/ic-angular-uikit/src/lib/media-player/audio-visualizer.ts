import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  untracked,
  viewChild,
} from '@angular/core';
import { UiMediaControl } from './media-hub';

/** Visualisations prédéfinies. */
export type UiVisualization = 'bars' | 'mirror' | 'wave' | 'radial' | 'blocks';

/** Libellés des visualisations (pour un sélecteur). */
export const UI_VISUALIZATIONS: Record<UiVisualization, string> = {
  bars: 'Barres',
  mirror: 'Miroir',
  wave: 'Onde',
  radial: 'Cercle',
  blocks: 'Égaliseur',
};

/**
 * Visualisation de l'audio en cours (spectre ou forme d'onde), dessinée dans un `canvas` à partir d'un analyseur
 * Web Audio. Décorative (`aria-hidden`) : elle ne porte aucune information. Couleur : `--ui-visualizer-color`
 * (défaut : couleur de texte principale du thème, lisible aussi dans une barre colorée).
 *
 * Avec `prefers-reduced-motion`, l'image n'est mise à jour que quelques fois par seconde. Sans analyseur (fichier
 * d'une autre origine sans CORS, vidéo YouTube), une visualisation au repos est affichée.
 *
 * @cssprop --ui-visualizer-color - Couleur des barres et de l'onde (défaut : `--ui-color-primary-text`).
 */
@Component({
  selector: 'ui-audio-visualizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-audio-visualizer', 'aria-hidden': 'true' },
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host { display: block; position: relative; min-width: 0; min-height: 0; color: var(--ui-visualizer-color, var(--ui-color-primary-text)); }
    canvas { display: block; position: absolute; inset: 0; width: 100%; height: 100%; }
  `,
})
export class UiAudioVisualizer {
  /** Lecteur (`ui-media-player`) ou analyseur Web Audio à visualiser. */
  readonly source = input<UiMediaControl | AnalyserNode | null | undefined>(null);
  /** Visualisation. */
  readonly type = input<UiVisualization>('bars');
  /** Nombre de barres (`bars`, `mirror`, `blocks`, `radial`) ; `0` = selon la largeur. */
  readonly bars = input(0, { transform: numberAttribute });

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private frame = 0;
  private lastDraw = 0;
  private peaks: number[] = [];
  private freq: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private wave: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  private readonly analyser = computed(() => {
    const source = this.source();
    if (!source) return null;
    return 'getByteFrequencyData' in source ? source : source.analyser();
  });
  private readonly playing = computed(() => {
    const source = this.source();
    return !!source && ('playing' in source ? source.playing() : true);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.resize();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => {
          this.resize();
          this.draw(true);
        });
        observer.observe(this.host);
        destroyRef.onDestroy(() => observer.disconnect());
      }
      this.draw(true);
    });
    destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));

    // Animation uniquement pendant la lecture ; à l'arrêt, une dernière image retombe au repos.
    effect(() => {
      const playing = this.playing();
      const analyser = this.analyser();
      this.type();
      untracked(() => {
        cancelAnimationFrame(this.frame);
        if (playing && analyser) this.loop();
        else afterNextRender(() => this.draw(true), { injector: this.injector });
      });
    });
  }

  private loop(): void {
    this.frame = requestAnimationFrame((time) => {
      const reduced = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduced || time - this.lastDraw > 160) {
        this.lastDraw = time;
        this.draw(false);
      }
      this.loop();
    });
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const ratio = Math.min(2, this.document.defaultView?.devicePixelRatio ?? 1);
    const { width, height } = this.host.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
  }

  /** Valeurs de 0 à 1 par barre, échelle de fréquences logarithmique (les graves ne prennent pas tout). */
  private levels(count: number, idle: boolean): number[] {
    const analyser = this.analyser();
    if (idle || !analyser) {
      this.peaks = this.peaks.map((p) => p * 0.6);
      return Array.from({ length: count }, (_, i) => 0.04 + 0.03 * Math.abs(Math.sin(i * 1.7)));
    }
    if (this.freq.length !== analyser.frequencyBinCount) this.freq = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(this.freq);
    const bins = this.freq.length;
    const max = Math.floor(bins * 0.75); // au-delà : très aigus, peu d'énergie
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      const from = Math.floor(Math.pow(max, i / count));
      const to = Math.max(from + 1, Math.floor(Math.pow(max, (i + 1) / count)));
      let sum = 0;
      for (let j = from; j < to && j < bins; j++) sum += this.freq[j];
      out.push(Math.min(1, sum / (to - from) / 255));
    }
    return out;
  }

  private draw(idle: boolean): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const rgb = (getComputedStyle(this.host).color.match(/\d+(\.\d+)?/g) ?? ['37', '99', '235']).slice(0, 3).join(', ');
    const color = (alpha: number) => `rgba(${rgb}, ${alpha})`;
    const ratio = canvas.width / Math.max(1, this.host.getBoundingClientRect().width);
    const auto = (unit: number) => Math.max(8, Math.min(96, Math.floor(w / (unit * ratio))));
    const type = this.type();

    if (type === 'wave') {
      const analyser = this.analyser();
      let data: ArrayLike<number> = [];
      if (!idle && analyser) {
        if (this.wave.length !== analyser.fftSize) this.wave = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(this.wave);
        data = this.wave;
      }
      ctx.lineWidth = Math.max(1.5, 2 * ratio);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color(1);
      ctx.beginPath();
      const points = data.length || 2;
      for (let i = 0; i < points; i++) {
        const v = data.length ? (data[i] - 128) / 128 : 0;
        const x = (i / (points - 1)) * w;
        const y = h / 2 + v * (h / 2) * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = color(0.12);
      ctx.fill();
      return;
    }

    if (type === 'radial') {
      const count = this.bars() || 48;
      const values = this.levels(count, idle);
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.22;
      const length = Math.min(w, h) * 0.26;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, ((2 * Math.PI * radius) / count) * 0.55);
      values.forEach((v, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const r2 = radius + 2 + v * length;
        ctx.strokeStyle = color(0.45 + v * 0.55);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        ctx.stroke();
      });
      const energy = values.reduce((a, b) => a + b, 0) / count;
      ctx.fillStyle = color(0.18 + energy * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (0.55 + energy * 0.35), 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (type === 'blocks') {
      const count = this.bars() || auto(16);
      const values = this.levels(count, idle);
      const rows = Math.max(4, Math.min(16, Math.floor(h / (7 * ratio))));
      const gap = Math.max(1, 2 * ratio);
      const cw = (w - gap * (count - 1)) / count;
      const ch = (h - gap * (rows - 1)) / rows;
      if (this.peaks.length !== count) this.peaks = new Array(count).fill(0);
      values.forEach((v, i) => {
        const lit = Math.round(v * rows);
        this.peaks[i] = Math.max(lit, (this.peaks[i] ?? 0) - 0.25);
        for (let r = 0; r < rows; r++) {
          const on = r < lit;
          ctx.fillStyle = color(on ? 0.35 + (r / rows) * 0.65 : 0.08);
          ctx.fillRect(i * (cw + gap), h - (r + 1) * ch - r * gap, cw, ch);
        }
        const peak = Math.floor(this.peaks[i]);
        if (peak > 0 && peak < rows) {
          ctx.fillStyle = color(1);
          ctx.fillRect(i * (cw + gap), h - (peak + 1) * ch - peak * gap, cw, Math.max(1, ch * 0.35));
        }
      });
      return;
    }

    // bars / mirror
    const count = this.bars() || auto(type === 'mirror' ? 7 : 9);
    const values = this.levels(count, idle);
    const gap = Math.max(1, 2 * ratio);
    const bw = (w - gap * (count - 1)) / count;
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, color(type === 'mirror' ? 0.55 : 0.45));
    gradient.addColorStop(1, color(1));
    ctx.fillStyle = type === 'mirror' ? color(0.9) : gradient;
    values.forEach((v, i) => {
      const x = i * (bw + gap);
      const bh = Math.max(2 * ratio, v * h * (type === 'mirror' ? 0.95 : 1));
      const y = type === 'mirror' ? (h - bh) / 2 : h - bh;
      const radius = Math.min(bw / 2, 3 * ratio);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, bw, bh, radius);
      else ctx.rect(x, y, bw, bh);
      ctx.fill();
    });
  }
}
