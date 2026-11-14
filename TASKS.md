# TASKS.md — 지리 자료 제작기(geomaker-KR)

PLAN.md의 목표를 작은 작업으로 나눈다. 수행 담당은 위에서부터 하나씩 처리한다.

## 형식
- [ ] T1. 작업 이름 — 완료 기준: (눈으로 확인할 수 있는 조건) — 관련 파일:

## 할 일

### 목표 1: 배포·갱신 안정화
- [ ] T3. 설치 기기 갱신 확인 — 완료 기준:
  - T1·T2를 적용한 판을 로컬 서버(`python -m http.server` 등, http)로 연다.
  - 한 번 연 뒤 파일 하나를 고치고 스크립트를 돌려 다시 연다. 이때 "새 버전이 나왔어요" 막대가 뜨고, 새로 고침하면 바뀐 내용이 보인다.
  - 개발자 도구에서 오프라인으로 바꾸고 다시 열어도 모든 탭이 열린다.
  - 지형 모식도의 한글 PDF 불러오기는 가능하면 확인하고, 확인하지 못했다면 못 했다고 적는다.
  - 결과를 이 항목 아래에 적는다.
  - 관련 파일: (확인 작업)
- [ ] T4. pwa.js 주석 바로잡기 — 완료 기준: "하루에 한 번쯤 새 버전 확인" 주석이 실제 간격(6시간)과 맞는다. 동작은 바꾸지 않는다. — 관련 파일: js/pwa.js

### 목표 2: 사용성 개선
- [ ] T5. 그래프→백지도 넘길 때 출처 이름이 비는 버그 — 완료 기준:
  - `shell.js:168`의 `fromName`이 `TOOLS`에 없는 `.tab` 대신 실제로 있는 값(예: `name`에서 "그래프 편집기"를 뺀 "기후" 등)을 쓴다.
  - 기후 탭에서 지점을 넣고 백지도 자동 생성으로 넘기면, 백지도 쪽 안내에 "기후 탭" 같은 출처가 보인다.
  - 백지도 쪽이 `fromName`을 어떻게 표시하는지 mapquick.js에서 먼저 확인한다.
  - 관련 파일: js/shell.js, js/tools/mapquick.js
- [ ] T6. 불러오기 실패 문구를 교사용으로 — 완료 기준:
  - `shell.js:92`(자료·라이브러리 파일을 받지 못함)는 "인터넷 연결을 확인하고 다시 시도해 주세요. 계속되면 새로 고침해 주세요"처럼 교사가 할 수 있는 행동만 안내한다.
  - `shell.js:58`(옛 자료 파일) 문구도 같은 방식으로 바꾼다.
  - 관리자용 정보(어떤 파일인지)는 `console.warn`으로만 남긴다.
  - '다시 시도' 단추는 그대로 둔다.
  - 관련 파일: js/shell.js
- [ ] T7. README 버전 갱신 — 완료 기준: T5·T6 등 사용자에게 보이는 변경을 main에 병합할 때, README의 `ver 1.0.(2026. 10. 6.)`을 새 버전과 날짜로 바꾼다. — 관련 파일: README.md

### 보류(큰 틀 담당이 먼저 할 일)
- [ ] B1. 실제 화면 사용성 점검 — 공개 주소에서 처음 쓰는 교사 흐름으로 홈→각 도구→내보내기를 직접 써 보고, 헤매는 지점을 T8 이후 항목으로 추가한다. 수행 담당은 손대지 않는다.

## 진행 중

## 완료
- [x] T2. 쓰이지 않는 `data/arid.js` 정리 — 완료 기준:
  - 저장소 전체에서 `arid`를 참조하는 곳이 없음을 다시 확인한다(참조 0건).
    - 검색 범위: `index.html`, `guide.html`, `licenses.html`, `sw.js`, `js/` 전체(`js/engines/`, `js/tools/` 하위 포함), `css/`, `data/`.
    - 예: `git grep -n "arid"`. 이미 확인한 `js/engines/engine.js`의 옛 작업 파일 변환 코드(`kind:'arid'`)는 파일 참조가 아니므로 건드리지 않는다.
  - 확인되면 파일을 지우고, T1 스크립트를 다시 돌려 `CORE`에 들어가지 않았는지 본다.
  - licenses.html에 이 파일만을 위한 출처 줄이 있었다면 함께 정리한다.
  - 관련 파일: data/arid.js, licenses.html
  - 완료 확인 (2026-11-14): 삭제 전 `git grep -n "arid"`로 전체 참조를 확인. 실행 코드의 파일 로딩 참조는 없으며, T1 생성 CORE·DATAVER 항목은 스크립트로 제거. engine.js의 옛 작업 변환, ldata.js의 지형 id, places.js의 지명 문자열은 유지.
  - `licenses.html` 직접 확인: 해당 파일만을 위한 출처 줄 없음. 기존 쾨펜 기후 자료 출처는 유지.
  - `git rm -- data/arid.js` 후 `node scripts/stamp.mjs` 실행: sw.js·js/shell.js 갱신. CORE에서 data/arid.js 제외, DATAVER의 arid 제거, 파일 삭제를 Node assert로 확인. `node scripts/stamp.mjs --check` 종료 코드 0.
  - V: gm-3bf2f50451 → gm-61620ece92. CORE: 114 → 113개, data/arid.js만 제외. 앱 화면·설치 기기·오프라인 확인(T3)은 수행하지 않음.

- [x] T1. 버전 도장 스크립트 만들기 — 내용:
  - `scripts/stamp.mjs`를 만든다. Node 내장 모듈만 쓴다(`fs`, `path`, `crypto`, `child_process`, `url`).
  - (a) 배포 대상 파일로 `sw.js`의 `CORE` 목록을 다시 만든다. 대상: `"./"`(현재 CORE의 첫 항목. 스크립트는 이 항목을 항상 맨 앞에 둔다), `index.html`, `manifest.webmanifest`, `licenses.html`, `guide.html`, `icons/`, `data/`, `fonts/`, `lib/`(`lib/pdfjs/cmaps/` 포함), `css/`, `js/`. 제외: `scripts/`, `*.md`, `LICENSE`, `sw.js` 자신.
  - 해시 전 줄바꿈 규칙: 이 PC는 Git 자동 줄바꿈 변환(CRLF)이 켜져 있다. 그래서 파일을 그대로 해시하면 다른 PC나 GitHub에서 받은 사본과 해시가 달라진다.
    - 텍스트 파일(`.js` `.css` `.html` `.txt` `.webmanifest`)은 읽은 뒤 `\r\n`을 `\n`으로 바꾸고 해시한다.
    - 바이너리 파일(`.png` `.woff2` `.bcmap` 등)은 그대로 해시한다.
    - 이 규칙은 (b)와 (c) 모두에 적용한다.
  - (b) 각 `data/*.js`의 끝줄 `GMVER` 값을 그 파일 본문(끝줄 제외)의 해시 10자리로 바꾸고, `shell.js`의 `DATAVER`도 같은 값으로 맞춘다. 해시는 위 줄바꿈 규칙을 따른다.
  - (c) `V`를 `'gm-'+`(CORE 파일 전체 내용 해시 10자리)로 바꾼다. 해시는 위 줄바꿈 규칙을 따른다.
  - (d) `--check` 옵션을 주면 파일을 고치지 않고, 어긋난 곳이 있을 때만 목록을 출력하고 종료 코드 1로 끝난다.
  - 메모: `lib/pdfjs/cmaps/`(25개, 약 0.16MB)를 CORE에 넣으면 기기 저장 용량이 약 0.2MB 늘어난다. 한글 PDF 불러오기를 오프라인에서도 되게 하려는 것이다.
  - 완료 기준:
    - `node scripts/stamp.mjs`를 두 번 연달아 실행해도 두 번째 실행은 아무것도 바꾸지 않는다(`git diff`로 확인).
    - 아무 `css` 파일에 공백 한 칸을 넣고 실행하면 `V`만 바뀐다.
    - `--check`가 어긋남을 찾아낸다.
    - 작업 폴더의 텍스트 파일을 CRLF로 바꾼 사본에서도 같은 `V`와 `GMVER`가 나온다.
    - 생성된 CORE의 첫 항목이 `"./"`이다.
  - 관련 파일: scripts/stamp.mjs(새 파일), sw.js, js/shell.js, data/*.js
  - 완료 확인 (2026-11-14, 임시 Git 저장소에서 Node 검증 스크립트로 실제 실행):
    - 반복 실행: `node scripts/stamp.mjs` 두 번째 실행 전후 `git diff --binary` 동일.
    - CSS 공백 추가: 실행 후 생성 파일은 sw.js의 V만 변경됨.
    - `--check`: 정상은 출력 없이 0, CSS 변경 시 stderr 안내와 sw.js 목록/1, 파일 수정 없음. 잘못된 인자·파일 누락·GMVER 형식 오류·Git 저장소 밖 실행은 2.
    - CRLF 사본: 텍스트 전체를 CRLF로 변환 후 V와 자료 16개의 GMVER 동일, `--check` 0. 바이너리는 변환 없이 해시.
    - CORE 첫 항목 `"./"` 확인.
    - 보완: Git 추적 배포 파일만 로케일 무관 정렬; 미추적 Thumbs.db/desktop.ini는 경고 후 제외하고 검사 뒤 삭제; 추적 파일 누락과 GMVER 뒤 코드가 있는 사본은 오류 2, 한국어 복구 안내 확인. root는 try 안에서 fileURLToPath로 계산.
    - 앱 화면·설치 기기·실제 오프라인 동작은 T1 범위에서 확인하지 않음.
  - 추가 보완 A~D 확인 (2026-11-14, 로컬 저장소를 임시 git clone한 뒤 변경된 스크립트를 복사하여 시험):
    - A: 미추적 css/new.css가 있으면 `node scripts/stamp.mjs --check`는 1, 쓰기 모드는 경고와 함께 0이며 CORE에서 제외. Thumbs.db도 제외. .gitignore로 무시한 CSS는 검사 0.
    - B: cwd의 Git 검사를 제거하고 스크립트 root만 확인. 저장소 밖 폴더에서 절대 경로로 스크립트의 --check 실행 시 0.
    - C: 텍스트(.json .svg .mjs .map 추가)·바이너리(.png .woff2 .bcmap .jpg .ico .webp) 확장자 명시. 현재 자료는 오류 없음, css/x.foo를 git add한 사본은 파일명과 분류 추가 안내/2. LF·CRLF 사본에서 V·GMVER 동일, 추가 텍스트 확장자의 줄바꿈 정규화와 바이너리 바이트 보존 확인.
    - D: --check에서 git diff --name-only HEAD로 미커밋 배포 수정 경고. 스테이징 전후 모두 도장이 맞으면 0이며 작업 폴더 기준 해시 안내 출력.
    - 작업 폴더 마무리: `node scripts/stamp.mjs`는 이미 최신 도장(변경 없음), `node scripts/stamp.mjs --check`는 0. V gm-61620ece92와 CORE 113개 유지.
    - 회귀 확인: 연속 실행 전후 git diff --binary 동일, CSS 공백 추가 시 생성 결과 V만 변경, 도장 불일치 1·실행 오류 2, CORE 첫 항목 "./" 유지.


- [x] T0. 구조 진단과 PLAN·TASKS 작성, AGENTS.md 앱별 메모 점검 — 2026-11-14, 큰 틀 담당. 코드 수정은 하지 않음.
