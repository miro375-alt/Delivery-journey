# 🔐 자동 연동에 필요한 크리덴셜 체크리스트

선택된 자동화:
- 인스타 피드 → **Instagram Graph API (완전자동)**
- 진행 행사 → **카페24 API (자동연동)**
- 운송장 조회 → **택배사/스마트택배 API**

> ⚠️ 보안 원칙: 아래 토큰/키는 **절대 코드에 넣지 않습니다.**
> GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에 저장하면,
> cron 워크플로가 안전하게 읽어 `data/*.json` 만 생성합니다. (토큰은 공개되지 않음)

---

## 1) Instagram Graph API (아가드 / 베이비스탠다드 각각)

**발급 순서**
1. 두 인스타 계정을 각각 **프로(비즈니스/크리에이터) 계정**으로 전환
2. 각 계정을 **페이스북 페이지**에 연결 (계정별 페이지 1개씩)
3. **Meta for Developers**(developers.facebook.com)에서 **앱 생성**(유형: 비즈니스) → 제품에 **Instagram Graph API** 추가
4. **장기 액세스 토큰(Long-lived token)** 발급 + **인스타 비즈니스 계정 ID** 확인

**필요한 Secret**
| 이름 | 설명 |
|---|---|
| `IG_TOKEN_AGUARD` | 아가드 계정 장기 토큰 |
| `IG_USERID_AGUARD` | 아가드 IG 비즈니스 계정 ID |
| `IG_TOKEN_BABYSTANDARD` | 베이비스탠다드 장기 토큰 |
| `IG_USERID_BABYSTANDARD` | 베이비스탠다드 IG 비즈니스 계정 ID |

> 두 계정이 같은 Meta 비즈니스에 묶여 있으면 토큰 하나로 둘 다 될 수도 있습니다(계정 ID는 각각 필요).

---

## 2) 카페24 API (aguardmall / babystandard 각 몰)

**발급 순서**
1. **카페24 개발자센터**(developers.cafe24.com) 가입 → **앱 생성**
2. 앱의 **Client ID / Client Secret** 확인
3. 필요한 **권한(scope)** 설정: 상품 조회(`mall.read_product`), 혜택/프로모션 관련 등
4. 각 몰에 앱 설치 → **OAuth 인증**으로 `access_token` / `refresh_token` 발급

**필요한 Secret**
| 이름 | 설명 |
|---|---|
| `CAFE24_CLIENT_ID` | 앱 Client ID |
| `CAFE24_CLIENT_SECRET` | 앱 Client Secret |
| `CAFE24_MALLID_AGUARD` | 아가드몰 mall_id |
| `CAFE24_REFRESH_AGUARD` | 아가드몰 refresh_token |
| `CAFE24_MALLID_BABYSTANDARD` | 베이비스탠다드 mall_id |
| `CAFE24_REFRESH_BABYSTANDARD` | 베이비스탠다드 refresh_token |

> refresh_token으로 access_token을 자동 갱신합니다(만료 대응).

---

## 3) 운송장 조회 — 스마트택배(굿스플로) API

**발급 순서**
1. 스마트택배(굿스플로) 트래킹 API **키 발급** (apiKey)
2. (선택) 사방넷 연동 시: 주문↔송장 매핑용 사방넷 API 인증정보

**필요한 Secret**
| 이름 | 설명 |
|---|---|
| `SMART_PARCEL_API_KEY` | 스마트택배 트래킹 API 키 |
| `SABANGNET_*` (선택) | 사방넷 API 인증정보(주문↔송장 매핑이 필요할 때) |

> 조회 예: `GET https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key={KEY}&t_code={택배사코드}&t_invoice={송장번호}`

---

## 전달 방법
- 위 Secret들을 **GitHub Actions Secrets**에 직접 넣으시거나, 안전한 방법으로 저에게 주시면 연동 코드를 붙입니다.
- **하나라도 준비되는 대로** 그 항목부터 순차 연동합니다(전부 한 번에 안 주셔도 됩니다).
- 준비되는 동안, 자율 루프는 크리덴셜이 필요 없는 개선(접근성·다크모드·인스타 모달·SEO 등)을 계속 진행합니다.
