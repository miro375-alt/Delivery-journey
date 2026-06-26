/* =========================================================
   목업(가짜) 데이터 — 배송 / 주문 / 제품 / 브랜드
   - 실제 API 연동 시 TRACKING_DB 조회 부분을 fetch 로 교체.
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

// 상태 애니메이션 메타 (추후 사용자가 Lottie/video/gif 삽입)
// data-status 값으로 #status-animation 슬롯에 매핑됩니다.
const STATUS_ANIMATION = {
  ordered:   { emoji: "📝", title: "주문이 접수되었어요", caption: "곧 상품 준비를 시작합니다" },
  prepared:  { emoji: "📦", title: "상품을 정성껏 포장 중이에요", caption: "출고 준비 중" },
  picked:    { emoji: "🏷️", title: "택배사에 전달되었어요", caption: "집화 완료" },
  transit:   { emoji: "🚛", title: "물류센터를 이동하고 있어요", caption: "간선 이동 중" },
  delivery:  { emoji: "🛵", title: "오늘 도착! 배송기사님이 이동 중이에요", caption: "곧 만나요" },
  delivered: { emoji: "🎉", title: "배송이 완료되었어요", caption: "이용해 주셔서 감사합니다" },
};

const TRACKING_DB = {
  "519719884106": {
    carrier: "스마트로지스",
    carrierTel: "1588-0000",
    receiver: "김*리",
    eta: "6월 27일 (토) 도착 예정",
    etaDate: "2026-06-27",
    currentStep: "delivery",
    product: "prod-1",

    // 주문요약
    order: {
      orderNo: "20260625-0098213",
      orderDate: "2026-06-25 14:02",
      payMethod: "신용카드 (간편결제)",
      items: [
        { name: "유기농 콜드프레스 주스 12종 세트", option: "기본 구성", qty: 1, price: 32900,
          image: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=200&q=80&auto=format&fit=crop" },
      ],
      shippingFee: 0,
    },

    // 배송정보
    delivery: {
      sender: "FRESH GARDEN",
      senderAddr: "경기 용인시 처인구 물류로 12",
      receiverName: "김지리",
      receiverAddr: "서울 강남구 테헤란로 123, 4층 (역삼동)",
      receiverPhone: "010-****-1234",
      request: "부재 시 문 앞에 놓아주세요",
    },

    // 상세 추적 이력 (app.js에서 역순 정렬)
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
    product: "prod-2",

    order: {
      orderNo: "20260623-0044120",
      orderDate: "2026-06-23 10:11",
      payMethod: "계좌간편결제",
      items: [
        { name: "무선 아로마 디퓨저 + 오일 3종", option: "화이트", qty: 1, price: 48000,
          image: "https://images.unsplash.com/photo-1602874801006-e26d3d17d2b1?w=200&q=80&auto=format&fit=crop" },
      ],
      shippingFee: 3000,
    },

    delivery: {
      sender: "NORDIC HOME",
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
   제품 데이터
   ========================================================= */
const PRODUCT_DB = {
  "prod-1": {
    brand: "brand-fresh",
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
    recommends: ["rec-1", "rec-2", "rec-3"],
  },

  "prod-2": {
    brand: "brand-nordic",
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
    recommends: ["rec-4", "rec-5", "rec-1"],
  },
};

/* =========================================================
   추천 상품 풀
   ========================================================= */
const RECOMMEND_DB = {
  "rec-1": { name: "유기농 그래놀라 500g", image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400&q=80&auto=format&fit=crop", price: 12900, rating: 4.7 },
  "rec-2": { name: "원목 캔들 홀더 세트", image: "https://images.unsplash.com/photo-1602607213323-9483c3a17e6e?w=400&q=80&auto=format&fit=crop", price: 18500, rating: 4.5 },
  "rec-3": { name: "프리미엄 핸드크림 3종", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80&auto=format&fit=crop", price: 24000, rating: 4.9 },
  "rec-4": { name: "라벤더 룸스프레이", image: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=400&q=80&auto=format&fit=crop", price: 15900, rating: 4.6 },
  "rec-5": { name: "린넨 무드 쿠션 커버", image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?w=400&q=80&auto=format&fit=crop", price: 21000, rating: 4.4 },
};

/* =========================================================
   브랜드 데이터 (철학 / 인스타 피드 / 쇼핑몰 / 문의)
   ========================================================= */
const BRAND_DB = {
  "brand-fresh": {
    name: "FRESH GARDEN",
    tagline: "자연을 가장 가까이",
    philosophy:
      "우리는 흙에서 식탁까지의 거리를 줄이는 일을 합니다. 불필요한 첨가물 대신 제철 원물의 힘을 믿고, " +
      "농부와 직접 계약 재배한 재료만을 사용합니다. 더 적게 가공하고, 더 정직하게 담는 것 — 그것이 프레시가든의 약속입니다.",
    values: [
      { icon: "🌱", title: "유기농 원물", desc: "계약 재배 · 무농약 인증" },
      { icon: "♻️", title: "친환경 포장", desc: "재활용 가능 패키지 100%" },
      { icon: "🤝", title: "공정한 거래", desc: "산지 농가와 직거래" },
    ],
    shopUrl: "https://example.com/freshgarden",
    instaHandle: "@fresh_garden_official",
    instaFeed: [
      { image: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&q=80&auto=format&fit=crop", likes: 842, caption: "오늘 아침의 한 잔 🍊 #콜드프레스 #모닝루틴", isReview: false },
      { image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80&auto=format&fit=crop", likes: 1203, caption: "고객님 후기 📸 '아이도 잘 먹어요!' ⭐⭐⭐⭐⭐", isReview: true },
      { image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&q=80&auto=format&fit=crop", likes: 657, caption: "산지에서 바로 🌿 #제철과일 #직거래", isReview: false },
      { image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&q=80&auto=format&fit=crop", likes: 998, caption: "리뷰 이벤트 당첨자 발표! 🎁", isReview: true },
      { image: "https://images.unsplash.com/photo-1576673442511-7e39b6545c87?w=400&q=80&auto=format&fit=crop", likes: 1540, caption: "여름 한정 자몽에이드 출시 🍋", isReview: false },
      { image: "https://images.unsplash.com/photo-1497534446932-c925b458314a?w=400&q=80&auto=format&fit=crop", likes: 721, caption: "'매일 마시는 습관' 후기 모음 💬", isReview: true },
    ],
    contact: {
      kakao: "@freshgarden",
      tel: "1600-1234",
      email: "help@freshgarden.example.com",
      hours: "평일 10:00~17:00 (점심 12~13시 / 주말·공휴일 휴무)",
    },
  },

  "brand-nordic": {
    name: "NORDIC HOME",
    tagline: "단순함이 주는 편안함",
    philosophy:
      "북유럽의 절제된 미학에서 출발합니다. 화려함보다 오래 곁에 둘 수 있는 물건, " +
      "공간을 채우기보다 비우는 디자인을 지향합니다. 좋은 소재와 정직한 마감으로 일상의 온도를 높입니다.",
    values: [
      { icon: "🪵", title: "지속가능 소재", desc: "FSC 인증 원목 사용" },
      { icon: "✨", title: "미니멀 디자인", desc: "군더더기 없는 형태" },
      { icon: "🔧", title: "오래 쓰는 품질", desc: "2년 무상 A/S" },
    ],
    shopUrl: "https://example.com/nordichome",
    instaHandle: "@nordic_home_kr",
    instaFeed: [
      { image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80&auto=format&fit=crop", likes: 932, caption: "거실의 작은 변화 🕯️ #홈스타일링", isReview: false },
      { image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80&auto=format&fit=crop", likes: 654, caption: "고객님 공간 후기 🏠 ⭐⭐⭐⭐⭐", isReview: true },
      { image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&q=80&auto=format&fit=crop", likes: 1120, caption: "은은한 우드 향 🌲 #디퓨저", isReview: false },
      { image: "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=400&q=80&auto=format&fit=crop", likes: 845, caption: "재구매 후기 💬 '선물용으로 최고'", isReview: true },
      { image: "https://images.unsplash.com/photo-1522444195799-478538b28823?w=400&q=80&auto=format&fit=crop", likes: 1330, caption: "신상 캔들 컬렉션 ✨", isReview: false },
      { image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80&auto=format&fit=crop", likes: 712, caption: "이달의 베스트 리뷰 🏆", isReview: true },
    ],
    contact: {
      kakao: "@nordichome",
      tel: "1600-5678",
      email: "cs@nordichome.example.com",
      hours: "평일 09:30~18:00 (주말·공휴일 휴무)",
    },
  },
};
