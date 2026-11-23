import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';

/** Cadre d'aperçu redimensionnable pour les démos de mise en page (simule un écran plus étroit). */
@Component({
  selector: 'doc-demo-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="width">
      Largeur de l'aperçu : <strong>{{ current() }} px</strong>
      @if (current() < 768) {
        <span class="mobile">mobile</span>
      }
      <input type="range" min="320" max="1100" step="20" [value]="current()" (input)="setWidth($event)" />
    </label>
    <div class="frame" [style.width.px]="current()" [style.height.px]="height()">
      <ng-content />
    </div>
  `,
  styles: `
    :host { display: block; }
    .width { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .width input { flex: 1; min-width: 10rem; max-width: 22rem; accent-color: var(--ui-color-primary); }
    .mobile { padding: 0 0.5rem; border-radius: 999px; background: var(--ui-color-warning-subtle); color: var(--ui-color-warning-text); font-size: 0.75rem; font-weight: 600; }
    .frame { max-width: 100%; overflow: hidden; border: 1px solid var(--ui-color-border-control); border-radius: var(--ui-radius-lg); }
  `,
})
export class DemoFrame {
  readonly width = input(980);
  readonly height = input(440);
  protected readonly current = linkedSignal(() => this.width());

  protected setWidth(event: Event): void {
    this.current.set(Number((event.target as HTMLInputElement).value));
  }
}
