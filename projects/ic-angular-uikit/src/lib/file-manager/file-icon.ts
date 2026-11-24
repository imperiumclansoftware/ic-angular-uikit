import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiFileEntry, UiFileFamily, fileFamily } from './file-source';

const PATHS: Record<UiFileFamily, string[]> = {
  folder: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z', 'm21 15-5-5L5 21'],
  video: ['M4 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'm18 10 4-2.5v9L18 14'],
  audio: ['M9 18V5l12-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  pdf: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 15h1.5a1.5 1.5 0 0 0 0-3H8v6'],
  text: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8M8 17h6'],
  sheet: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 12h8v6H8zM12 12v6M8 15h8'],
  archive: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M10 4h1M10 7h1M10 10h1M10 13h1v3h-1z'],
  code: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'm10 13-2 2 2 2M14 13l2 2-2 2'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6'],
};

/**
 * Icône d'un fichier ou d'un dossier selon son type (image, vidéo, audio, PDF, texte, tableur, archive, code).
 * Décorative : le nom du fichier est affiché à côté.
 *
 * ```html
 * <ui-file-icon [entry]="file" />
 * ```
 * @category Affichage
 */
@Component({
  selector: 'ui-file-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-file-icon', 'aria-hidden': 'true', '[attr.data-family]': 'family()' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-grid; flex: none; place-items: center; width: 1.5rem; height: 1.5rem; color: var(--ui-color-text-muted); }
    :host([data-family='folder']) { color: var(--ui-color-warning); }
    :host([data-family='image']) { color: var(--ui-color-success-text); }
    :host([data-family='video']) { color: var(--ui-color-primary-text); }
    :host([data-family='pdf']) { color: var(--ui-color-danger-text); }
    :host([data-family='folder']) path { fill: color-mix(in srgb, currentColor 22%, transparent); }
    svg { width: 100%; height: 100%; }
  `,
})
export class UiFileIcon {
  /** Élément (dossier ou fichier). */
  readonly entry = input.required<Pick<UiFileEntry, 'kind' | 'name' | 'mimeType'>>();

  protected readonly family = computed(() => fileFamily(this.entry()));
  protected readonly paths = computed(() => PATHS[this.family()]);
}
