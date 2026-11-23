import { Component, inject, signal } from '@angular/core';
import { UI_LOADER_TYPES, UiButton, UiImage, UiLoader, UiLoaderDefaults, UiLoaderType, UiSelect, provideUiLoader } from 'ic-angular-uikit';

/**
 * Choix global, par zone ou local
 * Le loader affiché vient, dans l'ordre : de l'attribut `type` du composant, de la **zone** la plus proche (`provideUiLoader()` dans les `providers` d'un composant), puis de la configuration de l'**application** (`provideUiLoader({ type: 'dots' })` dans `app.config.ts`). `UiLoaderDefaults.set()` le change à l'exécution, par exemple depuis les préférences de l'utilisateur. Tous les composants qui attendent quelque chose suivent ce choix : `ui-loader`, le bouton `loading`, `ui-image`, le lecteur multimédia. Ici, l'exemple est une zone : modifier le loader ne change pas le reste de la documentation.
 * @order 2
 */
@Component({
  selector: 'doc-loader-global-example',
  imports: [UiLoader, UiButton, UiImage, UiSelect],
  // Zone : ce composant et ses descendants. Dans une application : provideUiLoader(...) dans app.config.ts.
  providers: [provideUiLoader({ type: 'orbit' })],
  template: `
    <div class="controls">
      <ui-select label="Loader de la zone" [options]="typeOptions" [value]="type()" (valueChange)="choose($event)" />
      <ui-select label="Vitesse" [options]="speedOptions" [value]="speed()" (valueChange)="setSpeed($event)" />
    </div>
    <div class="demo">
      <div class="cell">
        <ui-loader />
        <span>ui-loader</span>
      </div>
      <div class="cell">
        <button uiButton [loading]="busy()" (click)="send()">{{ busy() ? 'Envoi…' : 'Envoyer' }}</button>
        <span>bouton loading</span>
      </div>
      <div class="cell cell--image">
        <ui-image [src]="image()" alt="Forêt de conifères" ratio="16/9" />
        <span>ui-image (<button type="button" class="link" (click)="reloadImage()">recharger</button>)</span>
      </div>
      <div class="cell">
        <ui-loader type="dots" label="Toujours des points…" />
        <span>local : type="dots"</span>
      </div>
    </div>
  `,
  styles: `
    .controls { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    .controls ui-select { width: 12rem; }
    .demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 1rem; align-items: stretch; }
    .cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; min-height: 8rem; padding: 0.75rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); }
    .cell > span { color: var(--ui-color-text-muted); font-size: 0.8125rem; }
    .cell--image ui-image { width: 100%; border-radius: var(--ui-radius-sm); }
    .link { padding: 0; border: 0; background: none; color: var(--ui-color-primary-text); font: inherit; text-decoration: underline; cursor: pointer; }
  `,
})
export class LoaderGlobalExample {
  private readonly loaders = inject(UiLoaderDefaults);
  protected readonly typeOptions = UI_LOADER_TYPES.map((t) => ({ value: t as UiLoaderType, label: t }));
  protected readonly speedOptions = [0.5, 1, 2].map((s) => ({ value: s, label: `× ${s}` }));
  protected readonly type = signal<UiLoaderType>('orbit');
  protected readonly speed = signal(1);
  protected readonly busy = signal(true);
  protected readonly image = signal<string | null>(null);
  private version = 0;

  constructor() {
    this.reloadImage();
  }

  protected choose(type: UiLoaderType | null): void {
    if (!type) return;
    this.type.set(type);
    this.loaders.set({ type });
  }

  protected setSpeed(speed: number | null): void {
    this.speed.set(speed ?? 1);
    this.loaders.set({ speed: speed ?? 1 });
  }

  protected send(): void {
    this.busy.set(true);
    setTimeout(() => this.busy.set(false), 2500);
  }

  /** Chargement lent simulé : l'adresse n'est fournie qu'au bout de 2,5 s. */
  protected reloadImage(): void {
    this.image.set(null);
    const v = ++this.version;
    setTimeout(() => this.image.set(`demo/forest.svg?v=${v}`), 2500);
  }
}
