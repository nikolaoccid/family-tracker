#!/usr/bin/env node
// Compares two smoke outputs (JSON lines). Success bodies must have identical key sets
// and value types; error bodies may only add keys (the standard error body is additive).
//   node scripts/compare-shapes.mjs baseline.jsonl candidate.jsonl
import { readFileSync } from 'node:fs';

const load = (path) =>
  new Map(readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.name, r]));

function diff(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length && b.length ? diff(a[0], b[0], `${path}[]`) : [];
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out = [];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) out.push(`+ ${path}.${k} (only in candidate)`);
      else if (!(k in b)) out.push(`- ${path}.${k} (missing in candidate)`);
      else out.push(...diff(a[k], b[k], `${path}.${k}`));
    }
    return out;
  }
  return [`~ ${path || '(root)'}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`];
}

const [base, cand] = [load(process.argv[2]), load(process.argv[3])];
let problems = 0;
for (const [name, b] of base) {
  const c = cand.get(name);
  if (!c) { console.log(`MISSING step: ${name}`); problems++; continue; }
  const issues = [];
  if (b.status !== c.status) issues.push(`status ${b.status} -> ${c.status}`);
  if (b.status < 400 && c.status < 400) issues.push(...diff(b.shape, c.shape));
  else if (b.status >= 400 && c.status >= 400) issues.push(...diff(b.shape, c.shape).filter((i) => !i.startsWith('+')));
  if (issues.length) { problems++; console.log(`${name}\n  ${issues.join('\n  ')}`); }
}
console.log(problems ? `${problems} step(s) differ` : 'all steps match');
process.exit(problems ? 1 : 0);
