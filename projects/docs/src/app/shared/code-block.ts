import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CodeLanguage, highlight } from './highlight';

/** Bloc de code coloré avec bouton « Copier ». */
@Component({
  selector: 'doc-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="doc-code" [class.doc-code--inline-copy]="!filename()">
      @if (filename()) {
        <div class="doc-code__bar">
          <span class="doc-code__file">{{ filename() }}</span>
          <ng-container *ngTemplateOutlet="copyButton" />
        </div>
      } @else {
        <ng-container *ngTemplateOutlet="copyButton" />
      }
      <pre class="doc-code__pre" tabindex="0" [style.max-height]="maxHeight() ?? null" [attr.aria-label]="filename() ? 'Code : ' + filename() : 'Code'"><code>@for (token of tokens(); track $index) {<span [class]="'tk-' + token.kind">{{ token.text }}</span>}</code></pre>
    </div>
    <ng-template #copyButton>
      <button type="button" class="doc-code__copy" (click)="copy()" [attr.aria-label]="copied() ? 'Copié' : 'Copier le code'">
        {{ copied() ? 'Copié ✓' : 'Copier' }}
      </button>
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
  styleUrl: './code-block.css',
})
export class CodeBlock {
  /** Hauteur maximale (défilement au-delà), ex. `32rem`. */
  readonly maxHeight = input<string>();
  readonly code = input.required<string>();
  readonly language = input<CodeLanguage>('ts');
  readonly filename = input<string>();

  protected readonly tokens = computed(() => highlight(this.code().trimEnd(), this.language()));
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code().trimEnd());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }
}
