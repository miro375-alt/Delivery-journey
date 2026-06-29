# data/ — 자동화 산출물 폴더

cron(GitHub Actions) 또는 서버리스가 API를 호출해 이 폴더에 아래 파일을 생성하면,
프론트가 자동으로 읽어 시드 데이터 위에 덮어씁니다. **파일이 없으면 시드/폴백으로 동작**합니다.

| 파일 | 생성 소스 | 내용 |
|---|---|---|
| `catalog.json` | 카페24 API / 엑셀 변환 | 추천 엔진용 통합 상품 카탈로그(배열) |
| `promotions.json` | 카페24 API | 브랜드별 진행 행사(객체) |
| `insta-aguard.json` | Instagram Graph API | 아가드 인스타 피드(배열) |
| `insta-babystandard.json` | Instagram Graph API | 베이비스탠다드 인스타 피드(배열) |

스키마 예시는 같은 폴더의 `*.sample.json` 참조. (`.sample.json` 은 로드되지 않음 — 형식 참고용)
실제 파일명은 위 표대로(`catalog.json` 등) 생성해야 로드됩니다.
