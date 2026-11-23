import { Injectable, Signal, signal } from '@angular/core';
import { UiMediaSource, UiResolvedMedia } from './media-source';

/**
 * Commandes et état communs à tous les lecteurs : c'est ce que lit et pilote `ui-mini-player`.
 * Implémenté par `ui-media-player`.
 */
export interface UiMediaControl {
  /** Source en cours. */
  readonly current: Signal<UiMediaSource | null>;
  /** Source analysée (hébergeur, audio / vidéo). */
  readonly resolved: Signal<UiResolvedMedia | null>;
  readonly playing: Signal<boolean>;
  readonly currentTime: Signal<number>;
  readonly duration: Signal<number>;
  readonly volume: Signal<number>;
  readonly muted: Signal<boolean>;
  /** Il y a une piste précédente / suivante. */
  readonly hasPrevious: Signal<boolean>;
  readonly hasNext: Signal<boolean>;
  /** Analyseur Web Audio (fichiers audio et vidéo de même origine), pour les visualisations. */
  readonly analyser: Signal<AnalyserNode | null>;
  /** Élément vidéo natif (fichiers vidéo), pour la vignette du mini-lecteur. */
  readonly videoElement: Signal<HTMLVideoElement | null>;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(seconds: number): void;
  next(): void;
  previous(): void;
  setMuted(muted: boolean): void;
  /** Fait défiler la page jusqu'au lecteur et lui donne le focus. */
  reveal(): void;
}

/**
 * Coordination des lecteurs de la page : le dernier lancé devient « actif » (celui que suit le mini-lecteur) et,
 * par défaut, met les autres en pause.
 */
@Injectable({ providedIn: 'root' })
export class UiMediaHub {
  private readonly players = new Set<UiMediaControl>();
  private readonly activeSignal = signal<UiMediaControl | null>(null);

  /** Lecteur actif : le dernier lancé, sinon le premier inscrit. */
  readonly active: Signal<UiMediaControl | null> = this.activeSignal.asReadonly();

  /** @internal */
  register(player: UiMediaControl): void {
    this.players.add(player);
    if (!this.activeSignal()) this.activeSignal.set(player);
  }

  /** @internal */
  unregister(player: UiMediaControl): void {
    this.players.delete(player);
    if (this.activeSignal() === player) this.activeSignal.set(this.players.values().next().value ?? null);
  }

  /** @internal Un lecteur démarre : il devient actif ; les autres s'arrêtent si `exclusive`. */
  started(player: UiMediaControl, exclusive: boolean): void {
    this.activeSignal.set(player);
    if (!exclusive) return;
    for (const other of this.players) if (other !== player && other.playing()) other.pause();
  }
}
