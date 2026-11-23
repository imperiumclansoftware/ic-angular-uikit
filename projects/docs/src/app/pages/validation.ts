import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EXAMPLES } from '../generated/examples';
import { ApiView } from '../shared/api-view';
import { CodeBlock } from '../shared/code-block';
import { ExampleViewer } from '../shared/example-viewer';
import { VALIDATION_GROUP } from '../shared/api-groups';

@Component({
  selector: 'doc-validation',
  imports: [ApiView, CodeBlock, ExampleViewer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="doc-page">
      <p class="doc-page__eyebrow">Guide</p>
      <h1 class="doc-page__title">Validation</h1>
      <p class="doc-page__lead">
        Les champs de formulaire (<code class="doc-inline-code">ui-text-field</code>, <code class="doc-inline-code">ui-textarea</code>,
        <code class="doc-inline-code">ui-select</code>, <code class="doc-inline-code">ui-checkbox</code>,
        <code class="doc-inline-code">ui-radio-group</code>, <code class="doc-inline-code">ui-switch</code>) affichent eux-mêmes
        l'état de leur contrôle Angular : erreur, vérification en cours ou succès, avec un message personnalisable.
      </p>

      <h2 id="principe">Principe</h2>
      <p>
        Branchez le champ avec <code class="doc-inline-code">formControlName</code>, <code class="doc-inline-code">[formControl]</code>
        ou <code class="doc-inline-code">ngModel</code> : il lit les validateurs, l'état touché / modifié et la soumission du formulaire parent.
        <code class="doc-inline-code">Validators.required</code> ajoute aussi l'astérisque et l'attribut <code class="doc-inline-code">required</code>.
      </p>
      <doc-code [code]="principle" />

      <h2 id="messages">Choix du message</h2>
      <p>Pour une erreur donnée, le premier message trouvé l'emporte :</p>
      <ol class="order">
        <li><code class="doc-inline-code">[errorMessages]</code> du champ ;</li>
        <li>la propriété <code class="doc-inline-code">message</code> renvoyée par le validateur : <code class="doc-inline-code">&#123; taken: &#123; message: 'Déjà utilisé' &#125; &#125;</code> ;</li>
        <li>les messages de <code class="doc-inline-code">provideUiValidation()</code> (application ou composant) ;</li>
        <li>les messages par défaut ci-dessous.</li>
      </ol>
      <p>
        Un message est un texte où <code class="doc-inline-code">&#123;paramètre&#125;</code> est remplacé par la propriété de l'erreur
        (<code class="doc-inline-code">&#123;requiredLength&#125;</code>, <code class="doc-inline-code">&#123;min&#125;</code>…) et
        <code class="doc-inline-code">&#123;label&#125;</code> par le libellé du champ, ou une fonction <code class="doc-inline-code">(erreur, contexte) => string</code>.
      </p>
      <div class="defaults" tabindex="0" role="region" aria-label="Messages par défaut">
        <table>
          <thead><tr><th scope="col">Clé</th><th scope="col">Message par défaut</th></tr></thead>
          <tbody>
            @for (row of defaults; track row[0]) {
              <tr><td><code>{{ row[0] }}</code></td><td>{{ row[1] }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      <h2 id="exemples">Exemples</h2>
      @for (example of examples; track example.id) {
        <doc-example [example]="example" />
      }

      <h2 id="api">API</h2>
      @for (entry of entries; track entry.name) {
        <doc-api [entry]="entry" />
      }
      @for (type of types; track type.name) {
        <h3 class="type-name">{{ type.name }}</h3>
        <doc-code [code]="type.code" />
      }
    </article>
  `,
  styles: `
    .order { padding-left: 1.25rem; line-height: 1.9; }
    .defaults:focus-visible { outline: 2px solid var(--ui-color-focus-ring); outline-offset: 2px; }
    .defaults { overflow-x: auto; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-md); }
    .defaults table { width: 100%; border-collapse: collapse; font-size: var(--ui-font-size-sm); }
    .defaults th, .defaults td { padding: var(--ui-space-2) var(--ui-space-3); border-bottom: 1px solid var(--ui-color-border); text-align: start; }
    .defaults th { background: var(--ui-color-surface-sunken); font-size: var(--ui-font-size-xs); }
    .defaults tbody tr:last-child td { border-bottom: 0; }
    .type-name { font-family: var(--ui-font-family-mono); font-size: var(--ui-font-size-md); }
  `,
})
export default class ValidationPage {
  protected readonly examples = EXAMPLES['validation'] ?? [];
  protected readonly entries = VALIDATION_GROUP?.entries ?? [];
  protected readonly types = VALIDATION_GROUP?.types ?? [];
  protected readonly defaults: [string, string][] = [
    ['required', 'Ce champ est obligatoire. (case : « Cette case doit être cochée. », radio : « Choisissez une option. »)'],
    ['email', 'Saisissez une adresse e-mail valide.'],
    ['minlength', 'Au moins {requiredLength} caractères ({actualLength} actuellement).'],
    ['maxlength', 'Au plus {requiredLength} caractères ({actualLength} actuellement).'],
    ['min', 'La valeur minimale est {min}.'],
    ['max', 'La valeur maximale est {max}.'],
    ['pattern', 'Le format est invalide.'],
    ['(en attente)', 'Vérification…'],
    ['(autre)', 'Valeur invalide.'],
  ];

  protected readonly principle = `form = new FormGroup({
  email: new FormControl('', { validators: [Validators.required, Validators.email] }),
});

<form [formGroup]="form" (ngSubmit)="save()">
  <ui-text-field label="E-mail" formControlName="email" />
  <!-- après blur ou soumission : « Saisissez une adresse e-mail valide. » -->
</form>`;
}
