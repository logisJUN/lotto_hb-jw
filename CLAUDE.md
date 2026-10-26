# 로또랩 (LottoLab)

빌드 과정 없는 정적 모바일 웹앱입니다. GitHub Pages가 `main` 브랜치를 그대로 배포합니다.

## 작업 규칙

- 코드를 고친 뒤 PR을 만들지 말고 `main`에 바로 커밋하고 푸시합니다. (저장소 주인이 허락함)
- 푸시하기 전에 바꾼 화면을 브라우저로 열어 오류가 없는지 확인합니다.
- 답변과 커밋 메시지는 한국어로 씁니다.
- 기능을 추가하거나 바꿀 때마다 `CHANGELOG.md` 맨 위에 기록을 추가해 같은 커밋에 넣습니다. 형식: `## 날짜 · 제목` 아래 **생긴 기능**(무엇이 생기거나 바뀌었는지)과 **사용 방법**(어느 화면에서 무엇을 누르는지), 계산 방식이 있으면 그 설명. 사용자가 읽는 메모이므로 쉬운 말로 씁니다. 바뀐 기능이 README의 설명과 다르면 README도 함께 고칩니다.

## 구조

- `index.html`(홈), `combiner.html`(번호 생성), `stats.html`(통계), `simulator.html`(당첨 조회), `vault.html`(보관함). `body`의 `data-page`로 구분합니다.
- HTML에는 화면 뼈대만 있고, 머리말(`#top`)과 하단 탭(`#tabbar`), 데이터로 채우는 내용은 `js/app.js`가 그립니다. 다섯 페이지의 `<head>`와 틀은 똑같이 유지합니다.
- `css/style.css`: 맨 위 `:root`(라이트)와 `[data-theme="dark"]`의 색 토큰, 그 아래 공통 컴포넌트(`.card`, `.btn`, `.seg`, `.chip`, `.switch`, `.ball`, `.board`, `.bars` 등). 화면 코드에 색 값을 직접 쓰지 말고 토큰을 씁니다.
- 색 역할: `--primary` 브랜드·주요 버튼·선택, `--prize` 당첨금, `--win` 당첨·일치, `--danger` 삭제·제외. 로또 공 색은 `.ball.y/.b/.r/.g/.n`에만 씁니다.
- `js/app.js`: 공통(데이터 읽기, 등수 계산 `rankOf`, 가장 많이 맞은 회차 `findBestMatches`, 번호 생성 `generate`, 6개 고르기 판 `makePicker`, 보관함, 테마) 다음에 화면별 `initHome`/`initGenerate`/`initStats`(+`initBestMatch`)/`initCheck`/`initVault`.
- 아래에서 올라오는 창은 `<dialog class="sheet">`를 씁니다(통계의 번호 고르기 창, 당첨 조회의 QR 카메라 창).
- 용지 QR: `parseTicket`(주소의 `v=` → 회차 4자리 + 게임마다 글자 1자·12자리), `readQR`(BarcodeDetector가 없으면 `js/vendor/jsQR.min.js`를 그때 불러옴), 화면은 `initQr`. 외부 CDN은 쓰지 않습니다.
- `data/lotto.json`: 1회부터 최신 회차까지 당첨번호, 1~5등 당첨금(`prizes`)과 당첨자 수(`winners`). 회차당 한 줄이며 직접 고치지 않습니다.
- `scripts/fetch-lotto.mjs`: 동행복권 `lt645/selectPstLt645Info.do`에서 새 회차를 받아 `data/lotto.json`에 추가합니다.
- `.github/workflows/update-lotto.yml`: 매주 토요일 21:07, 일요일 09:07(KST)에 위 스크립트와 `scripts/analyze.mjs`를 실행하고 `data`·`analysis`를 `main`에 커밋합니다.
- 억지 분석: 규칙은 `js/rules.js`(브라우저·Node 겸용, `evaluate`·`summary`) 하나에 둡니다. 통계 탭 카드는 `initRules`, GitHub 기록은 `scripts/analyze.mjs`가 같은 규칙으로 `analysis/<회차>.md`(한 번 쓰면 덮어쓰지 않음)와 `analysis/README.md`(매번 새로 씀)를 만듭니다. 규칙을 추가할 때는 목록 끝에 붙이고 `since`에 만든 회차를 적으며, 이미 있는 규칙의 `id`·조건은 바꾸지 않습니다(성적 기록이 이어지도록). 예측·추천에는 쓰지 않습니다.

## 알아둘 점

- 화면의 모든 수치는 `data/lotto.json`으로 계산합니다. 근거 없는 수치나 "당첨 확률을 높인다"는 식의 문구는 넣지 않습니다.
- 보관함 항목(`lottolab.vault`)은 `{nums, label, at, weekly?, round?}` 형식입니다. `round`가 있으면(QR 용지) 그 회차로, 없으면 저장 시각 이후 첫 추첨으로 당첨 여부를 판단하고, `weekly: true`(매주 구매)면 저장 시각 이후 모든 추첨을 확인해 누적합니다(`vaultResult`, `weeklyTotals`).
- 보관함 백업: 파일은 `{app:'lottolab', version:1, exportedAt, items}`, 링크는 `vault.html#import=<base64url>`(항목을 `n`·`t`·`l`·`w`·`r`로 줄임). 가져올 때는 `cleanItem`으로 검사하고 `mergeVault`가 번호·회차·저장 시각이 같은 항목을 건너뜁니다. 보관함 항목 형식을 바꾸면 이 세 곳과 `version`도 함께 맞춥니다.
- 로컬 확인은 `python3 -m http.server`로 띄워서 합니다. `file://`로 열면 `data/lotto.json`을 읽지 못합니다. 라이트·다크 둘 다 390px 폭에서 확인합니다.
