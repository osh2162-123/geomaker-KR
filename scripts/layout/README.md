# scripts/layout — 그래프 겹침 검사(묶음 E)

배포 파일이 아니다(도장 대상 아님). Node 내장 모듈과 이 PC의 크롬만 쓴다.

## 실행
```
node scripts/layout/run.mjs                         # scenarios/*.json 전부
node scripts/layout/run.mjs scripts/layout/scenarios/10-energy.json --only energy
node scripts/layout/run.mjs --snap ../layout-base.json   # 기준판 해시 저장
node scripts/layout/run.mjs --cmp  ../layout-base.json   # 기준판과 비교(회귀 검사)
```
- 결과: 저장소 밖 `../layout-out/` — `index.html`(걸린 사례 그림 모음), `results.json`(전체), `png/`
- 그림에서 빨강 상자 = 앞 항목(A), 파랑 상자 = 뒤 항목(B)
- 종료 코드: 0 정상(검출이 있어도 0), 1 회귀(`--cmp`에서 걸리지 않았던 그림이 바뀜), 2 실행 오류

## 판정 규칙
| 규칙 | 뜻 |
|---|---|
| T | 글자–글자 겹침 |
| L | 범례 영역이 데이터(막대·점·선·면)나 다른 글자와 겹침 |
| M | 글자가 데이터 점이나 선(1.5 mm보다 긴 직선, 점선 격자 제외) 위에 걸침 |
| E | 글자가 채운 막대·면의 경계에 걸침(완전히 안쪽·바깥쪽은 정상) |
| O | 글자가 틀·패널·표 칸(채움 없는 테두리 상자)의 선을 가로지름(완전히 안쪽·바깥쪽은 정상) |
| G | 같은 줄 글자 사이가 0.3 mm 미만(경고). `100(%)`처럼 단위를 붙이는 것은 제외 |

## 시나리오 파일 형식 (`scenarios/*.json`, 배열)
```json
[
 {"id":"ene-g-001","app":"energy","q":"미국, 중국, 인도의 석탄 소비량 묶은 막대 (2024)"},
 {"id":"ene-g-002","app":"energy","q":"미국, 중국, 인도의 석탄 소비량 묶은 막대 (2024)",
  "kind":"group","set":{"group.legend":"right","group.values":true}},
 {"id":"ene-g-003","app":"energy","q":"브라질, 미국, 중국의 1차 에너지 소비 구조",
  "vary":{"kind":["stack","donut","tree"],"stack.legend":["bottom","right","none"]}}
]
```
- `id`(필수, 파일 전체에서 겹치지 않게): `앱 세 글자-주제-번호`. `vary`를 쓰면 자동으로 `[...]` 꼬리가 붙는다.
- `app`(필수): `climate` `energy` `religion` `population` `agriculture`
- `q`: 그 탭의 '문장으로 만들기'에 넣을 문장. 해석에 실패하면 결과에 `parseFail`로 남는다(그것도 쓸모 있는 정보).
- `kind`: 그래프 종류를 바꿈. 앱마다 값이 다름(아래 표).
- `set`: 문서의 설정을 `경로: 값`으로 바꿈. 예: `"stack.inLbl":"both"`, `"meta.title":"아주 긴 제목 …"`
- `patch`: 문서에 깊게 합칠 객체(자료를 직접 넣을 때). 보통은 `q`로 충분하다.
- `vary`: `{경로:[값…]}`의 모든 조합을 만든다. 경로에 `kind`를 쓰면 종류를 바꾼다. **조합 수는 시나리오 하나당 24개 이하**로.
- 같은 `q`는 한 번만 해석하고 결과 문서를 복사해 쓴다. 문장 해석의 무작위(‘섞어서’)는 씨앗을 고정해 늘 같은 결과가 나온다.

## 앱별 종류(kind)와 자주 바꿀 설정
설정 이름은 엔진의 `freshDoc`(js/engines/*.js)에 있다. 모르면 `kind`와 `q`만 써도 된다.

| app | kind | 자주 바꿀 설정(예) |
|---|---|---|
| energy | stack donut tree group small tb | `stack.dir` h/v, `stack.inLbl` none/name/value/both, `stack.legend` bottom/right/none, `group.legend` in/right/bottom/none, `group.values` true/false, `donut.inLbl`, `donut.legend` |
| religion | rank stack donut tri bars group tb | `tri.*`, `bars.*`, 그 밖은 energy와 같은 구조 |
| population | sc line dumb group tb tree stack pyr tri cube | `sc.*`, `line.*`, `dumb.legend`, `pyr.*` |
| agriculture | stack donut tree group small sc tb list | energy와 같은 구조 + `sc.*` |
| climate | climo line cat sc rd tb | 문장 해석이 다른 탭과 다르다(지점 이름 중심) |

## 시나리오를 만들 때 넣을 변형(E1)
- 행(나라·지역) 수: 2, 3, 5, 8, 10
- 긴 이름: 콩고 민주 공화국, 앵글로아메리카, 중·남부 아메리카, 아시아·태평양, 사우디아라비아
- 값: 음수, 0에 가까운 아주 작은 값, 한 항목만 아주 큰 값, 비슷한 값끼리 몰림
- 범례 위치 전부, 막대 안 글자 모드 전부, 가로/세로 방향
- 긴 제목·주석, 기호((가)~(라), A~D, ㉠~㉣)

## 알려진 한계
- O는 테두리를 **가로지르는** 경우만 잡는다. 글자가 의도한 패널에서 완전히 벗어났지만 테두리와 교차하지 않는 경우는 대개 다른 글자·막대와 겹쳐 T/L/M/E로 잡히므로 별도 규칙을 두지 않았다. 그림 전체 밖으로 나가는 일은 없다(그림 크기가 모든 글자 상자를 감싸도록 계산됨).
- 글자 크기는 이 PC에 설치된 글꼴로 잰다. HY신명조가 없으면 대체 글꼴로 재므로 실제 시험지 글꼴과 조금 다를 수 있다.
- 보기 좋음(지시선이 지나치게 길다, 이름표가 멀리 떨어졌다 등)은 판정하지 않는다. 걸린 사례를 고친 뒤에는 그림을 눈으로 확인한다.
