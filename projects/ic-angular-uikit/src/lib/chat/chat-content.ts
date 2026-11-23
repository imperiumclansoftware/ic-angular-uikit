import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { renderChatMarkdown } from './chat-markdown';

/**
 * Contenu Markdown d'une réponse, reconstruit au plus une fois par image pendant le flux.
 * Styles non encapsulés (nœuds créés à la volée) : classes préfixées `ui-chat-md`.
 * @internal
 */
@Component({
  selector: 'ui-chat-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-chat-md', '(click)': 'onClick($event)' },
  template: ``,
  styleUrl: './chat-markdown.css',
})
export class UiChatContent {
  readonly markdown = input('');
  readonly headingOffset = input(3, { transform: numberAttribute });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly document = inject(DOCUMENT);
  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    effect(() => {
      const markdown = this.markdown();
      const offset = this.headingOffset();
      cancelAnimationFrame(this.frame);
      const render = () => this.host.replaceChildren(renderChatMarkdown(markdown, this.document, { headingOffset: offset }));
      if (typeof requestAnimationFrame === 'function' && this.host.childNodes.length) this.frame = requestAnimationFrame(render);
      else render();
    });
  }

  /** Boutons « Copier » des blocs de code (délégation : les nœuds sont reconstruits pendant le flux). */
  protected onClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.ui-chat-md__copy');
    if (!button) return;
    const code = button.dataset['code'] ?? '';
    void this.document.defaultView?.navigator.clipboard?.writeText(code).then(
      () => {
        button.textContent = 'Copié ✓';
        setTimeout(() => (button.textContent = 'Copier'), 1500);
      },
      () => (button.textContent = 'Copie impossible'),
    );
  }
}
