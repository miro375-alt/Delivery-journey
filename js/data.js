/* =========================================================
   목업(가짜) 배송 데이터
   - 실제 택배사 API 연동 시 이 부분을 fetch 로 교체하면 됩니다.
   - key: 운송장 번호 (문자열)
   ========================================================= */

// 배송여정 단계 정의 (순서 고정)
const JOURNEY_STEPS = [
  { key: "ordered",   label: "주문접수", icon: "📝" },
  { key: "prepared",  label: "상품준비", icon: "📦" },
  { key: "picked",    label: "집화완료", icon: "🏷️" },
  { key: "transit",   label: "간선이동", icon: "🚛" },
  { key: "delivery",  label: "배송중",   icon: "🛵" },
  { key: "delivered", label: "배송완료", icon: "🏠" },
];

const TRACKING_DB = {
  "519719884106": {
    carrier: "스마트로지스",
    receiver: "김*리",
    eta: "6월 27일 (토) 도착 예정",
    // 현재 진행 단계 key (JOURNEY_STEPS 기준)
    currentStep: "delivery",
    product: "prod-1",
    // 상세 추적 이력 (최신이 위로 가도록 app.js에서 역순 정렬)
    history: [
      { time: "2026-06-25 14:02", status: "주문접수", where: "온라인 주문 완료", step: "ordered" },
      { time: "2026-06-25 18:30", status: "상품준비중", where: "용인 물류센터", step: "prepared" },
      { time: "2026-06-26 07:15", status: "집화완료", where: "용인 물류센터", step: "picked" },
      { time: "2026-06-26 09:40", status: "간선상차", where: "용인 H-허브", step: "transit" },
      { time: "2026-06-26 11:55", status: "간선하차", where: "서울 강남 터미널", step: "transit" },
      { time: "2026-06-26 13:20", status: "배송출발", where: "강남2 배송지점 · 박기사", step: "delivery" },
    ],
  },

  "884201337755": {
    carrier: "한진택배",
    receiver: "이*수",
    eta: "6월 26일 (금) 배송완료",
    currentStep: "delivered",
    product: "prod-2",
    history: [
      { time: "2026-06-23 10:11", status: "주문접수", where: "온라인 주문 완료", step: "ordered" },
      { time: "2026-06-23 16:45", status: "상품준비중", where: "이천 물류센터", step: "prepared" },
      { time: "2026-06-24 08:02", status: "집화완료", where: "이천 물류센터", step: "picked" },
      { time: "2026-06-24 20:30", status: "간선상차", where: "이천 허브", step: "transit" },
      { time: "2026-06-25 06:10", status: "간선하차", where: "부산 사상 터미널", step: "transit" },
      { time: "2026-06-25 09:25", status: "배송출발", where: "사상1 배송지점 · 최기사", step: "delivery" },
      { time: "2026-06-26 11:48", status: "배송완료", where: "문 앞 (수령인: 본인)", step: "delivered" },
    ],
  },
};

/* =========================================================
   제품 데이터
   ========================================================= */
const PRODUCT_DB = {
  "prod-1": {
    brand: "FRESH GARDEN",
    name: "유기농 콜드프레스 주스 12종 세트",
    image: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&q=80&auto=format&fit=crop",
    rating: 4.8,
    reviewsCount: 1284,
    price: 32900,
    priceOrigin: 45000,
    desc: "착즙 그대로, 첨가물 없이. 매일 아침 마시는 100% 유기농 콜드프레스 주스 12종을 한 박스에 담았습니다.",
    features: [
      "무첨가·무가당 100% 착즙 원액",
      "저온 살균으로 영양소 보존",
      "낱개 포장으로 신선하게",
      "냉장 보관 · 출고일 포함 14일 이내 섭취 권장",
    ],
    reviews: [
      { author: "건강한아침", rating: 5, date: "2026-06-20", text: "매일 아침 하나씩 마시는데 속이 편하고 맛도 좋아요. 재구매 의사 100%!" },
      { author: "주스러버", rating: 4, date: "2026-06-15", text: "당도가 낮아서 처음엔 밍밍했는데 익숙해지니 자연스러운 단맛이 좋네요." },
      { author: "미니멀리스트", rating: 5, date: "2026-06-10", text: "포장 꼼꼼하고 배송 빨라요. 12종이라 골라먹는 재미가 있습니다." },
    ],
  },

  "prod-2": {
    brand: "NORDIC HOME",
    name: "무선 아로마 디퓨저 + 오일 3종",
    image: "https://images.unsplash.com/photo-1602874801006-e26d3d17d2b1?w=600&q=80&auto=format&fit=crop",
    rating: 4.6,
    reviewsCount: 532,
    price: 48000,
    priceOrigin: 69000,
    desc: "USB 충전식 무선 디퓨저로 어디서나 은은한 향을. 라벤더·시트러스·우드 3종 에센셜 오일을 함께 드립니다.",
    features: [
      "무선 충전식 · 최대 8시간 연속 사용",
      "7색 무드등 내장",
      "자동 꺼짐 안전 기능",
      "천연 에센셜 오일 3종 포함",
    ],
    reviews: [
      { author: "집순이라이프", rating: 5, date: "2026-06-22", text: "무선이라 침실 어디든 둘 수 있어서 좋아요. 향도 은은하니 딱 좋습니다." },
      { author: "향기수집가", rating: 4, date: "2026-06-18", text: "디자인 예쁘고 조용해요. 오일이 좀 더 많았으면 하는 아쉬움은 있네요." },
    ],
  },
};

/* =========================================================
   추천 상품 (모든 조회 결과에 공통 노출)
   ========================================================= */
const RECOMMENDED = [
  {
    name: "유기농 그래놀라 500g",
    image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&q=80&auto=format&fit=crop",
    price: 12900,
    rating: 4.7,
  },
  {
    name: "원목 캔들 홀더 세트",
    image: "https://images.unsplash.com/photo-1602607213323-9483c3a17e6e?w=400&q=80&auto=format&fit=crop",
    price: 18500,
    rating: 4.5,
  },
  {
    name: "프리미엄 핸드크림 3종",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80&auto=format&fit=crop",
    price: 24000,
    rating: 4.9,
  },
];
