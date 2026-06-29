/* 배송조회(스마트택배) 서버리스 함수 — 템플릿 (예: Vercel / Netlify / Cloudflare)
   ──────────────────────────────────────────────────────────────
   배송조회는 "사용자가 송장 입력 → 실시간 조회"라서 cron(정적 파일)이 아니라
   서버리스 엔드포인트가 필요합니다. (API 키를 프론트에 노출하면 안 되므로 서버 경유)

   배포 후 프론트(js/app.js)의 track() 에서 TRACKING_DB[no] 대신
   `fetch('/api/track?invoice=...&code=...')` 로 호출하도록 바꾸면 됩니다.

   환경변수: SMART_PARCEL_API_KEY
   ────────────────────────────────────────────────────────────── */

// Vercel/Netlify 스타일 핸들러 예시
module.exports = async function handler(req, res) {
  try {
    const key = process.env.SMART_PARCEL_API_KEY;
    if (!key) return res.status(500).json({ error: "SMART_PARCEL_API_KEY 미설정" });

    const url = new URL(req.url, "http://x");
    const invoice = url.searchParams.get("invoice");
    const code = url.searchParams.get("code"); // 택배사 코드(t_code). companylist API로 조회 가능.
    if (!invoice || !code) return res.status(400).json({ error: "invoice, code 필요" });

    const api = `https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${key}&t_code=${code}&t_invoice=${invoice}`;
    const r = await fetch(api);
    const data = await r.json();

    // 스마트택배 응답 → 프론트 TRACKING_DB 형식으로 매핑(필요 시 가공)
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};

/* 택배사 코드 목록:
   GET https://info.sweettracker.co.kr/api/v1/companylist?t_key={KEY}
   사방넷 사용 시: 주문번호 → (택배사코드, 송장번호) 매핑을 먼저 조회 후 위 API 호출. */
