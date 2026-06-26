/* =========================================================
   배송조회 + 배송여정 + 제품 + 브랜드 — 화면 제어 로직
   ========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ----- 섹션 -----
  const form = $("track-form");
  const input = $("track-input");
  const errorBox = $("track-error");
  const resultSec = $("result");
  const productSec = $("product");
  const brandSec = $("brand");
  const contactSec = $("contact");
  const emptyState = $("empty-state");

  // ----- 유틸 -----
  const won = (n) => n.toLocaleString("ko-KR") + "원";
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function stars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function setSectionsVisible(v) {
    [resultSec, productSec, brandSec, contactSec].forEach((s) => (s.hidden = !v));
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    setSectionsVisible(false);
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

    const product = PRODUCT_DB[data.product];
    const brand = product ? BRAND_DB[product.brand] : null;

    renderStatusAnimation(data);
    renderSummary(no, data);
    renderJourney(data);
    renderOrder(data);
    renderDelivery(data);
    renderHistory(data);
    renderProduct(product);
    renderRecommends(product);
    renderBrand(brand);
    renderContact(brand);

    setSectionsVisible(true);
    resultSec.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ----- 상태 애니메이션 영역 -----
  function renderStatusAnimation(data) {
    const meta = STATUS_ANIMATION[data.currentStep] || {};
    const wrap = $("status-animation");
    wrap.dataset.status = data.currentStep; // 사용자가 CSS/JS로 분기 가능
    $("status-anim-emoji").textContent = meta.emoji || "🚚";
    $("status-anim-title").textContent = meta.title || "배송 상태";
    $("status-anim-caption").textContent = meta.caption || "";

    // 진행률 계산
    const idx = JOURNEY_STEPS.findIndex((s) => s.key === data.currentStep);
    const pct = Math.round(((idx + 1) / JOURNEY_STEPS.length) * 100);
    requestAnimationFrame(() => {
      $("status-progress-bar").style.width = pct + "%";
    });
    $("status-progress-label").textContent = `진행률 ${pct}%`;
  }

  // ----- 요약 카드 -----
  function renderSummary(no, data) {
    const isDone = data.currentStep === "delivered";
    const badge = $("summary-badge");
    badge.textContent = isDone ? "배송완료" : "배송중";
    badge.classList.toggle("done", isDone);

    $("summary-title").textContent = isDone ? "배송이 완료되었어요 🎉" : "배송이 진행 중이에요";

    const latest = data.history[data.history.length - 1];
    $("summary-desc").textContent = isDone
      ? "상품이 안전하게 도착했습니다. 이용해 주셔서 감사합니다."
      : `현재 상태: ${latest.status} · ${latest.where}`;

    $("meta-invoice").textContent = no;
    $("meta-carrier").textContent = data.carrier;
    $("meta-receiver").textContent = data.receiver;
    $("meta-eta").textContent = data.eta;
  }

  // ----- 배송여정 단계 -----
  function renderJourney(data) {
    const stepsEl = $("journey-steps");
    const currentIdx = JOURNEY_STEPS.findIndex((s) => s.key === data.currentStep);

    const timeByStep = {};
    data.history.forEach((h) => (timeByStep[h.step] = h.time));

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

  // ----- 주문요약 -----
  function renderOrder(data) {
    const o = data.order;
    if (!o) return;
    $("order-no").textContent = o.orderNo;
    $("order-date").textContent = o.orderDate;
    $("order-pay").textContent = o.payMethod;

    $("order-items").innerHTML = o.items
      .map(
        (it) => `
        <li class="order-item">
          <img src="${esc(it.image)}" alt="" loading="lazy" />
          <div class="order-item-info">
            <span class="order-item-name">${esc(it.name)}</span>
            <span class="order-item-opt">${esc(it.option)} · ${it.qty}개</span>
          </div>
          <span class="order-item-price">${won(it.price * it.qty)}</span>
        </li>`
      )
      .join("");

    const subtotal = o.items.reduce((s, it) => s + it.price * it.qty, 0);
    $("order-subtotal").textContent = won(subtotal);
    $("order-shipping").textContent = o.shippingFee ? won(o.shippingFee) : "무료";
    $("order-total").textContent = won(subtotal + o.shippingFee);
  }

  // ----- 배송정보 -----
  function renderDelivery(data) {
    const d = data.delivery;
    if (!d) return;
    $("del-sender").textContent = d.sender;
    $("del-sender-addr").textContent = d.senderAddr;
    $("del-receiver").textContent = d.receiverName;
    $("del-receiver-addr").textContent = d.receiverAddr;
    $("del-phone").textContent = d.receiverPhone;
    $("del-request").textContent = d.request;
    $("del-carrier-tel").textContent = `${data.carrier} ${data.carrierTel}`;
  }

  // ----- 국내 배송 상세 (최신 우선) -----
  function renderHistory(data) {
    const list = $("history-list");
    const items = [...data.history].reverse();
    list.innerHTML = items
      .map((h, i) => {
        const [date, time] = h.time.split(" ");
        const latestCls = i === 0 ? "is-latest" : "";
        return `
          <li class="timeline-item ${latestCls}">
            <div class="tl-time"><b>${time}</b>${date.slice(5).replace("-", "/")}</div>
            <div class="tl-rail"><span class="tl-node"></span></div>
            <div class="tl-body">
              <div class="tl-status">${esc(h.status)}</div>
              <div class="tl-where">${esc(h.where)}</div>
            </div>
          </li>`;
      })
      .join("");
  }

  // ----- 제품 소개 -----
  function renderProduct(p) {
    if (!p) return;
    $("product-image").src = p.image;
    $("product-image").alt = p.name;
    $("product-brand").textContent = (BRAND_DB[p.brand] && BRAND_DB[p.brand].name) || "";
    $("product-name").textContent = p.name;
    $("product-stars").textContent = stars(p.rating);
    $("product-score").textContent = p.rating.toFixed(1);
    $("product-reviews-count").textContent = `(${p.reviewsCount.toLocaleString("ko-KR")}개 리뷰)`;
    $("product-desc").textContent = p.desc;
    $("product-price").textContent = won(p.price);

    const originEl = $("product-price-origin");
    const discEl = $("product-discount");
    if (p.priceOrigin && p.priceOrigin > p.price) {
      originEl.textContent = won(p.priceOrigin);
      discEl.textContent = `${Math.round((1 - p.price / p.priceOrigin) * 100)}%`;
    } else {
      originEl.textContent = "";
      discEl.textContent = "";
    }

    $("product-features").innerHTML = p.features.map((f) => `<li>${esc(f)}</li>`).join("");
    $("review-list").innerHTML = p.reviews
      .map(
        (r) => `
        <li class="review-item">
          <div class="review-head">
            <span class="review-author">${esc(r.author)}</span>
            <span class="review-stars">${stars(r.rating)}</span>
            <span class="review-date">${esc(r.date)}</span>
          </div>
          <p class="review-text">${esc(r.text)}</p>
        </li>`
      )
      .join("");
  }

  // ----- 추천 상품 -----
  function renderRecommends(p) {
    const ids = (p && p.recommends) || Object.keys(RECOMMEND_DB).slice(0, 3);
    $("recommend-list").innerHTML = ids
      .map((id) => RECOMMEND_DB[id])
      .filter(Boolean)
      .map(
        (r) => `
      <li class="recommend-item">
        <img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy" />
        <div class="rec-body">
          <p class="rec-name">${esc(r.name)}</p>
          <div class="rec-price">${won(r.price)}</div>
          <div class="rec-rating">★ ${r.rating.toFixed(1)}</div>
        </div>
      </li>`
      )
      .join("");
  }

  // ----- 브랜드 (인스타 / 철학 / 쇼핑몰) -----
  function renderBrand(b) {
    if (!b) return;
    const handle = $("insta-handle");
    handle.textContent = b.instaHandle;
    handle.href = `https://instagram.com/${b.instaHandle.replace(/^@/, "")}`;

    $("insta-feed").innerHTML = b.instaFeed
      .map(
        (f) => `
        <li class="insta-item">
          <img src="${esc(f.image)}" alt="" loading="lazy" />
          <div class="insta-overlay">
            ${f.isReview ? '<span class="insta-tag">리뷰</span>' : ""}
            <p class="insta-caption">${esc(f.caption)}</p>
            <span class="insta-likes">♥ ${f.likes.toLocaleString("ko-KR")}</span>
          </div>
        </li>`
      )
      .join("");

    $("brand-tagline").textContent = `“${b.tagline}”`;
    $("brand-philosophy").textContent = b.philosophy;
    $("brand-values").innerHTML = b.values
      .map(
        (v) => `
        <li class="brand-value">
          <span class="bv-icon">${v.icon}</span>
          <strong class="bv-title">${esc(v.title)}</strong>
          <span class="bv-desc">${esc(v.desc)}</span>
        </li>`
      )
      .join("");

    const banner = $("shop-banner");
    banner.href = b.shopUrl;
    $("shop-banner-name").textContent = `${b.name} 공식몰`;
  }

  // ----- 문의하기 -----
  function renderContact(b) {
    if (!b) return;
    const c = b.contact;
    $("contact-channels").innerHTML = `
      <li><span class="cc-ico">💬</span><div><dt>카카오톡 채널</dt><dd>${esc(c.kakao)}</dd></div></li>
      <li><span class="cc-ico">📞</span><div><dt>고객센터</dt><dd>${esc(c.tel)}</dd></div></li>
      <li><span class="cc-ico">✉️</span><div><dt>이메일</dt><dd>${esc(c.email)}</dd></div></li>
      <li><span class="cc-ico">🕒</span><div><dt>운영시간</dt><dd>${esc(c.hours)}</dd></div></li>`;
  }

  // ----- 이벤트 -----
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

  document.addEventListener("click", (e) => {
    if (e.target.id === "cta-buy") alert("구매 페이지로 이동합니다. (데모)");
    if (e.target.id === "cta-cart") alert("장바구니에 담았습니다. (데모)");
  });

  const contactForm = $("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("문의가 접수되었습니다. 빠르게 답변드릴게요! (데모)");
      contactForm.reset();
    });
  }

  // URL(?no= / #track/번호) 자동 조회
  function autoTrackFromUrl() {
    const params = new URLSearchParams(location.search);
    const hashMatch = location.hash.match(/track\/(\d+)/);
    const no = params.get("no") || (hashMatch && hashMatch[1]);
    if (no) {
      input.value = no;
      track(no);
    }
  }

  autoTrackFromUrl();
})();
