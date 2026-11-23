import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
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
import { Subscription, isObservable } from 'rxjs';
import { uniqueId } from '../core/id';
import { UiChatContent } from './chat-content';
import { chatMarkdownToText } from './chat-markdown';
import { UiChatMessage, UiChatTransport } from './chat-types';

/** En-tête de la conversation (titre, sélecteur de modèle, bouton « Nouvelle conversation ») : `<div uiChatHeader>`. */
@Directive({ selector: '[uiChatHeader]', host: { class: 'ui-chat__header-slot' } })
export class UiChatHeader {}

/** Contenu ajouté au-dessus de la zone de saisie (pièces jointes, options) : `<div uiChatComposerExtra>`. */
@Directive({ selector: '[uiChatComposerExtra]', host: { class: 'ui-chat__composer-extra' } })
export class UiChatComposerExtra {}

/** Payload de `feedbackChange`. */
export interface UiChatFeedback {
  message: UiChatMessage;
  feedback: 'up' | 'down' | null;
}

/** Identifiant aléatoire (crypto, disponible aussi hors HTTPS, contrairement à `randomUUID`). */
function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Conversation avec une IA : fil des messages, réponses en flux (affichées au fil de l'écriture, Markdown rendu sans
 * `innerHTML`), bouton Arrêter, régénération, copie, avis 👍 / 👎, suggestions de départ, avertissement sur la
 * fiabilité des réponses.
 *
 * Le composant ne connaît aucun fournisseur : `transport` reçoit l'historique et renvoie la réponse par morceaux
 * (`Observable<string>`, itérateur asynchrone ou `Promise<string>`). `uiChatHttpTransport(http, '/api/chat')` lit le
 * flux NDJSON des exemples « Côté serveur ». **La clé de l'API d'IA reste sur votre serveur**, jamais dans le
 * navigateur.
 *
 * Accessibilité : fil en rôle `log` dont les morceaux du flux ne sont pas annoncés un par un ; la réponse complète
 * est annoncée une fois terminée. Entrée envoie, Maj+Entrée va à la ligne ; le focus reste dans la zone de saisie.
 * Défilement automatique tant que l'utilisateur est en bas du fil, bouton « Aller aux derniers messages » sinon.
 *
 * @slot [uiChatHeader] - En-tête (titre, actions).
 * @slot [uiChatComposerExtra] - Contenu au-dessus de la zone de saisie.
 * @cssprop --ui-chat-max-width - Largeur maximale du fil et de la saisie (défaut : `48rem`).
 * @cssprop --ui-chat-user-bg - Fond des messages de l'utilisateur (défaut : `--ui-color-primary-subtle`).
 * @category Affichage
 */
@Component({
  selector: 'ui-chat',
  imports: [UiChatContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-chat',
    role: 'region',
    '[attr.aria-label]': 'ariaLabel()',
    '[class.ui-chat--busy]': 'busy()',
  },
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class UiChat {
  /** Messages (liaison bidirectionnelle `[(messages)]`) : à enregistrer pour reprendre la conversation. */
  readonly messages = model<UiChatMessage[]>([]);
  /** Obtient la réponse de l'IA (voir `UiChatTransport`). Sans transport, seul `messageSent` est émis. */
  readonly transport = input<UiChatTransport>();
  /** Nom de l'assistant (lecteurs d'écran, avatar). */
  readonly assistantName = input('Assistant');
  /** Nom de l'utilisateur. */
  readonly userName = input('Vous');
  /** Texte de bienvenue (Markdown) quand la conversation est vide. */
  readonly welcome = input<string>();
  /** Suggestions de départ (boutons) quand la conversation est vide. */
  readonly suggestions = input<readonly string[]>([]);
  /** Texte indicatif de la zone de saisie. */
  readonly placeholder = input('Écrivez votre message…');
  /** Avertissement sous la zone de saisie (`''` pour le retirer). */
  readonly disclaimer = input('Les réponses de l’IA peuvent contenir des erreurs : vérifiez les informations importantes.');
  /** Longueur maximale d'un message. */
  readonly maxLength = input(4000, { transform: numberAttribute });
  /** Boutons d'avis 👍 / 👎 sous les réponses. */
  readonly showFeedback = input(true, { transform: booleanAttribute });
  /** Heure sous chaque message. */
  readonly showTimestamps = input(false, { transform: booleanAttribute });
  /** Niveau de titre des messages pour les lecteurs d'écran (les titres des réponses en découlent). */
  readonly headingLevel = input(3, { transform: numberAttribute });
  /** Nom accessible de la conversation. */
  readonly ariaLabel = input('Conversation avec l’assistant');
  /** Saisie désactivée. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Message envoyé par l'utilisateur. */
  readonly messageSent = output<UiChatMessage>();
  /** Réponse terminée (ou interrompue, ou en erreur : voir `status`). */
  readonly responseComplete = output<UiChatMessage>();
  /** Avis donné sur une réponse. */
  readonly feedbackChange = output<UiChatFeedback>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly logRef = viewChild.required<ElementRef<HTMLElement>>('log');
  private readonly inputRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');
  protected readonly baseId = uniqueId('ui-chat');
  protected readonly draft = signal('');
  protected readonly announcement = signal('');
  /** Le fil suit les nouveaux messages (l'utilisateur est en bas). */
  protected readonly stick = signal(true);
  private current: { id: string; controller: AbortController; subscription?: Subscription } | null = null;

  /** Une réponse est en cours d'écriture. */
  readonly busy = computed(() => this.messages().some((m) => m.status === 'streaming'));
  protected readonly canSend = computed(() => !this.disabled() && !this.busy() && !!this.draft().trim() && this.draft().length <= this.maxLength());
  protected readonly lastAssistantId = computed(() => [...this.messages()].reverse().find((m) => m.role === 'assistant')?.id ?? null);
  protected readonly counter = computed(() => {
    const length = this.draft().length;
    return length > this.maxLength() * 0.8 ? `${length} / ${this.maxLength()}` : null;
  });
  protected readonly time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.current?.controller.abort());
    // Nouveaux messages ou texte en flux : on reste en bas si l'utilisateur y était.
    effect(() => {
      this.messages();
      untracked(() => {
        if (this.stick()) afterNextRender(() => this.scrollToEnd(false), { injector: this.injector });
      });
    });
  }

  /** Envoie un message (le texte saisi par défaut) et demande la réponse. */
  send(text = this.draft()): void {
    const content = text.trim().slice(0, this.maxLength());
    if (!content || this.busy() || this.disabled()) return;
    const message: UiChatMessage = { id: randomId(), role: 'user', content, createdAt: new Date().toISOString(), status: 'done' };
    this.messages.update((list) => [...list, message]);
    this.draft.set('');
    this.stick.set(true);
    this.messageSent.emit(message);
    this.respond();
    afterNextRender(() => this.inputRef().nativeElement.focus({ preventScroll: true }), { injector: this.injector });
  }

  /** Interrompt la réponse en cours (le texte déjà reçu est gardé). */
  stop(): void {
    const current = this.current;
    if (!current) return;
    this.current = null;
    current.controller.abort();
    current.subscription?.unsubscribe();
    this.finish(current.id, 'stopped');
    this.announcement.set('Réponse interrompue.');
  }

  /** Relance la réponse d'index donné (par défaut, la dernière) : elle et les messages suivants sont remplacés. */
  regenerate(messageId = this.lastAssistantId()): void {
    if (!messageId || this.busy()) return;
    const list = this.messages();
    const index = list.findIndex((m) => m.id === messageId);
    if (index < 0 || list[index].role !== 'assistant') return;
    this.messages.set(list.slice(0, index));
    this.respond();
  }

  /** Vide la conversation (nouvelle conversation). */
  clear(): void {
    this.stop();
    this.messages.set([]);
    this.announcement.set('Nouvelle conversation.');
  }

  /** Donne le focus à la zone de saisie. */
  focus(): void {
    this.inputRef().nativeElement.focus();
  }

  private respond(): void {
    const transport = this.transport();
    if (!transport) return;
    // Historique envoyé : messages terminés (une réponse en erreur ou vide n'est pas renvoyée au modèle).
    const history = this.messages()
      .filter((m) => m.role === 'user' || (m.content.trim() && m.status !== 'error'))
      .map(({ role, content }) => ({ role, content }));
    const id = randomId();
    const controller = new AbortController();
    this.current = { id, controller };
    this.messages.update((list) => [...list, { id, role: 'assistant', content: '', createdAt: new Date().toISOString(), status: 'streaming' }]);
    this.announcement.set(`${this.assistantName()} rédige une réponse…`);

    const append = (chunk: string) => {
      if (this.current?.id !== id || !chunk) return;
      this.messages.update((list) => list.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m)));
    };
    const done = () => {
      if (this.current?.id !== id) return;
      this.current = null;
      this.finish(id, 'done');
    };
    const fail = (error: unknown) => {
      if (this.current?.id !== id) return;
      this.current = null;
      const message = error instanceof Error && error.message ? error.message : 'La réponse n’a pas pu être obtenue.';
      this.finish(id, 'error', message);
    };

    let result: ReturnType<UiChatTransport>;
    try {
      result = transport({ messages: history, signal: controller.signal });
    } catch (error) {
      fail(error);
      return;
    }
    if (isObservable(result)) {
      this.current.subscription = result.subscribe({ next: append, error: fail, complete: done });
    } else if (result && typeof (result as AsyncIterable<string>)[Symbol.asyncIterator] === 'function') {
      void (async () => {
        try {
          for await (const chunk of result as AsyncIterable<string>) {
            if (controller.signal.aborted) return;
            append(chunk);
          }
          done();
        } catch (error) {
          if (!controller.signal.aborted) fail(error);
        }
      })();
    } else {
      (result as Promise<string>).then(
        (text) => {
          append(text);
          done();
        },
        fail,
      );
    }
  }

  private finish(id: string, status: 'done' | 'stopped' | 'error', error?: string): void {
    let finished: UiChatMessage | undefined;
    this.messages.update((list) =>
      list.map((m) => {
        if (m.id !== id) return m;
        finished = { ...m, status, ...(error ? { error } : {}) };
        return finished;
      }),
    );
    if (!finished) return;
    this.responseComplete.emit(finished);
    if (status === 'done') {
      const text = chatMarkdownToText(finished.content, this.document);
      this.announcement.set(`${this.assistantName()} : ${text.length > 600 ? `${text.slice(0, 600)}… (suite dans le fil)` : text}`);
    } else if (status === 'error') {
      this.announcement.set(`Erreur : ${error}`);
    }
  }

  protected setFeedback(message: UiChatMessage, value: 'up' | 'down'): void {
    const feedback = message.feedback === value ? null : value;
    this.messages.update((list) => list.map((m) => (m.id === message.id ? { ...m, feedback } : m)));
    this.feedbackChange.emit({ message: { ...message, feedback }, feedback });
    this.announcement.set(feedback ? 'Merci pour votre avis.' : 'Avis retiré.');
  }

  protected copy(message: UiChatMessage, button: HTMLElement): void {
    void this.document.defaultView?.navigator.clipboard?.writeText(message.content).then(
      () => {
        button.dataset['copied'] = 'true';
        this.announcement.set('Réponse copiée.');
        setTimeout(() => delete button.dataset['copied'], 1500);
      },
      () => this.announcement.set('Copie impossible.'),
    );
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Entrée envoie ; Maj+Entrée et la composition (IME) restent des sauts de ligne / validations de saisie.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.send();
    } else if (event.key === 'Escape' && this.busy()) {
      event.preventDefault();
      this.stop();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.busy()) this.stop();
    else this.send();
  }

  protected onScroll(): void {
    const log = this.logRef().nativeElement;
    this.stick.set(log.scrollHeight - log.scrollTop - log.clientHeight < 48);
  }

  protected scrollToEnd(smooth: boolean): void {
    const log = this.logRef().nativeElement;
    const reduced = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (typeof log.scrollTo === 'function') log.scrollTo({ top: log.scrollHeight, behavior: smooth && !reduced ? 'smooth' : 'auto' });
    else log.scrollTop = log.scrollHeight;
    this.stick.set(true);
  }

  protected formatTime(value: string | Date | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : this.time.format(date);
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }
}
