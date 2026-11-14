import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run from any working directory. Only deployment assets participate in the stamp.
let root;
const textExtensions = new Set(['.js', '.css', '.html', '.txt', '.webmanifest', '.json', '.svg', '.mjs', '.map']);
const binaryExtensions = new Set(['.png', '.woff2', '.bcmap', '.jpg', '.ico', '.webp']);
const normalized = (name, bytes) => textExtensions.has(path.extname(name))
  ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);
const read = name => {
  try { return fs.readFileSync(path.join(root, name)); }
  catch { throw new Error(`${name}: 파일을 읽을 수 없습니다. 파일이 있는지와 읽기 권한을 확인해 주세요.`); }
};
const pending = new Map();
function replaceOnce(source, pattern, replacement, name) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g'))];
  if (matches.length !== 1) throw new Error(`${name}: 버전 표기 형식이 올바르지 않습니다. 기존 파일과 같은 형식의 표기를 하나만 남겨 주세요.`);
  return source.replace(pattern, replacement);
}
function git(args, cwd = root) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw new Error('Git 명령을 실행할 수 없습니다. Git 설치와 저장소 상태를 확인해 주세요.'); }
}

try {
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try { git(['rev-parse', '--show-toplevel']); }
  catch { throw new Error('Git 저장소 안에서 실행해 주세요. Git 설치와 저장소 상태도 확인해 주세요.'); }
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('인자가 올바르지 않습니다. node scripts/stamp.mjs [--check] 형식으로 실행해 주세요.');
  const check = args.includes('--check');
  const targets = ['index.html', 'manifest.webmanifest', 'licenses.html', 'guide.html', 'icons', 'data', 'fonts', 'lib', 'css', 'js'];
  const deployable = name => !name.endsWith('.md') && !['LICENSE', 'sw.js'].includes(path.posix.basename(name));
  const files = [...new Set(git(['ls-files', '-z', '--', ...targets]).split('\0').filter(Boolean).filter(deployable))].sort();
  const untracked = git(['ls-files', '-z', '--others', '--exclude-standard', '--', ...targets]).split('\0').filter(Boolean).sort();
  if (untracked.length) console.warn(`배포 경로의 추적하지 않는 파일은 제외합니다:\n${untracked.join('\n')}\n새 파일은 git add를 먼저 한 뒤 다시 실행하세요`);
  if (check) {
    const modified = git(['diff', '--name-only', 'HEAD', '--', ...targets]).trim();
    if (modified) console.warn(`배포 경로에 커밋하지 않은 수정이 있습니다:\n${modified}\n해시는 작업 폴더 기준이라 커밋된 내용과 다를 수 있다`);
  }
  for (const name of files) {
    if (!fs.existsSync(path.join(root, name))) throw new Error(`${name}: Git 추적 파일이 작업 폴더에 없습니다. 파일을 복원하거나 git rm으로 삭제를 반영한 뒤 다시 실행해 주세요.`);
    const extension = path.extname(name);
    if (!textExtensions.has(extension) && !binaryExtensions.has(extension)) {
      throw new Error(`${name}: 확장자 분류를 stamp.mjs에 추가해 주세요`);
    }
  }
  for (const name of targets.slice(0, 4).concat('js/shell.js')) {
    if (!files.includes(name)) throw new Error(`${name}: 필수 배포 파일이 없습니다. 파일을 복원하고 git add한 뒤 다시 실행해 주세요.`);
  }
  const versions = {};
  for (const name of files.filter(name => /^data\/[^/]+\.js$/.test(name))) {
    const source = read(name).toString('utf8');
    const pattern = /(?:^|(?<=\n))\(window\.GMVER=window\.GMVER\|\|\{\}\)\["([^"\r\n]+)"\]="([a-f0-9]+)";\r?\n?(?![\s\S])/;
    const match = source.match(pattern);
    if (!match) throw new Error(`${name}: 끝줄에 GMVER 표기가 없거나 형식이 다릅니다.\n마지막 줄을 다음 형식으로 맞춰 주세요: (window.GMVER=window.GMVER||{})["${path.basename(name, '.js')}"]="0000000000";`);
    const key = match[1];
    if (key !== path.basename(name, '.js')) throw new Error(`${name}: GMVER 키를 파일명 ${JSON.stringify(path.basename(name, '.js'))}과 같게 고쳐 주세요.`);
    // Exclude only the stamp line, preserving the exact body and trailing blank lines.
    const body = source.slice(0, match.index) + source.slice(match.index + match[0].length);
    versions[key] = digest(normalized(name, Buffer.from(body)));
    pending.set(name, Buffer.from(replaceOnce(source, pattern,
      match[0].replace(`="${match[2]}";`, `="${versions[key]}";`), name)));
  }
  const shell = read('js/shell.js').toString('utf8');
  pending.set('js/shell.js', Buffer.from(replaceOnce(shell, /const DATAVER=\{[^\r\n]*?\};/,
    `const DATAVER=${JSON.stringify(versions)};`, 'js/shell.js')));

  const core = ['./', ...files];
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
    if (untracked.length) process.exitCode = 1;
    if (changed.length) {
      console.error('다음 파일이 도장과 다릅니다. node scripts/stamp.mjs를 실행한 뒤 커밋해 주세요\n' + changed.map(([name]) => name).join('\n'));
      process.exitCode = 1;
    }
  } else {
    for (const [name, bytes] of changed) fs.writeFileSync(path.join(root, name), bytes);
    console.log(changed.length ? `갱신한 파일: ${changed.map(([name]) => name).join(', ')}` : '이미 최신 도장입니다.');
  }
} catch (error) {
  console.error(error.code ? `파일 작업에 실패했습니다 (${error.path ?? error.code}). 파일 경로와 쓰기 권한을 확인한 뒤 다시 실행해 주세요.` : error.message);
  process.exitCode = 2;
}
