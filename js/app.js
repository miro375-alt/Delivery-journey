/* =========================================================
   배송조회 + 배송여정 + 제품 소개 — 화면 제어 로직
   ========================================================= */
(function () {
  "use strict";

  // ----- 엘리먼트 -----
  const form = document.getElementById("track-form");
  const input = document.getElementById("track-input");
  const errorBox = document.getElementById("track-error");
  const resultSec = document.getElementById("result");
  const productSec = document.getElementById("product");
  const emptyState = document.getElementById("empty-state");

  // ----- 유틸 -----
  const won = (n) => n.toLocaleString("ko-KR") + "원";

  function stars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    resultSec.hidden = true;
    productSec.hidden = true;
    emptyState.hidden = false;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  // ----- 조회 실행 -----
  function track(rawNo) {
    const no = (rawNo || "").trim();
    if (!no) {
      showError("운송장 번호를 입력해 주세요.");
      return;
    }

    const data = TRACKING_DB[no];
    if (!data) {
      showError(
        "해당 운송장 번호의 배송 정보를 찾을 수 없습니다. 예시 번호(519719884106 또는 884201337755)로 확인해 보세요."
      );
      return;
    }

    clearError();
    emptyState.hidden = true;

    renderSummary(no, data);
    renderJourney(data);
    renderHistory(data);
    renderProduct(data);
    renderRecommends();

    resultSec.hidden = false;
    productSec.hidden = false;

    resultSec.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ----- 요약 카드 -----
  function renderSummary(no, data) {
    const isDone = data.currentStep === "delivered";
    const badge = document.getElementById("summary-badge");
    badge.textContent = isDone ? "배송완료" : "배송중";
    badge.classList.toggle("done", isDone);

    document.getElementById("summary-title").textContent = isDone
      ? "배송이 완료되었어요 🎉"
      : "배송이 진행 중이에요";

    const latest = data.history[data.history.length - 1];
    document.getElementById("summary-desc").textContent = isDone
      ? "상품이 안전하게 도착했습니다. 이용해 주셔서 감사합니다."
      : `현재 상태: ${latest.status} · ${latest.where}`;

    document.getElementById("meta-invoice").textContent = no;
    document.getElementById("meta-carrier").textContent = data.carrier;
    document.getElementById("meta-receiver").textContent = data.receiver;
    document.getElementById("meta-eta").textContent = data.eta;
  }

  // ----- 배송여정 (진행 단계) -----
  function renderJourney(data) {
    const stepsEl = document.getElementById("journey-steps");
    const currentIdx = JOURNEY_STEPS.findIndex((s) => s.key === data.currentStep);

    // 각 단계에 도달한 가장 최근 시각 매핑
    const timeByStep = {};
    data.history.forEach((h) => {
      timeByStep[h.step] = h.time;
    });

    stepsEl.innerHTML = JOURNEY_STEPS.map((step, i) => {
      let cls = "";
      if (i < currentIdx) cls = "complete";
      else if (i === currentIdx) cls = "active";

      const t = timeByStep[step.key];
      const timeLabel = t ? t.slice(5, 16).replace("-", "/") : "";

      return `
        <li class="journey-step ${cls}">
          <div class="step-dot">${step.icon}</div>
          <div class="step-label">${step.label}</div>
          <div class="step-time">${timeLabel}</div>
        </li>`;
    }).join("");
  }

  // ----- 상세 타임라인 (최신 우선) -----
  function renderHistory(data) {
    const list = document.getElementById("history-list");
    const items = [...data.history].reverse(); // 최신이 위로

    list.innerHTML = items
      .map((h, i) => {
        const [date, time] = h.time.split(" ");
        const latestCls = i === 0 ? "is-latest" : "";
        return `
          <li class="timeline-item ${latestCls}">
            <div class="tl-time"><b>${time}</b>${date.slice(5).replace("-", "/")}</div>
            <div class="tl-rail"><span class="tl-node"></span></div>
            <div class="tl-body">
              <div class="tl-status">${h.status}</div>
              <div class="tl-where">${h.where}</div>
            </div>
          </li>`;
      })
      .join("");
  }

  // ----- 제품 소개 -----
  function renderProduct(data) {
    const p = PRODUCT_DB[data.product];
    if (!p) return;

    document.getElementById("product-image").src = p.image;
    document.getElementById("product-image").alt = p.name;
    document.getElementById("product-brand").textContent = p.brand;
    document.getElementById("product-name").textContent = p.name;
    document.getElementById("product-stars").textContent = stars(p.rating);
    document.getElementById("product-score").textContent = p.rating.toFixed(1);
    document.getElementById("product-reviews-count").textContent =
      `(${p.reviewsCount.toLocaleString("ko-KR")}개 리뷰)`;
    document.getElementById("product-desc").textContent = p.desc;
    document.getElementById("product-price").textContent = won(p.price);

    const originEl = document.getElementById("product-price-origin");
    const discEl = document.getElementById("product-discount");
    if (p.priceOrigin && p.priceOrigin > p.price) {
      originEl.textContent = won(p.priceOrigin);
      const rate = Math.round((1 - p.price / p.priceOrigin) * 100);
      discEl.textContent = `${rate}%`;
    } else {
      originEl.textContent = "";
      discEl.textContent = "";
    }

    document.getElementById("product-features").innerHTML = p.features
      .map((f) => `<li>${f}</li>`)
      .join("");

    // 리뷰
    document.getElementById("review-list").innerHTML = p.reviews
      .map(
        (r) => `
        <li class="review-item">
          <div class="review-head">
            <span class="review-author">${r.author}</span>
            <span class="review-stars">${stars(r.rating)}</span>
            <span class="review-date">${r.date}</span>
          </div>
          <p class="review-text">${r.text}</p>
        </li>`
      )
      .join("");
  }

  // ----- 추천 상품 -----
  function renderRecommends() {
    document.getElementById("recommend-list").innerHTML = RECOMMENDED.map(
      (r) => `
      <li class="recommend-item">
        <img src="${r.image}" alt="${r.name}" loading="lazy" />
        <div class="rec-body">
          <p class="rec-name">${r.name}</p>
          <div class="rec-price">${won(r.price)}</div>
          <div class="rec-rating">★ ${r.rating.toFixed(1)}</div>
        </div>
      </li>`
    ).join("");
  }

  // ----- 이벤트 바인딩 -----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    track(input.value);
  });

  document.querySelectorAll(".sample-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.no;
      track(chip.dataset.no);
    });
  });

  // 제품 CTA (데모 알림)
  document.addEventListener("click", (e) => {
    if (e.target.id === "cta-buy") alert("구매 페이지로 이동합니다. (데모)");
    if (e.target.id === "cta-cart") alert("장바구니에 담았습니다. (데모)");
  });

  // URL 해시(#track/번호) 또는 ?no= 로 진입 시 자동 조회
  function autoTrackFromUrl() {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("no");
    const hashMatch = location.hash.match(/track\/(\d+)/);
    const no = fromQuery || (hashMatch && hashMatch[1]);
    if (no) {
      input.value = no;
      track(no);
    }
  }

  autoTrackFromUrl();
})();
