import { ChangeDetectionStrategy, Component, Injector, afterNextRender, booleanAttribute, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { UiButton } from '../button/button';
import { UiCheckbox } from '../checkbox/checkbox';
import { UiDialog } from '../dialog/dialog';
import { UiFileManager } from '../file-manager/file-manager';
import { UiFileEntry, UiFileSource, fileFamily } from '../file-manager/file-source';
import { UiFileSize } from '../file-upload/file-utils';
import { UiImage } from '../image/image';
import { galleryItemKind } from '../media-gallery/media-gallery';
import { UiRichTextMedia, UiRichTextMediaPolicy, safeRichTextMediaUrl } from '../rich-text-editor/rich-text-html';
import { UiSelect } from '../select/select';
import { UiTab, UiTabs } from '../tabs/tabs';
import { UiTextField } from '../text-field/text-field';

/** Média choisi. */
export interface UiPickedMedia extends UiRichTextMedia {
  /** Élément de la bibliothèque, s'il vient de là. */
  entry?: UiFileEntry;
}

/**
 * Sélecteur de média (dialogue) : choix d'une image ou d'une vidéo dans une bibliothèque (`ui-file-manager`, avec
 * envoi de nouveaux fichiers si la source le permet) ou par adresse, puis description : texte alternatif (obligatoire
 * pour une image, sauf image décorative cochée explicitement), titre de la vidéo, légende.
 *
 * ```ts
 * const media = await this.picker().pick(); // null si annulé
 * ```
 * Utilisé par `ui-rich-text-editor` (entrée `mediaSource`) ; utilisable seul.
 * @category Formulaires
 */
@Component({
  selector: 'ui-media-picker',
  imports: [UiDialog, UiTabs, UiTab, UiFileManager, UiTextField, UiCheckbox, UiButton, UiImage, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-media-picker' },
  templateUrl: './media-picker.html',
  styleUrl: './media-picker.css',
})
export class UiMediaPicker {
  /** Bibliothèque (facultative : sans elle, seule l'adresse est proposée). */
  readonly source = input<UiFileSource>();
  /** Types proposés. */
  readonly accept = input('image/*,video/*');
  /** Onglet « Adresse » (image ou vidéo par URL). */
  readonly allowUrl = input(true, { transform: booleanAttribute });
  /** Filtre d'adresses (mêmes règles que l'éditeur). */
  readonly urlPolicy = input<UiRichTextMediaPolicy>({});
  /** Taille maximale des fichiers envoyés depuis le sélecteur. */
  readonly maxFileSize = input<UiFileSize>();
  /** Titre du dialogue. */
  readonly title = input('Insérer une image ou une vidéo');
  /** Ouverture (liaison `[(open)]`). */
  readonly open = model(false);

  /** Média choisi (bouton « Insérer »). */
  readonly picked = output<UiPickedMedia>();
  /** Dialogue fermé sans choix. */
  readonly cancelled = output<void>();

  protected readonly tab = signal(0);
  protected readonly selection = signal<readonly UiFileEntry[]>([]);
  protected readonly url = signal('');
  protected readonly urlKind = signal<'auto' | 'image' | 'video'>('auto');
  protected readonly alt = signal('');
  protected readonly decorative = signal(false);
  protected readonly caption = signal('');
  protected readonly submitted = signal(false);
  private resolver: ((media: UiPickedMedia | null) => void) | null = null;
  private readonly injector = inject(Injector);
  private readonly altField = viewChild<UiTextField>('altField');
  private done = false;

  protected readonly kindOptions = [
    { value: 'auto', label: 'Déduit de l’adresse' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Vidéo' },
  ];
  protected readonly showLibrary = computed(() => !!this.source());
  protected readonly urlTab = computed(() => (this.showLibrary() ? 1 : 0));

  /** Média en cours de choix (élément sélectionné ou adresse saisie), sans description. */
  protected readonly candidate = computed<{ kind: 'image' | 'video'; src: string; entry?: UiFileEntry; width?: number; height?: number; poster?: string } | null>(() => {
    if (this.showLibrary() && this.tab() === 0) {
      const entry = this.selection()[0];
      if (!entry || entry.kind !== 'file' || !entry.url) return null;
      const family = fileFamily(entry);
      if (family !== 'image' && family !== 'video') return null;
      return { kind: family, src: entry.url, entry, width: entry.width, height: entry.height, poster: family === 'video' ? entry.thumbnailUrl : undefined };
    }
    const src = this.url().trim();
    // Adresse refusée : aucun aperçu (jamais de chargement d'une adresse `javascript:` ou `data:`).
    if (!src || !safeRichTextMediaUrl(src, this.urlPolicy())) return null;
    const choice = this.urlKind();
    const kind: 'image' | 'video' = choice === 'auto' ? galleryItemKind({ src, alt: '' }) : choice;
    return { kind, src };
  });
  protected readonly urlError = computed(() => {
    const src = this.url().trim();
    if (!src) return this.submitted() && this.tab() === this.urlTab() ? 'Saisissez l’adresse du média.' : null;
    return safeRichTextMediaUrl(src, this.urlPolicy()) ? null : 'Adresse refusée : http(s) ou chemin du site uniquement.';
  });
  protected readonly altError = computed(() => {
    const candidate = this.candidate();
    if (!this.submitted() || candidate?.kind !== 'image' || this.decorative() || this.alt().trim()) return null;
    return 'Décrivez l’image, ou cochez « Image décorative ».';
  });

  /** Ouvre le sélecteur ; la promesse donne le média choisi, ou `null` si l'utilisateur annule. */
  pick(): Promise<UiPickedMedia | null> {
    this.resolver?.(null);
    this.reset();
    this.open.set(true);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  private reset(): void {
    this.done = false;
    this.tab.set(0);
    this.selection.set([]);
    this.url.set('');
    this.urlKind.set('auto');
    this.alt.set('');
    this.decorative.set(false);
    this.caption.set('');
    this.submitted.set(false);
  }

  /** Double clic ou Entrée sur un fichier : il est choisi, la description suit. */
  protected onOpenEntry(entry: UiFileEntry): void {
    this.selection.set([entry]);
    if (!this.alt() && entry.alt) this.alt.set(entry.alt);
    afterNextRender(() => this.altField()?.focus(), { injector: this.injector });
  }

  protected onSelection(selection: readonly UiFileEntry[]): void {
    this.selection.set(selection);
    const entry = selection[0];
    if (entry?.alt && !this.alt()) this.alt.set(entry.alt);
  }


  protected insert(): void {
    this.submitted.set(true);
    const candidate = this.candidate();
    if (!candidate || (this.tab() === this.urlTab() && this.urlError()) || this.altError()) return;
    if (!safeRichTextMediaUrl(candidate.src, this.urlPolicy())) return;
    const media: UiPickedMedia = {
      ...candidate,
      alt: candidate.kind === 'image' && this.decorative() ? '' : this.alt().trim(),
      caption: this.caption().trim() || undefined,
    };
    this.done = true;
    this.picked.emit(media);
    this.resolver?.(media);
    this.resolver = null;
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }

  protected onClosed(): void {
    this.open.set(false);
    if (!this.done) {
      this.cancelled.emit();
      this.resolver?.(null);
      this.resolver = null;
    }
  }
}
