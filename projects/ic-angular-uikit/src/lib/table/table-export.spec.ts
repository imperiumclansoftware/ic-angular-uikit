import { columnLetter, crc32, neutralizeFormula, tableExportFilename, tableToCsv, tableToJson, tableToXlsx, zipStore } from './table-export';

const DATA = {
  headers: ['Nom', 'Montant', 'Date', 'Payé', 'Note'],
  keys: ['name', 'amount', 'date', 'paid', 'note'],
  rows: [
    ['Ada; Lovelace', 1234.5, new Date(2026, 10, 23), true, 'dit "bonjour"\nligne 2'],
    ['=HYPERLINK("http://x")', -3, new Date(2026, 10, 23, 14, 5, 9), false, null],
    ['+33 Services', 0, 'pas une date', undefined, ['a', 'b']],
  ],
};

/** Lit les entrées d'une archive ZIP « stored » (vérifie aussi les CRC). */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const crc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const data = bytes.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size);
    expect(crc32(data)).toBe(crc);
    files.set(name, new TextDecoder().decode(data));
    offset += 30 + nameLength + size;
  }
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  expect(view.getUint16(end + 10, true)).toBe(files.size);
  expect(view.getUint32(end + 16, true)).toBe(offset);
  return files;
}

describe('table-export', () => {
  it('CSV : BOM, séparateur ;, décimales à virgule, guillemets, dates, booléens', () => {
    const csv = tableToCsv(DATA);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Nom;Montant;Date;Payé;Note');
    expect(lines[1]).toBe('"Ada; Lovelace";1234,5;2026-11-23;Oui;"dit ""bonjour""\nligne 2"');
    expect(csv).toContain('-3;2026-11-23 14:05:09;Non;');
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(tableToCsv(DATA, { csvSeparator: ',', bom: false, booleanLabels: ['true', 'false'] }).split('\r\n')[1]).toBe(
      'Ada; Lovelace,1234.5,2026-11-23,true,"dit ""bonjour""\nligne 2"',
    );
  });

  it('CSV : neutralise l’injection de formules (textes seulement, pas les nombres)', () => {
    const csv = tableToCsv(DATA);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain("'+33 Services;0;pas une date;;a, b");
    expect(neutralizeFormula('@SUM(1)')).toBe("'@SUM(1)");
    expect(neutralizeFormula('\t=1')).toBe("'\t=1");
    expect(neutralizeFormula('Bonjour = salut')).toBe('Bonjour = salut');
    expect(tableToCsv({ headers: ['=1+1'], keys: ['a'], rows: [] }, { bom: false })).toBe("'=1+1\r\n");
  });

  it('JSON : objets par clé, jour AAAA-MM-JJ ou ISO complet, valeurs vides à null', () => {
    const json = JSON.parse(tableToJson(DATA));
    expect(json).toHaveLength(3);
    expect(json[0]).toEqual({ name: 'Ada; Lovelace', amount: 1234.5, date: '2026-11-23', paid: true, note: 'dit "bonjour"\nligne 2' });
    expect(json[1].date).toBe(new Date(2026, 10, 23, 14, 5, 9).toISOString());
    expect(json[2]).toEqual({ name: '+33 Services', amount: 0, date: 'pas une date', paid: null, note: 'a, b' });
  });

  it('XLSX : archive valide, cellules typées, texte jamais interprété comme formule', () => {
    const files = unzip(tableToXlsx(DATA, { sheetName: 'Commandes [2026]' }));
    expect([...files.keys()]).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']);
    expect(files.get('xl/workbook.xml')).toContain('<sheet name="Commandes  2026" sheetId="1" r:id="rId1"/>');
    const sheet = files.get('xl/worksheets/sheet1.xml') ?? '';
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Nom</t></is></c>');
    expect(sheet).toContain('<c r="B2"><v>1234.5</v></c>');
    expect(sheet).toContain('<c r="C2" s="2"><v>46349</v></c>');
    expect(sheet).toMatch(/<c r="C3" s="3"><v>46349\.5869\d*</);
    expect(sheet).toContain('<c r="D2" t="b"><v>1</v></c>');
    expect(sheet).toContain('dit &quot;bonjour&quot;\nligne 2');
    expect(sheet).toContain('<t xml:space="preserve">=HYPERLINK(&quot;http://x&quot;)</t>');
    expect(sheet).not.toContain('<f>');
    expect(sheet).toContain('<autoFilter ref="A1:E4"/>');
    expect(sheet).toContain('state="frozen"');
  });

  it('XLSX : caractères de contrôle retirés, archive vide valide', () => {
    const sheet = unzip(tableToXlsx({ headers: ['A'], keys: ['a'], rows: [['x\u0001y\u0000z']] })).get('xl/worksheets/sheet1.xml');
    expect(sheet).toContain('>xyz<');
    expect(unzip(zipStore([])).size).toBe(0);
  });

  it('utilitaires : lettres de colonne, CRC-32, nom de fichier sûr', () => {
    expect([0, 25, 26, 51, 701, 702].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AZ', 'ZZ', 'AAA']);
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const day = new Date(2026, 10, 3);
    expect(tableExportFilename('Commandes clients', 'csv', day)).toBe('Commandes-clients-2026-11-03.csv');
    expect(tableExportFilename('../../etc/passwd', 'json', day)).toBe('etc-passwd-2026-11-03.json');
    expect(tableExportFilename('', 'xlsx', day)).toBe('export-2026-11-03.xlsx');
  });
});
