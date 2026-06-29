# 📋 필요한 API 전체 리스트 (API 완전자동 방식)

대상: 아가드(aguard) · 베이비스탠다드(babystandard) — 둘 다 카페24 + 사방넷
구성: cron(GitHub Actions)이 아래 API를 호출 → `data/*.json` 생성 → 정적 사이트가 읽음(키 노출 X).

> 우선순위: ① 카페24(상품·행사) → ② 인스타그램 → ③ 스마트택배(배송조회)
> 하나씩 준비되는 대로 그 항목부터 연동합니다. (전부 한 번에 안 주셔도 됨)

---

## ① 카페24 API — 상품 / 월령 카테고리 / 행사  ⭐먼저

- **발급처**: 카페24 개발자센터 https://developers.cafe24.com
- **방식**: 앱 생성 → OAuth 2.0 (Authorization Code) → access_token(약 2h) + refresh_token(약 2주, 자동 갱신)
- **앱당**: Client ID / Client Secret (두 몰 공용 1개 가능)
- **몰당**: mall_id + refresh_token (각 몰에 앱 설치/인증 별도)

**필요 권한(scope)**
| scope | 용도 |
|---|---|
| `mall.read_product` | 상품 조회(이름·가격·이미지·URL) |
| `mall.read_category` | **월령별 카테고리 → 연령대 자동 매핑** |
| `mall.read_collection` | 진열(베스트/신상품/기획전) |
| `mall.read_promotion` | 쿠폰/할인 등 혜택 |

**주요 엔드포인트** (base: `https://{mall_id}.cafe24api.com/api/v2/admin`)
- 상품: `GET /products`
- 카테고리: `GET /categories`
- 카테고리별 상품: `GET /categories/{category_no}/products`
- 쿠폰/혜택: `GET /coupons`
- 헤더: `Authorization: Bearer {token}`, `X-Cafe24-Api-Version: {YYYY-MM-DD}`

**GitHub Secrets**
```
CAFE24_CLIENT_ID
CAFE24_CLIENT_SECRET
CAFE24_MALLID_AGUARD
CAFE24_REFRESH_AGUARD
CAFE24_MALLID_BABYSTANDARD
CAFE24_REFRESH_BABYSTANDARD
```
> ⚠️ 메인 배너/이벤트 페이지(예: '첫만남 기프트박스')는 카페24 표준 API로 안 나올 수 있음
> → 행사는 (a)쿠폰/진열 API로 가능한 것 + (b)필요 시 행사 배너만 수동 입력 하이브리드 권장.

---

## ② Instagram Graph API — 인스타 피드 / 리뷰

- **발급처**: Meta for Developers https://developers.facebook.com
- **전제**: 각 인스타를 *프로(비즈니스/크리에이터)* 계정으로 전환 + **페이스북 페이지에 연결**
- **방식**: 비즈니스 앱 생성 → Instagram Graph API 추가 → 토큰 발급
- **토큰 권장**: 만료 없는 **시스템 사용자 토큰**(비즈니스 관리자) 또는 장기 토큰(60일, 갱신)

**필요 권한**
| 권한 | 용도 |
|---|---|
| `instagram_basic` | 미디어(이미지·캡션·permalink) 조회 |
| `pages_show_list` | 연결된 페이지 확인 |
| `business_management` | 비즈니스 계정 접근 |

**엔드포인트**
```
GET https://graph.facebook.com/v19.0/{ig-user-id}/media
    ?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count
    &access_token={TOKEN}
```

**GitHub Secrets**
```
IG_TOKEN_AGUARD
IG_USERID_AGUARD
IG_TOKEN_BABYSTANDARD
IG_USERID_BABYSTANDARD
```
> 두 계정이 같은 Meta 비즈니스에 묶여 있으면 토큰 1개로도 가능(계정 ID는 각각 필요).

---

## ③ 스마트택배(굿스플로) API — 운송장/배송조회

- **발급처**: 스마트택배(굿스플로) 트래킹 API (sweettracker) — API 키 발급
- **방식**: t_key(API 키)로 호출. 무료 등급은 일일 호출 제한 있음.

**엔드포인트**
```
택배사 목록: GET https://info.sweettracker.co.kr/api/v1/companylist?t_key={KEY}
배송 조회 : GET https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key={KEY}&t_code={택배사코드}&t_invoice={송장번호}
```

**GitHub Secrets**
```
SMART_PARCEL_API_KEY
```

---

## ④ (선택) 사방넷 API — 주문 ↔ 송장 매핑

송장번호를 이미 알고 있으면 ③만으로 조회됩니다.
"주문번호로 배송조회"까지 자동화하려면 사방넷에서 주문↔송장(택배사+운송장) 매핑이 필요합니다.

**GitHub Secrets (선택)**
```
SABANGNET_API_KEY   (사방넷 인증정보 — 발급 방식 확인 후 확정)
```

---

## ✅ 전체 Secret 한눈에 (GitHub → Settings → Secrets and variables → Actions)
```
# 카페24
CAFE24_CLIENT_ID
CAFE24_CLIENT_SECRET
CAFE24_MALLID_AGUARD
CAFE24_REFRESH_AGUARD
CAFE24_MALLID_BABYSTANDARD
CAFE24_REFRESH_BABYSTANDARD
# 인스타그램
IG_TOKEN_AGUARD
IG_USERID_AGUARD
IG_TOKEN_BABYSTANDARD
IG_USERID_BABYSTANDARD
# 배송조회
SMART_PARCEL_API_KEY
# (선택) 사방넷
SABANGNET_API_KEY
```

> 각 API의 정확한 버전·scope 명칭은 연동 시점 최신 문서로 최종 확인합니다.
> 토큰/키는 **절대 코드·커밋에 넣지 말고** GitHub Actions Secrets 에만 저장하세요.
