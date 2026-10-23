# 로또랩 (LottoLab)

역대 로또 당첨번호를 조회하고, 번호를 뽑아 저장하고, 당첨 여부를 확인하는 모바일 웹앱입니다. 빌드 과정 없이 정적 파일만으로 동작하며, 모든 수치는 매주 자동으로 갱신되는 실제 당첨 데이터(`data/lotto.json`)로 계산합니다.

| 하단 탭 | 파일 | 하는 일 |
| --- | --- | --- |
| 홈 | `index.html` | 최신 당첨번호와 1등 당첨금, 다음 추첨 카운트다운, 빠른 번호 뽑기(5게임), 내 번호 결과 요약 |
| 번호 생성 | `combiner.html` | 고정수·제외수 지정, 홀짝·합계·연속번호·끝자리·지난 회차 조건, 1/5/10게임 생성 후 복사·저장 |
| 통계 | `stats.html` | 기간(전체/100/50/10회)별 번호 출현 지도, 많이 나온·오래 안 나온 번호, 번호대·홀짝·합계·연속·끝자리 분포 |
| 당첨 조회 | `simulator.html` | 회차별 당첨번호와 1~5등 당첨금·당첨자 수, 내 번호 6개를 역대 전 회차에 맞춰 본 결과 |
| 보관함 | `vault.html` | 저장한 번호와 저장 뒤 첫 추첨의 당첨 결과, 복사·삭제 |

## 디자인

- 화면 테마는 기기 설정(라이트/다크)을 따르고, 머리말 오른쪽 버튼으로 기기 설정 → 라이트 → 다크 순서로 바꿀 수 있습니다.
- 색은 역할별로만 씁니다: 남색(브랜드·주요 버튼·선택), 주황(당첨금), 초록(당첨·일치), 빨강(삭제·제외). 로또 공 색(노랑/파랑/빨강/회색/초록)은 공에만 씁니다.
- 색과 간격 값은 `css/style.css` 맨 위의 토큰(`--primary` 등)에 모여 있습니다.
- 저장한 번호는 이 기기의 브라우저(localStorage)에만 보관됩니다.

## 폴더 구조

```
index.html  combiner.html  stats.html  simulator.html  vault.html
css/style.css          디자인 토큰과 공통 컴포넌트
js/app.js              머리말·하단 탭·테마와 화면별 동작
data/lotto.json        역대 당첨번호 (자동 갱신)
scripts/fetch-lotto.mjs  당첨번호 수집 스크립트
```

## GitHub Pages로 임시 사이트 열기

1. GitHub에서 새 저장소(Repository)를 만듭니다. (예: `lottolab`)
2. 이 폴더 안의 파일 전체를 저장소에 업로드합니다. (`Add file` → `Upload files`)
3. 저장소의 `Settings` → `Pages`에서 Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 두고 `Save`를 누릅니다.
4. 1~2분 뒤 `https://<GitHub 아이디>.github.io/<저장소 이름>/` 주소로 열립니다.

## 역대 당첨번호 자동 수집

`data/lotto.json`에 1회부터 최신 회차까지의 당첨번호가 저장되고, 매주 자동으로 갱신됩니다.

- GitHub Actions(`.github/workflows/update-lotto.yml`)가 토요일 21:07, 일요일 09:07(한국 시간)에 `scripts/fetch-lotto.mjs`를 실행합니다.
- 스크립트는 동행복권에서 파일에 없는 회차만 받아 추가하고, 변경이 있으면 저장소에 커밋합니다.
- 바로 갱신하고 싶으면 저장소의 `Actions` → `로또 당첨번호 갱신` → `Run workflow`를 누릅니다.
- 사이트에서는 `fetch('data/lotto.json')`으로 읽습니다. 형식은 회차당 한 줄이고, `prizes`와 `winners`는 1~5등 1인당 당첨금과 당첨자 수입니다.

```json
{"round":1100,"date":"2023-12-30","numbers":[17,26,29,30,31,43],"bonus":12,"prizes":[2207575472,59050373,1667160,50000,5000],"winners":[13,81,2869,146262,2503154],"totalSales":116187023000}
```

예약 실행은 기본 브랜치(`main`)에 있는 워크플로만 동작합니다.

## 알아둘 점

- 글꼴은 Google Fonts(Inter, JetBrains Mono, Noto Sans KR)를 사용하므로 인터넷 연결이 필요합니다.
- 아이콘은 Figma 에셋을 내려받지 못해 같은 의미의 아이콘을 SVG로 다시 그렸습니다. 로고도 임시 SVG입니다.
