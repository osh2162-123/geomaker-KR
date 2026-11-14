# TASKS.md — 지리 자료 제작기(geomaker-KR)

PLAN.md의 목표를 작은 작업으로 나눈다. 수행 담당은 위에서부터 하나씩 처리한다.

## 형식
- [ ] T1. 작업 이름 — 완료 기준: (눈으로 확인할 수 있는 조건) — 관련 파일:

## 할 일

### 배포 묶음 2 — 브랜치 `feat/t4-t8-cleanup`, 한 PR로 한 번만 병합 (PLAN 결정 기록 2026-11-15)
순서: T4(완료) → T8 → T5 → T6 → T7 → M2. 각 작업은 커밋하지 않고 끝낸다. 큰 틀 담당이 검토한 뒤 사용자가 커밋한다.

- [x] T5. 표 탭(에너지·종교·인구·농업)에서 백지도로 넘길 때 출처 이름이 비는 버그 — 완료 기준:
  - 원인: `shell.js:168`이 `TOOLS`에 없는 `.tab` 속성을 읽어 `fromName`이 늘 빈 문자열이다. 그래서 `mapquick.js:241`의 안내가 "표의 나라를 칠한 지도를 만들었어요"로만 나온다. 기후 탭은 `mapquick.js:241`에 "기후 탭의 지점으로…" 문구가 따로 있어 영향이 없다(큰 틀 담당 확인, 2026-11-15).
  - 고칠 것: `fromName`을 `TOOLS`의 `name`에서 만든다. 예: "에너지 그래프 편집기" → "에너지 탭". 고치는 곳은 shell.js 한 곳뿐이고, mapquick.js 문구는 바꾸지 않는다.
  - 완료 기준:
    - 에너지·종교·인구·농업 탭에서 백지도 자동 생성으로 넘기면 안내가 "에너지 탭의 나라를 칠한 지도를 만들었어요…"처럼 탭 이름으로 나온다.
    - 기후 탭에서 넘길 때의 안내는 바뀌지 않는다.
    - `fromName`을 만들지 못하면 지금처럼 "표"로 나온다.
    - 도장을 다시 찍고 `--check`가 0이다.
  - 관련 파일: js/shell.js (읽기만: js/tools/mapquick.js)
  - 완료 확인 (2026-11-15, Node): 실제 TOOLS 배열과 수정한 fromName 식을 읽어 vm으로 계산하고 mapquick.js의 실제 안내문 조건식을 실행. climate→기후 탭, energy→에너지 탭, religion→종교 탭, population→인구 탭, agriculture→농업 탭 출력 확인. 네 표 탭은 각 탭 이름의 나라 안내, 기후는 기존 지점 안내 그대로, 알 수 없는 id는 빈 fromName과 "표" 안내 확인.
  - node --check js/shell.js 통과. node scripts/stamp.mjs 실행 후 --check 종료 코드 0(기존 T8과 이번 수정의 미커밋 경고만 출력). mapquick.js 변경 없음. 기존 T8 변경은 보존. 브라우저 화면의 직접 클릭·안내 표시는 확인하지 못함.
  - V gm-073156656f → gm-0bbc917d6c, CORE 113개 유지(추가·제외 없음). README는 묶음 마지막 T7에서 갱신하는 PLAN/TASKS 범위에 따라 이번에는 수정하지 않음.
- [x] T6. 불러오기 실패·옛 자료 문구를 교사용으로 — 내용:
  - 배경: 두 문구 모두 사이트 관리자용이다. 공개 주소를 쓰는 교사는 폴더를 올릴 수 없다.
    - `shell.js:92`(웹 판에서 자료·라이브러리 파일을 받지 못함): "data·lib·icons 폴더가 올라가 있는지 확인해 주세요"
    - `shell.js:58`(옛 자료 파일 경고): "data 폴더 안에 새 파일을 올려 주세요"
  - 교사 쪽에서 실제로 이 상황이 생기는 경우: 인터넷이 끊긴 채 처음 여는 도구, 그리고 옛 탭을 열어 둔 채 다른 탭에서 새 버전으로 갱신한 경우(T3에서 확인하지 못한 항목).
  - 고칠 것 (문구는 예시이며 뜻이 같으면 다듬어도 된다):
    - 92행(웹 판): "자료를 불러오지 못했어요. 인터넷 연결을 확인하고 '다시 시도'를 눌러 주세요. 계속 안 되면 페이지를 새로 고쳐 주세요." 라이브러리 실패도 같은 문구로 한다.
    - 58행: "새 버전이 나와 화면과 자료가 맞지 않아요. 새로 고치면 최신 판으로 열려요." 그리고 `location.reload()`를 부르는 '새로 고침' 단추를 더한다. 단추 모양은 pwa.js 알림 막대의 `hub-btn`을 쓴다. 닫기(×)는 그대로 둔다.
    - 어떤 파일이 문제인지는 두 경우 모두 `console.warn`으로만 남긴다(58행은 이미 있음).
  - 바꾸지 않을 것: '다시 시도' 단추, `MODE!=='web'`일 때의 기존 문구(89~90행), `checkVer`가 언제 경고를 띄우는지 판단하는 조건.
  - 완료 기준:
    - 두 문구에 "폴더", "올려" 같은 관리자용 표현이 없다.
    - 58행 막대에 '새로 고침' 단추가 있고, 누르면 다시 열린다.
    - 콘솔 경고에 파일 이름이 남는다.
    - `node --check js/shell.js`가 통과하고, 도장을 다시 찍은 뒤 `--check`가 0이다.
    - 사용자에게 보이는 변경이므로 T7(README 버전)이 필요하다고 기록한다.
  - 관련 파일: js/shell.js (참고: js/pwa.js의 bar 함수, css에서 hub-btn 정의)
  - 완료 확인 (2026-11-15, Node vm): 실제 checkVer를 가짜 document에서 실행. 미등록 키·버전 일치 시 막대 없음, 불일치 시 관리자 표현·파일명이 없는 안내와 hub-btn 새로 고침 생성, 클릭 시 location.reload 1회, 닫기 × 동작, console.warn 파일명 확인. 실제 mount도 실행하여 웹 판 자료·라이브러리 실패의 동일 안내 및 콘솔 파일명을 확인. 비웹 기존 문구와 다시 시도 콜백 유지 확인.
  - node --check js/shell.js, node scripts/stamp.mjs, node scripts/stamp.mjs --check 모두 0. 브라우저 화면·실제 네트워크 실패·실제 새로 고침은 직접 확인하지 못함. 기존 T8·T5 변경 보존.
  - 사용자에게 보이는 변경 → T7 필요. README 갱신은 묶음 마지막 T7에서 수행. V gm-0bbc917d6c → gm-e0bc607cf7, CORE 113개 유지(추가·제외 없음).
- [x] T7. README 버전 갱신 — 완료 기준: 묶음의 마지막 작업으로 한다. T5·T6처럼 사용자에게 보이는 변경이 들어갔으면, README의 `ver 1.0.(2026. 10. 6.)`을 새 버전(예: ver 1.1.)과 병합 날짜로 바꾼다. README는 배포 대상이 아니므로 도장을 다시 찍을 필요는 없다. — 관련 파일: README.md
  - 완료 확인 (2026-11-15): README의 버전을 ver 1.1.(2026. 11. 15.)로, AGENTS의 현재 버전을 ver 1.1로 수정. Node assert로 기존 버전 문자열 부재와 지정 문자열 외 원문 동일 확인. node scripts/stamp.mjs --check 종료 코드 0, sw.js 바이트 동일. git diff의 변경 파일은 README.md·AGENTS.md·TASKS.md뿐임을 확인. 커밋하지 않음.
- [ ] M2. 병합 전 점검(큰 틀 담당 + 사용자) — 완료 기준:
  - 새로 받은 사본(`git clone`)에서 `node scripts/stamp.mjs --check`가 0이다.
  - PR diff(`origin/main...HEAD`)에 묶음 2 밖의 변경이 없다.
  - 일반 크롬과 로컬 서버로 다음을 확인한다.
    - 직전 배포판(main)을 설치한 상태에서 "새 버전" 막대가 뜬다.
    - 캐시에 새 `V` 하나만 남는다.
    - Network 탭에 404가 없다(T8 글꼴 포함).
    - 오프라인에서 11개 탭이 열린다.
  - `V`가 바뀌는 병합이므로 외부 점검을 한 번 받는다.
  - 병합 뒤 공개 주소에서, 배포된 sw.js의 `V`가 맞는지와 404가 없는지 확인한다.

### 보류(큰 틀 담당이 먼저 할 일)
- [ ] B1. 실제 화면 사용성 점검 — 공개 주소에서 처음 쓰는 교사 흐름으로 홈→각 도구→내보내기를 직접 써 보고, 헤매는 지점을 T8 이후 항목으로 추가한다. 수행 담당은 손대지 않는다.

## 진행 중

## 완료
- [x] T8. 없는 글꼴 파일을 요청하는 404 없애기 — 내용:
  - 증상: `css/base.css` 2번째 줄의 `@font-face`("Pretendard Variable", `font-weight:45 920`, `format("woff2-variations")`)가 존재하지 않는 `css/fonts/PretendardVariable.woff2`를 요청해, 공개 주소에서 404가 난다. 실제 글꼴은 `fonts/Pretendard-*.subset.woff2`(Regular·Medium·SemiBold·Bold)이고, `css/fonts.css`가 같은 family를 굵기 400·500·600·700으로 이미 선언한다.
  - 먼저 확인: 어떤 `@font-face`가 실제로 쓰이는지 본다.
    - 개발자 도구에서 `document.fonts`의 각 항목 상태(`status`: loaded/error)를 확인한다.
    - index.html의 css 로드 순서를 확인한다(현재 `fonts.css`가 `base.css`보다 먼저 로드됨).
    - 화면에서 400·500·600·700 밖의 굵기(예: 300, 800)를 쓰는 곳이 있는지 css에서 찾는다. base.css 선언이 가변 범위(45~920)를 맡고 있었기 때문이다.
  - 큰 틀 담당 사전 조사(2026-11-15): css·js·html 전체에서 쓰는 굵기는 400·500·600·700뿐이다(`--fw-*` 변수도 600·700). guide.html·licenses.html은 base.css를 부르지 않는다. 따라서 base.css 2번째 줄을 **지우는 쪽**을 권한다. 위 확인에서 다른 결과가 나오면 멈추고 알린다.
  - 고칠 것: base.css의 깨진 선언을 지우거나, 실제 파일을 가리키게 고친다. 새 글꼴 파일을 추가하는 것은 큰 변경이므로 하지 않는다(필요해 보이면 멈추고 물어본다).
  - 완료 기준:
    - 공개 판이나 로컬 서버에서 Network 탭에 해당 404가 없다.
    - 화면 글꼴이 이전과 같다(고치기 전과 후의 같은 화면을 눈으로 비교).
    - `node scripts/stamp.mjs`로 도장을 다시 찍고, `node scripts/stamp.mjs --check`가 0이다.
    - 사용자에게 보이는 변화가 없으면 README 버전은 올리지 않는다.
  - 관련 파일: css/base.css, css/fonts.css
  - 구현 및 정적 확인 (2026-11-15): css・js・html의 font-weight/fontWeight/font 축약형 및 --fw-* 변수를 전수 검색. 깨진 @font-face 범위(45 920)를 제외한 사용 굵기는 400·500·600·700(normal/기본값=400, bold=700). --fw-title=700, --fw-head/strong=600, --fw-body=400. index.html은 fonts.css → base.css 순서.
  - base.css 2번째 줄의 깨진 @font-face만 삭제. css/fonts.css 원문 동일 및 네 글꼴 URL의 파일 존재 확인. 새 글꼴 추가 없음, README 변경 없음.
  - 임시 git clone에서 node scripts/stamp.mjs와 --check 모두 0. 작업 폴더에서도 도장 실행 후 --check 0. CORE 113개 동일, V gm-a01bbb8ebc → gm-073156656f.
  - 미확인: 브라우저 연결 도구가 browser access host is unavailable을 반환하여 Chrome document.fonts 상태, Network의 404 부재, 수정 전후 화면 글꼴 비교는 직접 확인하지 못함. 코드 수정·도장 확인 완료이며 브라우저 완료 기준은 검토 시 확인 필요.

- [x] T4. pwa.js 주석 바로잡기 — 완료 기준: "하루에 한 번쯤 새 버전 확인" 주석이 실제 간격(6시간)과 맞는다. 동작은 바꾸지 않는다. — 관련 파일: js/pwa.js
  - 완료 확인 (2026-11-15): 주석을 "6시간마다 새 버전 확인"으로 수정. 기존 setInterval의 6*3600*1000과 나머지 코드는 변경 없음(주석 문자열을 되돌려 원문과 동일함을 비교).
  - 임시 git clone에서 node --check js/pwa.js, node scripts/stamp.mjs, node scripts/stamp.mjs --check 모두 종료 코드 0. CORE 목록 동일 확인. 작업 폴더에서도 도장 실행 후 --check 0 확인.
  - 앱 화면·실제 6시간 대기·설치 기기 동작은 확인하지 않음. T5 이후는 수행하지 않음.

- [x] T3. 설치 기기 갱신 확인 — 완료 기준:
  - T1·T2를 적용한 판을 로컬 서버(`python -m http.server` 등, http)로 연다.
  - 한 번 연 뒤 파일 하나를 고치고 스크립트를 돌려 다시 연다. 이때 "새 버전이 나왔어요" 막대가 뜨고, 새로 고침하면 바뀐 내용이 보인다.
  - 개발자 도구에서 오프라인으로 바꾸고 다시 열어도 모든 탭이 열린다.
  - 지형 모식도의 한글 PDF 불러오기는 가능하면 확인하고, 확인하지 못했다면 못 했다고 적는다.
  - 결과를 이 항목 아래에 적는다.
  - 관련 파일: (확인 작업)
  - 완료 확인 (2026-11-15, 승현의 크롬, 로컬 서버 http://localhost:5000, `npx serve`):
    - 갱신 확인 방식: 파일 하나를 고치는 대신, 옛 판(main)을 설치한 뒤 새 판(feat/t1-version-stamp)으로 바꿔 갱신 흐름을 확인함.
    - 옛 판(main) 설치: 서비스 워커 active, 캐시 `gm-8c3855b89c`에 88개 항목(옛 CORE와 일치).
    - 새 판으로 전환 후 새로 고침: "새 버전이 나왔어요" 막대가 떴음.
    - 갱신 후 Cache Storage:
      - `gm-61620ece92`만 남고 옛 `gm-8c3855b89c`는 삭제됨. `gmfonts`는 글꼴용으로 따로 유지됨.
      - CORE 113개가 모두 캐시에 있음(sw.js의 CORE와 캐시 키를 비교, 빠진 것 없음). `data/arid.js`는 없음.
      - CORE 외에 `sw.js` 한 개가 runtime으로 더 저장되어 있음. 기존 동작이고 갱신에는 영향이 없을 것으로 봄(직접 시험하지는 않음).
    - 설치 때 404: `addAll`이 성공해 새 캐시가 완성되었으므로 404가 없었다고 판단함.
    - 오프라인 열기: Network 탭의 Offline 체크, 서버를 끈 상태 두 경우 모두 11개 탭이 열림.
  - 확인하지 못한 것:
    - 옛 탭을 열어 둔 채 갱신할 때 "옛 자료 파일" 경고가 뜨는지(옛 DATAVER와 새 GMVER가 다를 수 있음). 병합 뒤 공개 주소에서 확인하거나 T6과 함께 다룬다.
    - 지형 모식도의 한글 PDF 불러오기(cmaps), 옛 작업 파일(`{kind:'arid'}`) 열기: 시험 자료가 없어 하지 못함.
    - 휴대폰·사파리 등 다른 기기와 브라우저.
    - GitHub Pages(CDN)를 거치는 갱신: 로컬 서버로만 확인함.
  - 참고: Claude 데스크톱 앱의 내장 브라우저에서는 서비스 워커가 등록되지 않아 이 확인에 쓰지 못했다. 앞으로도 설치·갱신 확인은 일반 크롬에서 한다.

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
