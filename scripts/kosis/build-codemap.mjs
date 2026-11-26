/* KOSIS 통계청 지역코드 → 행안부(mois) 코드 → 앱 지도(kmdata) 대응표 빌더
   사용법: node build-codemap.mjs <R폴더> <출력json>
   - R폴더 읽기 전용 입력: stat_codes_DT_1YL20631.json(통계청), mois_codes_DT_1YL20651E.json(행안부), kmdata_units.json(앱 지도 단위)
   - Node 내장 모듈(fs/path)만 사용. 네트워크·KOSIS 접속 없음.
   - 이름 정규화: 앞뒤 공백 제거 후 내부 공백 제거.
   - 추측 금지: 짝 0개/2개 이상이면 unmatched에 기록. */
import fs from 'node:fs';
import path from 'node:path';

const [,, RArg, outArg] = process.argv;
if (!RArg || !outArg) { console.error('usage: node build-codemap.mjs <R folder> <output json>'); process.exit(2); }
const R = path.resolve(RArg);
const OUT = path.resolve(outArg);

const read = (f) => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const stat = read('stat_codes_DT_1YL20631.json');
const mois = read('mois_codes_DT_1YL20651E.json');
const km = read('kmdata_units.json');

/* 행안부 표는 청주·창원을 '통합청주시'·'통합창원시'로 적는다(2026-11-25 Opus 검수에서 추가) */
const MOIS_ALIAS = /^통합(?=청주시$|창원시$)/;
const norm = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, '');
const len = (c) => String(c).length;

// ── 시도 정의 ──
// 통계청 시도: 2자리(전국 00 제외) + 4자리(1224 광주·1236 전남). 행안부 시도: 2자리(전국 00 제외).
const statSidoName = new Map();   // stat 시도 코드 → 정규화된 이름
for (const x of stat) {
  const c = String(x.C1), n = len(c);
  if ((n === 2 || n === 4) && c !== '00') statSidoName.set(c, norm(x.C1_NM));
}
const moisSidoName = new Map();
for (const x of mois) if (len(x.C1) === 2 && x.C1 !== '00') moisSidoName.set(String(x.C1), norm(x.C1_NM));

// 자식 행 수(시도별): 5자리는 앞2, 7자리는 앞4가 시도
const childCount = new Map();
for (const x of stat) {
  const c = String(x.C1), n = len(c);
  const pref = n === 5 ? c.slice(0, 2) : n === 7 ? c.slice(0, 4) : null;
  if (pref) childCount.set(pref, (childCount.get(pref) || 0) + 1);
}

// 행안부 시군구 인덱스: (시도이름, 시군구이름) → [행안부 5자리 코드...]
const moisIndex = new Map();
for (const x of mois) {
  if (len(x.C1) !== 5) continue;
  const key = (moisSidoName.get(String(x.C1).slice(0, 2)) || '') + '\u0000' + norm(x.C1_NM).replace(MOIS_ALIAS, '');
  if (!moisIndex.has(key)) moisIndex.set(key, []);
  moisIndex.get(key).push(String(x.C1));
}

const unmatched = [];
const notes = [];
const sido = {};   // {통계청:행안부}
const sgg = {};    // {통계청:행안부}

// ── (가) 시도: 이름이 같은 행안부 2자리와 짝짓기 ──
for (const [sCode, sName] of statSidoName) {
  const cand = [...moisSidoName.entries()].filter(([, n]) => n === sName);
  if (cand.length === 1) sido[sCode] = cand[0][0];
  else unmatched.push({
    src: 'stat', code: sCode, name: sName, sido: sName,
    why: cand.length === 0 ? 'sido-no-match' : 'sido-ambiguous:' + cand.map((c) => c[0]).join(',')
  });
}

// ── (나) 시군구: 통계청 5·7자리 → (시도이름,시군구이름) 같은 행안부 5자리 ──
for (const x of stat) {
  const c = String(x.C1), n = len(c);
  if (n !== 5 && n !== 7) continue;
  const pref = n === 5 ? c.slice(0, 2) : c.slice(0, 4);
  const sName = statSidoName.get(pref) || '';
  const name = norm(x.C1_NM);
  const cand = moisIndex.get(sName + '\u0000' + name) || [];
  if (cand.length === 1) sgg[c] = cand[0];
  else unmatched.push({
    src: 'stat', code: c, name: x.C1_NM, sido: sName,
    why: cand.length === 0 ? 'sgg-no-match' : 'sgg-ambiguous:' + cand.join(',')
  });
}

// ── (다) 하위 행 없는 통계청 시도(세종 29): kmdata ver a에서 sn 같은 유일한 단위 c ──
const kmA = km.filter((u) => u.ver === 'a');
const kmB = km.filter((u) => u.ver === 'b');
for (const [sCode, sName] of statSidoName) {
  if ((childCount.get(sCode) || 0) > 0) continue;           // 자식 있으면 (나)에서 처리
  const units = kmA.filter((u) => norm(u.sn) === sName);
  const uniq = [...new Set(units.map((u) => String(u.c)))];
  if (uniq.length === 1) {
    sgg[sCode] = uniq[0];
    notes.push(`sgg ${sCode}(${sName}): 통계청 하위행 없어 kmdata ver a 유일한 단위 ${uniq[0]} 사용`);
  } else unmatched.push({
    src: 'stat', code: sCode, name: sName, sido: sName,
    why: uniq.length === 0 ? 'kmdata-no-unit' : 'kmdata-ambiguous:' + uniq.join(',')
  });
}

// ── (라) a2b: kmdata ver a(광주·전남) → ver b(전남광주통합) 같은 이름 ──
const INTEGRATED = '전남광주통합특별시';
const OLD = new Set(['광주광역시', '전라남도']);
const bByName = new Map();
for (const u of kmB) {
  if (norm(u.sn) !== INTEGRATED) continue;
  const k = norm(u.n);
  if (!bByName.has(k)) bByName.set(k, []);
  bByName.get(k).push(String(u.c));
}
const a2b = {};
for (const u of kmA) {
  if (!OLD.has(norm(u.sn))) continue;
  const cand = bByName.get(norm(u.n)) || [];
  if (cand.length === 1) a2b[String(u.c)] = cand[0];
  else unmatched.push({
    src: 'kmdata', code: String(u.c), name: u.n, sido: u.sn,
    why: cand.length === 0 ? 'a2b-no-match' : 'a2b-ambiguous:' + cand.join(',')
  });
}

// ── 키 코드 문자열 오름차순 정렬 ──
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

const data = {
  _src: 'KOSIS DT_1YL20631(통계청)·DT_1YL20651E(행안부)·data/kmdata.js',
  built: '2026-11-25',
  sido: sortKeys(sido),
  sgg: sortKeys(sgg),
  a2b: sortKeys(a2b),
  notes,
  unmatched,
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n', 'utf8');

// ── 자가 점검 출력 ──
const kmA_codes = new Set(kmA.map((u) => String(u.c)));
const mappedMois = Object.values(sgg).concat(Object.values(sido));
const notInKm = [...new Set(Object.values(sgg))].filter((v) => !kmA_codes.has(v));

console.log('=== 자가 점검 ===');
console.log(`sido 개수: ${Object.keys(sido).length}`);
console.log(`sgg 개수: ${Object.keys(sgg).length}`);
console.log(`a2b 개수: ${Object.keys(a2b).length}`);
console.log(`unmatched 개수: ${unmatched.length}`);
console.log(`notes: ${notes.length}`);
const sggVals = [...new Set(Object.values(sgg))];
const sggInKm = sggVals.filter((v) => kmA_codes.has(v)).length;
console.log(`sgg 매핑 행안부 코드 kmdata ver a c 포함: ${sggInKm}/${sggVals.length}${notInKm.length ? ' / 누락: ' + notInKm.join(',') : ' / 모두 포함'}`);
console.log('--- 필수 확인 값 ---');
const checks = [
  ['sgg', '11010', '11110'],   // 종로구
  ['sgg', '21010', '26110'],   // 부산 중구
  ['sgg', '31010', '41110'],   // 수원시
  ['sgg', '22520', '27720'],   // 군위군
  ['sgg', '29', '36110'],      // 세종
  ['sgg', '1224010', '29110'], // 1224 동구 → 29110
  ['sido', '21', '26'],
  ['sido', '1224', '29'],
  ['sido', '1236', '46'],
  ['a2b', '29110', '12210'],
];
for (const [m, k, exp] of checks) {
  const got = data[m][k];
  console.log(`  ${m}[${k}] = ${got} (기대 ${exp}) ${got === exp ? 'PASS' : 'FAIL <<< 다름'}`);
}
