import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { UiTab, UiTabs } from 'ic-angular-uikit';
import { CodeBlock } from './code-block';
import { ExampleDef } from './doc-types';
import { Markdown } from './markdown';

type PreviewTheme = 'inherit' | 'light' | 'dark' | 'split';

@Component({
  selector: 'doc-example',
  imports: [NgComponentOutlet, CodeBlock, Markdown, UiTabs, UiTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="example" [attr.aria-labelledby]="example().id">
      <header class="example__header">
        <h3 class="example__title" [id]="example().id">
          {{ example().title }}
          <a [href]="'#' + example().id" class="example__anchor" [attr.aria-label]="'Lien vers l’exemple « ' + example().title + ' »'">#</a>
        </h3>
        @if (example().description) {
          <doc-markdown class="example__description" [text]="example().description" />
        }
      </header>

      <div class="example__frame">
        <div class="example__toolbar">
          <div class="example__themes" role="group" aria-label="Thème de l'aperçu">
            @for (option of themeOptions; track option.value) {
              <button
                type="button"
                [class.is-active]="theme() === option.value"
                [attr.aria-pressed]="theme() === option.value"
                (click)="theme.set(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
          <button type="button" class="example__code-toggle" [attr.aria-expanded]="showCode()" (click)="showCode.set(!showCode())">
            {{ showCode() ? 'Masquer le code' : 'Voir le code' }}
          </button>
        </div>

        @if (theme() === 'split') {
          <div class="example__split">
            <div class="example__preview" data-ui-theme="light">
              <ng-container *ngComponentOutlet="example().component" />
            </div>
            <div class="example__preview" data-ui-theme="dark">
              <ng-container *ngComponentOutlet="example().component" />
            </div>
          </div>
        } @else {
          <div class="example__preview" [attr.data-ui-theme]="theme() === 'inherit' ? null : theme()">
            <ng-container *ngComponentOutlet="example().component" />
          </div>
        }

        @if (showCode()) {
          @if (example().files.length) {
            <!-- Exemple + fichiers qu'il importe (données, composants annexes), un onglet par fichier. -->
            <ui-tabs class="example__files" [ariaLabel]="'Fichiers de l’exemple « ' + example().title + ' »'">
              <ui-tab [label]="fileName()">
                <doc-code class="example__code" maxHeight="32rem" [code]="example().source" [filename]="fileName()" />
              </ui-tab>
              @for (file of example().files; track file.name) {
                <ui-tab [label]="file.name">
                  <doc-code class="example__code" maxHeight="32rem" [code]="file.source" [filename]="file.name" />
                </ui-tab>
              }
            </ui-tabs>
          } @else {
            <doc-code class="example__code" [code]="example().source" [filename]="fileName()" />
          }
        }
      </div>
    </section>
  `,
  styleUrl: './example-viewer.css',
})
export class ExampleViewer {
  readonly example = input.required<ExampleDef>();

  protected readonly theme = signal<PreviewTheme>('inherit');
  protected readonly showCode = signal(false);
  protected readonly themeOptions: { value: PreviewTheme; label: string }[] = [
    { value: 'inherit', label: 'Site' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'split', label: 'Côte à côte' },
  ];

  protected fileName(): string {
    return this.example().file.split('/').pop() ?? '';
  }
}
