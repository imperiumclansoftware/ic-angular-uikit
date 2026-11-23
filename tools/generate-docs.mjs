// Génère les données du site de documentation à partir des sources de la librairie :
//  - API des composants / directives / services (inputs, outputs, models, méthodes, slots, variables CSS, types)
//  - exemples (classe + source) de projects/docs/src/app/examples
//  - jetons des thèmes (projects/ic-angular-uikit/src/styles)
// Usage : node tools/generate-docs.mjs [--watch]
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, watch, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = join(root, 'projects/ic-angular-uikit/src/lib');
const stylesDir = join(root, 'projects/ic-angular-uikit/src/styles');
const examplesDir = join(root, 'projects/docs/src/app/examples');
const outDir = join(root, 'projects/docs/src/app/generated');
const backendsDir = join(root, 'projects/docs/src/backend-examples');

const SIGNAL_APIS = new Set(['input', 'input.required', 'model', 'model.required', 'output', 'outputFromObservable']);
const HIDDEN_METHODS = new Set(['writeValue', 'registerOnChange', 'registerOnTouched', 'setDisabledState', 'ngTemplateContextGuard']);
const TYPE_FLAGS = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

function walk(dir, filter) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, filter) : filter(path) ? [path] : [];
  });
}

const titleCase = (slug) => slug.split('-').map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const docText = (symbol, checker) => (symbol ? ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim() : '');
const tagText = (tag) => ts.displayPartsToString(tag.text ?? []).trim();
const tags = (symbol, name) => (symbol?.getJsDocTags() ?? []).filter((t) => t.name === name).map(tagText);
const hasTag = (symbol, name) => (symbol?.getJsDocTags() ?? []).some((t) => t.name === name);

function splitNameDesc(text) {
  const match = /^(\S+)\s+-\s+([\s\S]*)$/.exec(text);
  return match ? { name: match[1], description: match[2].trim() } : { name: text, description: '' };
}

function decoratorInfo(node) {
  for (const decorator of ts.getDecorators(node) ?? []) {
    const call = decorator.expression;
    if (!ts.isCallExpression(call)) continue;
    const kind = call.expression.getText();
    if (!['Component', 'Directive', 'Injectable'].includes(kind)) continue;
    const meta = {};
    const hostDirectives = [];
    const arg = call.arguments[0];
    if (arg && ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        if (ts.isStringLiteralLike(prop.initializer)) {
          meta[prop.name.getText()] = prop.initializer.text;
        } else if (prop.name.getText() === 'hostDirectives' && ts.isArrayLiteralExpression(prop.initializer)) {
          for (const item of prop.initializer.elements) {
            if (ts.isIdentifier(item)) {
              hostDirectives.push({ name: item.text, inputs: [], outputs: [] });
            } else if (ts.isObjectLiteralExpression(item)) {
              const get = (key) => item.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === key)?.initializer;
              const list = (node) => (node && ts.isArrayLiteralExpression(node) ? node.elements.filter(ts.isStringLiteralLike).map((e) => e.text) : []);
              hostDirectives.push({ name: get('directive')?.getText(), inputs: list(get('inputs')), outputs: list(get('outputs')) });
            }
          }
        }
      }
    }
    return { kind: kind.toLowerCase(), selector: meta.selector, exportAs: meta.exportAs, hostDirectives };
  }
  return null;
}

function isPublic(member) {
  const mods = ts.getCombinedModifierFlags(member);
  return !(mods & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) && !(member.name && ts.isPrivateIdentifier(member.name));
}

function optionsAlias(call) {
  const opts = call.arguments.find((a) => ts.isObjectLiteralExpression(a));
  const alias = opts?.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'alias');
  const transform = opts?.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'transform');
  return {
    alias: alias && ts.isStringLiteralLike(alias.initializer) ? alias.initializer.text : undefined,
    transform: transform ? transform.initializer.getText() : undefined,
  };
}

function signalTypeArgs(checker, node) {
  const type = checker.getTypeAtLocation(node);
  const args = type.aliasTypeArguments ?? (type.flags & ts.TypeFlags.Object ? checker.getTypeArguments(type) : []);
  return args.map((t) => checker.typeToString(t, undefined, TYPE_FLAGS));
}

function documentClass(node, checker, file) {
  const info = decoratorInfo(node);
  if (!info || !node.name) return null;
  const symbol = checker.getSymbolAtLocation(node.name);
  if (hasTag(symbol, 'internal')) return null;
  const entry = {
    name: node.name.text,
    kind: info.kind === 'injectable' ? 'service' : info.kind,
    selector: info.selector,
    exportAs: info.exportAs,
    hostDirectives: info.hostDirectives,
    description: docText(symbol, checker),
    file: relative(root, file),
    category: tags(symbol, 'category')[0],
    slots: tags(symbol, 'slot').map(splitNameDesc),
    cssProperties: tags(symbol, 'cssprop').map(splitNameDesc),
    inputs: [],
    outputs: [],
    models: [],
    properties: [],
    methods: [],
  };

  for (const member of node.members) {
    if (!member.name || !isPublic(member) || ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) continue;
    const memberSymbol = checker.getSymbolAtLocation(member.name);
    if (hasTag(memberSymbol, 'internal')) continue;
    const name = member.name.getText();
    const description = docText(memberSymbol, checker);
    const deprecated = tags(memberSymbol, 'deprecated')[0];

    if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer)) {
      const call = member.initializer;
      const api = call.expression.getText();
      if (SIGNAL_APIS.has(api)) {
        const required = api.endsWith('.required');
        const { alias, transform } = optionsAlias(call);
        const typeArgs = signalTypeArgs(checker, member.name);
        const firstArg = call.arguments[0];
        const defaultValue = !required && firstArg && !ts.isObjectLiteralExpression(firstArg) ? firstArg.getText() : undefined;
        if (api.startsWith('output')) {
          entry.outputs.push({ name: alias ?? name, type: typeArgs[0] ?? 'unknown', description, deprecated });
        } else if (api.startsWith('model')) {
          entry.models.push({ name: alias ?? name, type: typeArgs[0] ?? 'unknown', default: defaultValue, required, description, deprecated });
        } else {
          let type = typeArgs.length > 1 ? typeArgs[1] : (typeArgs[0] ?? 'unknown');
          if (transform === 'booleanAttribute') type = 'boolean';
          if (transform === 'numberAttribute') type = 'number';
          entry.inputs.push({ name: alias ?? name, type, default: defaultValue, required, description, deprecated });
        }
        continue;
      }
      if (/^(contentChild|contentChildren|viewChild|viewChildren|inject)\b/.test(api)) continue;
    }

    if (ts.isMethodDeclaration(member)) {
      if (name.startsWith('ng') || HIDDEN_METHODS.has(name)) continue;
      const signature = checker.getSignatureFromDeclaration(member);
      entry.methods.push({
        name,
        signature: `${name}${signature ? checker.signatureToString(signature, undefined, TYPE_FLAGS) : '()'}`.replace(/\): /, '): '),
        description,
        deprecated,
      });
      continue;
    }

    if (ts.isPropertyDeclaration(member) && entry.kind === 'service') {
      entry.properties.push({
        name,
        type: checker.typeToString(checker.getTypeAtLocation(member.name), undefined, TYPE_FLAGS),
        description,
      });
    }
  }
  return entry;
}

function documentFunction(node, checker, file) {
  const symbol = checker.getSymbolAtLocation(node.name);
  if (hasTag(symbol, 'internal')) return null;
  const signature = checker.getSignatureFromDeclaration(node);
  return {
    name: node.name.text,
    kind: 'function',
    description: docText(symbol, checker),
    file: relative(root, file),
    signature: `${node.name.text}${signature ? checker.signatureToString(signature, undefined, TYPE_FLAGS) : '()'}`,
    slots: [], cssProperties: [], inputs: [], outputs: [], models: [], properties: [], methods: [],
  };
}

function isExported(node) {
  return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
}

function generateApi() {
  const files = walk(libDir, (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts'));
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    experimentalDecorators: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const groups = new Map();

  for (const file of files) {
    const source = program.getSourceFile(file);
    const slug = basename(dirname(file));
    const group = groups.get(slug) ?? { slug, title: titleCase(slug), category: '', description: '', entries: [], types: [] };
    groups.set(slug, group);

    ts.forEachChild(source, (node) => {
      if (ts.isClassDeclaration(node) && isExported(node)) {
        const entry = documentClass(node, checker, file);
        if (entry) group.entries.push(entry);
      } else if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
        const entry = documentFunction(node, checker, file);
        if (entry) group.entries.push(entry);
      } else if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && isExported(node)) {
        const symbol = checker.getSymbolAtLocation(node.name);
        const printer = ts.createPrinter({ removeComments: false });
        group.types.push({
          name: node.name.text,
          description: docText(symbol, checker),
          code: printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/^export /, ''),
        });
      }
    });
  }

  // Entrées / sorties exposées par les directives hôtes (hostDirectives) : reportées sur le composant.
  const byName = new Map([...groups.values()].flatMap((g) => g.entries.map((e) => [e.name, e])));
  for (const entry of byName.values()) {
    for (const host of entry.hostDirectives ?? []) {
      const source = byName.get(host.name);
      if (!source) continue;
      const pick = (list, names) =>
        names.flatMap((spec) => {
          const [name, alias] = spec.split(':').map((x) => x.trim());
          const member = list.find((m) => m.name === name);
          return member ? [{ ...member, name: alias ?? name, from: host.name }] : [];
        });
      entry.inputs.push(...pick(source.inputs, host.inputs));
      entry.outputs.push(...pick(source.outputs, host.outputs));
    }
    delete entry.hostDirectives;
  }

  for (const group of groups.values()) {
    const kindOrder = { component: 0, directive: 1, service: 2, function: 3 };
    // Composant principal : UiTextField pour le dossier text-field, UiTabs pour tabs…
    const mainName = 'ui' + group.slug.replace(/-/g, '');
    const isMain = (e) => (e.kind === 'component' && e.name.toLowerCase() === mainName ? -1 : 0);
    group.entries.sort((a, b) => isMain(a) - isMain(b) || kindOrder[a.kind] - kindOrder[b.kind]);
    // Le composant principal du dossier porte la description de la page.
    const main = group.entries.find((e) => e.kind === 'component') ?? group.entries[0];
    group.description = main?.description ?? '';
    group.category = main?.category ?? 'Autres';
    group.title = main?.kind === 'component' ? main.name.replace(/^Ui/, '').replace(/([a-z])([A-Z])/g, '$1 $2') : group.title;
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Fichiers locaux importés par un exemple (`./donnees`, récursivement) : données et composants annexes, affichés
 * dans « Voir le code » à côté de l'exemple. Les aides du site (`../../shared/…`) ne sont pas reprises.
 */
function localDependencies(file, seen = new Set([file])) {
  const out = [];
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/from\s+'(\.\/[^']+)'/g)) {
    const target = join(dirname(file), match[1].endsWith('.ts') ? match[1] : `${match[1]}.ts`);
    if (seen.has(target) || !existsSync(target)) continue;
    seen.add(target);
    out.push({ name: relative(dirname(file), target).replace(/\\/g, '/'), source: readFileSync(target, 'utf8') });
    out.push(...localDependencies(target, seen));
  }
  return out;
}

function generateExamples() {
  const files = walk(examplesDir, (p) => p.endsWith('.example.ts')).sort();
  const imports = [];
  const bySlug = {};
  files.forEach((file, index) => {
    const source = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
    // Composant d'exemple : la classe exportée dont le nom finit par « Example » (le fichier peut en exporter d'autres).
    const exported = sf.statements.filter((s) => ts.isClassDeclaration(s) && isExported(s) && s.name);
    const cls = exported.find((s) => s.name.text.endsWith('Example')) ?? exported[0];
    if (!cls) throw new Error(`Aucune classe exportée dans ${file}`);
    const jsDoc = ts.getJSDocCommentsAndTags(cls).find(ts.isJSDoc);
    const comment = typeof jsDoc?.comment === 'string' ? jsDoc.comment : ts.getTextOfJSDocComment(jsDoc?.comment) ?? '';
    const [title, ...rest] = comment.trim().split('\n');
    const order = Number(jsDoc?.tags?.find((t) => t.tagName.text === 'order')?.comment ?? 100);
    const slug = basename(dirname(file));
    const alias = `Example${index}`;
    const importPath = './' + relative(outDir, file).replace(/\\/g, '/').replace(/\.ts$/, '');
    imports.push(`import { ${cls.name.text} as ${alias} } from '${importPath.startsWith('./..') ? importPath.slice(2) : importPath}';`);
    (bySlug[slug] ??= []).push({
      id: basename(file, '.example.ts'),
      title: title?.trim() || cls.name.text,
      description: rest.join('\n').trim(),
      order,
      alias,
      file: relative(root, file),
      files: localDependencies(file),
      source: source.replace(/\/\*\*[\s\S]*?\*\/\n(?=@Component)/, ''),
    });
  });

  const body = Object.entries(bySlug)
    .map(([slug, list]) => {
      const items = list
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map(
          (e) =>
            `    { id: ${JSON.stringify(e.id)}, title: ${JSON.stringify(e.title)}, description: ${JSON.stringify(e.description)}, file: ${JSON.stringify(e.file)}, component: ${e.alias}, source: ${JSON.stringify(e.source)}, files: ${JSON.stringify(e.files)} },`,
        )
        .join('\n');
      return `  ${JSON.stringify(slug)}: [\n${items}\n  ],`;
    })
    .join('\n');

  return `${imports.join('\n')}\nimport type { ExampleDef } from '../shared/doc-types';\n\nexport const EXAMPLES: Record<string, readonly ExampleDef[]> = {\n${body}\n};\n`;
}

function parseTokens(file) {
  const css = readFileSync(join(stylesDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = {};
  const firstBlock = css.slice(css.indexOf('{') + 1, css.indexOf('}'));
  for (const match of firstBlock.matchAll(/(--ui-[\w-]+)\s*:\s*([^;]+);/g)) tokens[match[1]] = match[2].trim().replace(/\s+/g, ' ');
  return tokens;
}

function generateTokens() {
  const base = parseTokens('tokens.css');
  const rank = (f) => ({ 'light.css': 0, 'dark.css': 1 })[f] ?? 2;
  const themeFiles = readdirSync(join(stylesDir, 'themes')).filter((f) => f.endsWith('.css')).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const themes = Object.fromEntries(themeFiles.map((f) => [basename(f, '.css'), parseTokens(join('themes', f))]));
  const names = [...new Set(Object.values(themes).flatMap((t) => Object.keys(t)))];
  const seasonsCss = existsSync(join(stylesDir, 'seasons.css')) ? readFileSync(join(stylesDir, 'seasons.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') : '';
  const seasons = [...seasonsCss.matchAll(/\[data-ui-theme='season-(light|dark)'\]\[data-ui-season='(\w+)'\]\s*\{([^}]*)\}/g)].map((m) => ({
    mode: m[1],
    season: m[2],
    tokens: Object.fromEntries([...m[3].matchAll(/(--ui-[\w-]+)\s*:\s*([^;]+);/g)].map((t) => [t[1], t[2].trim()])),
  }));
  return {
    seasons,
    themes: Object.keys(themes),
    color: names.map((name) => ({ name, values: Object.fromEntries(Object.entries(themes).map(([theme, t]) => [theme, t[name] ?? ''])) })),
    base: Object.entries(base).map(([name, value]) => ({ name, value })),
  };
}

/** Exemples côté serveur : projects/docs/src/backend-examples/<slug>/index.json + fichiers source. */
function generateBackends() {
  const result = {};
  if (!existsSync(backendsDir)) return result;
  for (const slug of readdirSync(backendsDir)) {
    const manifestPath = join(backendsDir, slug, 'index.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    result[slug] = {
      intro: manifest.intro,
      backends: manifest.backends.map((backend) => ({
        ...backend,
        files: backend.files.map((f) => ({ ...f, code: readFileSync(join(backendsDir, slug, f.file), 'utf8') })),
      })),
    };
  }
  return result;
}

function write(name, content) {
  const path = join(outDir, name);
  const previous = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (previous !== content) writeFileSync(path, content);
}

function generate() {
  mkdirSync(outDir, { recursive: true });
  const header = '// Fichier généré par tools/generate-docs.mjs — ne pas modifier.\n';
  const api = generateApi();
  write('api.ts', `${header}import type { ApiGroup } from '../shared/doc-types';\n\nexport const API: readonly ApiGroup[] = ${JSON.stringify(api, null, 2)};\n`);
  // Index léger pour le menu et la recherche (chargé au démarrage) ; l'API complète reste dans les pages paresseuses.
  const navIndex = api.map(({ slug, title, category, description, entries }) => ({
    slug,
    title,
    category,
    description,
    selectors: entries.map((e) => `${e.name} ${e.selector ?? ''}`.trim()).join(' '),
  }));
  write('nav-index.ts', `${header}import type { NavGroup } from '../shared/doc-types';\n\nexport const NAV_INDEX: readonly NavGroup[] = ${JSON.stringify(navIndex, null, 2)};\n`);
  write('examples.ts', header + generateExamples());
  write('backends.ts', `${header}import type { BackendDocs } from '../shared/doc-types';\n\nexport const BACKENDS: Record<string, BackendDocs> = ${JSON.stringify(generateBackends(), null, 2)};\n`);
  write('tokens.ts', `${header}import type { TokenData } from '../shared/doc-types';\n\nexport const TOKENS: TokenData = ${JSON.stringify(generateTokens(), null, 2)};\n`);
  const count = api.reduce((n, g) => n + g.entries.length, 0);
  console.log(`[docs] ${count} éléments d'API documentés, données écrites dans ${relative(root, outDir)}`);
}

generate();

if (process.argv.includes('--watch')) {
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        generate();
      } catch (error) {
        console.error('[docs]', error.message);
      }
    }, 150);
  };
  for (const dir of [libDir, stylesDir, examplesDir, backendsDir]) if (existsSync(dir)) watch(dir, { recursive: true }, schedule);
  console.log('[docs] surveillance des sources…');
}
