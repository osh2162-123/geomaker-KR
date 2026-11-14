import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Run from any working directory. Only deployment assets participate in the stamp.
const root = path.resolve(import.meta.dirname, '..');
const textExtensions = new Set(['.js', '.css', '.html', '.txt', '.webmanifest']);
const normalized = (name, bytes) => textExtensions.has(path.extname(name))
  ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);
const read = name => fs.readFileSync(path.join(root, name));
const pending = new Map();
function replaceOnce(source, pattern, replacement, name) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g'))];
  if (matches.length !== 1) throw new Error(`${name}: expected exactly one ${pattern}`);
  return source.replace(pattern, replacement);
}
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(name);
    if (!entry.isFile()) throw new Error(`Unsupported deployment entry: ${name}`);
    return entry.name.endsWith('.md') || entry.name === 'LICENSE' || entry.name === 'sw.js' ? [] : [name];
  }).sort();
}

try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/stamp.mjs [--check]');
  const check = args.includes('--check');
  const versions = {};
  for (const name of walk('data').filter(name => /^data\/[^/]+\.js$/.test(name))) {
    const source = read(name).toString('utf8');
    const pattern = /^\(window\.GMVER=window\.GMVER\|\|\{\}\)\["([^"\r\n]+)"\]="([a-f0-9]+)";\r?\n?(?=\s*$)/m;
    const match = source.match(pattern);
    if (!match) throw new Error(`${name}: missing final GMVER line`);
    const key = match[1];
    if (key !== path.basename(name, '.js')) throw new Error(`${name}: unexpected GMVER key`);
    // Exclude only the stamp line, preserving the exact body and trailing blank lines.
    const body = source.slice(0, match.index) + source.slice(match.index + match[0].length);
    versions[key] = digest(normalized(name, Buffer.from(body)));
    pending.set(name, Buffer.from(replaceOnce(source, pattern,
      match[0].replace(`="${match[2]}";`, `="${versions[key]}";`), name)));
  }
  const shell = read('js/shell.js').toString('utf8');
  pending.set('js/shell.js', Buffer.from(replaceOnce(shell, /const DATAVER=\{[^\r\n]*?\};/,
    `const DATAVER=${JSON.stringify(versions)};`, 'js/shell.js')));

  const core = ['./', 'index.html', 'manifest.webmanifest', 'licenses.html', 'guide.html',
    ...['icons', 'data', 'fonts', 'lib', 'css', 'js'].flatMap(walk)];
  const hash = crypto.createHash('sha256');
  for (const name of core) {
    const file = name === './' ? 'index.html' : name;
    const bytes = normalized(file, pending.get(file) ?? read(file));
    // Frame paths and lengths so file boundaries and additions cannot be ambiguous.
    hash.update(`${name}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  const version = `gm-${hash.digest('hex').slice(0, 10)}`;
  let sw = read('sw.js').toString('utf8');
  sw = replaceOnce(sw, /const V='[^'\r\n]*';/, `const V='${version}';`, 'sw.js');
  sw = replaceOnce(sw, /const CORE=\[[^\r\n]*\];/, `const CORE=${JSON.stringify(core)};`, 'sw.js');
  pending.set('sw.js', Buffer.from(sw));

  const changed = [...pending].filter(([name, bytes]) => !bytes.equals(read(name)));
  if (check) {
    if (changed.length) {
      console.log(changed.map(([name]) => name).join('\n'));
      process.exitCode = 1;
    }
  } else {
    for (const [name, bytes] of changed) fs.writeFileSync(path.join(root, name), bytes);
    console.log(changed.length ? `Updated: ${changed.map(([name]) => name).join(', ')}` : 'Already up to date.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
