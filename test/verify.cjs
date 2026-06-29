/* 헤드리스 렌더 검증 스크립트 (Playwright)
   실행: node test/verify.cjs
   - 빌드 불필요. file:// 로 index.html 을 열어 핵심 렌더/에러를 점검합니다.
   - 외부 이미지(net::ERR_*) 로드 실패는 무시합니다(코드 오류 아님). */
const fs = require("fs");
const path = require("path");

function findPlaywright() {
  const cands = [
    "playwright",
    "/opt/node22/lib/node_modules/playwright/index.js",
  ];
  for (const c of cands) { try { return require(c); } catch (_) {} }
  throw new Error("playwright 모듈을 찾을 수 없습니다.");
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    const dir = fs.readdirSync(base).find((d) => d.startsWith("chromium-"));
    if (dir) return path.join(base, dir, "chrome-linux", "chrome");
  } catch (_) {}
  return undefined; // playwright 기본 경로 사용
}

// 실제 배포(https)와 동일하게 http 로 띄우기 위한 초경량 정적 서버
function startServer(root) {
  const http = require("http");
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = path.join(root, p);
    fs.readFile(file, (err, buf) => {
      if (err) { res.statusCode = 404; res.end("not found"); return; }
      res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, () => resolve({ server, port: server.address().port })));
}

(async () => {
  const { chromium } = findPlaywright();
  const exe = findChromium();
  const { server, port } = await startServer(path.join(__dirname, ".."));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    // 리소스 로드 실패(net::ERR_/404)는 폴백이 처리하는 의도된 케이스 → 무시.
    // 실제 JS 오류만 잡는다(pageerror + 그 외 console.error).
    const t = m.text();
    if (m.type() === "error" && !/net::ERR_|Failed to load resource/.test(t)) errors.push("CONSOLE: " + t);
  });

  const url = `http://localhost:${port}/index.html`;
  await page.goto(url);

  let fail = 0;
  const expect = (name, cond, got) => {
    const ok = !!cond;
    console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : "  (got: " + JSON.stringify(got) + ")"}`);
    if (!ok) fail++;
  };

  for (const no of ["519719884106", "884201337755"]) {
    await page.click(`.sample-chip[data-no="${no}"]`);
    await page.waitForTimeout(500);
    const r = {};
    for (const sel of ["#result", "#product", "#brand", "#contact"]) r[sel] = await page.$eval(sel, (el) => !el.hidden);
    r.journey = await page.$$eval("#journey-steps .journey-step", (e) => e.length);
    r.route = await page.$$eval("#route-nodes .route-node", (e) => e.length);
    r.routeChar = await page.$eval("#route-char-img", (e) => !!e.getAttribute("src"));
    r.history = await page.$$eval("#history-list .timeline-item", (e) => e.length);
    r.insta = await page.$$eval("#insta-feed .insta-item", (e) => e.length);
    r.recommends = await page.$$eval("#recommend-list .recommend-item", (e) => e.length);
    r.eta = await page.$eval("#eta-countdown", (e) => e.textContent);
    r.status = await page.$eval("#status-animation", (e) => e.dataset.status);
    console.log(`\n[${no}]`);
    expect("결과 섹션 노출", r["#result"] && r["#product"] && r["#brand"] && r["#contact"], r);
    expect("배송여정 6단계", r.journey === 6, r.journey);
    expect("배송 경로 노드 5", r.route === 5, r.route);
    expect("경로 캐릭터 표시", r.routeChar, r.routeChar);
    expect("이력 ≥ 6", r.history >= 6, r.history);
    expect("인스타 6칸", r.insta === 6, r.insta);
    expect("추천 2개", r.recommends === 2, r.recommends);
    expect("ETA 표시", r.eta && r.eta.length > 0, r.eta);
    expect("status 주입", !!r.status, r.status);
  }

  // 없는 운송장 → 에러 노출
  await page.fill("#track-input", "000000000000");
  await page.click(".track-btn");
  await page.waitForTimeout(300);
  const errVisible = await page.$eval("#track-error", (el) => !el.hidden);
  console.log("\n[오류 처리]");
  expect("없는 번호 → 에러 노출", errVisible);

  console.log("\n" + (errors.length ? "런타임 에러:\n" + errors.join("\n") : "런타임 에러 없음 ✓"));
  if (errors.length) fail++;

  await browser.close();
  server.close();
  console.log("\n" + (fail ? `❌ 실패 ${fail}건` : "✅ 전체 통과"));
  process.exit(fail ? 1 : 0);
})();
