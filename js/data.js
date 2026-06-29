/* =========================================================
   목업/시드 데이터 — 배송 / 주문 / 제품 / 브랜드 / 추천
   - 자사몰: 아가드(aguard), 베이비스탠다드(babystandard)  [카페24 + 사방넷]
   - 제품/카탈로그는 예시 시드값. 실제 데이터는 추후 엑셀→CATALOG 로 교체.
   - 실제 API 연동 시 TRACKING_DB 조회를 fetch 로 교체.
   ========================================================= */

// 배송여정 단계 (순서 고정)
const JOURNEY_STEPS = [
  { key: "ordered",   label: "주문접수", icon: "📝" },
  { key: "prepared",  label: "상품준비", icon: "📦" },
  { key: "picked",    label: "집화완료", icon: "🏷️" },
  { key: "transit",   label: "간선이동", icon: "🚛" },
  { key: "delivery",  label: "배송중",   icon: "🛵" },
  { key: "delivered", label: "배송완료", icon: "🏠" },
];

// 상태 애니메이션 메타 (큰 히어로 영역, 추후 Lottie/video 교체)
const STATUS_ANIMATION = {
  ordered:   { emoji: "📝", title: "주문이 접수되었어요", caption: "곧 상품 준비를 시작합니다" },
  prepared:  { emoji: "📦", title: "상품을 정성껏 포장 중이에요", caption: "출고 준비 중" },
  picked:    { emoji: "🏷️", title: "택배사에 전달되었어요", caption: "집화 완료" },
  transit:   { emoji: "🚛", title: "물류센터를 이동하고 있어요", caption: "간선 이동 중" },
  delivery:  { emoji: "🛵", title: "오늘 도착! 배송기사님이 이동 중이에요", caption: "곧 만나요" },
  delivered: { emoji: "🎉", title: "배송이 완료되었어요", caption: "이용해 주셔서 감사합니다" },
};

/* ---- 배송 경로 맵: 경유지 노드 (정지 이미지) ---- */
// img 파일이 없으면 emoji 로 자동 폴백. 규격은 ASSETS.md 참조.
const ROUTE_NODES = [
  { key: "warehouse", label: "물류센터", emoji: "🏭", img: "assets/route/node-warehouse.png" },
  { key: "hub",       label: "허브",     emoji: "🏢", img: "assets/route/node-hub.png" },
  { key: "terminal",  label: "터미널",   emoji: "🏬", img: "assets/route/node-terminal.png" },
  { key: "branch",    label: "배송지점", emoji: "🏪", img: "assets/route/node-branch.png" },
  { key: "home",      label: "도착",     emoji: "🏠", img: "assets/route/node-home.png" },
];

/* ---- 배송 경로 맵: 단계별 캐릭터 + 경로상 위치(at: 노드 인덱스 0~4) ---- */
// img(gif) 파일이 없으면 emoji 로 자동 폴백. 규격은 ASSETS.md 참조.
const ROUTE_CHARACTER = {
  ordered:   { emoji: "📝", img: "assets/route/char-ordered.gif",   at: 0,   label: "주문접수" },
  prepared:  { emoji: "📦", img: "assets/route/char-prepared.gif",  at: 0,   label: "상품준비" },
  picked:    { emoji: "🏷️", img: "assets/route/char-picked.gif",    at: 0.5, label: "출발 준비" },
  transit:   { emoji: "🚛", img: "assets/route/char-transit.gif",   at: 1.6, label: "간선 이동중" },
  delivery:  { emoji: "🛵", img: "assets/route/char-delivery.gif",  at: 3.4, label: "배송중" },
  delivered: { emoji: "🎉", img: "assets/route/char-delivered.gif", at: 4,   label: "도착 완료" },
};

/* ---- 연령대(추천 매칭용) 순서: 인접도 계산에 사용 ---- */
// 아가드몰 "월령별 추천" 카테고리 체계와 일치. (인접도 계산 = 배열 순서)
// ⚠️ 13개월 이상 구간은 추정값 — 실제 카페24 카테고리명으로 확정 필요(자동 매핑은 카테고리명 기준).
const AGE_GROUPS = ["출산준비물", "1~3개월", "4~6개월", "7~9개월", "10~12개월", "13~18개월", "19~24개월", "24개월~"];

const TRACKING_DB = {
  "519719884106": {
    carrier: "스마트로지스",
    carrierTel: "1588-0000",
    receiver: "김*리",
    eta: "6월 27일 (토) 도착 예정",
    etaDate: "2026-06-27",
    currentStep: "delivery",
    product: "ag-1",
    order: {
      orderNo: "20260625-0098213",
      orderDate: "2026-06-25 14:02",
      payMethod: "신용카드 (간편결제)",
      items: [{ name: "예시 상품 A", option: "기본", qty: 1, price: 32900,
        image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&q=80&auto=format&fit=crop" }],
      shippingFee: 0,
    },
    delivery: {
      sender: "아가드",
      senderAddr: "경기 용인시 처인구 물류로 12",
      receiverName: "김지리",
      receiverAddr: "서울 강남구 테헤란로 123, 4층 (역삼동)",
      receiverPhone: "010-****-1234",
      request: "부재 시 문 앞에 놓아주세요",
    },
    history: [
      { time: "2026-06-25 14:02", status: "주문접수", where: "온라인 주문 완료", step: "ordered" },
      { time: "2026-06-25 18:30", status: "상품준비중", where: "용인 물류센터", step: "prepared" },
      { time: "2026-06-26 07:15", status: "집화완료", where: "용인 물류센터", step: "picked" },
      { time: "2026-06-26 09:40", status: "간선상차", where: "용인 H-허브", step: "transit" },
      { time: "2026-06-26 11:55", status: "간선하차", where: "서울 강남 터미널", step: "transit" },
      { time: "2026-06-26 13:20", status: "배송출발", where: "강남2 배송지점 · 박기사 (010-****-5678)", step: "delivery" },
    ],
  },

  "884201337755": {
    carrier: "한진택배",
    carrierTel: "1588-0011",
    receiver: "이*수",
    eta: "6월 26일 (금) 배송완료",
    etaDate: "2026-06-26",
    currentStep: "delivered",
    product: "bs-1",
    order: {
      orderNo: "20260623-0044120",
      orderDate: "2026-06-23 10:11",
      payMethod: "계좌간편결제",
      items: [{ name: "예시 상품 B", option: "라이트그레이", qty: 1, price: 48000,
        image: "https://images.unsplash.com/photo-1522771930-78b8b3e6e6f6?w=200&q=80&auto=format&fit=crop" }],
      shippingFee: 3000,
    },
    delivery: {
      sender: "베이비스탠다드",
      senderAddr: "경기 이천시 마장면 물류단지로 80",
      receiverName: "이민수",
      receiverAddr: "부산 사상구 가야대로 999 (주례동)",
      receiverPhone: "010-****-7788",
      request: "경비실에 맡겨주세요",
    },
    history: [
      { time: "2026-06-23 10:11", status: "주문접수", where: "온라인 주문 완료", step: "ordered" },
      { time: "2026-06-23 16:45", status: "상품준비중", where: "이천 물류센터", step: "prepared" },
      { time: "2026-06-24 08:02", status: "집화완료", where: "이천 물류센터", step: "picked" },
      { time: "2026-06-24 20:30", status: "간선상차", where: "이천 허브", step: "transit" },
      { time: "2026-06-25 06:10", status: "간선하차", where: "부산 사상 터미널", step: "transit" },
      { time: "2026-06-25 09:25", status: "배송출발", where: "사상1 배송지점 · 최기사", step: "delivery" },
      { time: "2026-06-26 11:48", status: "배송완료", where: "경비실 (수령: 경비실 위탁)", step: "delivered" },
    ],
  },
};

/* =========================================================
   통합 상품 카탈로그 (추천 엔진 소스)
   ⚠️ 아래는 구조 확인용 예시 시드. 실제 데이터는 엑셀→이 배열로 교체.
   필수 필드: id, brand, mall, ageGroup, category, name, price, image, url
   ========================================================= */
const CATALOG = [
  // --- 아가드 (aguard) ---
  { id: "ag-1", brand: "aguard", mall: "aguard", ageGroup: "7~9개월", category: "안전용품",
    name: "예시: 코너 가드 4개입", price: 12900, rating: 4.8, reviewsCount: 1284,
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80&auto=format&fit=crop",
    url: "https://aguardmall.com",
    desc: "(예시 설명) 모서리 충돌을 막아주는 안전 가드. 실제 상품 정보로 교체 예정.",
    features: ["예시 특징 1", "예시 특징 2", "예시 특징 3"],
    reviews: [
      { author: "초보맘", rating: 5, date: "2026-06-20", text: "(예시) 모서리 다 붙였더니 안심돼요. 실제 후기로 교체 예정." },
      { author: "두아이맘", rating: 4, date: "2026-06-12", text: "(예시) 접착력 좋고 깔끔합니다." },
    ] },
  { id: "ag-2", brand: "aguard", mall: "aguard", ageGroup: "1~3개월", category: "안전용품",
    name: "예시: 콘센트 안전커버 세트", price: 8900, rating: 4.7, reviewsCount: 540,
    image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&q=80&auto=format&fit=crop",
    url: "https://aguardmall.com" },
  { id: "ag-3", brand: "aguard", mall: "aguard", ageGroup: "13~18개월", category: "안전용품",
    name: "예시: 도어 핑거 가드", price: 15900, rating: 4.6, reviewsCount: 320,
    image: "https://images.unsplash.com/photo-1558877385-8c1b8e6e6f8a?w=600&q=80&auto=format&fit=crop",
    url: "https://aguardmall.com" },
  { id: "ag-4", brand: "aguard", mall: "aguard", ageGroup: "24개월~", category: "생활용품",
    name: "예시: 미끄럼방지 매트", price: 23900, rating: 4.5, reviewsCount: 210,
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=600&q=80&auto=format&fit=crop",
    url: "https://aguardmall.com" },

  // --- 베이비스탠다드 (babystandard) ---
  { id: "bs-1", brand: "babystandard", mall: "babystandard", ageGroup: "4~6개월", category: "수유/이유",
    name: "예시: 실리콘 이유식 식기 세트", price: 48000, rating: 4.6, reviewsCount: 532,
    image: "https://images.unsplash.com/photo-1522771930-78b8b3e6e6f6?w=600&q=80&auto=format&fit=crop",
    url: "https://babystandard.kr",
    desc: "(예시 설명) 부드러운 실리콘 식기 세트. 실제 상품 정보로 교체 예정.",
    features: ["예시 특징 1", "예시 특징 2", "예시 특징 3"],
    reviews: [
      { author: "이유식시작", rating: 5, date: "2026-06-22", text: "(예시) 흡착 잘되고 세척 편해요. 실제 후기로 교체 예정." },
      { author: "베이비맘", rating: 4, date: "2026-06-15", text: "(예시) 색감 예쁘고 부드러워요." },
    ] },
  { id: "bs-2", brand: "babystandard", mall: "babystandard", ageGroup: "7~9개월", category: "수유/이유",
    name: "예시: 흡착 이유식 그릇", price: 18900, rating: 4.7, reviewsCount: 410,
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80&auto=format&fit=crop",
    url: "https://babystandard.kr" },
  { id: "bs-3", brand: "babystandard", mall: "babystandard", ageGroup: "13~18개월", category: "외출용품",
    name: "예시: 실리콘 빕(턱받이)", price: 12000, rating: 4.8, reviewsCount: 690,
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80&auto=format&fit=crop",
    url: "https://babystandard.kr" },
  { id: "bs-4", brand: "babystandard", mall: "babystandard", ageGroup: "19~24개월", category: "생활용품",
    name: "예시: 유아 식판 세트", price: 21000, rating: 4.5, reviewsCount: 180,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80&auto=format&fit=crop",
    url: "https://babystandard.kr" },
];

// id → 카탈로그 항목 빠른 조회
const CATALOG_BY_ID = CATALOG.reduce((m, p) => ((m[p.id] = p), m), {});

/* =========================================================
   추천 엔진
   - 구매한 제품(brand/mall/ageGroup/category) 기준으로 2개 추천
   - 점수: 같은 연령대(+3)/인접 연령대(+1) + 같은 브랜드(+2) + 같은 몰(+1)
           + 같은 카테고리(+1). 자기 자신 제외. 동점이면 평점순.
   ========================================================= */
function recommendFor(product, limit = 2) {
  if (!product) return [];
  const ai = AGE_GROUPS.indexOf(product.ageGroup);
  const scored = CATALOG.filter((c) => c.id !== product.id).map((c) => {
    let s = 0;
    const ci = AGE_GROUPS.indexOf(c.ageGroup);
    if (ai >= 0 && ci >= 0) {
      const d = Math.abs(ai - ci);
      if (d === 0) s += 3; else if (d === 1) s += 1;
    }
    if (c.brand === product.brand) s += 2;
    if (c.mall === product.mall) s += 1;
    if (c.category === product.category) s += 1;
    return { item: c, score: s };
  });
  scored.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating);
  return scored.slice(0, limit).map((x) => x.item);
}

/* =========================================================
   브랜드 데이터 (철학 / 인스타 / 쇼핑몰 / 문의)
   ⚠️ philosophy/values/contact 는 예시 카피 — 실제 문구로 교체 권장.
   instaFeed 는 자동화 전까지 placeholder. (AUTOMATION.md 참조)
   ========================================================= */
const BRAND_DB = {
  aguard: {
    name: "아가드",
    tagline: "우리 아이 안전의 기준",
    philosophy:
      "(예시 카피) 아가드는 아이가 머무는 모든 공간을 더 안전하게 만드는 일에 집중합니다. " +
      "꼼꼼한 안전 설계와 검증된 소재로, 보호자가 안심할 수 있는 환경을 만듭니다.",
    values: [
      { icon: "🛡️", title: "안전 최우선", desc: "유해물질 시험 통과" },
      { icon: "🔍", title: "꼼꼼한 설계", desc: "디테일까지 안전하게" },
      { icon: "🤝", title: "신뢰", desc: "보호자가 믿는 브랜드" },
    ],
    shopUrl: "https://aguardmall.com",
    instaHandle: "@aguard_official",
    instaUrl: "https://www.instagram.com/aguard_official/",
    instaFeed: [], // 자동화 전까지 비움 → JS가 placeholder 렌더
    contact: { kakao: "@아가드", tel: "고객센터", email: "help@aguardmall.com", hours: "평일 10:00~17:00 (점심 12~13시 / 주말·공휴일 휴무)" },
  },

  babystandard: {
    name: "베이비스탠다드",
    tagline: "아이에게 맞는 기준",
    philosophy:
      "(예시 카피) 베이비스탠다드는 아이의 일상에 꼭 맞는 '기준'이 되는 제품을 제안합니다. " +
      "안전한 소재와 실용적인 디자인으로 매일의 육아를 조금 더 편안하게 만듭니다.",
    values: [
      { icon: "🍼", title: "안심 소재", desc: "유아 사용 기준 충족" },
      { icon: "✨", title: "실용 디자인", desc: "매일 쓰기 편하게" },
      { icon: "💛", title: "함께 성장", desc: "아이와 보호자 모두" },
    ],
    shopUrl: "https://babystandard.kr",
    instaHandle: "@babystandard_official",
    instaUrl: "https://www.instagram.com/babystandard_official/",
    instaFeed: [],
    contact: { kakao: "@베이비스탠다드", tel: "고객센터", email: "cs@babystandard.kr", hours: "평일 10:00~17:00 (주말·공휴일 휴무)" },
  },
};

/* ---- 진행중 행사/프로모션 (자동화 전까지 시드값) ---- */
// AUTOMATION.md 참조: 카페24 API 또는 주기적 export 로 교체 예정.
const PROMOTIONS = {
  aguard: [],
  babystandard: [],
};
