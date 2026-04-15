/**
 * One-off: replace React.* with unqualified names and rebuild `from 'react'` imports.
 * Run: node scripts/refactor-react-namespace.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

/** Identifiers typically used as types only (import type) */
const TYPE_IDS = new Set([
  'FC',
  'ReactNode',
  'ChangeEvent',
  'FormEvent',
  'MouseEvent',
  'KeyboardEvent',
  'DragEvent',
  'TouchEvent',
  'CSSProperties',
  'ElementType',
  'ComponentType',
  'Dispatch',
  'SetStateAction',
  'PropsWithChildren',
  'SVGProps',
  'HTMLAttributes',
  'RefObject',
  'MutableRefObject',
]);

function walkTs(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, acc);
    else if (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

function reactDotIds(text) {
  const s = new Set();
  const re = /\bReact\.([A-Za-z][A-Za-z0-9_]*)\b/g;
  let m;
  while ((m = re.exec(text))) s.add(m[1]);
  return s;
}

function stripReactNs(text) {
  return text.replace(/\bReact\.([A-Za-z][A-Za-z0-9_]*)\b/g, '$1');
}

function splitImportSpecifiers(inner) {
  const parts = [];
  let angle = 0;
  let cur = '';
  for (const ch of inner) {
    if (ch === '<') angle++;
    else if (ch === '>') angle = Math.max(0, angle - 1);
    if (ch === ',' && angle === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function specifierLocalName(spec) {
  const s = spec.replace(/^\s*type\s+/, '').trim();
  const asM = s.match(/^(.+?)\s+as\s+(\w+)\s*$/);
  if (asM) return asM[2].trim();
  return s.split(/\s+/)[0];
}

function parseNamesFromReactImportLine(line) {
  const names = new Set();
  const trimmed = line.trim();

  if (/^import\s+type\s+\{/.test(trimmed)) {
    const m = trimmed.match(/^import\s+type\s+\{([^}]*)\}\s+from\s+['"]react['"]/);
    if (m) splitImportSpecifiers(m[1]).forEach((sp) => names.add(specifierLocalName(sp)));
    return names;
  }

  const braced = trimmed.match(
    /^import\s+(?:React\s*,\s*)?\{([^}]*)\}\s+from\s+['"]react['"]/,
  );
  if (braced) {
    splitImportSpecifiers(braced[1]).forEach((sp) => names.add(specifierLocalName(sp)));
    return names;
  }

  if (/^import\s+React\s+from\s+['"]react['"]/.test(trimmed)) {
    return names;
  }

  return names;
}

function findReactImportLineIndices(lines) {
  const idx = [];
  const re = /^import\s+.*\s+from\s+['"]react['"]\s*;?\s*$/;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i].trim())) idx.push(i);
  }
  return idx;
}

function buildReactImportLine(names) {
  if (names.size === 0) return null;
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  const valueParts = [];
  const typeParts = [];
  for (const n of sorted) {
    if (TYPE_IDS.has(n)) typeParts.push(`type ${n}`);
    else valueParts.push(n);
  }
  const inner = [...valueParts, ...typeParts].join(', ');
  return `import { ${inner} } from 'react';`;
}

function processFile(fp) {
  let text = fs.readFileSync(fp, 'utf8');
  const fromDot = reactDotIds(text);
  const hadReactImports = /\bfrom\s+['"]react['"]/.test(text);

  if (fromDot.size === 0 && !hadReactImports) return false;

  text = stripReactNs(text);
  const lines = text.split('\n');
  const reactIdx = findReactImportLineIndices(lines);

  const merged = new Set(fromDot);
  for (const i of reactIdx) {
    for (const n of parseNamesFromReactImportLine(lines[i])) merged.add(n);
  }

  for (let j = reactIdx.length - 1; j >= 0; j--) {
    lines.splice(reactIdx[j], 1);
  }

  const newImport = buildReactImportLine(merged);
  if (newImport) {
    let insertAt = 0;
    while (insertAt < lines.length && /^\s*$/.test(lines[insertAt])) insertAt++;
    while (insertAt < lines.length && lines[insertAt].startsWith('///')) insertAt++;
    lines.splice(insertAt, 0, newImport);
  }

  fs.writeFileSync(fp, lines.join('\n'), 'utf8');
  return true;
}

function main() {
  const files = walkTs(SRC).filter(
    (f) => !f.endsWith(`${path.sep}vite-env.d.ts`),
  );
  let n = 0;
  for (const f of files) {
    if (processFile(f)) n++;
  }
  console.log(`Updated ${n} files under src/`);
}

main();
