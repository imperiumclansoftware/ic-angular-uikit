// app.config.ts — le jeton CSRF (cookie XSRF-TOKEN) est renvoyé automatiquement dans l'en-tête X-XSRF-TOKEN.
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))],
};

// comments.ts — saisie avec ui-rich-text-editor, affichage avec ui-rich-text.
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiRichText, UiRichTextEditor, richTextMaxLength } from 'ic-angular-uikit';

interface StoredComment {
  id: string;
  content: string; // HTML nettoyé par le serveur
  createdAt?: string;
}

@Component({
  selector: 'app-comments',
  imports: [ReactiveFormsModule, UiRichTextEditor, UiRichText, UiButton],
  template: `
    <form (ngSubmit)="send()">
      <ui-rich-text-editor label="Votre commentaire" [formControl]="content" [maxLength]="5000" [blocks]="['p', 'blockquote', 'pre']" />
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <button uiButton type="submit" [loading]="sending()">Publier</button>
    </form>

    @for (comment of comments(); track comment.id) {
      <article>
        <!-- Jamais [innerHTML] : ui-rich-text renettoie le HTML reçu et le reconstruit nœud par nœud. -->
        <ui-rich-text [html]="comment.content" externalLinks="_blank" />
      </article>
    }
  `,
})
export class Comments {
  private readonly http = inject(HttpClient);
  protected readonly content = new FormControl('', { nonNullable: true, validators: [Validators.required, richTextMaxLength(5000)] });
  protected readonly comments = signal<StoredComment[]>([]);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.http.get<StoredComment[]>('/api/comments').subscribe((list) => this.comments.set(list));
  }

  protected send(): void {
    this.content.markAsTouched();
    if (this.content.invalid || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    this.http.post<StoredComment>('/api/comments', { content: this.content.value }).subscribe({
      next: (saved) => {
        // On affiche ce que le serveur a enregistré (nettoyé), pas ce qui a été envoyé.
        this.comments.update((list) => [saved, ...list]);
        this.content.reset('');
        this.sending.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 422 ? (e.error?.error ?? 'Commentaire invalide.') : 'Envoi impossible, réessayez.');
        this.sending.set(false);
      },
    });
  }
}
