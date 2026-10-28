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
- `js/app.js`: 공통(데이터 읽기, 등수 계산 `rankOf`, 가장 많이 맞은 회차 `findBestMatches`, 번호 생성 `generate`, 6개 고르기 판 `makePicker`, 보관함, 테마) 다음에 화면별 `initHome`/`initGenerate`/`initStats`(+`initBestMatch`: 내 번호 맞춰보기 = 매주 샀을 때의 당첨 성적 + 가장 많이 맞은 회차)/`initCheck`(회차별 조회·용지 QR, 예전 `simulator.html#mine`은 `stats.html#best`로 보냄)/`initVault`.
- 번호 생성 조건: 연속 번호(`runMin`)·같은 끝자리(`endMin`)·지난 회차 번호는 넣기/빼기를 고릅니다(`runIn`·`endIn`·`lastIn`, 기본은 빼기). 넣기는 `generate`가 조건에 맞는 번호를 먼저 넣고 나머지를 채운 뒤 모든 조건을 다시 검사합니다.
- 사주 번호: 계산은 `js/saju.js`(브라우저·Node 겸용: `pillars`, `dayPillar`, `weeklyNumbers`), 화면은 번호 생성의 `initSaju`(탭 `#saju`). 시드는 `생년월일|시|다음 추첨 회차`라서 같은 주에는 항상 같은 번호가 나와야 합니다. 이 시드나 가중치를 바꾸면 그 주의 번호가 바뀌므로 CHANGELOG에 알립니다. 마지막 입력은 `lottolab.saju`에 저장합니다(`{cal:'solar', date, hour}` 또는 `{cal:'lunar', ly, lm, ld, leap, hour}`). 음력은 `js/vendor/korean-lunar-calendar.min.js`(KASI 기준, 필요할 때만 불러옴)로 양력으로 바꾼 뒤 같은 계산을 하므로, 시드는 항상 양력 날짜입니다.
- 화면 안 탭은 `role="tablist"` + `data-tab` 버튼과 `#tab-<이름>` 패널로 만들고, 주소 `#이름`으로 바로 열립니다(통계는 공통 `setupTabs`, 번호 생성·당첨 조회는 각자). 새 기능을 추가하면 **홈의 기능 지도(`index.html`의 `.menu-grid`)에도 타일을 추가**해 찾아갈 수 있게 합니다.
- 아래에서 올라오는 창은 `<dialog class="sheet">`를 씁니다(통계의 번호 고르기 창, 당첨 조회의 QR 카메라 창).
- 용지 QR: `parseTicket`(주소의 `v=` → 회차 4자리 + 게임마다 글자 1자·12자리), `readQR`(BarcodeDetector가 없으면 `js/vendor/jsQR.min.js`를 그때 불러옴), 화면은 `initQr`. 외부 CDN은 쓰지 않습니다.
- `data/lotto.json`: 1회부터 최신 회차까지 당첨번호, 1~5등 당첨금(`prizes`)과 당첨자 수(`winners`). 회차당 한 줄이며 직접 고치지 않습니다.
- `scripts/fetch-lotto.mjs`: 동행복권 `lt645/selectPstLt645Info.do`에서 새 회차를 받아 `data/lotto.json`에 추가합니다.
- `.github/workflows/update-lotto.yml`: 토 21:07·21:47·22:37, 일 00:07·09:07·15:07(KST)에 위 스크립트와 `scripts/analyze.mjs`를 실행하고 `data`·`analysis`를 `main`에 커밋합니다(push 전 `pull --rebase`, 최대 3번). 수집 스크립트는 다음 추첨 전이면 바로 끝나고, 손으로 실행하면(`FORCE=1`) 항상 확인합니다. Actions는 커밋 해시로 고정합니다.
- 패턴 분석: 규칙은 `js/rules.js`(브라우저·Node 겸용, `evaluate`·`summary`) 하나에 둡니다. 통계 탭 카드는 `initRules`(계산은 `js/rules-worker.js` Web Worker, 안 되면 메인 스레드), GitHub 기록은 `scripts/analyze.mjs`가 같은 규칙으로 `analysis/<회차>.md`(한 번 쓰면 덮어쓰지 않음)와 `analysis/README.md`(매번 새로 씀)를 만듭니다. 규칙을 추가할 때는 목록 끝에 붙이고 `since`에 만든 회차를 적으며, 이미 있는 규칙의 `id`·조건은 바꾸지 않습니다(성적 기록이 이어지도록). 예측·추천에는 쓰지 않습니다.

## 알아둘 점

- **보관함은 지금 숨김 상태입니다**(사용자 요청). `js/app.js`의 `VAULT_ON = false`면 하단 탭에서 빠지고, `data-vault`가 붙은 요소(홈의 내 번호 관리·내 번호 결과, 저장 버튼, 당첨 조회의 보관함에서 불러오기 등)는 CSS `html:not(.vault-on) [data-vault]`로 숨기며, `vault.html`은 홈으로 보냅니다. 저장과 관련된 화면 요소를 새로 만들면 `data-vault`를 붙입니다. 다시 켜 달라고 하면 `VAULT_ON = true`로 바꾸고 README·CHANGELOG를 맞춥니다.
- 화면의 모든 수치는 `data/lotto.json`으로 계산합니다. 근거 없는 수치나 "당첨 확률을 높인다"는 식의 문구는 넣지 않습니다.
- 보관함은 최대 `VAULT_MAX`(500)게임입니다. 가득 차면 저장·가져오기를 막고 알리며, 있던 항목을 지우지 않습니다. 결과가 없는 항목의 대상 회차는 **저장 시각** 기준(`drawAfter`)이고, 추첨이 지났는데 데이터가 없으면 "결과 수집 중"(`pendingDraw`, `roundAt`)으로 표시합니다. `nextDraw`는 지금 이후 첫 추첨입니다.
- 보관함 항목(`lottolab.vault`)은 `{nums, label, at, weekly?, round?}` 형식입니다. `round`가 있으면(QR 용지) 그 회차로, 없으면 저장 시각 이후 첫 추첨으로 당첨 여부를 판단하고, `weekly: true`(매주 구매)면 저장 시각 이후 모든 추첨을 확인해 누적합니다(`vaultResult`, `weeklyTotals`).
- 보관함 백업: 파일은 `{app:'lottolab', version:1, exportedAt, items}`, 링크는 `vault.html#import=<base64url>`(항목을 `n`·`t`·`l`·`w`·`r`로 줄임). 가져올 때는 `cleanItem`으로 검사하고(번호, 저장 시각 2002-12 ~ 지금+1일), `mergeVault`가 번호·회차·저장 시각이 같은 항목을 건너뜁니다. 보관함 항목 형식을 바꾸면 이 세 곳과 `version`도 함께 맞춥니다.
- CSS의 `color-mix`·`cqw`에는 지원하지 않는 브라우저용 기본값(앞줄 값 또는 `@supports not`)을 함께 둡니다.
- 로컬 확인은 `python3 -m http.server`로 띄워서 합니다. `file://`로 열면 `data/lotto.json`을 읽지 못합니다. 라이트·다크 둘 다 390px 폭에서 확인합니다.
