import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiCell, UiTable, UiTableColumn, UiTableExportEvent, UiTablePage, UiTablePageSize, UiTableSort } from './table';

interface Row {
  name: string;
  age: number;
}

@Component({
  imports: [UiTable, UiCell],
  template: `
    <ui-table [data]="rows" [columns]="columns" [(sort)]="sort">
      <ng-template uiCell="name" [uiCellOf]="rows" let-row>[{{ row.name }}]</ng-template>
    </ui-table>
  `,
})
class Host {
  rows: Row[] = [
    { name: 'Bob', age: 40 },
    { name: 'alice', age: 9 },
    { name: 'Chloé', age: 25 },
  ];
  columns: UiTableColumn<Row>[] = [
    { key: 'name', header: 'Nom', sortable: true },
    { key: 'age', header: 'Âge', sortable: true },
  ];
  sort = signal<UiTableSort | null>(null);
}

describe('UiTable', () => {
  const firstColumn = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr td:first-child')).map((td) => td.textContent?.trim());

  it('rend les templates de cellule', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(firstColumn(fixture.nativeElement)).toEqual(['[Bob]', '[alice]', '[Chloé]']);
  });

  it('trie asc → desc → aucun et met à jour aria-sort', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const sortButton = el.querySelectorAll<HTMLButtonElement>('th button')[1];

    sortButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sort()).toEqual({ key: 'age', direction: 'asc' });
    expect(firstColumn(el)).toEqual(['[alice]', '[Chloé]', '[Bob]']);
    expect(el.querySelectorAll('th')[1].getAttribute('aria-sort')).toBe('ascending');

    sortButton.click();
    fixture.detectChanges();
    expect(firstColumn(el)).toEqual(['[Bob]', '[Chloé]', '[alice]']);

    sortButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sort()).toBeNull();
    expect(firstColumn(el)).toEqual(['[Bob]', '[alice]', '[Chloé]']);
  });
});


interface Person {
  name: string;
  role: string;
  active: boolean;
  projects: number;
  city: string;
  joined: string;
}

const PEOPLE: Person[] = [
  { name: 'Ada Lovelace', role: 'Admin', active: true, projects: 12, city: 'Londres', joined: '2024-02-10' },
  { name: 'Alan Turing', role: 'Éditeur', active: true, projects: 7, city: 'Manchester', joined: '2025-06-01' },
  { name: 'Grace Hopper', role: 'Éditeur', active: false, projects: 23, city: 'New York', joined: '2025-09-15' },
  { name: 'Élodie Martin', role: 'Lecteur', active: true, projects: 3, city: 'Paris', joined: '2026-01-20' },
];

@Component({
  imports: [UiTable],
  template: `
    <ui-table
      caption="Équipe"
      [data]="rows"
      [columns]="columns"
      searchable
      filterable
      columnToggle
      [manualFilter]="manual()"
      [(search)]="search"
      [(filters)]="filters"
      [(hiddenColumns)]="hidden"
    />
  `,
})
class FilterHost {
  rows = PEOPLE;
  manual = signal(false);
  search = signal('');
  filters = signal<Record<string, unknown>>({});
  hidden = signal<readonly string[] | null>(null);
  columns: UiTableColumn<Person>[] = [
    { key: 'name', header: 'Nom', filter: { type: 'text' }, hideable: false },
    { key: 'role', header: 'Rôle', filter: { type: 'select' } },
    { key: 'active', header: 'Actif', filter: { type: 'boolean' } },
    { key: 'projects', header: 'Projets', filter: { type: 'number' } },
    { key: 'city', header: 'Ville', hidden: true, filter: { type: 'text', operators: ['startsWith', 'endsWith', 'empty'] } },
    { key: 'joined', header: 'Arrivée', filter: { type: 'date' } },
  ];
}

describe('UiTable — recherche, filtres, colonnes', () => {
  function setup() {
    const fixture = TestBed.createComponent(FilterHost);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const names = () => Array.from(el.querySelectorAll('tbody td:first-child')).map((td) => td.textContent?.trim());
    const headers = () => Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    return { fixture, el, host: fixture.componentInstance, names, headers };
  }

  it('masque les colonnes « hidden » au départ, toggle via le menu', () => {
    const { fixture, el, host, headers } = setup();
    expect(headers()).toEqual(['Nom', 'Rôle', 'Actif', 'Projets', 'Arrivée']);
    (el.querySelector('.ui-table__columns-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const boxes = Array.from(el.querySelectorAll<HTMLInputElement>('.ui-table__columns-panel input'));
    expect(boxes[0].disabled).toBe(true); // hideable: false
    boxes[4].click(); // Ville
    boxes[2].click(); // Actif
    fixture.detectChanges();
    expect(host.hidden()).toEqual(['active']);
    expect(headers()).toEqual(['Nom', 'Rôle', 'Projets', 'Ville', 'Arrivée']);
  });

  it('recherche insensible aux accents, compteur et état vide avec réinitialisation', () => {
    const { fixture, el, host, names } = setup();
    host.search.set('elodie');
    fixture.detectChanges();
    expect(names()).toEqual(['Élodie Martin']);
    expect(el.querySelector('.ui-table__count')?.textContent).toContain('1 sur 4');
    host.search.set('zzz');
    fixture.detectChanges();
    expect(el.querySelector('.ui-table__empty')?.textContent).toContain('Aucune ligne ne correspond');
    (el.querySelector('.ui-table__empty button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.search()).toBe('');
    expect(names().length).toBe(4);
  });

  it('filtres select (options déduites), booléen et nombre se cumulent', () => {
    const { fixture, el, host, names } = setup();
    const roleSelect = el.querySelectorAll('.ui-table__filter select')[0] as HTMLSelectElement;
    expect(Array.from(roleSelect.options).map((o) => o.textContent?.trim())).toEqual(['Tous', 'Admin', 'Éditeur', 'Lecteur']);
    host.filters.set({ role: 'Éditeur' });
    fixture.detectChanges();
    expect(names()).toEqual(['Alan Turing', 'Grace Hopper']);
    host.filters.set({ role: 'Éditeur', active: true });
    fixture.detectChanges();
    expect(names()).toEqual(['Alan Turing']);
    host.filters.set({ projects: { min: 10 } });
    fixture.detectChanges();
    expect(names()).toEqual(['Ada Lovelace', 'Grace Hopper']);
  });

  it('saisie dans un filtre texte → modèle filters', () => {
    const { fixture, el, host, names } = setup();
    const input = el.querySelector('.ui-table__filter input') as HTMLInputElement;
    input.value = 'hop';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.filters()).toEqual({ name: 'hop' });
    expect(names()).toEqual(['Grace Hopper']);
  });

  /** Fenêtre de réglages d'une colonne (popover) et ses champs, par libellé visible. */
  function popover(el: HTMLElement, header: string) {
    const pop = Array.from(el.querySelectorAll<HTMLElement>('.ui-table__fpop')).find((p) => p.getAttribute('aria-label') === 'Réglages du filtre ' + header) as HTMLElement;
    const field = (label: string) => {
      const l = Array.from(pop.querySelectorAll('label')).find((x) => x.textContent?.trim() === label) as HTMLLabelElement;
      return pop.querySelector('#' + l.htmlFor) as HTMLInputElement & HTMLSelectElement;
    };
    return { pop, field };
  }

  it('date « entre » : un résumé sur la ligne, les deux dates dans la fenêtre de réglages', () => {
    const { fixture, el, host, names } = setup();
    const line = () => el.querySelectorAll('.ui-table__filter')[4].querySelector('.ui-table__fline') as HTMLElement; // Arrivée (ligne visible)
    expect(line().querySelectorAll('input[type=date]').length).toBe(0);
    expect(line().querySelector('.ui-table__fsummary')?.textContent?.trim()).toBe('Toutes les dates');
    const button = line().querySelector('.ui-table__fbtn') as HTMLButtonElement;
    const { pop, field } = popover(el, 'Arrivée');
    expect(button.getAttribute('popovertarget')).toBe(pop.id);
    expect(pop.getAttribute('popover')).toBe('auto');
    field('Du').value = '2025-01-01';
    field('Du').dispatchEvent(new Event('input'));
    field('Au').value = '2025-12-31';
    field('Au').dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.filters()['joined']).toEqual({ op: 'between', value: '2025-01-01', to: '2025-12-31' });
    expect(names()).toEqual(['Alan Turing', 'Grace Hopper']);
    expect(line().querySelector('.ui-table__fsummary')?.textContent).toContain('→');
  });

  it('la fenêtre est ancrée à la ligne du filtre (toujours présente), pas au bouton qui l’ouvre (régression)', () => {
    const { el } = setup();
    const line = el.querySelectorAll('.ui-table__filter')[4].querySelector('.ui-table__fline') as HTMLElement;
    const { pop } = popover(el, 'Arrivée');
    const anchor = line.style.getPropertyValue('anchor-name');
    expect(anchor).toMatch(/^--ui-table-\d+-joined$/);
    expect(pop.style.getPropertyValue('position-anchor')).toBe(anchor);
  });

  it('date à une seule valeur (le / avant / après) : un seul champ de date, directement sur la ligne', () => {
    const { fixture, el, host, names } = setup();
    host.filters.set({ joined: { op: 'before', value: '2025-07-01' } });
    fixture.detectChanges();
    const line = el.querySelectorAll('.ui-table__filter')[4].querySelector('.ui-table__fline') as HTMLElement;
    const dates = line.querySelectorAll<HTMLInputElement>('input[type=date]');
    expect(dates.length).toBe(1);
    expect(dates[0].value).toBe('2025-07-01');
    expect(names()).toEqual(['Ada Lovelace', 'Alan Turing']);
  });

  it('texte avancé : opérateurs restreints dans la fenêtre, symbole devant la valeur', () => {
    const { fixture, el, host, names } = setup();
    host.hidden.set([]);
    fixture.detectChanges();
    const { field } = popover(el, 'Ville');
    expect(Array.from(field('Condition').options).slice(1).map((o) => o.textContent?.trim())).toEqual(['Commence par', 'Finit par', 'Est vide']);
    host.filters.set({ city: { op: 'endsWith', value: 'ster' } });
    fixture.detectChanges();
    expect(names()).toEqual(['Alan Turing']);
    const cityLine = Array.from(el.querySelectorAll<HTMLElement>('.ui-table__filter')).find((c) => c.querySelector('[aria-label^="Filtrer Ville"]')) as HTMLElement;
    expect(cityLine.querySelector('.ui-table__op')?.textContent).toBe('…a');
    expect(cityLine.querySelector('.ui-table__fbtn')?.classList).toContain('ui-table__fbtn--custom');
  });

  it('opérateur choisi AVANT la saisie : conservé (régression)', () => {
    const { fixture, el, host, names } = setup();
    host.hidden.set([]);
    fixture.detectChanges();
    const select = popover(el, 'Ville').field('Condition');
    select.value = String(Array.from(select.options).findIndex((o) => o.textContent?.trim() === 'Finit par') - 1);
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(host.filters()['city']).toEqual({ op: 'endsWith', value: null });
    expect(names().length).toBe(4); // pas encore de valeur : ne filtre pas
    const input = el.querySelector('.ui-table__fline input[aria-label="Filtrer Ville (Finit par)"]') as HTMLInputElement;
    input.value = 'is';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.filters()['city']).toEqual({ op: 'endsWith', value: 'is' });
    expect(names()).toEqual(['Élodie Martin']);
  });

  it('manualFilter : émet sans filtrer localement', () => {
    const { fixture, host, names } = setup();
    host.manual.set(true);
    host.search.set('ada');
    fixture.detectChanges();
    expect(names().length).toBe(4);
  });
});

interface Item {
  id: number;
  label: string;
}

const ITEMS: Item[] = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, label: `Élément ${i + 1}` }));

@Component({
  imports: [UiTable],
  template: `
    <ui-table
      [data]="items()"
      [columns]="columns"
      paginated
      reorderable
      columnToggle
      searchable
      [manualPagination]="manual()"
      [totalItems]="total()"
      [(page)]="page"
      [(pageSize)]="pageSize"
      [(columnOrder)]="order"
      (paginationChange)="events.push($event)"
    />
  `,
})
class PagedHost {
  items = signal<Item[]>(ITEMS);
  columns: UiTableColumn<Item>[] = [
    { key: 'id', header: 'N°', sortable: true },
    { key: 'label', header: 'Libellé' },
  ];
  page = signal(1);
  pageSize = signal<UiTablePageSize>(10);
  order = signal<readonly string[] | null>(null);
  manual = signal(false);
  total = signal<number | null>(null);
  events: UiTablePage[] = [];
}

describe('UiTable — pagination et ordre des colonnes', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(PagedHost);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, host: fixture.componentInstance };
  };
  const ids = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr td:first-child')).map((td) => td.textContent?.trim());
  const headers = (el: HTMLElement) => Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
  const button = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) as HTMLButtonElement;
  const range = (el: HTMLElement) => el.querySelector('.ui-table__prange')?.textContent?.trim();

  it('découpe en pages, navigation et bornes', () => {
    const { fixture, el, host } = setup();
    expect(ids(el)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(range(el)).toBe('1–10 sur 23');
    expect(button(el, 'Page précédente').disabled).toBe(true);
    expect(button(el, 'Page 1').getAttribute('aria-current')).toBe('page');

    button(el, 'Page suivante').click();
    fixture.detectChanges();
    expect(host.page()).toBe(2);
    expect(ids(el)[0]).toBe('11');

    button(el, 'Dernière page').click();
    fixture.detectChanges();
    expect(ids(el)).toEqual(['21', '22', '23']);
    expect(range(el)).toBe('21–23 sur 23');
    expect(button(el, 'Page suivante').disabled).toBe(true);
    expect(host.events.at(-1)).toEqual({ page: 3, pageSize: 10 });
  });

  it('taille de page : garde la première ligne visible ; page hors bornes ramenée', () => {
    const { fixture, el, host } = setup();
    host.page.set(3);
    fixture.detectChanges();
    (fixture.debugElement.query((d) => d.componentInstance instanceof UiTable).componentInstance as UiTable<Item>).setPageSize(5);
    fixture.detectChanges();
    expect(host.pageSize()).toBe(5);
    expect(host.page()).toBe(5); // ligne 21 → page 5 de 5 lignes
    expect(ids(el)[0]).toBe('21');

    host.page.set(99);
    fixture.detectChanges();
    expect(range(el)).toBe('21–23 sur 23');
  });

  it('ellipses dans la liste des pages', () => {
    const { fixture, el, host } = setup();
    host.items.set(Array.from({ length: 200 }, (_, i) => ({ id: i + 1, label: '' })));
    host.page.set(10);
    fixture.detectChanges();
    const items = Array.from(el.querySelectorAll('.ui-table__pages > .ui-table__page:not(.ui-table__page--nav), .ui-table__gap')).map((n) => n.textContent?.trim());
    expect(items).toEqual(['1', '…', '9', '10', '11', '…', '20']);
  });

  it('revient à la page 1 quand la recherche change', () => {
    const { fixture, el, host } = setup();
    host.page.set(3);
    fixture.detectChanges();
    const search = el.querySelector<HTMLInputElement>('.ui-table__search input') as HTMLInputElement;
    search.value = '1';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.detectChanges();
    expect(host.page()).toBe(1);
    expect(range(el)).toBe('1–10 sur 12'); // 1, 10…19, 21
  });

  it('manualPagination : affiche data telle quelle, total depuis totalItems', () => {
    const { fixture, el, host } = setup();
    host.manual.set(true);
    host.items.set(ITEMS.slice(10, 20));
    host.total.set(230);
    host.page.set(2);
    fixture.detectChanges();
    expect(ids(el)[0]).toBe('11');
    expect(range(el)).toBe('11–20 sur 230');
    expect(button(el, 'Page 23')).toBeTruthy();
  });

  it('réordonne via Monter / Descendre, réinitialise l’ordre', () => {
    const { fixture, el, host } = setup();
    expect(headers(el)).toEqual(['N°', 'Libellé']);
    el.querySelector<HTMLButtonElement>('.ui-table__columns-button')?.click();
    fixture.detectChanges();
    expect(button(el, 'Monter N°').disabled).toBe(true);
    button(el, 'Monter Libellé').click();
    fixture.detectChanges();
    expect(host.order()).toEqual(['label', 'id']);
    expect(headers(el)).toEqual(['Libellé', 'N°']);
    expect(el.querySelector('.ui-table__sr')?.textContent).toContain('Libellé : position 1 sur 2');

    el.querySelector<HTMLButtonElement>('.ui-table__col-reset')?.click();
    fixture.detectChanges();
    expect(host.order()).toBeNull();
    expect(headers(el)).toEqual(['N°', 'Libellé']);
  });

  it('réordonne par glisser-déposer des en-têtes ; ordre partiel complété', () => {
    const { fixture, el, host } = setup();
    const th = el.querySelectorAll('thead th');
    const drag = (target: Element, type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { setData: () => undefined, effectAllowed: '', dropEffect: '' } });
      target.dispatchEvent(event);
    };
    drag(th[0], 'dragstart');
    drag(th[1], 'dragover');
    drag(th[1], 'drop');
    fixture.detectChanges();
    expect(headers(el)).toEqual(['Libellé', 'N°']);

    host.order.set(['label', 'inconnue']);
    fixture.detectChanges();
    expect(headers(el)).toEqual(['Libellé', 'N°']);
  });

  describe('export', () => {
    interface Item {
      id: number;
      name: string;
      price: number;
    }
    @Component({
      imports: [UiTable],
      template: `
        <ui-table
          caption="Produits"
          [exportable]="exportable()"
          [exportFormats]="formats"
          [data]="items"
          [columns]="columns"
          [hiddenColumns]="hidden()"
          [columnOrder]="['price']"
          [search]="search()"
          [sort]="{ key: 'price', direction: 'desc' }"
          searchable
          paginated
          [pageSize]="2"
          (exportRequest)="onExport($event)"
        />
      `,
    })
    class ExportHost {
      exportable = signal(true);
      formats: ('csv' | 'xlsx' | 'json')[] = ['csv', 'json'];
      search = signal('');
      hidden = signal<string[] | null>(null);
      prevent = false;
      events: UiTableExportEvent<Item>[] = [];
      items: Item[] = [
        { id: 1, name: 'Pomme', price: 2.5 },
        { id: 2, name: 'Poire', price: 3 },
        { id: 3, name: 'Prune', price: 1.2 },
        { id: 4, name: 'Kiwi', price: 4 },
      ];
      columns: UiTableColumn<Item>[] = [
        { key: 'id', header: 'Id' },
        { key: 'name', header: 'Nom', exportValue: (i) => i.name.toUpperCase() },
        { key: 'price', header: 'Prix', sortable: true },
        { key: 'actions', header: 'Actions', exportable: false },
      ];
      onExport(event: UiTableExportEvent<Item>): void {
        this.events.push(event);
        if (this.prevent) event.preventDefault();
      }
    }

    async function setup() {
      const fixture = TestBed.createComponent(ExportHost);
      document.body.appendChild(fixture.nativeElement);
      const render = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
      };
      await render();
      const blobs: Blob[] = [];
      const names: string[] = [];
      (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => {
        blobs.push(b);
        return 'blob:test';
      };
      (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        names.push(this.download);
      });
      const el: HTMLElement = fixture.nativeElement;
      const button = () => el.querySelector('.ui-table__export-button') as HTMLButtonElement | null;
      return { fixture, el, host: fixture.componentInstance, render, blobs, names, click, button };
    }

    afterEach(() => {
      vi.restoreAllMocks();
      document.querySelectorAll('body > div[ng-version], body > [id^="root"]').forEach((n) => n.remove());
    });

    it('bouton activable, menu des formats, choix des lignes avec la pagination', async () => {
      const { el, host, render, button } = await setup();
      expect(button()?.textContent).toContain('Exporter');
      expect(button()?.getAttribute('aria-expanded')).toBe('false');
      button()?.click();
      await render();
      const panel = el.querySelector('.ui-table__export-panel') as HTMLElement;
      expect(panel.getAttribute('role')).toBe('group');
      expect([...panel.querySelectorAll('.ui-table__export-format')].map((b) => b.textContent?.trim())).toEqual(['CSV', 'JSON']);
      expect([...panel.querySelectorAll('label')].map((l) => l.textContent?.trim())).toEqual(['Toutes (4)', 'Page affichée (2)']);
      // Échap ferme et rend le focus au bouton.
      panel.querySelector('button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await render();
      expect(el.querySelector('.ui-table__export-panel')).toBeNull();
      expect(document.activeElement).toBe(button());
      host.exportable.set(false);
      await render();
      expect(button()).toBeNull();
    });

    it('exporte ce qui est affiché : tri, recherche, colonnes visibles et ordre, exportValue, exportable:false', async () => {
      const { el, host, render, blobs, names, button } = await setup();
      button()?.click();
      await render();
      (el.querySelector('[data-format="csv"]') as HTMLButtonElement).click();
      await render();
      expect(names[0]).toMatch(/^Produits-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(blobs[0].type).toBe('text/csv;charset=utf-8');
      const csv = await blobs[0].text();
      expect(csv.replace('\uFEFF', '').split('\r\n')).toEqual(['Prix;Id;Nom', '4;4;KIWI', '3;2;POIRE', '2,5;1;POMME', '1,2;3;PRUNE', '']);
      expect(el.querySelector('.ui-table__export-panel')).toBeNull();
      expect(el.querySelector('[aria-live="polite"].ui-table__sr')?.textContent).toContain('Export CSV : 4 lignes, 3 colonnes.');
      expect(host.events[0]).toMatchObject({ format: 'csv', scope: 'all', state: { search: '', page: 1, pageSize: 2 } });

      // Page affichée seulement, puis colonne masquée et recherche.
      button()?.click();
      await render();
      (el.querySelector('input[value="page"]') as HTMLInputElement).click();
      await render();
      (el.querySelector('[data-format="json"]') as HTMLButtonElement).click();
      await render();
      expect(JSON.parse(await blobs[1].text())).toEqual([
        { price: 4, id: 4, name: 'KIWI' },
        { price: 3, id: 2, name: 'POIRE' },
      ]);
      host.hidden.set(['id']);
      host.search.set('pr');
      await render();
      button()?.click();
      await render();
      expect(el.querySelector('.ui-table__export-scope')).toBeNull(); // une seule page : pas de choix
      (el.querySelector('[data-format="csv"]') as HTMLButtonElement).click();
      await render();
      expect((await blobs[2].text()).replace('\uFEFF', '')).toBe('Prix;Nom\r\n1,2;PRUNE\r\n');
    });

    it('preventDefault() annule le téléchargement ; bouton désactivé sans ligne', async () => {
      const { el, host, render, blobs, button } = await setup();
      host.prevent = true;
      button()?.click();
      await render();
      (el.querySelector('[data-format="csv"]') as HTMLButtonElement).click();
      await render();
      expect(host.events).toHaveLength(1);
      expect(host.events[0].rows.map((r) => r.id)).toEqual([4, 2, 1, 3]);
      expect(blobs).toHaveLength(0);
      host.search.set('introuvable');
      await render();
      expect(button()?.disabled).toBe(true);
    });
  });
});
