import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from 'ic-angular-uikit';
import { CodeBlock } from '../shared/code-block';

interface Rule {
  id: string;
  title: string;
  library: string[];
  you: string[];
}

@Component({
  selector: 'doc-accessibility',
  imports: [RouterLink, UiBadge, CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="doc-page">
      <p class="doc-page__eyebrow">Guide</p>
      <h1 class="doc-page__title">Accessibilité</h1>
      <p class="doc-page__lead">
        IC Angular UiKit suit les principes de conception universelle et vise le niveau AA des
        <a href="https://www.w3.org/TR/WCAG21/" rel="noopener" target="_blank">WCAG 2.1</a>.
        Pour chaque règle : ce que la librairie garantit, et ce qui reste à la charge de votre application.
      </p>

      @for (rule of rules; track rule.id; let i = $index) {
        <section class="rule" [attr.aria-labelledby]="rule.id">
          <h2 class="rule__title" [id]="rule.id"><span class="rule__num" aria-hidden="true">{{ i + 1 }}</span>{{ rule.title }}</h2>
          <div class="rule__cols">
            <div>
              <h3 class="rule__label"><ui-badge tone="success" pill>Librairie</ui-badge></h3>
              <ul>
                @for (item of rule.library; track item) { <li>{{ item }}</li> }
              </ul>
            </div>
            <div>
              <h3 class="rule__label"><ui-badge tone="primary" pill>Votre application</ui-badge></h3>
              <ul>
                @for (item of rule.you; track item) { <li>{{ item }}</li> }
              </ul>
            </div>
          </div>
        </section>
      }

      <h2 id="verifier">Vérifier</h2>
      <p>
        Parcourez vos écrans au clavier (Tab, Maj+Tab, flèches, Échap), affichez-les en niveaux de gris pour vérifier que
        rien ne repose sur la couleur, et contrôlez les contrastes de vos propres couleurs (par exemple avec le
        vérificateur de WebAIM). En développement, la librairie signale dans la console les champs sans libellé et
        les images de carte sans <code class="doc-inline-code">alt</code>.
      </p>
      <doc-code language="css" [code]="grayscale" />
      <p>Voir aussi : <a routerLink="/theming">jetons de couleur</a> · <a routerLink="/validation">validation des formulaires</a>.</p>
    </article>
  `,
  styles: `
    .rule { margin-top: var(--ui-space-6); padding: var(--ui-space-5); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); background: var(--ui-color-surface); }
    .rule__title { display: flex; align-items: center; gap: var(--ui-space-3); margin: 0 0 var(--ui-space-3) !important; font-size: var(--ui-font-size-lg) !important; }
    .rule__num { display: grid; place-items: center; flex: none; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: var(--ui-color-primary-subtle); color: var(--ui-color-primary-text); font-size: var(--ui-font-size-sm); }
    .rule__cols { display: grid; gap: var(--ui-space-5); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
    .rule__label { margin: 0 0 var(--ui-space-2); font-size: inherit; }
    ul { margin: 0; padding-left: 1.1rem; font-size: var(--ui-font-size-sm); line-height: 1.7; }
  `,
})
export default class AccessibilityPage {
  protected readonly grayscale = `/* Test rapide : toute la page en niveaux de gris (à coller dans les outils de développement) */
html { filter: grayscale(1); }`;

  protected readonly rules: Rule[] = [
    {
      id: 'couleur',
      title: 'Ne pas transmettre une information par la couleur seule',
      library: [
        'Erreur : bordure, icône ⓘ et message texte ; vérification asynchrone : bordure pointillée et texte ; succès : bordure et icône ✓.',
        'Onglet actif souligné, option de liste cochée (fond + coche), tri de tableau indiqué par une flèche, case et radio par une coche / un point.',
        'Champ obligatoire : astérisque visible et attribut required.',
      ],
      you: ['Gardez un libellé texte dans les badges et boutons colorés (ne vous fiez pas au seul ton success / danger).'],
    },
    {
      id: 'contraste',
      title: 'Contraste suffisant entre le texte et son arrière-plan',
      library: [
        'Tous les jetons de texte atteignent 4,5:1 sur tous les fonds, en light comme en dark (texte des boutons et badges pleins compris).',
        'Contours des champs, cases, radios et interrupteurs, et anneau de focus : au moins 3:1 (jeton --ui-color-border-control).',
        'Placeholders au même niveau de contraste que le texte d’aide.',
      ],
      you: ['Vérifiez les contrastes si vous créez un thème ou surchargez des jetons --ui-color-*.'],
    },
    {
      id: 'libelles',
      title: 'Étiqueter les champs de formulaire',
      library: [
        'Libellé visible relié au champ, aide et erreurs reliées par aria-describedby, groupes de radios dans un fieldset avec légende.',
        'Contours de champs toujours visibles ; zones cliquables de 44 px pour cases, radios et interrupteurs, 24 px minimum pour les petits boutons.',
        'Avertissement en développement si un champ n’a ni label ni ariaLabel.',
      ],
      you: ['Renseignez toujours label (ou ariaLabel) : un placeholder ne remplace pas un libellé.'],
    },
    {
      id: 'focus',
      title: 'Indicateurs de sélection (focus) visibles',
      library: [
        'Anneau de focus :focus-visible sur tous les éléments interactifs, jamais supprimé.',
        'Navigation clavier complète : Tab, flèches dans les onglets et radios, Échap et piège à focus dans le dialogue (natif).',
      ],
      you: ['Ne retirez pas les outlines dans vos styles ; testez vos écrans à la touche Tab.'],
    },
    {
      id: 'alt',
      title: 'Textes alternatifs pertinents',
      library: [
        'Icônes décoratives masquées (aria-hidden) ; boutons icône avec libellé accessible (fermer, effacer).',
        'Avertissement en développement pour une image uiCardMedia sans attribut alt.',
      ],
      you: ['Décrivez le contenu et le rôle de chaque image ; alt="" pour les images purement décoratives.'],
    },
    {
      id: 'titres',
      title: 'Balises de titre adaptées',
      library: ['Les composants ne génèrent pas de titres, sauf le titre du dialogue (h2, qui en est aussi le nom accessible).'],
      you: [
        'Utilisez h1 → h6 pour la structure et non pour le style : par exemple <h3 uiCardHeader> dans une section h2.',
        'Pour un titre seulement visuel, gardez un élément non-titre et stylez-le.',
      ],
    },
    {
      id: 'survol',
      title: 'Ne rien révéler uniquement au survol',
      library: [
        'Aucune action ni information n’apparaît au seul survol : le survol ne fait que renforcer un état déjà visible.',
        'Les actions secondaires (fermer, effacer) sont toujours affichées et accessibles au clavier et au toucher.',
      ],
      you: ['Évitez les boutons d’action qui n’apparaissent qu’au survol d’une ligne ou d’une carte.'],
    },
  ];
}
