import { Type } from '@angular/core';

export interface ApiMember {
  name: string;
  type?: string;
  default?: string;
  required?: boolean;
  description: string;
  deprecated?: string;
  signature?: string;
  /** Directive hôte qui fournit ce membre. */
  from?: string;
}

export interface ApiNamed {
  name: string;
  description: string;
}

export interface ApiEntry {
  name: string;
  kind: 'component' | 'directive' | 'service' | 'function';
  selector?: string;
  exportAs?: string;
  category?: string;
  description: string;
  file: string;
  signature?: string;
  slots: ApiNamed[];
  cssProperties: ApiNamed[];
  inputs: ApiMember[];
  outputs: ApiMember[];
  models: ApiMember[];
  properties: ApiMember[];
  methods: ApiMember[];
}

export interface ApiType {
  name: string;
  description: string;
  code: string;
}

export interface ApiGroup {
  slug: string;
  title: string;
  /** Catégorie du menu (tag JSDoc `@category` du composant principal). */
  category: string;
  description: string;
  entries: ApiEntry[];
  types: ApiType[];
}

export interface ExampleDef {
  id: string;
  title: string;
  description: string;
  file: string;
  component: Type<unknown>;
  source: string;
}

export interface BackendFile {
  file: string;
  name: string;
  language: 'ts' | 'php' | 'py' | 'sh' | 'html' | 'css' | 'text';
  code: string;
}

export interface BackendDoc {
  id: string;
  title: string;
  install?: string;
  notes?: string;
  files: BackendFile[];
}

export interface BackendDocs {
  intro: string;
  backends: BackendDoc[];
}

export interface TokenData {
  seasons: { mode: string; season: string; tokens: Record<string, string> }[];
  themes: string[];
  color: { name: string; values: Record<string, string> }[];
  base: { name: string; value: string }[];
}
