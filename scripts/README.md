# scripts/ — 자동 동기화 스크립트

cron 워크플로(`.github/workflows/data-sync.yml`)가 6시간마다 실행합니다.
**시크릿이 없으면 각 스크립트가 스스로 skip** 하므로, 토큰 발급 전에도 CI가 실패하지 않습니다.

| 파일 | 역할 | 산출물 |
|---|---|---|
| `lib.js` | 공용 헬퍼(fetch/파일쓰기) | — |
| `fetch-cafe24.js` | 카페24 상품·월령카테고리·쿠폰 | `data/catalog.json`, `data/promotions.json` |
| `fetch-instagram.js` | 인스타 미디어 | `data/insta-aguard.json`, `data/insta-babystandard.json` |
| `tracking-serverless.example.js` | 배송조회 서버리스 **템플릿**(cron 아님) | — |

## 활성화 방법
1. `API_CHECKLIST.md`의 Secret들을 GitHub Actions Secrets에 등록
2. Actions 탭 → **Data Sync** → *Run workflow* (수동 1회 실행해 확인) 또는 6시간 주기 대기
3. 생성된 `data/*.json` 이 커밋되면 Pages가 자동 재배포 → 사이트에 실데이터 반영

## 로컬 테스트
```bash
CAFE24_CLIENT_ID=... CAFE24_CLIENT_SECRET=... \
CAFE24_MALLID_AGUARD=... CAFE24_REFRESH_AGUARD=... \
node scripts/fetch-cafe24.js
```

## ⚠️ 운영 주의 — 카페24 refresh_token 회전
카페24 `refresh_token`은 **사용 시마다 새 값으로 회전되고 약 2주 후 만료**됩니다.
cron이 매번 같은 시크릿을 쓰면 결국 만료될 수 있으니, 다음 중 하나가 필요합니다:
- (권장) 워크플로에 **새 refresh_token을 Actions Secret으로 자동 갱신**하는 단계 추가
  (PAT + `gh secret set` 또는 GitHub API 사용)
- 또는 2주 주기로 수동 갱신

토큰 받으면 이 자동 갱신 단계까지 붙여드리겠습니다.

## 배송조회(실시간)
`tracking-serverless.example.js`를 Vercel/Netlify/Cloudflare 등에 배포한 뒤,
`js/app.js`의 `track()`에서 그 엔드포인트를 호출하도록 전환하면 됩니다. (API 키는 서버에만 보관)
