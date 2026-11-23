import { Component } from '@angular/core';
import { UiButton, UiCard, UiCardFooter, UiCardHeader, UiCardMedia, UiIcon } from 'ic-angular-uikit';

/**
 * Dans les cartes
 * Dans une carte, placez `<ui-icon>` où vous voulez : en-tête, média (icône grand format), pied. L'icône prend la couleur et la taille du texte qui l'entoure.
 * @order 3
 */
@Component({
  selector: 'doc-icon-cards-example',
  imports: [UiCard, UiCardHeader, UiCardMedia, UiCardFooter, UiIcon, UiButton],
  template: `
    <div class="ex-grid">
      @for (feature of features; track feature.title) {
        <ui-card appearance="outlined">
          <div uiCardMedia class="media" [style.color]="feature.color">
            <ui-icon [name]="feature.icon" size="3x" />
          </div>
          <h4 uiCardHeader class="title"><ui-icon [name]="feature.small" /> {{ feature.title }}</h4>
          <p>{{ feature.text }}</p>
          <footer uiCardFooter>
            <button uiButton variant="ghost" size="sm" iconEnd="lucide:arrow-right">En savoir plus</button>
          </footer>
        </ui-card>
      }
    </div>
  `,
  styles: `
    .media { display: grid; place-items: center; height: 6rem; background: var(--ui-color-surface-sunken); }
    .title { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1rem; }
    p { margin: 0; color: var(--ui-color-text-muted); font-size: 0.875rem; }
  `,
})
export class IconCardsExample {
  protected readonly features = [
    { title: 'Sécurité', icon: 'material:shield_lock', small: 'lucide:lock', color: 'var(--ui-color-primary-text)', text: 'Chiffrement de bout en bout et double authentification.' },
    { title: 'Synchronisation', icon: 'fa:arrows-rotate', small: 'lucide:upload', color: 'var(--ui-color-success-text)', text: 'Vos données à jour sur tous vos appareils.' },
    { title: 'Communauté', icon: 'bi:people-fill', small: 'lucide:heart', color: 'var(--ui-color-danger-text)', text: 'Des milliers d’utilisateurs partagent leurs modèles.' },
  ];
}
