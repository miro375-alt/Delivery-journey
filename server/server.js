/* NAS 풀스택 서버 (무의존성, Node 18+ 내장 http/fetch만 사용)
   역할:
   1) 정적 프론트(index.html, css, js, data, assets) 서빙
   2) /api/track — 스마트택배 조회(키는 서버에만, 개인정보 마스킹 후 응답)
   3) 데이터 동기화(cron 대체) — 일정 주기로 카페24/인스타 fetch → data/*.json
   실행: node server/server.js   (Docker 권장 — Dockerfile/compose 참고)
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const SYNC_HOURS = Number(process.env.SYNC_INTERVAL_HOURS) || 6;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2",
};

// ---------- 개인정보 마스킹 ----------
const maskName = (s) => (!s ? s : s.length <= 1 ? s : s[0] + "*".repeat(s.length - 1));
const maskPhone = (s) => (!s ? s : String(s).replace(/(\d{2,3})\D?\d{3,4}\D?(\d{4})/, "$1-****-$2"));
function maskAddr(s) {
  if (!s) return s;
  // 동/읍/면/리 까지만 노출, 이후 상세주소는 가림
  const m = String(s).match(/^(.*?[동읍면리])\b/);
  return m ? m[1] + " ***" : s.replace(/\s\d.*$/, " ***");
}

// ---------- 정적 파일 ----------
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); } // 경로 탈출 방지
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
    res.end(buf);
  });
}

// ---------- /api/track (스마트택배) ----------
async function apiTrack(res, url) {
  const key = process.env.SMART_PARCEL_API_KEY;
  if (!key) return json(res, 503, { error: "배송조회 미설정(SMART_PARCEL_API_KEY 없음)" });
  const invoice = (url.searchParams.get("invoice") || "").replace(/\D/g, "");
  let code = url.searchParams.get("code") || "";
  if (!invoice) return json(res, 400, { error: "invoice(송장번호) 필요" });

  try {
    // 택배사 코드 미지정 시 자동 추천
    if (!code) {
      const rec = await fetchJson(`https://info.sweettracker.co.kr/api/v1/recommend?t_key=${key}&t_invoice=${invoice}`);
      code = (rec.Recommend && rec.Recommend[0] && rec.Recommend[0].Code) || "";
      if (!code) return json(res, 404, { error: "택배사 자동인식 실패 — code 파라미터 필요" });
    }
    const t = await fetchJson(
      `https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${key}&t_code=${code}&t_invoice=${invoice}`
    );
    return json(res, 200, mapTracking(t, invoice));
  } catch (e) {
    return json(res, 502, { error: "조회 실패", detail: String(e).slice(0, 200) });
  }
}

// 스마트택배 응답 → 프론트 TRACKING_DB 형식으로 매핑 (+개인정보 마스킹)
// ⚠️ 실제 응답 필드는 키 발급 후 1회 점검해 미세조정 필요.
function mapTracking(t, invoice) {
  const STEP_BY_LEVEL = { 1: "ordered", 2: "picked", 3: "transit", 4: "transit", 5: "delivery", 6: "delivered" };
  const details = t.trackingDetails || [];
  const history = details.map((d) => ({
    time: d.timeString || d.time || "",
    status: d.kind || d.where || "",
    where: d.where || "",
    step: STEP_BY_LEVEL[d.level] || "transit",
  }));
  const last = details[details.length - 1] || {};
  return {
    carrier: t.company || "",
    carrierTel: t.companyTel || "",
    receiver: maskName(t.receiverName || ""),
    eta: t.estimate || "",
    etaDate: "",
    currentStep: STEP_BY_LEVEL[last.level] || (t.complete ? "delivered" : "transit"),
    product: null, // 송장↔주문↔상품 매핑(사방넷)은 별도 단계
    delivery: {
      sender: t.senderName || "",
      receiverName: maskName(t.receiverName || ""),
      receiverAddr: maskAddr(t.receiverAddr || ""),
      receiverPhone: maskPhone(t.receiverTel || ""),
      request: "",
    },
    history,
  };
}

// ---------- 유틸 ----------
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}
async function fetchJson(u) {
  const r = await fetch(u);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

// ---------- 서버 ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/track") return apiTrack(res, url);
  if (url.pathname === "/healthz") return json(res, 200, { ok: true });
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => console.log(`[server] http://0.0.0.0:${PORT} (sync ${SYNC_HOURS}h)`));

// ---------- 데이터 동기화 스케줄 (cron 대체) ----------
async function sync() {
  try {
    const cafe24 = require("../scripts/fetch-cafe24");
    const insta = require("../scripts/fetch-instagram");
    await cafe24.run();
    await insta.run();
  } catch (e) { console.error("[sync] 실패:", e.message); }
}
sync(); // 부팅 시 1회
// setInterval 은 ~24.8일(2^31-1 ms) 초과 시 즉시 반복되는 버그가 있어 클램프
const intervalMs = Math.min(Math.max(SYNC_HOURS, 1) * 3600 * 1000, 2 ** 31 - 1);
setInterval(sync, intervalMs);
