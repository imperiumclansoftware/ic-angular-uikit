# IC Angular UiKit

[![npm](https://img.shields.io/npm/v/ic-angular-uikit)](https://www.npmjs.com/package/ic-angular-uikit)
[![licence MIT](https://img.shields.io/npm/l/ic-angular-uikit)](https://github.com/imperiumclansoftware/ic-angular-uikit/blob/main/LICENSE)

Bibliothèque de composants **Angular 22** accessibles et thémables : composants standalone à base de signaux,
`OnPush`, templatisables (slots et `ng-template`), thèmes **clair**, **sombre** et **saisonniers**, compatible avec une
CSP stricte et Trusted Types.

- Plus de 25 composants : formulaires avec validation, tableaux (recherche, filtres, pagination), menus multi-niveaux, barre
  d'application, carrousel, tableau de bord personnalisable, organigramme…
- Accessibilité visée : **WCAG 2.1 AA** (contrastes vérifiés dans tous les thèmes, clavier complet, motifs ARIA).
- Thèmes par jetons CSS (`--ui-color-*`), applicables à toute la page ou à une seule zone.
- Icônes au choix : Font Awesome, Material Symbols, Bootstrap Icons, Lucide, SVG maison.
- Aucun `innerHTML`, aucune dépendance d'exécution hors Angular, RxJS et `tslib`.

## Prérequis

| Paquet | Version |
| --- | --- |
| `@angular/core`, `@angular/common`, `@angular/forms` | `^22.2.0` |
| `rxjs` | `~7.8.0` |

## Installation

```sh
npm install ic-angular-uikit
```

### 1. Styles

Ajoutez la feuille de styles globale (jetons + thèmes) dans `angular.json`, avant vos propres styles :

```json
"styles": [
  "node_modules/ic-angular-uikit/styles/ic-angular-uikit.css",
  "src/styles.css"
]
```

### 2. Configuration

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideUiKit } from 'ic-angular-uikit';

export const appConfig: ApplicationConfig = {
  providers: [
    provideUiKit({ defaultTheme: 'system' }), // 'light' | 'dark' | 'system' | 'season-light' | 'season-dark'
  ],
};
```

### 3. Utilisation

Chaque composant est standalone : importez-le là où vous l'utilisez.

```ts
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiCard, UiTextField } from 'ic-angular-uikit';

@Component({
  selector: 'app-newsletter',
  imports: [ReactiveFormsModule, UiCard, UiTextField, UiButton],
  template: `
    <ui-card>
      <ui-text-field label="E-mail" type="email" [formControl]="email" hint="Une lettre par mois." />
      <button uiButton icon="lucide:mail" [disabled]="email.invalid" (click)="sent.set(true)">S'inscrire</button>
    </ui-card>
  `,
})
export class Newsletter {
  protected readonly email = new FormControl('', [Validators.required, Validators.email]);
  protected readonly sent = signal(false);
}
```

## Composants

| Catégorie | Composants |
| --- | --- |
| Mise en page | `ui-layout` + `ui-sidebar` (colonnes, rail, tiroir mobile), `ui-app-bar`, `ui-jumbotron` |
| Actions | `uiButton` (7 variantes, icônes, chargement), `ui-toolbar` |
| Formulaires | `ui-text-field`, `ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio-group`, `ui-switch`, `ui-file-upload` |
| Navigation | `ui-menu` + `ui-submenu` (vertical / horizontal, multi-niveaux), `ui-tabs` (horizontaux / verticaux) |
| Affichage | `ui-badge`, `ui-card`, `ui-carousel`, `ui-dashboard`, `ui-icon`, `ui-org-chart`, `ui-ribbon`, `ui-table`, `ui-season-effects` |
| Retours & superpositions | `ui-alert`, `ui-dialog` |

Chaque composant documente ses inputs, outputs, slots, variables CSS et exemples dans le site de documentation
(voir plus bas).

## Thèmes

Thèmes fournis : `light`, `dark`, `season-light`, `season-dark` (couleurs selon la saison, animations facultatives avec
`<ui-season-effects />`). Le thème est porté par l'attribut `data-ui-theme` : sur `<html>` via `ThemeService`, ou sur
n'importe quel élément pour une seule zone.

```ts
import { ThemeService } from 'ic-angular-uikit';

inject(ThemeService).setTheme('dark'); // préférence mémorisée (désactivable : provideUiKit({ storageKey: null }))
```

Personnalisez les jetons (`--ui-color-primary`, `--ui-radius-md`…) dans vos styles, ou créez un thème en copiant
`styles/themes/dark.css` puis en le déclarant : `provideUiKit({ themes: ['light', 'dark', 'mon-theme'] })`.
Pour cibler tous les thèmes sombres : `[data-ui-theme$='dark']`.

## Icônes

Aucune librairie d'icônes n'est imposée. Installez celle de votre choix et déclarez-la :

```ts
import { provideUiIcons, fontAwesomeFont, lucideIcons } from 'ic-angular-uikit';
import { Mail, Search } from 'lucide';

provideUiIcons([fontAwesomeFont(), lucideIcons({ Mail, Search })], { defaultSet: 'lucide' });
```

```html
<ui-icon name="lucide:search" />
<button uiButton icon="fas:floppy-disk">Enregistrer</button>
```

Adaptateurs : `fontAwesomeFont`, `fontAwesomeSvg`, `materialSymbols`, `materialIcons`, `bootstrapIcons`, `lucideIcons`,
`svgIcons`, `fontIcons`. Installez les polices depuis npm plutôt qu'un CDN (compatible CSP `font-src 'self'`).

## Formulaires et validation

Les champs fonctionnent avec `[(value)]`, `formControl`, `formControlName` ou `ngModel`, et affichent eux-mêmes
erreurs, vérification asynchrone et succès. Messages personnalisables par champ (`[errorMessages]`), par validateur
(`{ clé: { message } }`) ou pour toute l'application :

```ts
provideUiValidation({ showErrorsWhen: 'touched', messages: { required: 'Ce champ est obligatoire.' } });
```

## Tableau de bord

`ui-dashboard` affiche des widgets déplaçables et redimensionnables (souris, tactile, clavier), à deux faces, avec une
colonne de personnalisation et un catalogue par catégories. Un widget est un composant Angular ordinaire :

```ts
@Component({
  imports: [UiWidgetFront, UiWidgetSettings, UiTextField],
  template: `
    <ng-template uiWidgetFront>{{ ctx.config().message }}</ng-template>
    <ng-template uiWidgetSettings>
      <ui-text-field label="Message" [value]="ctx.config().message" (valueChange)="ctx.updateConfig({ message: $event })" />
    </ng-template>
  `,
})
export class MessageWidget {
  protected readonly ctx = injectUiWidgetContext<{ message: string }>();
}
```

La disposition (`layoutChange`) est un JSON sérialisable à enregistrer côté serveur ; relisez-la avec
`sanitizeDashboardLayout()`. La documentation fournit des exemples serveur (Symfony, Node.js, PHP).

## Accessibilité

- Contrastes de texte ≥ 4,5:1 et contours de contrôles ≥ 3:1 dans chaque thème ; l'information n'est jamais portée
  par la couleur seule.
- Navigation clavier complète, focus visible, motifs ARIA (onglets, menus, barre d'outils, carrousel…).
- Animations désactivées avec `prefers-reduced-motion`.
- En développement, avertissements dans la console pour les champs sans libellé et les images sans `alt`.

## Sécurité

- Aucun `innerHTML` ni `bypassSecurityTrust*` : les SVG sont construits avec `Renderer2` et une liste blanche.
- Compatible avec une CSP stricte (`script-src 'self'`, `require-trusted-types-for 'script'`).
- `localStorage` utilisé uniquement pour la préférence de thème (désactivable).
- Les contrôles côté client (taille de fichier, disposition du tableau de bord…) sont un confort : revalidez toujours
  côté serveur.

## Documentation

Le site de documentation (exemples interactifs, API de chaque composant, guides thèmes, validation, accessibilité) est
dans le dépôt : <https://github.com/imperiumclansoftware/ic-angular-uikit>

```sh
git clone https://github.com/imperiumclansoftware/ic-angular-uikit.git
cd ic-angular-uikit && npm install && npm start   # http://localhost:4220
```

Questions et anomalies : <https://github.com/imperiumclansoftware/ic-angular-uikit/issues>

## Licence

[MIT](https://github.com/imperiumclansoftware/ic-angular-uikit/blob/main/LICENSE) © Imperium Clan Software
