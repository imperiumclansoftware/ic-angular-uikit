import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiCard, UiCardHeader } from 'ic-angular-uikit';
import { CodeBlock } from '../shared/code-block';
import { COMPONENT_GROUPS, COMPONENT_SECTIONS } from '../shared/nav';

@Component({
  selector: 'doc-getting-started',
  imports: [RouterLink, CodeBlock, UiCard, UiCardHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="doc-page">
      <p class="doc-page__eyebrow">Guide</p>
      <h1 class="doc-page__title">Prise en main</h1>
      <p class="doc-page__lead">
        <strong>IC Angular UiKit</strong> (package <code class="doc-inline-code">ic-angular-uikit</code>) est une bibliothèque de composants Angular standalone, pilotés par signaux, entièrement
        personnalisables par projection de contenu et <code class="doc-inline-code">ng-template</code>,
        avec des thèmes <strong>light</strong> et <strong>dark</strong> basés sur des variables CSS.
      </p>
      <ul class="links">
        <li><strong>Paquet npm</strong> : <a href="https://www.npmjs.com/package/ic-angular-uikit">npmjs.com/package/ic-angular-uikit</a></li>
        <li><strong>Sources, anomalies, journal des versions</strong> : <a href="https://github.com/imperiumclansoftware/ic-angular-uikit">github.com/imperiumclansoftware/ic-angular-uikit</a></li>
        <li><strong>Prérequis</strong> : Angular 22.2 ou plus (<code class="doc-inline-code">&#64;angular/core</code>, <code class="doc-inline-code">common</code>, <code class="doc-inline-code">forms</code>), RxJS 7.8 — <strong>licence</strong> MIT</li>
      </ul>

      <h2 id="installation">1. Installation</h2>
      <doc-code language="sh" [code]="install" />

      <h2 id="styles">2. Styles et thèmes</h2>
      <p>Ajoutez la feuille de styles globale (jetons + thèmes) dans <code class="doc-inline-code">angular.json</code> :</p>
      <doc-code language="ts" filename="angular.json" [code]="styles" />

      <h2 id="configuration">3. Configuration</h2>
      <p>
        <code class="doc-inline-code">provideUiKit()</code> applique le thème dès le démarrage (préférence mémorisée ou
        <code class="doc-inline-code">prefers-color-scheme</code>).
      </p>
      <doc-code filename="app.config.ts" [code]="config" />

      <h2 id="usage">4. Utilisation</h2>
      <p>Chaque composant est standalone : importez uniquement ce dont vous avez besoin.</p>
      <doc-code filename="profile.ts" [code]="usage" />

      <h2 id="icons">5. Icônes (optionnel)</h2>
      <p>
        IC Angular UiKit n'impose aucune librairie d'icônes : installez celle(s) de votre choix, puis déclarez-les avec
        <code class="doc-inline-code">provideUiIcons()</code>. Elles s'utilisent ensuite partout avec
        <code class="doc-inline-code">préfixe:nom</code> : <code class="doc-inline-code">&lt;ui-icon name="fa:house" /&gt;</code>,
        <code class="doc-inline-code">&lt;button uiButton icon="material:add"&gt;</code>…
        Installez les polices depuis npm plutôt qu'un CDN : elles sont alors servies par votre application, ce
        qu'exige une CSP stricte (<code class="doc-inline-code">font-src 'self'</code>).
      </p>
      <doc-code language="sh" [code]="iconInstall" />
      <doc-code language="ts" filename="angular.json" [code]="iconStyles" />
      <doc-code filename="app.config.ts" [code]="iconConfig" />
      <p>Voir la page <a routerLink="/components/icon">Icon</a> pour les exemples dans les boutons, champs, cartes et onglets.</p>

      <h2 id="components">Composants</h2>
      @for (section of sections; track section.title) {
        <h3 class="category">{{ section.title }}</h3>
        <div class="grid">
          @for (item of section.items; track item.title) {
            <a class="grid__link" [routerLink]="item.link">
              <ui-card appearance="outlined" interactive>
                <h4 uiCardHeader class="grid__title">{{ item.title }}</h4>
                <p class="grid__desc">{{ summary(descriptionOf(item.link)) }}</p>
              </ui-card>
            </a>
          }
        </div>
      }
    </article>
  `,
  styles: `
    .links { margin: 0 0 var(--ui-space-6); padding-inline-start: var(--ui-space-5); line-height: 1.7; }
    .links a { color: var(--ui-color-primary-text); }
    .category { margin: var(--ui-space-6) 0 var(--ui-space-3); font-size: var(--ui-font-size-md); color: var(--ui-color-text-muted); }
    .grid { display: grid; gap: var(--ui-space-4); grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
    .grid__link { color: inherit; text-decoration: none; border-radius: var(--ui-radius-lg); }
    .grid__link:focus-visible { outline: 2px solid var(--ui-color-focus-ring); outline-offset: 2px; }
    .grid__link ui-card { height: 100%; }
    .grid__title { margin: 0; font-size: var(--ui-font-size-md); }
    .grid__desc { margin: 0; color: var(--ui-color-text-muted); font-size: var(--ui-font-size-sm); }
  `,
})
export default class GettingStartedPage {
  protected readonly sections = COMPONENT_SECTIONS;

  protected descriptionOf(link: string[]): string {
    return COMPONENT_GROUPS.find((g) => g.slug === link[1])?.description ?? '';
  }

  protected readonly install = `npm install ic-angular-uikit`;
  protected readonly styles = `"styles": [
  "node_modules/ic-angular-uikit/styles/ic-angular-uikit.css",
  "src/styles.css"
]`;
  protected readonly config = `import { ApplicationConfig } from '@angular/core';
import { provideUiKit } from 'ic-angular-uikit';

export const appConfig: ApplicationConfig = {
  providers: [
    provideUiKit({ defaultTheme: 'system' }),
  ],
};`;
  protected readonly usage = `import { Component, signal } from '@angular/core';
import { UiButton, UiCard, UiCardFooter, UiCardHeader, UiSwitch } from 'ic-angular-uikit';

@Component({
  selector: 'app-profile',
  imports: [UiButton, UiCard, UiCardHeader, UiCardFooter, UiSwitch],
  template: \`
    <ui-card>
      <h2 uiCardHeader>Notifications</h2>
      <ui-switch [(checked)]="enabled">Recevoir les e-mails</ui-switch>
      <footer uiCardFooter>
        <button uiButton variant="ghost">Annuler</button>
        <button uiButton (click)="save()">Enregistrer</button>
      </footer>
    </ui-card>
  \`,
})
export class Profile {
  protected readonly enabled = signal(true);
  protected save(): void { /* … */ }
}`;

  protected readonly iconInstall = `# Choisissez une ou plusieurs librairies
npm install @fortawesome/fontawesome-free     # Font Awesome (police)
npm install @fortawesome/free-solid-svg-icons # Font Awesome (SVG, à l'unité)
npm install material-symbols                  # Google Material Symbols
npm install bootstrap-icons                   # Bootstrap Icons
npm install lucide                            # Lucide (SVG, à l'unité)`;
  protected readonly iconStyles = `"styles": [
  "node_modules/ic-angular-uikit/styles/ic-angular-uikit.css",
  "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
  "node_modules/material-symbols/outlined.css",
  "node_modules/bootstrap-icons/font/bootstrap-icons.min.css",
  "src/styles.css"
]`;
  protected readonly iconConfig = `import { Bell, Search } from 'lucide';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import {
  bootstrapIcons, fontAwesomeFont, fontAwesomeSvg, lucideIcons,
  materialSymbols, provideUiIcons, svgIcons,
} from 'ic-angular-uikit';

export const appConfig: ApplicationConfig = {
  providers: [
    provideUiIcons(
      [
        fontAwesomeFont(),                   // fa:house  far:heart  fab:github
        materialSymbols({ style: 'outlined' }), // material:home
        bootstrapIcons(),                    // bi:house
        lucideIcons({ Bell, Search }),       // lucide:bell  lucide:search
        // ou : fontAwesomeSvg([faHouse])    // fa:house en SVG
        svgIcons({ logo: 'M12 2 2 22h20Z' }, 'app'), // app:logo
      ],
      { defaultSet: 'lucide' },              // name="search" = lucide:search
    ),
  ],
};`;

  protected summary(text: string): string {
    const first = text.split(/(?<=\.)\s/)[0] ?? '';
    return first.replace(/`/g, '');
  }
}
