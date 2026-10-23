# 로또랩 (LottoLab)

빌드 과정 없는 정적 모바일 웹앱입니다. GitHub Pages가 `main` 브랜치를 그대로 배포합니다.

## 작업 규칙

- 코드를 고친 뒤 PR을 만들지 말고 `main`에 바로 커밋하고 푸시합니다. (저장소 주인이 허락함)
- 푸시하기 전에 바꾼 화면을 브라우저로 열어 오류가 없는지 확인합니다.
- 답변과 커밋 메시지는 한국어로 씁니다.

## 구조

- `index.html`, `stats.html`, `combiner.html`, `simulator.html`, `vault.html`: 화면 5개 (`body`의 `data-page`로 구분)
- `css/style.css`: 공통 스타일. `u123` 같은 클래스는 Figma에서 추출한 것이라 이름에 의미가 없습니다.
- `js/app.js`: 모든 화면의 인터랙션 (라이브러리 없는 순수 JavaScript)
- `data/lotto.json`: 1회부터 최신 회차까지의 당첨번호. 회차당 한 줄이며 직접 고치지 않습니다.
- `scripts/fetch-lotto.mjs`: 동행복권 `lt645/selectPstLt645Info.do`에서 새 회차를 받아 `data/lotto.json`에 추가합니다.
- `.github/workflows/update-lotto.yml`: 매주 토요일 21:07, 일요일 09:07(KST)에 위 스크립트를 실행하고 `main`에 커밋합니다.

## 알아둘 점

- 회차 표기와 지난 회차 당첨번호, 홈 카운트다운은 `js/app.js`의 `initLatest()`가 `data/lotto.json`을 읽어 바꿉니다. HTML에 적힌 1114/1115회는 시안 값입니다.
- 통계 수치와 시뮬레이션 결과는 아직 시안의 예시 값입니다.
- 로컬 확인은 `python3 -m http.server`로 띄워서 합니다. `file://`로 열면 `data/lotto.json`을 읽지 못합니다.
