/* 관리자 페이지 — 속도 개선과 휴대폰 화면용 보조 스크립트 (admin.html 의 본문 스크립트 뒤에 불러온다)
 *
 *  1) 로그인 유지: 한 번 로그인하면 이 기기에서는 다시 묻지 않는다 (설정 → 로그아웃으로 해제)
 *  2) 바로 보여주기: 마지막으로 받은 대시보드 숫자를 먼저 띄우고, 서버 응답이 오면 바꾼다
 *  3) 왕복 줄이기: 로그인 확인과 통계를 한 번에, 접수 목록·상품은 그와 동시에 미리 받는다
 *  4) 탭·필터는 기다림 없이: 받아 둔 목록을 기기 안에서 거른다
 *  5) 휴대폰에서는 표를 카드로 보여준다 (칸 이름표는 표 머리글에서 가져온다)
 *
 *  개인정보(이름·연락처·주소)가 든 접수 목록은 기기에 저장하지 않고 화면이 열려 있는 동안만 기억한다.
 */
(function () {
  'use strict';
  const KEEP = 'expo_admin_key_keep';        // 로그인 유지
  const CACHE = 'expo_admin_stats_v1';       // 마지막 대시보드 숫자 (최근 접수 목록은 빼고 저장)
  const el = id => document.getElementById(id);
  const has = name => typeof window[name] === 'function';

  /* ── 저장된 대시보드 ── */
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CACHE)) || {}; } catch (e) { saved = {}; }
  function keepStats(ev, s) {
    try {
      const copy = Object.assign({}, s, { recent: [] });   // 최근 접수(개인정보)는 저장하지 않는다
      saved = { [ev || '']: copy };
      localStorage.setItem(CACHE, JSON.stringify(saved));
    } catch (e) { /* 저장 공간이 막혀 있으면 건너뛴다 */ }
  }
  function showSaved() {
    const s = saved[evKey || ''];
    if (!s || !s.generatedAt || !s.totals) return false;
    try {
      stats = s; loadedKey = evKey;
      renderDash(s);
      el('updatedAt').innerHTML = '<span class="stale-note">' + s.generatedAt.slice(5, 16) + ' 기준 · 갱신 중</span>';
      return true;
    } catch (e) { stats = null; return false; }
  }

  /* ── 접수 목록: 한 번 받아 두고 기기 안에서 거른다 ── */
  const lists = {};   // 행사별 { rows, at, capped }
  let listReq = 0;
  const digits = v => String(v || '').replace(/\D/g, '');
  function filterRows(rows) {
    const date = el('fDate').value, ship = el('fShip').value, flag = el('fFlag').value, device = el('fDevice').value;
    const text = el('fQ').value.trim().toLowerCase(), dg = digits(text);
    return rows.filter(o => {
      if (date && o.ts.slice(0, 10) !== date) return false;
      if (ship === 'shipped' && o.ship !== '발송완료') return false;
      if (ship === 'unshipped' && o.ship) return false;
      if (ship === 'onsite' && o.ship !== '현장수령') return false;
      if (flag === 'dup' && !o.dup) return false;
      if (flag === 'edited' && !o.edited) return false;
      if (flag === 'items' && !o.items) return false;
      if (flag === 'noitems' && o.items) return false;
      if (flag === 'pickup' && !o.pickup) return false;
      if (flag === 'gifts' && !o.gifts) return false;
      if (flag === 'fee' && !o.feeDue) return false;
      if (device && (o.device || '(미지정)') !== device) return false;
      if (text) {
        const hay = [o.receiptNo, o.orderNo, o.name, o.rName, o.addr1, o.addr2, o.memo, o.items, o.pickup, o.gifts].join(' ').toLowerCase();
        const phoneHit = dg.length >= 4 && (digits(o.phone).includes(dg) || digits(o.rPhone).includes(dg));
        if (!hay.includes(text) && !phoneHit) return false;
      }
      return true;
    });
  }
  function renderList(rows, capped) {
    const tb = el('listTable').tBodies[0]; tb.innerHTML = '';
    rows.forEach(o => {
      const tr = document.createElement('tr');
      const shipped = o.ship === '발송완료';
      tr.innerHTML = `<td><b>${esc(o.receiptNo)}</b></td><td>${esc(o.ts.slice(5, 16))}</td><td>${esc(o.orderNo)}</td>
        <td>${esc(o.name)}<br><span class="muted">${esc(o.phone)}</span></td>
        <td>${esc(o.rName)}<br><span class="muted">${esc(o.rPhone)}</span></td>
        <td>${o.ship === '현장수령' ? '<span class="muted">택배 없음</span>' : `[${esc(o.zipcode)}] ${esc(o.addr1)} ${esc(o.addr2)}`}</td><td>${esc(o.memo)}</td><td>${itemsCell(o)}</td><td>${tags(o)}</td>
        <td><div class="row-actions">${o.ship === '현장수령' ? '' : `<button class="btn sm ${shipped ? '' : 'primary'}" data-act="ship">${shipped ? '발송 취소' : '발송완료'}</button>`}<button class="btn sm danger" data-act="del">삭제</button></div></td>`;
      const shipBtn = tr.querySelector('[data-act=ship]');
      if (shipBtn) shipBtn.addEventListener('click', async () => {
        shipBtn.disabled = true; shipBtn.classList.add('busy');
        try {
          await api('setShip', { row: o.row, receiptNo: o.receiptNo, status: shipped ? '' : '발송완료' });
          o.ship = shipped ? '' : '발송완료';            // 받아 둔 목록을 바로 고쳐 다시 그린다 (서버를 다시 기다리지 않는다)
          toast(shipped ? '발송 취소됨' : '발송완료 처리됨'); loadList(); refresh();
        } catch (e) { toast(e.message, 4000); shipBtn.disabled = false; shipBtn.classList.remove('busy'); }
      });
      tr.querySelector('[data-act=del]').addEventListener('click', async () => {
        if (!confirm(`접수번호 ${o.receiptNo} (${o.name}) 을 삭제합니다. 구글 시트에서도 지워지며 되돌릴 수 없습니다. 계속할까요?`)) return;
        try {
          await api('deleteRow', { row: o.row, receiptNo: o.receiptNo });
          Object.values(lists).forEach(c => { c.rows = c.rows.filter(x => x.row !== o.row); });
          toast('삭제됨'); loadList(); refresh();
        } catch (e) { toast(e.message, 4000); }
      });
      tb.appendChild(tr);
    });
    if (!rows.length) tb.innerHTML = '<tr><td colspan="10" class="muted">조건에 맞는 접수가 없습니다.</td></tr>';
    el('listInfo').textContent = `${rows.length}건` + (capped ? ' (최신 500건 안에서 찾은 결과 — 더 오래된 건은 검색어로 찾아주세요)' : '');
  }
  async function fetchList(ev, quiet) {
    const req = ++listReq;
    if (!quiet) { el('listInfo').textContent = '불러오는 중…'; skRows('listTable', 6); }
    try {
      const r = await api('list', { event: ev });
      lists[ev] = { rows: r.rows, at: Date.now(), capped: r.rows.length >= 500 };
      if (ev === evKey && (!quiet || !el('tab-list').classList.contains('hide') || !el('listTable').tBodies[0].children.length) && req === listReq) {
        renderList(filterRows(lists[ev].rows), lists[ev].capped);
      }
    } catch (e) {
      if (!quiet && ev === evKey) { el('listInfo').textContent = '불러오기 실패: ' + e.message; el('listTable').tBodies[0].innerHTML = ''; }
    }
  }
  // 500건을 넘겨 일부만 받아 온 행사에서 검색어를 넣으면, 오래된 건까지 찾도록 서버에 직접 묻는다
  async function serverSearch() {
    const req = ++listReq;
    el('listInfo').textContent = '찾는 중…'; skRows('listTable', 4);
    try {
      const r = await api('list', { event: evKey, flag: el('fFlag').value, device: el('fDevice').value, date: el('fDate').value, ship: el('fShip').value, q: el('fQ').value });
      if (req === listReq) renderList(r.rows, false);
    } catch (e) { el('listInfo').textContent = '불러오기 실패: ' + e.message; el('listTable').tBodies[0].innerHTML = ''; }
  }
  window.loadList = async function () {
    const c = lists[evKey];
    if (!c) return fetchList(evKey, false);
    if (c.capped && el('fQ').value.trim()) return serverSearch();
    renderList(filterRows(c.rows), c.capped);
    if (Date.now() - c.at > 60000) fetchList(evKey, true);   // 1분 넘은 목록은 뒤에서 새로 받아 바꾼다
  };
  // 본문 스크립트가 필터에 직접 걸어 둔 예전 불러오기(매번 서버 왕복)가 돌지 않게, 바깥에서 먼저 받아 처리한다
  const filterBox = document.querySelector('#tab-list .filters');
  if (filterBox) filterBox.addEventListener('change', e => {
    if (!['fDate', 'fShip', 'fFlag', 'fDevice'].includes(e.target.id)) return;
    e.stopPropagation();
    window.loadList();
  }, true);
  el('fQ').addEventListener('input', () => { const c = lists[evKey]; if (c && !c.capped) renderList(filterRows(c.rows), false); });   // 입력하는 대로 걸러 보여준다

  /* ── 상품: 받아 둔 것을 바로 보여준다 ── */
  let prodAt = 0;
  function drawProducts() {
    const statMap = {}; (stats ? stats.products : []).forEach(p => statMap[p.name] = p);
    const tb = el('prodTable').tBodies[0]; tb.innerHTML = '';
    productsCache.forEach(p => addProdRow(p, statMap[p.name]));
    if (!productsCache.length) addProdRow();
  }
  async function fetchProducts(quiet) {
    if (!quiet) skRows('prodTable', 6);
    try {
      const r = await api('products');
      productsCache = r.products; prodAt = Date.now();
      if (!quiet) drawProducts();
    } catch (e) {
      if (!quiet) { el('prodTable').tBodies[0].innerHTML = ''; toast('상품 불러오기 실패: ' + e.message, 4000); }
    }
  }
  window.loadProducts = async function () {
    if (!prodAt) return fetchProducts(false);
    if (!el('prodTable').tBodies[0].children.length) drawProducts();   // 이미 그려져 있으면 그대로 둔다 (고치던 내용을 덮어쓰지 않게)
  };
  if (has('saveProducts')) {
    const saveOld = window.saveProducts;
    window.saveProducts = async function () { prodAt = 0; return saveOld.apply(this, arguments); };   // 저장한 뒤에는 새로 받아 그린다
  }

  /* ── 새로고침: 저장해 둔 화면 먼저, 받는 대로 교체. 목록·상품은 동시에 미리 받는다 ── */
  function prefetch() {
    const c = lists[evKey];
    if (!c || (!el('tab-list').classList.contains('hide') && Date.now() - c.at > 30000)) fetchList(evKey, true);
    if (!prodAt) fetchProducts(true);
  }
  const refreshOld = window.refresh;
  window.refresh = async function () {
    if (key && (!stats || loadedKey !== evKey)) showSaved();
    prefetch();                                   // 통계 요청과 같은 때에 보낸다 (차례로 기다리지 않는다)
    await refreshOld.apply(this, arguments);
    if (key && stats && loadedKey === evKey && stats.generatedAt) keepStats(evKey, stats);
  };

  /* ── 로그인: 비밀번호 확인과 통계를 한 번에. 성공하면 이 기기에 로그인 유지 ── */
  window.doLogin = async function () {
    const pw = el('pw').value;
    if (!pw) return;
    const btn = el('loginBtn');
    btn.disabled = true; btn.classList.add('busy'); el('loginErr').textContent = '';
    key = pw;
    prefetchAfterLogin();
    try {
      const s = await api('stats', { event: evKey });   // 비밀번호가 틀리면 여기서 오류가 난다
      try { sessionStorage.setItem('expo_admin_key', key); localStorage.setItem(KEEP, key); } catch (e) {}
      el('login').classList.add('hide'); el('app').classList.remove('hide');
      stats = s; loadedKey = evKey;
      renderDash(s);
      el('updatedAt').textContent = '갱신 ' + s.generatedAt.slice(11, 16);
      keepStats(evKey, s);
    } catch (e) { key = ''; el('loginErr').textContent = e.message || '로그인 실패'; }
    btn.disabled = false; btn.classList.remove('busy');
  };
  function prefetchAfterLogin() { fetchList(evKey, true); fetchProducts(true); }   // 틀린 비밀번호면 이 요청들도 거절될 뿐이다

  const logoutOld = window.logout;
  window.logout = function () {
    try { localStorage.removeItem(KEEP); localStorage.removeItem(CACHE); } catch (e) {}
    saved = {}; Object.keys(lists).forEach(k => delete lists[k]); prodAt = 0;
    return logoutOld.apply(this, arguments);
  };

  /* ── 휴대폰: 표를 카드로 (칸 이름표는 머리글에서) ── */
  const WIDE = /배송지|요청사항|상품|메모|구성|표시|발송|관리|판정|상태|장소/;
  function labelTable(t) {
    const heads = t.tHead ? [...t.tHead.rows[0].cells].map(th => (th.childNodes[0] ? th.childNodes[0].textContent : th.textContent).trim()) : [];
    [...t.tBodies[0].rows].forEach(tr => {
      [...tr.cells].forEach((td, i) => {
        if (td.colSpan > 1) { td.classList.add('span'); td.dataset.label = ''; return; }
        const label = td.dataset.label !== undefined && td.dataset.label !== '' ? td.dataset.label : (heads[i] || '');
        if (td.dataset.label !== label) td.dataset.label = label;
        if (i > 0 && WIDE.test(label)) td.classList.add('wide');
      });
    });
    if (t.id === 'salesTable' && stats && stats.products) {
      let hidden = 0;
      [...t.tBodies[0].rows].forEach((tr, i) => {
        const p = stats.products[i];
        const quiet = !!p && !p.sold && !p.gifted && !p.used && !tr.querySelector('.sk');
        tr.classList.toggle('nosale', quiet); if (quiet) hidden++;
      });
      const btn = el('nosaleToggle');
      if (btn) { btn.dataset.n = hidden; btn.style.display = hidden ? '' : 'none'; setToggleText(); }
    }
  }
  function setToggleText() {
    const btn = el('nosaleToggle'); if (!btn) return;
    btn.textContent = el('salesTable').classList.contains('hide-nosale') ? `판매 없는 상품 ${btn.dataset.n || 0}개 보기` : '판매 없는 상품 접기';
  }
  ['salesTable', 'recentTable', 'listTable', 'prodTable', 'schTable', 'clTable', 'receiptNotesTable'].forEach(id => {
    const t = el(id);
    if (!t || !t.tBodies[0]) return;
    t.classList.add('cards');
    if (id === 'salesTable') {
      t.classList.add('hide-nosale');
      const btn = document.createElement('button');
      btn.type = 'button'; btn.id = 'nosaleToggle'; btn.className = 'btn sm nosale-toggle';
      btn.addEventListener('click', () => { t.classList.toggle('hide-nosale'); setToggleText(); });
      (t.closest('.tablewrap') || t).after(btn);
    }
    new MutationObserver(() => labelTable(t)).observe(t.tBodies[0], { childList: true });
    labelTable(t);
  });

  /* ── 오늘 마감: 주문서가 택배 접수 전용이 되어 예전 마감(현장 수령 기준)은 계산할 것이 없다. 포스 판매내역으로 마감하는 화면으로 보낸다 ── */
  const closeBtn = document.querySelector('#banner .btn.primary');
  if (closeBtn) { closeBtn.textContent = '일일 마감'; closeBtn.onclick = () => { location.href = 'closing.html'; }; closeBtn.removeAttribute('onclick'); closeBtn.onclick = () => { location.href = 'closing.html'; }; }

  /* ── 시작: 로그인 유지 중이면 저장해 둔 화면을 바로 띄우고 뒤에서 새로 받는다 ── */
  if (!key) {
    let kept = '';
    try { kept = localStorage.getItem(KEEP) || ''; } catch (e) {}
    if (kept) {
      key = kept;
      el('login').classList.add('hide'); el('app').classList.remove('hide');
      window.refresh();
    }
  } else {
    try { localStorage.setItem(KEEP, key); } catch (e) {}
    if (!stats) showSaved();   // 본문 스크립트가 이미 새로고침을 시작했다 — 그동안 저장해 둔 화면을 보여준다
    prefetch();                // 목록·상품도 같이 받는다
  }
})();
