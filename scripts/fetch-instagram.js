/* Instagram Graph API → data/insta-{brand}.json
   - 시크릿 없으면 안전하게 skip
   실행: node scripts/fetch-instagram.js */
const { log, writeData, getJSON } = require("./lib");

const BRANDS = [
  { brand: "aguard",       tokenEnv: "IG_TOKEN_AGUARD",       userEnv: "IG_USERID_AGUARD" },
  { brand: "babystandard", tokenEnv: "IG_TOKEN_BABYSTANDARD", userEnv: "IG_USERID_BABYSTANDARD" },
];
const GRAPH = process.env.IG_GRAPH_VERSION || "v19.0";
const FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
const REVIEW_RE = /(후기|리뷰|review|⭐|★)/i;

async function fetchBrand(b) {
  const token = process.env[b.tokenEnv];
  const user = process.env[b.userEnv];
  if (!(token && user)) { log(`skip ${b.brand} (인스타 시크릿 없음)`); return; }

  const r = await getJSON(
    `https://graph.facebook.com/${GRAPH}/${user}/media?fields=${FIELDS}&limit=12&access_token=${token}`
  );
  const feed = (r.data || []).map((p) => ({
    image: p.media_type === "VIDEO" ? p.thumbnail_url || p.media_url : p.media_url,
    caption: (p.caption || "").split("\n")[0].slice(0, 80),
    likes: p.like_count || 0,
    permalink: p.permalink,
    isReview: REVIEW_RE.test(p.caption || ""),
  }));
  if (feed.length) writeData(`insta-${b.brand}.json`, feed);
  else log(`${b.brand}: 미디어 없음`);
}

async function run() {
  for (const b of BRANDS) {
    try { await fetchBrand(b); } catch (e) { log(`${b.brand} 실패: ${e.message}`); }
  }
}

module.exports = { run };
if (require.main === module) run();
