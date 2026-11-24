import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { entryMatchesAccept, fileFamily, resolveFileResult, uiHttpFileSource, uiMemoryFileSource, validateFileName } from './file-source';

/** Valeur présente, sinon échec explicite du test. */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Élément attendu absent');
  return value;
}

const tree = () =>
  uiMemoryFileSource([
    { name: 'Photos', children: [{ name: 'lac.jpg', mimeType: 'image/jpeg', size: 2048 }, { name: 'Été', children: [] }] },
    { name: 'devis.pdf', mimeType: 'application/pdf', size: 10 },
  ]);

describe('file-source', () => {
  it('familles, filtre accept et noms valides', () => {
    expect(fileFamily({ kind: 'file', name: 'x.MP4' })).toBe('video');
    expect(fileFamily({ kind: 'file', name: 'x', mimeType: 'image/webp' })).toBe('image');
    expect(fileFamily({ kind: 'folder', name: 'x.jpg' })).toBe('folder');
    expect(entryMatchesAccept({ id: '1', kind: 'file', name: 'a.png' }, 'image/*,video/*')).toBe(true);
    expect(entryMatchesAccept({ id: '1', kind: 'file', name: 'a.pdf', mimeType: 'application/pdf' }, 'image/*')).toBe(false);
    expect(entryMatchesAccept({ id: '1', kind: 'folder', name: 'Docs' }, 'image/*')).toBe(true);
    expect(validateFileName('  ')).toBe('Le nom est obligatoire.');
    expect(validateFileName('../secret')).toContain('Caractères interdits');
    expect(validateFileName('..')).toBe('Nom réservé.');
    expect(validateFileName('Rapport 2026.pdf')).toBeNull();
  });

  it('mémoire : liste, chemin, création, renommage, doublons', async () => {
    const source = tree();
    const root = await resolveFileResult(source.list(null));
    expect(root.items.map((e) => e.name)).toEqual(['Photos', 'devis.pdf']);
    expect(root.path).toEqual([{ id: null, name: 'Racine' }]);
    const photos = root.items[0];
    const inside = await resolveFileResult(source.list(photos.id));
    expect(inside.path.map((p) => p.name)).toEqual(['Racine', 'Photos']);
    await expect(resolveFileResult(must(source.createFolder)(photos.id, 'été'))).rejects.toThrow('existe déjà');
    await expect(resolveFileResult(must(source.createFolder)(photos.id, 'a/b'))).rejects.toThrow('Caractères interdits');
    const created = await resolveFileResult(must(source.createFolder)(photos.id, 'Hiver'));
    expect(created.kind).toBe('folder');
    const renamed = await resolveFileResult(must(source.rename)(created, 'Hiver 2026'));
    expect(renamed.name).toBe('Hiver 2026');
  });

  it('mémoire : déplacement (jamais dans soi-même), suppression récursive, lecture seule', async () => {
    const source = tree();
    const [photos, pdf] = (await resolveFileResult(source.list(null))).items;
    const ete = must((await resolveFileResult(source.list(photos.id))).items.find((e) => e.name === 'Été'));
    await expect(resolveFileResult(must(source.move)([photos], ete.id))).rejects.toThrow('dans lui-même');
    await resolveFileResult(must(source.move)([pdf], ete.id));
    expect((await resolveFileResult(source.list(ete.id))).items.map((e) => e.name)).toEqual(['devis.pdf']);
    await resolveFileResult(must(source.remove)([photos]));
    expect((await resolveFileResult(source.list(null))).items).toEqual([]);
    await expect(resolveFileResult(source.list(ete.id))).rejects.toThrow('introuvable');
    const readonly = uiMemoryFileSource([], { readonly: true });
    expect(readonly.createFolder).toBeUndefined();
    expect(readonly.upload).toBeUndefined();
  });

  it('mémoire : envoi avec progression, nom unique', async () => {
    const source = tree();
    const file = new File(['x'], 'devis.pdf', { type: 'application/pdf' });
    const events = await firstValueFrom(must(source.upload)(null, file).pipe(toArray()));
    expect(events.filter((e) => typeof e === 'number')).toEqual([25, 50, 75, 100]);
    expect(events.at(-1)).toMatchObject({ kind: 'file', name: 'devis (2).pdf', mimeType: 'application/pdf' });
  });

  it('HTTP : points d’accès et progression de l’envoi', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const source = uiHttpFileSource(TestBed.inject(HttpClient), '/api/files/');
    const listing = resolveFileResult(source.list('f 1'));
    const req = http.expectOne((r) => r.url === '/api/files' && r.params.get('folder') === 'f 1');
    req.flush({ items: [], path: [{ id: null, name: 'Racine' }] });
    expect((await listing).path[0].name).toBe('Racine');
    const entry = { id: 'a/b', name: 'x', kind: 'file' as const };
    void resolveFileResult(must(source.rename)(entry, 'y'));
    expect(http.expectOne('/api/files/a%2Fb').request.body).toEqual({ name: 'y' });
    void resolveFileResult(must(source.move)([entry], 'dest'));
    expect(http.expectOne('/api/files/move').request.body).toEqual({ ids: ['a/b'], targetId: 'dest' });
    void resolveFileResult(must(source.remove)([entry]));
    expect(http.expectOne('/api/files/delete').request.body).toEqual({ ids: ['a/b'] });
    const events: unknown[] = [];
    must(source.upload)('dest', new File(['abc'], 'a.txt')).subscribe((e) => events.push(e));
    const upload = http.expectOne('/api/files/upload');
    expect((upload.request.body as FormData).get('folder')).toBe('dest');
    upload.event({ type: 1, loaded: 1, total: 4 });
    upload.flush({ id: 'n1', name: 'a.txt', kind: 'file' });
    expect(events).toEqual([0, 25, { id: 'n1', name: 'a.txt', kind: 'file' }]);
  });
});
