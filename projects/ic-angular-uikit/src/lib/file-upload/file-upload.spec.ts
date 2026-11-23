import { HttpEventType } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { UiFileRejection, UiFileUpload, UiFileUploader } from './file-upload';
import { describeAccept, formatFileSize, matchesAccept, parseFileSize } from './file-utils';

const file = (name: string, size: number, type = '') => new File([new Uint8Array(size)], name, { type });

describe('file-utils', () => {
  it('convertit et affiche les tailles', () => {
    expect(parseFileSize('5 Mo')).toBe(5 * 1024 ** 2);
    expect(parseFileSize('500KB')).toBe(500 * 1024);
    expect(parseFileSize('1,5 Go')).toBe(1.5 * 1024 ** 3);
    expect(parseFileSize(2048)).toBe(2048);
    expect(parseFileSize('abc')).toBeUndefined();
    expect(formatFileSize(1536).replace(/\s/g, ' ')).toBe('1,5 Ko');
    expect(formatFileSize(12)).toBe('12 o');
  });

  it('vérifie accept (extensions, MIME, familles) et le décrit', () => {
    expect(matchesAccept(file('a.PDF', 1), '.pdf')).toBe(true);
    expect(matchesAccept(file('a.png', 1, 'image/png'), 'image/*')).toBe(true);
    expect(matchesAccept(file('a.txt', 1, 'text/plain'), 'image/*,.pdf')).toBe(false);
    expect(matchesAccept(file('a.bin', 1), '')).toBe(true);
    expect(describeAccept('image/*,.pdf,application/vnd.ms-excel')).toBe('images, PDF ou EXCEL');
  });
});

@Component({
  imports: [UiFileUpload, ReactiveFormsModule],
  template: `
    <ui-file-upload
      id="multi"
      label="Pièces jointes"
      accept="image/*,.pdf"
      [maxFiles]="3"
      maxFileSize="1 Ko"
      maxTotalSize="2 Ko"
      [upload]="uploader()"
      [(files)]="files"
      (rejected)="rejections = $event"
    />
    <ui-file-upload id="single" label="CV" mode="field" accept=".pdf" [formControl]="cv" />
  `,
})
class Host {
  files = signal<File[]>([]);
  rejections: UiFileRejection[] = [];
  cv = new FormControl<File[]>([], { nonNullable: true, validators: [Validators.required] });
  progress = new Subject<number>();
  uploader = signal<UiFileUploader | undefined>(undefined);
}

describe('UiFileUpload', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const comp = (id: string) => fixture.debugElement.query((d) => d.nativeElement.id === id).componentInstance as UiFileUpload;
    return { fixture, el, host: fixture.componentInstance, multi: comp('multi'), single: comp('single') };
  }

  it('accepte les fichiers valides et refuse type, taille, nombre et taille totale', () => {
    const { fixture, host, multi, el } = setup();
    multi.addFiles([
      file('a.png', 500, 'image/png'),
      file('b.txt', 10, 'text/plain'),
      file('c.pdf', 2000, 'application/pdf'),
      file('d.pdf', 900, 'application/pdf'),
      file('e.pdf', 700, 'application/pdf'),
    ]);
    fixture.detectChanges();
    expect(host.files().map((f) => f.name)).toEqual(['a.png', 'd.pdf']);
    expect(host.rejections.map((r) => `${r.file.name}:${r.reason}`)).toEqual(['b.txt:fileType', 'c.pdf:maxFileSize', 'e.pdf:maxTotalSize']);
    expect(el.querySelector('#multi .ui-file-upload__rejections')?.textContent).toContain('type de fichier non autorisé');
    expect(el.querySelectorAll('#multi .ui-file-upload__item').length).toBe(2);
  });

  it('respecte maxFiles puis signale la limite atteinte', () => {
    const { fixture, host, multi, el } = setup();
    multi.addFiles([file('1.pdf', 10), file('2.pdf', 10), file('3.pdf', 10), file('4.pdf', 10)]);
    fixture.detectChanges();
    expect(host.files().length).toBe(3);
    expect(host.rejections[0].reason).toBe('maxFiles');
    expect(el.querySelector('#multi .ui-file-upload__zone')?.textContent).toContain('Limite de 3 fichiers atteinte');
    expect((el.querySelector('#multi input[type=file]') as HTMLInputElement).disabled).toBe(true);
  });

  it('mode simple : un nouveau fichier remplace le précédent, lié au FormControl (required)', () => {
    const { fixture, host, single } = setup();
    expect(host.cv.hasError('required')).toBe(true);
    single.addFiles([file('cv1.pdf', 10)]);
    single.addFiles([file('cv2.pdf', 10)]);
    fixture.detectChanges();
    expect(host.cv.value.map((f) => f.name)).toEqual(['cv2.pdf']);
    expect(host.cv.valid).toBe(true);
    single.clear();
    expect(host.cv.hasError('required')).toBe(true);
  });

  it('suit la progression d’envoi (pourcentages ou événements HttpClient) et l’échec', () => {
    const { fixture, host, multi, el } = setup();
    const http = new Subject<{ type: HttpEventType; loaded?: number; total?: number; body?: unknown }>();
    let call = 0;
    host.uploader.set(() => (call++ === 0 ? host.progress : (http as never)));
    fixture.detectChanges();
    const uploaded: string[] = [];
    multi.uploaded.subscribe((u) => uploaded.push(u.file.name));
    multi.addFiles([file('a.pdf', 10), file('b.pdf', 10)]);
    host.progress.next(40);
    http.next({ type: HttpEventType.UploadProgress, loaded: 5, total: 10 });
    fixture.detectChanges();
    expect(multi.items().map((i) => `${i.status}:${i.progress}`)).toEqual(['uploading:40', 'uploading:50']);
    expect(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('40');
    host.progress.complete();
    http.error(new Error('500'));
    fixture.detectChanges();
    expect(multi.items().map((i) => i.status)).toEqual(['done', 'error']);
    expect(uploaded).toEqual(['a.pdf']);
  });
});
