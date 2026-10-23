# 로또랩 (LottoLab)

빌드 과정 없는 정적 모바일 웹앱입니다. GitHub Pages가 `main` 브랜치를 그대로 배포합니다.

## 작업 규칙

- 코드를 고친 뒤 PR을 만들지 말고 `main`에 바로 커밋하고 푸시합니다. (저장소 주인이 허락함)
- 푸시하기 전에 바꾼 화면을 브라우저로 열어 오류가 없는지 확인합니다.
- 답변과 커밋 메시지는 한국어로 씁니다.

## 구조

- `index.html`(홈), `combiner.html`(번호 생성), `stats.html`(통계), `simulator.html`(당첨 조회), `vault.html`(보관함). `body`의 `data-page`로 구분합니다.
- HTML에는 화면 뼈대만 있고, 머리말(`#top`)과 하단 탭(`#tabbar`), 데이터로 채우는 내용은 `js/app.js`가 그립니다. 다섯 페이지의 `<head>`와 틀은 똑같이 유지합니다.
- `css/style.css`: 맨 위 `:root`(라이트)와 `[data-theme="dark"]`의 색 토큰, 그 아래 공통 컴포넌트(`.card`, `.btn`, `.seg`, `.chip`, `.switch`, `.ball`, `.board`, `.bars` 등). 화면 코드에 색 값을 직접 쓰지 말고 토큰을 씁니다.
- 색 역할: `--primary` 브랜드·주요 버튼·선택, `--prize` 당첨금, `--win` 당첨·일치, `--danger` 삭제·제외. 로또 공 색은 `.ball.y/.b/.r/.g/.n`에만 씁니다.
- `js/app.js`: 공통(데이터 읽기, 등수 계산 `rankOf`, 번호 생성 `generate`, 보관함, 테마) 다음에 화면별 `initHome`/`initGenerate`/`initStats`/`initCheck`/`initVault`.
- `data/lotto.json`: 1회부터 최신 회차까지 당첨번호, 1~5등 당첨금(`prizes`)과 당첨자 수(`winners`). 회차당 한 줄이며 직접 고치지 않습니다.
- `scripts/fetch-lotto.mjs`: 동행복권 `lt645/selectPstLt645Info.do`에서 새 회차를 받아 `data/lotto.json`에 추가합니다.
- `.github/workflows/update-lotto.yml`: 매주 토요일 21:07, 일요일 09:07(KST)에 위 스크립트를 실행하고 `main`에 커밋합니다.

## 알아둘 점

- 화면의 모든 수치는 `data/lotto.json`으로 계산합니다. 근거 없는 수치나 "당첨 확률을 높인다"는 식의 문구는 넣지 않습니다.
- 보관함 항목(`lottolab.vault`)은 `{nums, label, at}` 형식이고, 저장 시각 이후 첫 추첨으로 당첨 여부를 판단합니다.
- 로컬 확인은 `python3 -m http.server`로 띄워서 합니다. `file://`로 열면 `data/lotto.json`을 읽지 못합니다. 라이트·다크 둘 다 390px 폭에서 확인합니다.
