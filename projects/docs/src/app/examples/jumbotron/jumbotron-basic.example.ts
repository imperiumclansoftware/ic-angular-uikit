import { Component, signal } from '@angular/core';
import {
  UiButton,
  UiJumbotron,
  UiJumbotronActions,
  UiJumbotronSize,
  UiJumbotronTone,
  UiRadio,
  UiRadioGroup,
} from 'ic-angular-uikit';

/**
 * Accroche simple (configurateur)
 * Les inputs `eyebrow`, `heading` et `lead` suffisent pour une accroche classique ; les boutons vont dans `uiJumbotronActions`. Essayez les fonds (`tone`), les hauteurs (`size`) et l'alignement. Sur une vraie page d'accueil, gardez `headingLevel` à 1 (ici 4, sous le titre de l'exemple).
 * @order 1
 */
@Component({
  selector: 'doc-jumbotron-basic-example',
  imports: [UiJumbotron, UiJumbotronActions, UiButton, UiRadioGroup, UiRadio],
  template: `
    <div class="controls">
      <ui-radio-group label="tone" orientation="horizontal" size="sm" [(value)]="tone">
        <ui-radio value="surface">surface</ui-radio>
        <ui-radio value="sunken">sunken</ui-radio>
        <ui-radio value="primary">primary</ui-radio>
        <ui-radio value="gradient">gradient</ui-radio>
      </ui-radio-group>
      <ui-radio-group label="size" orientation="horizontal" size="sm" [(value)]="size">
        <ui-radio value="sm">sm</ui-radio>
        <ui-radio value="md">md</ui-radio>
        <ui-radio value="lg">lg</ui-radio>
      </ui-radio-group>
      <ui-radio-group label="align" orientation="horizontal" size="sm" [(value)]="align">
        <ui-radio value="start">start</ui-radio>
        <ui-radio value="center">center</ui-radio>
      </ui-radio-group>
    </div>

    <ui-jumbotron
      class="demo"
      eyebrow="Nouveau — version 2"
      heading="Construisez vos interfaces plus vite"
      lead="Des composants Angular accessibles, thémables et documentés, prêts pour vos applications métier comme pour vos sites vitrines."
      [headingLevel]="4"
      [tone]="tone()"
      [size]="size()"
      [align]="align()"
    >
      <div uiJumbotronActions>
        <button uiButton size="lg" [variant]="onColor() ? 'secondary' : 'primary'" iconEnd="lucide:arrow-right">Commencer</button>
        <button uiButton size="lg" variant="outline">Voir la démo</button>
      </div>
    </ui-jumbotron>
  `,
  styles: `
    .controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem 2rem; margin-bottom: 1rem; }
    .demo { --ui-jumbotron-radius: var(--ui-radius-lg); }
  `,
})
export class JumbotronBasicExample {
  protected readonly tone = signal<UiJumbotronTone>('sunken');
  protected readonly size = signal<UiJumbotronSize>('md');
  protected readonly align = signal<'start' | 'center'>('center');
  protected onColor(): boolean {
    return this.tone() === 'primary' || this.tone() === 'gradient';
  }
}
