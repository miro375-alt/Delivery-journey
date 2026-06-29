/* 카페24 Admin API → data/catalog.json (+ promotions.json)
   - 시크릿 없으면 안전하게 skip (CI 실패 안 함)
   - 월령 카테고리명 → ageGroup 자동 매핑
   실행: node scripts/fetch-cafe24.js */
const { log, haveEnv, writeData, getJSON } = require("./lib");

const MALLS = [
  { brand: "aguard",       mallEnv: "CAFE24_MALLID_AGUARD",       refreshEnv: "CAFE24_REFRESH_AGUARD" },
  { brand: "babystandard", mallEnv: "CAFE24_MALLID_BABYSTANDARD", refreshEnv: "CAFE24_REFRESH_BABYSTANDARD" },
];
// 연동 시점 최신 버전으로 조정 (개발자센터 문서 기준)
const API_VERSION = process.env.CAFE24_API_VERSION || "2024-06-01";

// 카테고리명 → ageGroup 정규화 (아가드 "월령별 추천" 분류)
function categoryToAgeGroup(name) {
  if (!name) return null;
  const n = String(name).replace(/\s/g, "");
  if (/출산준비/.test(n)) return "출산준비물";
  const range = n.match(/(\d+)[~\-](\d+)개월/);
  if (range) return `${range[1]}~${range[2]}개월`;
  const over = n.match(/(\d+)개월(이상|~|＋|\+)/);
  if (over) return `${over[1]}개월~`;
  return null;
}

async function refreshToken(mallId, clientId, clientSecret, refresh) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh });
  return getJSON(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function fetchMall(m) {
  const clientId = process.env.CAFE24_CLIENT_ID;
  const clientSecret = process.env.CAFE24_CLIENT_SECRET;
  const mallId = process.env[m.mallEnv];
  const refresh = process.env[m.refreshEnv];
  if (!(clientId && clientSecret && mallId && refresh)) {
    log(`skip ${m.brand} (카페24 시크릿 없음)`);
    return { items: [], promos: [] };
  }

  const tok = await refreshToken(mallId, clientId, clientSecret, refresh);
  const at = tok.access_token;
  if (tok.refresh_token && tok.refresh_token !== refresh) {
    // refresh_token 은 회전·2주 만료 → 시크릿 갱신 필요(운영 주의). README 참조.
    log(`⚠ ${m.brand}: 새 refresh_token 발급됨 → 시크릿 ${m.refreshEnv} 갱신 필요(회전/만료).`);
  }
  const base = `https://${mallId}.cafe24api.com/api/v2/admin`;
  const headers = { Authorization: `Bearer ${at}`, "X-Cafe24-Api-Version": API_VERSION };

  // 1) 카테고리 → ageGroup
  const cats = (await getJSON(`${base}/categories?limit=100`, { headers })).categories || [];
  const catAge = {};
  for (const c of cats) {
    const ag = categoryToAgeGroup(c.category_name);
    if (ag) catAge[c.category_no] = ag;
  }
  log(`${m.brand}: 월령 카테고리 ${Object.keys(catAge).length}개`);

  // 2) product_no → ageGroup (각 월령 카테고리 소속 상품)
  const prodAge = {};
  for (const catNo of Object.keys(catAge)) {
    try {
      const r = await getJSON(`${base}/categories/${catNo}/products?limit=100`, { headers });
      for (const p of r.products || []) prodAge[p.product_no] = catAge[catNo];
    } catch (e) { log(`cat ${catNo} products 조회 실패: ${e.message}`); }
  }

  // 3) 상품 상세 (페이지네이션)
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const r = await getJSON(`${base}/products?limit=100&offset=${offset}&display=T&selling=T`, { headers });
    const ps = r.products || [];
    for (const p of ps) {
      items.push({
        id: `cafe24-${mallId}-${p.product_no}`,
        brand: m.brand, mall: m.brand,
        ageGroup: prodAge[p.product_no] || null,
        category: (p.category && p.category[0] && p.category[0].category_name) || "",
        name: p.product_name,
        price: Number(p.price) || 0,
        rating: 0, reviewsCount: 0,
        image: p.detail_image || p.list_image || p.tiny_image || "",
        // 커스텀 도메인(aguardmall.com)이 있으면 그 도메인으로 바꾸는 게 좋음
        url: `https://${mallId}.cafe24.com/product/detail.html?product_no=${p.product_no}`,
      });
    }
    if (ps.length < 100) break;
  }
  log(`${m.brand}: 상품 ${items.length}개`);

  // 4) (선택) 쿠폰 → 행사 (배너성 기획전은 API에 없을 수 있음 → 부가 정보)
  let promos = [];
  try {
    const cr = await getJSON(`${base}/coupons?limit=20&coupon_status=A`, { headers });
    promos = (cr.coupons || []).map((c) => ({
      title: c.coupon_name,
      period: [c.issued_start_date, c.issued_end_date].filter(Boolean).join(" ~ "),
      url: `https://${mallId}.cafe24.com`,
    }));
  } catch (e) { log(`${m.brand} 쿠폰 조회 생략: ${e.message}`); }

  return { items, promos };
}

async function run() {
  if (!haveEnv(["CAFE24_CLIENT_ID", "CAFE24_CLIENT_SECRET"])) {
    log("카페24 공통 시크릿 없음 → 전체 skip");
    return;
  }
  let all = [];
  const promotions = {};
  for (const m of MALLS) {
    try {
      const { items, promos } = await fetchMall(m);
      all = all.concat(items);
      if (promos && promos.length) promotions[m.brand] = promos;
    } catch (e) { log(`${m.brand} 실패: ${e.message}`); }
  }
  if (all.length) writeData("catalog.json", all);
  else log("생성된 상품 없음 → catalog.json 미기록");
  if (Object.keys(promotions).length) writeData("promotions.json", promotions);
}

module.exports = { run };
if (require.main === module) run();
