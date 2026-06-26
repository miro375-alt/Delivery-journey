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

(async () => {
  const { chromium } = findPlaywright();
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR_/.test(m.text())) errors.push("CONSOLE: " + m.text());
  });

  const url = "file://" + path.join(__dirname, "..", "index.html");
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
    r.history = await page.$$eval("#history-list .timeline-item", (e) => e.length);
    r.insta = await page.$$eval("#insta-feed .insta-item", (e) => e.length);
    r.eta = await page.$eval("#eta-countdown", (e) => e.textContent);
    r.status = await page.$eval("#status-animation", (e) => e.dataset.status);
    console.log(`\n[${no}]`);
    expect("결과 섹션 노출", r["#result"] && r["#product"] && r["#brand"] && r["#contact"], r);
    expect("배송여정 6단계", r.journey === 6, r.journey);
    expect("이력 ≥ 6", r.history >= 6, r.history);
    expect("인스타 6", r.insta === 6, r.insta);
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
  console.log("\n" + (fail ? `❌ 실패 ${fail}건` : "✅ 전체 통과"));
  process.exit(fail ? 1 : 0);
})();
