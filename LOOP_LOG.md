# 🔁 자율 개선 루프 로그

> 목표: 레퍼런스(`track.storej.co.kr`)를 넘어서는 배송여정 프로그램 개발
> 운영: 기획(Plan) → 개발(Develop) → 검증(Verify) → 재기획(Re-plan) 무한 루프
> 시작: 2026-06-26 / 종료 예정: 2026-06-28 24:00
> 원칙: **항상 비판적으로, 개선 여지 위주로 비교한다. 멈추지 않는다.**

---

## 필수 요구사항 체크리스트

- [x] 운송장 조회
- [x] 주문요약
- [x] 현재 상태 관련 상태 애니메이션 영역 (추후 사용자가 삽입할 placeholder)
- [x] 배송정보
- [x] 배송 스텝
- [x] 국내 배송조회 세부 내용
- [x] 구매 제품과 어울리는 추천 상품
- [x] 구매 제품의 인스타그램 피드(리뷰 등)
- [x] 브랜드 철학
- [x] 쇼핑몰 바로가기
- [x] 문의하기

---

## 반복 로그

### Iteration 1 — 필수 항목 전체 골격 구현
- **Plan**: 필수 11개 항목 중 빠진 8개(주문요약, 상태 애니메이션 영역, 배송정보, 국내배송 세부, 인스타 피드, 브랜드 철학, 쇼핑몰 바로가기, 문의하기) 골격 구현.
- **Develop**: data.js 데이터 모델 확장(order/delivery/statusAnimation/brand/instagram), index.html 전체 섹션 재구성, styles.css 확장, app.js 렌더러 추가.
- **Verify**: node 문법 검사 통과 / HTML·JS ID 교차검증(59 refs 모두 존재) / Playwright 헤드리스 렌더 — 4개 결과 섹션 노출, 여정6·이력6·인스타6·추천3·문의4 카운트 정상, 진행률 83%, 결제금액·브랜드 정상, **JS 런타임 에러 0**.
- **비판적 회고**: ① 외부 Unsplash 이미지에 전적으로 의존 → 오프라인/차단 환경에서 깨짐(높은 우선순위). ② 상태 애니메이션은 정적 emoji placeholder뿐 → 규격/슬롯 문서 필요. ③ 접근성(aria-live는 넣었으나 키보드/대비 미점검). ④ 단일 페이지에 모든 섹션 — 길어짐, 앵커 네비 강조 없음.
- **다음 개선 후보(Backlog)** → 아래 백로그 참조.

### Iteration 2 — 견고성·애니메이션 규격·ETA
- **Plan**: 백로그 1·2·4·8 처리.
- **Develop**: ① 이미지 로드 실패 fallback(인라인 SVG, 캡처 단계 error 위임) ② 상태별 기본 모션 6종(pulse/wiggle/pop/drive/scoot) + prefers-reduced-motion ③ ANIMATION.md 삽입 가이드(Lottie/video/CSS) ④ ETA D-day 카운트다운 ⑤ test/verify.cjs 검증 스크립트 repo 포함.
- **Verify**: `node test/verify.cjs` → 두 운송장 × 6항목 + 오류처리 전체 통과, 런타임 에러 0.
- **비판적 회고**: ① 배송 경로(간선 흐름) 시각화 아직 없음 — 레퍼런스 대비 차별화 약함. ② 다크모드/테마 토큰 미적용. ③ 인스타 클릭 시 모달 없음(hover만). ④ 키보드 접근성/포커스 링 미점검. ⑤ 메타태그/OG·favicon 없음(공유 시 빈약).

---

### Iteration 3 — 배송 경로 맵 + 실제 2개 브랜드 + 추천엔진
- **Plan**: 백로그 1번(경로 시각화) + 신규 요구(자사몰 2개·연령대 추천·인스타·행사 자동화).
- **Develop**: ① 캐릭터 이동형 배송 경로 맵(노드5 + 단계별 캐릭터, assets/route/* 슬롯, 이모지 폴백) ② 데이터 모델을 실제 브랜드(아가드/베이비스탠다드)로 교체 + 실제 쇼핑몰/인스타 URL ③ 통합 CATALOG + 연령대·브랜드·몰·카테고리 점수 기반 추천엔진(recommendFor, 2개) ④ 인스타 placeholder(실계정 링크) ⑤ 이미지 폴백 이모지별 지원 ⑥ AUTOMATION.md(엑셀 스키마·인스타/카페24/사방넷 자동화 설계).
- **Verify**: `node test/verify.cjs` → 두 운송장 × (경로노드5·캐릭터·추천2 포함) 전체 통과, 런타임 에러 0. 경로맵 스크린샷 확인, 폴백 배경 박스 제거.
- **비판적 회고**: ① 실제 상품/리뷰/인스타/행사 데이터는 아직 예시 시드 → 엑셀·API 연동 대기. ② 추천 엔진은 카탈로그가 작아 다양성 부족(데이터 들어오면 개선). ③ 인스타/행사 자동화는 사용자 결정·크리덴셜 필요. ④ 경로맵 모바일에서 노드 라벨 좁을 수 있음(추후 점검).

---

## ⏸ 사용자 입력 대기 (크리덴셜 필요 → 발급되면 즉시 연동) — CREDENTIALS.md
- 인스타 피드: **Instagram Graph API (완전자동)** — IG_TOKEN_*, IG_USERID_* 대기
- 진행 행사: **카페24 API (자동연동)** — CAFE24_* 대기
- 운송장: **스마트택배 API** — SMART_PARCEL_API_KEY 대기
- 추천 실데이터: 사용자 엑셀 → CATALOG 변환 대기
> 위 항목은 크리덴셜/데이터 없이는 검증 불가 → 루프는 아래 백로그(검증 가능 항목)를 먼저 진행.
> 단, 크리덴셜 없이도 가능한 **소비 계층 스캐폴딩**(data/*.json fetch+폴백, cron 워크플로 골격)은 미리 구축 가능.

### Iteration 4 — 자동화 소비 계층 + 검증 http화
- **Plan**: 백로그 1번(소비 계층 스캐폴딩) + 검증 신뢰도 개선.
- **Develop**: ① 프론트 데이터 병합 계층(loadExternalData: data/{catalog,promotions,insta-aguard,insta-babystandard}.json 있으면 시드 위 덮어쓰기, 없으면 폴백) ② data/README.md + *.sample.json 스키마 ③ 검증 스크립트를 file:// → 로컬 http 서버로 전환(실배포 동일 환경, fetch 경로 검증) ④ 리소스 404/net::ERR는 의도된 폴백으로 필터.
- **Verify**: `node test/verify.cjs`(http) → 전체 통과, 실 JS 오류 0.
- **비판적 회고**: ① cron 생성 스크립트는 크리덴셜 대기로 미작성(스키마만 확정). ② 데이터 병합은 첫 렌더 전 1회만 — 실시간 갱신 아님(정적 사이트 특성상 충분). ③ 접근성/다크모드 등 UX 개선 아직.

---

### Iteration 5 — API 연동 스캐폴딩(토큰 대기)
- **Plan**: 토큰만 넣으면 작동하는 cron+스크립트 사전 구축(사용자 요청).
- **Develop**: ① scripts/lib.js ② fetch-cafe24.js(상품/월령카테고리→ageGroup/쿠폰, refresh OAuth, 페이지네이션) ③ fetch-instagram.js(Graph media) ④ tracking-serverless.example.js(배송조회 서버리스 템플릿) ⑤ .github/workflows/data-sync.yml(6h cron, 시크릿 없으면 skip, 변경분만 커밋) ⑥ scripts/README(활성화법·refresh_token 회전 주의).
- **Verify**: 스크립트 node -c 통과 / 시크릿 없이 실행 시 안전 skip(exit 0, 실데이터 미생성) / 프론트 verify.cjs 전체 통과.
- **비판적 회고**: ① 실제 API 응답 형태는 토큰 발급 후 1회 검증 필요(엔드포인트/scope/버전 미세조정 가능성). ② 카페24 refresh_token 회전 자동갱신 단계 미구현(토큰 받으면 추가). ③ 상품 URL이 cafe24 기본도메인 — 커스텀도메인(aguardmall.com)로 교체 필요. ④ 행사 배너(기프트박스)는 표준 API 밖 → 하이브리드 필요.

---

## ⏳ 토큰 발급되면 즉시 할 일 (사용자 대기)
- 카페24 6 Secret → Data Sync 1회 실행 → catalog/promotions 실데이터 검증·미세조정
- refresh_token 자동갱신 단계 추가
- 인스타 4 Secret → insta-* 실데이터 검증
- 스마트택배 키 → 서버리스 배포 + track() 실연동 전환

## 개선 백로그 (우선순위 높은 순, 매 회차 갱신)

1. **접근성(a11y)**: 키보드 포커스 링, 명도 대비(WCAG AA), 탭 순서, 스크린리더 레이블
2. **접근성(a11y)**: 키보드 포커스 링, 명도 대비(WCAG AA), 탭 순서
3. 인스타 라이트박스 모달 + (피드 연동 시) 더보기
4. 다크모드 / 테마 토큰화
5. 공유/SEO: OG 메타태그, favicon, 공유 링크 복사
6. 다국어(ko/en) 토글
7. 배송 단계 변경 브라우저 알림 데모
8. 경로맵↔여정↔진행률↔카운트다운 인터랙션 연동 강화 + 모바일 경로맵 가독성
9. 진행 행사 배너 UI(데이터 모델 PROMOTIONS 이미 준비됨)
10. 성능: 폰트/이미지 CLS 방지, 에셋 lazy
2. 접근성: 키보드 포커스 링, 명도 대비(WCAG AA), 탭 순서
3. 인스타 피드 라이트박스 모달 + 더보기
4. 다크모드 / 테마 토큰화 (prefers-color-scheme)
5. 공유/배포: OG 메타태그, favicon, 공유 링크 복사 버튼
6. 다국어(ko/en) 토글
7. 배송 단계 변경 브라우저 알림 데모
8. 진행률 바 ↔ 단계 ↔ 카운트다운 인터랙션 연동 강화
9. 데이터 스키마 문서화 + 실제 API 연동 어댑터 인터페이스 정의
10. 성능: 폰트 display=swap 확인, 이미지 width/height 명시(CLS 방지)
