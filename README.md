# 로또랩 (LottoLab)

Figma 디자인(스티치 원본 4화면)을 HTML / CSS / JavaScript로 옮긴 모바일 웹앱입니다. 빌드 과정 없이 정적 파일만으로 동작합니다.

| 화면 | 파일 |
| --- | --- |
| 홈/추천 (AI 번호 추천) | `index.html` |
| 통계분석 | `stats.html` |
| 번호조합 (스마트 번호 조합기) | `combiner.html` |
| 시뮬레이터 (역대 당첨 시뮬레이터) | `simulator.html` |
| 보관함 (추가 구성, 저장한 번호 보기) | `vault.html` |

하단 탭으로 화면 사이를 이동합니다.

## 동작하는 기능

- 홈: `1초 즉시 재추출`, `번호 복사`, `보관함 저장`
- 번호조합: 번호 클릭으로 고정수/제외수 지정, 홀짝·고저 필터, 토글 스위치, 게임 수 선택, 조합 생성(결과 시트)
- 통계분석: 기간/랭킹 선택 버튼
- 시뮬레이터: `AI 추천번호 로드`, `내 보관함에서 호출`, 재실행, 결과 저장/공유
- 보관함: 저장한 번호는 브라우저(localStorage)에만 저장됩니다

통계 수치와 시뮬레이션 결과는 디자인 시안의 예시 값입니다. 실제 당첨 데이터와 연결되어 있지 않습니다.

## 폴더 구조

```
index.html  stats.html  combiner.html  simulator.html  vault.html
css/style.css   공통 스타일 + Figma에서 추출한 스타일
js/app.js       인터랙션
```

## GitHub Pages로 임시 사이트 열기

1. GitHub에서 새 저장소(Repository)를 만듭니다. (예: `lottolab`)
2. 이 폴더 안의 파일 전체를 저장소에 업로드합니다. (`Add file` → `Upload files`)
3. 저장소의 `Settings` → `Pages`에서 Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 두고 `Save`를 누릅니다.
4. 1~2분 뒤 `https://<GitHub 아이디>.github.io/<저장소 이름>/` 주소로 열립니다.

## 알아둘 점

- 글꼴은 Google Fonts(Inter, JetBrains Mono, Noto Sans KR)를 사용하므로 인터넷 연결이 필요합니다.
- 아이콘은 Figma 에셋을 내려받지 못해 같은 의미의 아이콘을 SVG로 다시 그렸습니다. 로고도 임시 SVG입니다.
