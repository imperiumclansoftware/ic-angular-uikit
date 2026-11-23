import { Component } from '@angular/core';
import {
  UiBadge,
  UiButton,
  UiIcon,
  UiJumbotron,
  UiJumbotronActions,
  UiJumbotronEyebrow,
  UiJumbotronMedia,
  UiJumbotronTitle,
} from 'ic-angular-uikit';

/**
 * Illustration à côté, contenu riche
 * Avec `uiJumbotronMedia`, l'illustration passe à côté du texte quand le composant fait au moins 48rem de large (règle sur sa propre largeur, pas sur l'écran), et dessous sinon ; `mediaPosition="start"` la place avant. Titre riche via `uiJumbotronTitle`, surtitre riche via `uiJumbotronEyebrow`, et contenu libre (liste d'arguments) dans le slot par défaut.
 * @order 2
 */
@Component({
  selector: 'doc-jumbotron-split-example',
  imports: [UiJumbotron, UiJumbotronTitle, UiJumbotronEyebrow, UiJumbotronActions, UiJumbotronMedia, UiButton, UiBadge, UiIcon],
  template: `
    <ui-jumbotron class="demo" tone="surface">
      <p uiJumbotronEyebrow><ui-badge tone="success" appearance="solid" pill>Gratuit 30 jours</ui-badge></p>
      <h4 uiJumbotronTitle>Pilotez votre activité <span class="accent">en temps réel</span></h4>
      <p class="lead">Tableaux de bord, alertes et rapports partagés : toute l'équipe voit les mêmes chiffres, au même moment.</p>
      <ul class="points">
        <li><ui-icon name="lucide:check" /> Connexion à vos outils en quelques minutes</li>
        <li><ui-icon name="lucide:check" /> Données hébergées en France</li>
        <li><ui-icon name="lucide:check" /> Sans engagement</li>
      </ul>
      <div uiJumbotronActions>
        <button uiButton size="lg">Essayer gratuitement</button>
        <button uiButton size="lg" variant="ghost" iconEnd="lucide:arrow-right">Voir les tarifs</button>
      </div>
      <img uiJumbotronMedia src="demo/dashboard.svg" width="640" height="440" alt="Aperçu du tableau de bord : indicateurs clés et histogramme des ventes" />
    </ui-jumbotron>
  `,
  styles: `
    .demo { --ui-jumbotron-radius: var(--ui-radius-lg); border: 1px solid var(--ui-color-border); }
    .accent { color: var(--ui-color-primary-text); }
    .lead { margin: 0; color: var(--ui-color-text-muted); font-size: 1.15rem; line-height: 1.55; }
    .points { display: grid; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
    .points li { display: flex; align-items: center; gap: 0.5rem; }
    .points ui-icon { color: var(--ui-color-success-text); }
  `,
})
export class JumbotronSplitExample {}
