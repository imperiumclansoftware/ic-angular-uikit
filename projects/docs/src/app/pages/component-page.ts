import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { UiBadge, UiTab, UiTabLabel, UiTabs } from 'ic-angular-uikit';
import { BACKENDS } from '../generated/backends';
import { EXAMPLES } from '../generated/examples';
import { ApiView } from '../shared/api-view';
import { CodeBlock } from '../shared/code-block';
import { ExampleViewer } from '../shared/example-viewer';
import { Markdown } from '../shared/markdown';
import { COMPONENT_GROUPS } from '../shared/api-groups';

@Component({
  selector: 'doc-component-page',
  imports: [RouterLink, UiTabs, UiTab, UiTabLabel, UiBadge, ApiView, CodeBlock, ExampleViewer, Markdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (group(); as group) {
      <article class="doc-page">
        <p class="doc-page__eyebrow">{{ group.category }}</p>
        <h1 class="doc-page__title">{{ group.title }}</h1>
        <doc-markdown class="doc-page__lead" [text]="group.description" />

        <doc-code [code]="importSnippet()" />

        <ui-tabs [(selectedIndex)]="tab" ariaLabel="Sections de la page">
          <ui-tab>
            <ng-template uiTabLabel>Exemples <ui-badge tone="neutral" pill>{{ examples().length }}</ui-badge></ng-template>
            <h2 class="visually-hidden">Exemples</h2>
            @for (example of examples(); track example.id) {
              <doc-example [example]="example" />
            } @empty {
              <p>Pas encore d'exemple pour ce composant.</p>
            }
          </ui-tab>
          <ui-tab label="API">
            <h2 class="visually-hidden">API</h2>
            @for (entry of group.entries; track entry.name) {
              <doc-api [entry]="entry" />
            }
            @if (group.types.length) {
              <h2>Types</h2>
              @for (type of group.types; track type.name) {
                <h3 class="type-name" [id]="'type-' + type.name">{{ type.name }}</h3>
                @if (type.description) {
                  <doc-markdown class="type-description" [text]="type.description" />
                }
                <doc-code [code]="type.code" />
              }
            }
          </ui-tab>
          @if (backends(); as server) {
            <ui-tab label="Côté serveur" icon="lucide:settings">
              <h2 class="visually-hidden">Côté serveur</h2>
              <doc-markdown class="server-intro" [text]="server.intro" />
              <ui-tabs appearance="pills" ariaLabel="Technologies serveur" class="server-tabs">
                @for (backend of server.backends; track backend.id) {
                  <ui-tab [label]="backend.title">
                    <h3 class="visually-hidden">{{ backend.title }}</h3>
                    @if (backend.notes) {
                      <doc-markdown class="server-notes" [text]="backend.notes" />
                    }
                    @if (backend.install) {
                      <doc-code language="sh" [code]="backend.install" />
                    }
                    @for (file of backend.files; track file.file) {
                      <doc-code [language]="file.language" [filename]="file.name" [code]="file.code" />
                    }
                  </ui-tab>
                }
              </ui-tabs>
            </ui-tab>
          }
        </ui-tabs>
      </article>
    } @else {
      <article class="doc-page">
        <h1 class="doc-page__title">Composant introuvable</h1>
        <p><a routerLink="/">Retour à l'accueil</a></p>
      </article>
    }
  `,
  styles: `
    ui-tabs { margin-top: var(--ui-space-6); }
    .server-intro { display: block; max-width: 48rem; color: var(--ui-color-text-muted); }
    .server-tabs { margin-top: var(--ui-space-4); }
    .server-notes { display: block; margin-bottom: var(--ui-space-3); color: var(--ui-color-text-muted); font-size: var(--ui-font-size-sm); }
    doc-code { margin-bottom: var(--ui-space-4); }
    .type-name { margin: var(--ui-space-5) 0 var(--ui-space-1); font-family: var(--ui-font-family-mono); font-size: var(--ui-font-size-md); }
    .type-description { color: var(--ui-color-text-muted); font-size: var(--ui-font-size-sm); }
  `,
})
export default class ComponentPage {
  /** Paramètre de route `:slug`. */
  readonly slug = input.required<string>();

  protected readonly group = computed(() => COMPONENT_GROUPS.find((g) => g.slug === this.slug()));
  protected readonly examples = computed(() => EXAMPLES[this.slug()] ?? []);
  /** Exemples côté serveur (onglet affiché seulement s'il y en a). */
  protected readonly backends = computed(() => BACKENDS[this.slug()]);
  /** Revient sur l'onglet « Exemples » à chaque changement de composant. */
  protected readonly tab = linkedSignal({ source: this.slug, computation: () => 0 });

  protected readonly importSnippet = computed(() => {
    const names = (this.group()?.entries ?? []).filter((e) => e.kind === 'component' || e.kind === 'directive').map((e) => e.name);
    return names.length > 3
      ? `import {\n${names.map((n) => `  ${n},`).join('\n')}\n} from 'ic-angular-uikit';`
      : `import { ${names.join(', ')} } from 'ic-angular-uikit';`;
  });

  constructor() {
    const title = inject(Title);
    effect(() => title.setTitle(`${this.group()?.title ?? 'Composant'} · IC Angular UiKit`));
  }
}
