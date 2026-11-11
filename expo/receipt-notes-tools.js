/* Receipt notes only. Shared admin API, authentication, and refresh remain in admin.html. */
const receiptCategories = { general:'일반', discount:'할인', gift:'사은품', zero_stock:'재고 부족 · 0원 등록', voucher:'상품권', stock_issue:'갑작스러운 제품 출고', other:'기타' };
const receiptTemplates = { general:'직접 입력', dp_discount:'DP 10% 할인', custom_discount:'예외 할인', gift:'추가 사은품', zero_stock:'재고 부족 · 0원 등록', voucher:'상품권', stock_issue:'갑작스러운 제품 출고' };
const receiptDraftKey = 'expo_receipt_note_drafts';
const receiptSettlementDraftKey = 'expo_receipt_settlement_drafts';
const receiptInputIds = ['rnOrderNo','rnSaleDate','rnMemo','rnTimeHint','rnPosNo','rnCategory','rnAuthor','rnQuickProduct','rnQuickQty','rnQuickAmount','rnQuickReason','rnQuickRecipient','rnQuickStockReason','rnQuickFulfillment','rnQuickPos'];
let receiptDrafts = readReceiptDrafts(receiptDraftKey), receiptContext = null, receiptDraftSlot = '', receiptPending = null, receiptAppend = null;
let receiptSaving = false, receiptPage = 1, receiptTotal = 0, receiptListRequest = 0, receiptSession = 0;
let receiptStockEvent = '', receiptStockProducts = [], receiptStockRequest = 0, receiptInventoryRequest = 0, receiptStockRows = [{ product:'', qty:'1' }];
let settlementBusy = false, settlementEvent = '', settlementImportId = '', settlementImports = [], settlementRows = [];
let settlementRequest = 0, settlementImportRequest = 0, settlementPage = 1, settlementTotal = 0, settlementPreview = null, settlementFile = null;
let settlementDrafts = readReceiptDrafts(receiptSettlementDraftKey);
let receiptCanonicalReports=new WeakMap();
// Migrate the original all-events draft without discarding its free-form memo.
if (receiptDrafts.all && receiptDrafts.all.event && !receiptDrafts.__allEvent) { receiptDrafts.__allEvent=receiptDrafts.all.event; receiptDrafts['all::'+receiptDrafts.all.event]=receiptDrafts.all; }
function readReceiptDrafts(storageKey) {
  try { const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}; } catch (e) { return {}; }
}
function receiptToday() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function receiptEventName() { if (evKey) return evKey; return stats && (stats.selected && stats.selected !== 'all' ? stats.selected : stats.event && stats.event.name) || ''; }
function receiptActualEvent() { return receiptContext === 'all' ? $('rnEvent').value : receiptContext || ''; }
function receiptTemplate() { const el = document.querySelector('input[name="rnTemplate"]:checked'); return el && receiptTemplates[el.value] ? el.value : 'general'; }
function setReceiptTemplate(value) { const el = document.querySelector('input[name="rnTemplate"][value="' + (receiptTemplates[value] ? value : 'general') + '"]'); if (el) el.checked = true; }
function receiptUuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  const bytes = new Uint8Array(16); if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes); else for (let i=0;i<16;i++) bytes[i]=Math.floor(Math.random()*256);
  bytes[6]=bytes[6]&15|64; bytes[8]=bytes[8]&63|128; const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
function receiptError(e) { return navigator.onLine === false ? '오프라인입니다. 인터넷 연결 후 다시 시도해 주세요.' : e.name === 'AbortError' ? '응답 시간이 초과되었습니다. 같은 내용으로 다시 저장하면 중복 저장을 방지합니다.' : e.message || '서버에 연결하지 못했습니다.'; }
function saveReceiptDraft() {
  if (!receiptDraftSlot) return;
  const fields={}; receiptInputIds.forEach(id=>{ fields[id]=$(id).value; });
  const slot=receiptAppend ? receiptDraftSlot+'::append::'+receiptAppend.id : receiptDraftSlot;
  receiptDrafts[slot]={ fields, template:receiptTemplate(), stockItems:receiptStockRows.map(x=>({...x})), pending:receiptPending, append:receiptAppend, details:$('rnDetails').open };
  receiptDrafts[receiptDraftSlot+'::activeAppend']=receiptAppend ? String(receiptAppend.id) : '';
  if (receiptContext === 'all') receiptDrafts.__allEvent=$('rnEvent').value;
  try { sessionStorage.setItem(receiptDraftKey,JSON.stringify(receiptDrafts)); $('rnDraftInfo').textContent='입력 내용은 이 브라우저 탭에 행사별로 임시 보관됩니다.'; }
  catch (e) { $('rnDraftInfo').textContent='임시 보관을 사용할 수 없습니다. 저장 전 이 탭을 닫지 마세요.'; }
}
function restoreReceiptDraft(slot,target) {
  receiptDraftSlot=slot;
  // Preserve drafts created by the previous single-slot implementation, too.
  if(receiptDrafts[slot] && receiptDrafts[slot].append){
    const legacy=receiptDrafts[slot];receiptDrafts[slot+'::append::'+legacy.append.id]=legacy;
    receiptDrafts[slot+'::activeAppend']=String(legacy.append.id);
    if(receiptDrafts[slot+'::new'])receiptDrafts[slot]=receiptDrafts[slot+'::new'];else delete receiptDrafts[slot];
    delete receiptDrafts[slot+'::new'];
  }
  const appendId=target==='new' ? '' : target!==undefined ? String(target) : receiptDrafts[slot+'::activeAppend']||'';
  const d=receiptDrafts[appendId ? slot+'::append::'+appendId : slot];
  receiptInputIds.forEach(id=>{ $(id).value=d && d.fields && typeof d.fields[id]==='string' ? d.fields[id] : id==='rnSaleDate' ? receiptToday() : id==='rnCategory' ? 'general' : id==='rnQuickQty' ? '1' : id==='rnQuickStockReason' ? 'gift' : id==='rnQuickFulfillment' ? 'onsite' : id==='rnQuickPos' ? 'none' : ''; });
  setReceiptTemplate(d && d.template || 'general');
  receiptPending=d && d.pending || null; receiptAppend=d && d.append || null;
  receiptStockRows=d && Array.isArray(d.stockItems) && d.stockItems.length ? d.stockItems.map(x=>({product:String(x.product || ''),qty:String(x.qty || 1)})) : [{product:'',qty:'1'}];
  $('rnDetails').open=!!(d && d.details); $('rnSaveError').textContent=''; $('rnSaveStatus').textContent='';
  renderReceiptStockRows(); updateReceiptQuickUI(); updateReceiptAppendUI();
}
function syncReceiptNoteContext() {
  if (receiptSaving || settlementBusy) return;
  const next=receiptEventName(), changed=next!==receiptContext;
  if (changed) saveReceiptDraft();
  const all=next==='all', selected=all ? (changed ? receiptDrafts.__allEvent || '' : $('rnEvent').value) : '';
  const events=stats && stats.events || [];
  $('rnEvent').innerHTML='<option value="">행사를 선택하세요</option>'+events.map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('');
  $('rnEvent').value=selected; receiptContext=next;
  const slot=all ? 'all::'+$('rnEvent').value : next;
  if (slot!==receiptDraftSlot) restoreReceiptDraft(slot);
  $('rnEventWrap').classList.toggle('hide',!all); $('rnEvent').required=all;
  $('rnContext').textContent=all ? '조회 범위: 전체 행사 · 등록할 행사를 별도로 선택하세요.' : next ? '등록 행사: '+next : '행사를 불러온 뒤 메모를 등록할 수 있습니다.';
  $('rnSave').disabled=!receiptActualEvent();
  ensureReceiptStockProducts(); syncSettlementContext(events,changed);
}
function setReceiptSaving(busy) {
  receiptSaving=busy; $('receiptNoteForm').setAttribute('aria-busy',String(busy)); $('rnFields').disabled=busy;
  $('rnSave').classList.toggle('busy',busy); $('rnSave').textContent=busy ? '저장 중…' : receiptAppend ? '내용 추가 저장' : receiptTemplate()==='stock_issue' ? '출고 기록 · 재고 차감' : '메모 등록';
  $('evSel').disabled=busy || settlementBusy; $('rsUploadFields').disabled=busy || settlementBusy; $('rsBrowseFields').disabled=busy || settlementBusy; $('rsEvent').disabled=busy || settlementBusy;
}
function resetReceiptNotes() {
  ++receiptListRequest; ++receiptSession; ++receiptStockRequest; ++receiptInventoryRequest; ++settlementRequest; ++settlementImportRequest;
  receiptCanonicalReports=new WeakMap();receiptDrafts={}; receiptPending=null; receiptAppend=null; receiptContext=null; receiptDraftSlot=''; receiptPage=1; receiptTotal=0;
  receiptStockEvent=''; receiptStockProducts=[]; receiptStockRows=[{product:'',qty:'1'}];
  settlementEvent=''; settlementImportId=''; settlementImports=[]; settlementRows=[]; settlementDrafts={}; settlementPreview=null; settlementFile=null; settlementPage=1; settlementTotal=0; settlementBusy=false;
  try { sessionStorage.removeItem(receiptDraftKey); sessionStorage.removeItem(receiptSettlementDraftKey); } catch (e) {}
  $('receiptNoteForm').reset(); $('receiptNoteFilters').reset(); $('rsFilters').reset(); $('rsFile').value='';
  ['rnSaveError','rnSaveStatus','rnListError','rnListInfo','rsError','rsStatus','rsSummary','rsContext','rnStockError'].forEach(id=>$(id).textContent='');
  $('receiptNotesTable').tBodies[0].innerHTML=''; $('rnListCard').setAttribute('aria-busy','false'); $('rsRows').innerHTML=''; $('rsPreview').classList.add('hide'); $('rsImport').innerHTML='<option value="">업로드한 파일을 선택하세요</option>'; $('rsImportBtn').disabled=true;$('rsImportBtn').textContent='확인한 파일 가져오기'; $('rsVoidImport').disabled=true;$('rsBrowseFields').classList.add('hide');$('rsPager').classList.add('hide');$('rsPanel').open=false;
  renderReceiptStockRows(); updateReceiptQuickUI(); updateReceiptAppendUI(); setReceiptSaving(false); setSettlementBusy(false); updateReceiptPager(false); updateSettlementPager(false);
}
function updateReceiptAppendUI() {
  const append=!!receiptAppend;
  $('rnFormTitle').textContent=append ? '기존 메모에 내용 추가' : '영수증 메모 등록';
  $('rnAppendInfo').classList.toggle('hide',!append); $('rnAppendCancel').classList.toggle('hide',!append);
  $('rnAppendInfo').textContent=append ? receiptAppend.eventName+' · '+receiptAppend.saleDate+' · 영수증 '+receiptAppend.orderNo+'에 추가합니다. 기존 원문은 보존됩니다.' : '';
  $('rnOrderNo').readOnly=append; $('rnSaleDate').readOnly=append; $('rnEvent').disabled=append;
  const issue=document.querySelector('input[name="rnTemplate"][value="stock_issue"]'); issue.disabled=append; issue.closest('label').classList.toggle('is-disabled',append);
  if (append && receiptTemplate()==='stock_issue') setReceiptTemplate('general');
  if (!receiptSaving) $('rnSave').textContent=append ? '내용 추가 저장' : receiptTemplate()==='stock_issue' ? '출고 기록 · 재고 차감' : '메모 등록';
}
function setQuickField(id,visible,required) {
  $(id+'Wrap').classList.toggle('hide',!visible); const field=$(id); if (field) { field.disabled=!visible; field.required=!!(visible && required); }
}
function updateReceiptQuickUI() {
  const t=receiptTemplate(), general=t==='general', issue=t==='stock_issue', supply=t==='gift'||t==='zero_stock';
  $('rnQuickPanel').classList.toggle('hide',general);
  setQuickField('rnQuickProduct',!general&&!issue,supply); setQuickField('rnQuickQty',supply,supply);
  setQuickField('rnQuickAmount',t==='dp_discount'||t==='custom_discount'||t==='voucher',false);
  setQuickField('rnQuickReason',t==='custom_discount'||t==='voucher'||issue,t==='custom_discount'||issue);
  $('rnReasonRequired').textContent=t==='custom_discount'||issue ? '*' : '(선택)';
  setQuickField('rnQuickRecipient',issue,false); setQuickField('rnQuickStockReason',issue,true); setQuickField('rnQuickFulfillment',supply,supply); setQuickField('rnQuickPos',supply,supply);
  $('rnStockWrap').classList.toggle('hide',!issue); $('rnStockItems').querySelectorAll('input,select,button').forEach(el=>{el.disabled=!issue; if (el.tagName!=='BUTTON') el.required=issue;}); $('rnStockAdd').disabled=!issue;
  const receiptless=issue || !!(receiptAppend && receiptAppend.recordKind==='stock_issue'); $('rnOrderWrap').classList.toggle('hide',receiptless); $('rnOrderNo').required=!receiptless; $('rnOrderNo').setAttribute('aria-required',String(!receiptless));
  $('rnMemo').required=general; $('rnMemo').setAttribute('aria-required',String(general)); $('rnMemoLabel').textContent=general ? '메모 *' : '추가 설명 (선택)';
  $('rnMemo').placeholder=general ? '메모를 입력하세요' : '위 내용에 더할 설명을 입력하세요'; $('rnMemoHelp').textContent=general ? '최대 2,000자 · 줄바꿈을 그대로 기록합니다.' : '자동 요약과 함께 저장합니다. 유형을 바꿔도 입력한 설명은 유지됩니다.';
  $('rnCategory').disabled=!general;
  $('rnQuickInfo').textContent=issue ? '이 카드의 기록은 공용 출고 내역에 저장되고 일일 마감 재고에 자동 반영됩니다. 재고가 미입력되었거나 잔여가 음수여도 출고를 기록할 수 있습니다. 기록 제외 시 공용 출고 내역에서도 제외됩니다.' : supply ? '메모만 남깁니다. 기존 주문 사은품과 중복 차감하지 않도록 이 카드에서는 재고를 차감하지 않습니다.' : '';
  $('rnQuickSummary').textContent=general ? '' : receiptQuickSummary(receiptQuickPayload(false));
  if (!receiptSaving) $('rnSave').textContent=receiptAppend ? '내용 추가 저장' : issue ? '출고 기록 · 재고 차감' : '메모 등록';
  if (issue) ensureReceiptStockProducts();
}
function receiptQuickPayload(validate) {
  const t=receiptTemplate(); if (t==='general') return null;
  const q={template:t};
  if (t==='stock_issue') {
    q.stockItems=receiptStockRows.filter(x=>x.product).map(x=>({product:x.product,qty:Number(x.qty)})); q.stockReason=$('rnQuickStockReason').value||'gift'; q.reason=$('rnQuickReason').value.trim(); q.recipient=$('rnQuickRecipient').value.trim();
    if (validate && (!q.stockItems.length || q.stockItems.length!==receiptStockRows.length)) throw new Error('출고할 상품을 모두 선택해 주세요.');
    if (validate && q.stockItems.some(x=>!Number.isInteger(x.qty)||x.qty<1||x.qty>999)) throw new Error('출고 수량은 상품별 1~999개로 입력해 주세요.');
    if (validate && new Set(q.stockItems.map(x=>x.product)).size!==q.stockItems.length) throw new Error('같은 상품은 한 줄에서 수량을 합쳐 주세요.');
    if (validate && !q.reason) throw new Error('제품 출고 사유를 입력해 주세요.');
  } else {
    q.product=$('rnQuickProduct').value.trim();
    if (t==='gift'||t==='zero_stock') { q.qty=Number($('rnQuickQty').value); q.fulfillment=$('rnQuickFulfillment').value; q.posRecorded=$('rnQuickPos').value; }
    if (t==='dp_discount') q.rate=10;
    if ((t==='dp_discount'||t==='custom_discount'||t==='voucher') && $('rnQuickAmount').value!=='') q.amount=Number($('rnQuickAmount').value);
    if (t==='custom_discount'||t==='voucher') q.reason=$('rnQuickReason').value.trim();
    if (validate && t==='custom_discount' && !q.reason) throw new Error('예외 할인 사유를 입력해 주세요.');
  }
  return q;
}
function receiptQuickSummary(q) {
  if (!q) return '';
  let text=receiptTemplates[q.template] || q.template;
  if (q.template==='stock_issue') {
    const items=(q.stockItems||[]).map(x=>x.product+' '+x.qty+'개');
    text+=' · '+({gift:'선물 / 증정',sample:'샘플 / 전시',damage:'파손 / 불량',other:'기타'}[q.stockReason]||'선물 / 증정');
    if (items.length) text+=' · '+items.join(', '); if (q.recipient) text+=' · 대상: '+q.recipient;
  } else { if(q.product) text+=' · '+q.product; if(q.qty) text+=' '+q.qty+'개'; if(q.amount!==undefined) text+=' · '+fmt(q.amount)+'원'; if(q.fulfillment) text+=' · '+({onsite:'현장 지급',delivery:'택배 발송',pending:'미지급 / 추후 지급'}[q.fulfillment]||q.fulfillment); if(q.posRecorded) text+=' · '+({none:'POS 미등록',zero:'POS 0원 등록',normal:'POS 일반 등록'}[q.posRecorded]||q.posRecorded); }
  if (q.reason) text+=' · 사유: '+q.reason;
  return text;
}
function receiptPayload() {
  const quick=receiptQuickPayload(true), description=$('rnMemo').value.trim();
  const memo=quick ? receiptQuickSummary(quick)+(description ? '\n추가 설명: '+description : '') : description;
  if(memo.length>2000) throw new Error('자동 요약과 추가 설명을 합쳐 2,000자 이내로 줄여 주세요.');
  return {event:receiptActualEvent(),orderNo:quick && quick.template==='stock_issue' ? '' : $('rnOrderNo').value.trim(),saleDate:$('rnSaleDate').value,timeHint:$('rnTimeHint').value,posNo:$('rnPosNo').value.trim(),category:quick ? quick.template==='dp_discount'||quick.template==='custom_discount' ? 'discount' : quick.template==='voucher' ? 'other' : quick.template : $('rnCategory').value,memo,author:$('rnAuthor').value.trim(),quick};
}
async function fetchReceiptClosingReport(event){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),30000),authKey=key,session=receiptSession;
  try{
    const response=await fetch(WEBAPP_URL.replace(/api\.php$/,'closing.php'),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({op:'report',key:authKey,event}),signal:ctrl.signal});
    const result=await response.json();if(result&&result.code==='auth'&&session===receiptSession&&key===authKey){logout();throw new Error(result.error||'인증을 확인해 주세요.');}
    if(!result||!result.ok)throw new Error(result&&result.error||'일일 마감 재고를 불러오지 못했습니다.');return result;
  }finally{clearTimeout(timer);}
}
function receiptClosingItems(report){
  const items=report&&report.items||[];return new Map((Array.isArray(items)?items:Object.entries(items).map(([name,item])=>({name,...item}))).map(item=>[item.name,item]));
}
async function ensureReceiptStockProducts(force,report) {
  const event=receiptActualEvent(); if(!event||event==='all'){receiptStockEvent='';receiptStockProducts=[];renderReceiptStockRows();return;}
  if(!force&&event===receiptStockEvent)return;
  receiptStockEvent=event;receiptStockProducts=[];renderReceiptStockRows();const request=++receiptStockRequest,session=receiptSession;
  $('rnStockError').textContent='상품과 일일 마감 재고를 불러오는 중…';
  const snapshot=stats,source=report?Promise.resolve(report):snapshot&&receiptStatsEvent(snapshot)===event&&evKey!=='all'?syncReceiptCanonicalInventory(snapshot):fetchReceiptClosingReport(event);
  const results=await Promise.allSettled([api('products'),source.then(value=>{if(!value)throw new Error('일일 마감 재고를 확인하지 못했습니다.');return value;})]);
  if(request!==receiptStockRequest||session!==receiptSession||event!==receiptActualEvent()||!key)return;
  const catalog=results[0],closing=results[1];
  if(catalog.status==='rejected'){receiptStockEvent='';$('rnStockError').textContent='상품 조회 실패: '+receiptError(catalog.reason);return;}
  const remaining=closing.status==='fulfilled'?receiptClosingItems(closing.value):new Map();
  receiptStockProducts=(catalog.value.products||[]).filter(p=>p.name).map(p=>({...p,bundle:Array.isArray(p.comp)?p.comp.length>0:!!p.comp,remaining:remaining.has(p.name)?remaining.get(p.name).remaining:null}));
  $('rnStockError').textContent=!receiptStockProducts.length?'등록된 상품이 없습니다. 상품·재고 탭을 확인해 주세요.':closing.status==='rejected'?'일일 마감 재고 조회 실패: '+receiptError(closing.reason)+' 상품 선택과 출고 기록은 가능합니다.':'';
  renderReceiptStockRows();updateReceiptQuickUI();
}
function renderReceiptStockRows() {
  const box=$('rnStockItems');if(!box)return;box.innerHTML='';
  receiptStockRows.forEach((row,index)=>{
    const div=document.createElement('div');div.className='rn-stock-row';
    const known=receiptStockProducts.some(p=>p.name===row.product);
    div.innerHTML=`<div class="note-field"><label for="rnStockProduct${index}">출고 상품 ${index+1}</label><select id="rnStockProduct${index}" data-stock-product="${index}"><option value="">상품을 선택하세요</option>${!known&&row.product?`<option value="${esc(row.product)}">${esc(row.product)} (등록 목록 확인 필요)</option>`:''}${receiptStockProducts.map(p=>`<option value="${esc(p.name)}">${esc(p.name)} · ${p.remaining===null||p.remaining===undefined?p.bundle?'세트·구성품 재고 사용':'일일 마감 잔여 확인 필요':'잔여 '+fmt(p.remaining)+'개'}</option>`).join('')}</select></div><div class="note-field"><label for="rnStockQty${index}">수량</label><input id="rnStockQty${index}" data-stock-qty="${index}" type="number" min="1" max="999" step="1" inputmode="numeric" value="${esc(row.qty)}"></div><button class="btn danger" type="button" data-stock-remove="${index}" aria-label="출고 상품 ${index+1} 삭제">삭제</button>`;
    div.querySelector('select').value=row.product;box.appendChild(div);
  });
  const issue=receiptTemplate()==='stock_issue';box.querySelectorAll('input,select,button').forEach(el=>{el.disabled=!issue;if(el.tagName!=='BUTTON')el.required=issue;});
}
async function saveReceiptNote(e) {
  e.preventDefault(); if(receiptSaving||settlementBusy)return; updateReceiptQuickUI(); if(!$('receiptNoteForm').reportValidity())return;
  $('rnSaveError').textContent='';$('rnSaveStatus').textContent='';let payload;
  try {payload=receiptPayload();}catch(error){$('rnSaveError').textContent=error.message;saveReceiptDraft();return;}
  if(!payload.event||payload.event==='all'){$('rnSaveError').textContent='등록할 행사를 선택해 주세요.';$('rnEvent').focus();return;}
  if(!payload.memo||(!receiptAppend&&!payload.orderNo&&!(payload.quick&&payload.quick.template==='stock_issue'))){$('rnSaveError').textContent='영수증 번호와 메모를 입력해 주세요.';return;}
  if(receiptAppend&&payload.quick&&payload.quick.template==='stock_issue'){$('rnSaveError').textContent='제품 출고는 신규 기록으로 등록해 주세요.';return;}
  if(navigator.onLine===false){$('rnSaveError').textContent=receiptError({});saveReceiptDraft();return;}
  const op=receiptAppend?'appendReceiptNote':'saveReceiptNote';
  if(receiptAppend) payload={event:receiptAppend.eventName,noteId:receiptAppend.id,version:receiptAppend.version,memo:payload.memo,author:payload.author,quick:payload.quick};
  const signature=JSON.stringify({op,payload});if(!receiptPending||receiptPending.signature!==signature||typeof receiptPending.uuid!=='string')receiptPending={signature,uuid:receiptUuid()};
  saveReceiptDraft();const session=receiptSession, requestedEvent=receiptActualEvent(), pendingUuid=receiptPending.uuid, wasAppend=!!receiptAppend;setReceiptSaving(true);
  try {
    const r=await api(op,{...payload,uuid:pendingUuid});if(session!==receiptSession||requestedEvent!==receiptActualEvent()||!key)return;
    const issue=payload.quick&&payload.quick.template==='stock_issue';
    $('rnOrderNo').value='';$('rnMemo').value='';$('rnTimeHint').value='';$('rnQuickProduct').value='';$('rnQuickQty').value='1';$('rnQuickAmount').value='';$('rnQuickReason').value='';$('rnQuickRecipient').value='';$('rnQuickStockReason').value='gift';$('rnQuickFulfillment').value='onsite';$('rnQuickPos').value='none';$('rnCategory').value='general';setReceiptTemplate('general');receiptStockRows=[{product:'',qty:'1'}];receiptPending=null;receiptAppend=null;
    if(wasAppend){delete receiptDrafts[receiptDraftSlot+'::append::'+payload.noteId];receiptDrafts[receiptDraftSlot+'::activeAppend']='';restoreReceiptDraft(receiptDraftSlot,'new');receiptAppend=null;}
    updateReceiptAppendUI();renderReceiptStockRows();updateReceiptQuickUI();saveReceiptDraft();
    $('rnSaveStatus').textContent=r.duplicate?'이 내용은 이미 저장되어 있습니다. 중복 저장 없이 확인했습니다.':issue?(r.row&&r.row.referenceNo||'출고')+' 기록을 공용 출고 내역에 저장했습니다. 일일 마감 재고에 자동 반영됩니다.':wasAppend?'기존 원문을 보존하고 내용을 추가했습니다.':'영수증 '+payload.orderNo+' 메모를 등록했습니다.';
    loadReceiptNotes(1);if(settlementImportId)loadSettlementCompare(settlementPage);if(issue)await refreshReceiptInventory();
  } catch(error){if(session===receiptSession){$('rnSaveError').textContent='저장 실패: '+receiptError(error)+' 입력 내용은 유지됩니다.';saveReceiptDraft();if(payload.quick&&payload.quick.template==='stock_issue')ensureReceiptStockProducts(true);}}
  finally{if(session===receiptSession)setReceiptSaving(false);}
}
function beginReceiptAppend(note) {
  if(receiptSaving||settlementBusy)return;
  if(receiptAppend && Number(receiptAppend.id)===Number(note.id) && receiptAppend.eventName===note.eventName){
    // A repeated tap must not erase the active explanation or retry UUID.
    saveReceiptDraft();$('rnEntryCard').scrollIntoView({behavior:'smooth',block:'start'});$('rnMemo').focus({preventScroll:true});return;
  }
  saveReceiptDraft();
  const baseSlot=receiptContext==='all' ? 'all::'+note.eventName : receiptDraftSlot;
  if(receiptContext==='all')$('rnEvent').value=note.eventName;
  const appendSlot=baseSlot+'::append::'+note.id;
  if(receiptDrafts[appendSlot]){
    restoreReceiptDraft(baseSlot,note.id);
    // Retain a submitted request's exact version/signature for a safe retry.
    if(receiptAppend && !receiptPending)receiptAppend.version=note.version;
  }else{
    restoreReceiptDraft(baseSlot,'new');
    receiptAppend={id:note.id,version:note.version,eventName:note.eventName,saleDate:note.saleDate,orderNo:note.orderNo||note.referenceNo||'',recordKind:note.recordKind||'sale'};
    $('rnOrderNo').value=note.orderNo||'';$('rnSaleDate').value=note.saleDate;$('rnMemo').value='';$('rnTimeHint').value='';$('rnPosNo').value='';$('rnQuickProduct').value='';$('rnQuickQty').value='1';$('rnQuickAmount').value='';$('rnQuickReason').value='';$('rnQuickRecipient').value='';$('rnQuickStockReason').value='gift';$('rnQuickFulfillment').value='onsite';$('rnQuickPos').value='none';setReceiptTemplate('general');$('rnCategory').value='general';receiptStockRows=[{product:'',qty:'1'}];receiptPending=null;
  }
  updateReceiptAppendUI();updateReceiptQuickUI();saveReceiptDraft();$('rnEntryCard').scrollIntoView({behavior:'smooth',block:'start'});$('rnMemo').focus({preventScroll:true});
}
function cancelReceiptAppend() {
  if(receiptSaving||settlementBusy)return;
  saveReceiptDraft();receiptDrafts[receiptDraftSlot+'::activeAppend']='';restoreReceiptDraft(receiptDraftSlot,'new');
  updateReceiptAppendUI();updateReceiptQuickUI();saveReceiptDraft();
}
function updateReceiptPager(loading){const pages=Math.max(1,Math.ceil(receiptTotal/20));$('rnPageInfo').textContent=receiptPage+' / '+pages;$('rnPrev').disabled=loading||receiptPage<=1;$('rnNext').disabled=loading||receiptPage>=pages;}
async function loadReceiptNotes(page){
  if(!key)return;const requestedEvent=evKey,request=++receiptListRequest,session=receiptSession;receiptPage=Math.max(1,Number(page)||1);const requestedPage=receiptPage;
  const params={event:requestedEvent,q:$('rnQ').value.trim(),date:$('rnDate').value,category:$('rnFilterCategory').value,page:requestedPage,pageSize:20};
  $('rnListError').textContent='';$('rnListInfo').textContent='영수증 메모를 불러오는 중…';$('rnListCard').setAttribute('aria-busy','true');$('rnSearch').classList.add('busy');updateReceiptPager(true);skRows('receiptNotesTable',3);
  try {const r=await api('receiptNotes',params);if(request!==receiptListRequest||requestedEvent!==evKey||session!==receiptSession||!key)return;receiptTotal=Number(r.total)||0;const last=Math.max(1,Math.ceil(receiptTotal/20));if(requestedPage>last){loadReceiptNotes(last);return;}receiptPage=Number(r.page)||requestedPage;renderReceiptNotes(r.rows||[]);const start=receiptTotal?(receiptPage-1)*20+1:0;$('rnListInfo').textContent='총 '+fmt(receiptTotal)+'건'+(receiptTotal?' · '+fmt(start)+'–'+fmt(Math.min(receiptPage*20,receiptTotal))+'건 표시':'');}
  catch(e){if(request!==receiptListRequest||requestedEvent!==evKey||session!==receiptSession||!key)return;$('rnListError').textContent='목록 조회 실패: '+receiptError(e);$('rnListInfo').textContent='검색 또는 새로고침으로 다시 시도해 주세요.';$('receiptNotesTable').tBodies[0].innerHTML='<tr><td colspan="9" class="muted">목록을 확인할 수 없습니다.</td></tr>';receiptTotal=0;}
  finally{if(request===receiptListRequest&&session===receiptSession){$('rnListCard').setAttribute('aria-busy','false');$('rnSearch').classList.remove('busy');updateReceiptPager(false);}}
}
function receiptNoteHistory(note){
  const entries=Array.isArray(note.entries)?note.entries:[],links=Array.isArray(note.settlementLinks)?note.settlementLinks:[];
  const history=entries.map(e=>`<div class="rn-history-entry"><small>${esc(e.createdAt||'')} · ${esc(e.author||'작성자 미입력')}${e.source==='settlement'?' · 정산 연결':''}</small><span>${esc(e.memo||'')}</span></div>`).join('');
  const linked=links.map(l=>`<div class="rn-settlement-link">연결 완료 · ${esc(l.startedAt||'')} · 영수증 ${esc(l.orderNo||'')}<small>${esc(l.fileName||'정산 파일')}</small></div>`).join('');
  return history+linked;
}
function renderReceiptNotes(rows){
  const body=$('receiptNotesTable').tBodies[0];body.innerHTML='';
  if(!rows.length){body.innerHTML='<tr><td colspan="9" class="muted">'+($('rnQ').value.trim()||$('rnDate').value||$('rnFilterCategory').value?'검색 조건에 맞는 기록이 없습니다.':'등록된 메모가 없습니다. 위에서 첫 메모를 등록해 주세요.')+'</td></tr>';return;}
  rows.forEach(note=>{const tr=document.createElement('tr');tr.className='receipt-record';const issue=note.recordKind==='stock_issue'||note.category==='stock_issue';
    tr.innerHTML=`<td data-label="행사" class="note-record-event">${esc(note.eventName)}</td><td data-label="거래일" class="note-record-date"><span>${esc(note.saleDate)}</span>${note.timeHint?'<span class="note-time">'+esc(note.timeHint)+'경</span>':''}</td><td data-label="${issue?'출고 관리번호':'영수증'}" class="note-record-number"><b>${esc(issue?note.referenceNo||'출고':note.orderNo)}</b>${issue?'<small>영수증 없는 재고 출고</small>':''}</td><td data-label="유형" class="note-record-category">${esc(note.quick&&receiptTemplates[note.quick.template]||receiptCategories[note.category]||note.category)}</td><td data-label="메모" class="note-memo"><span>${esc(note.memo)}</span>${receiptNoteHistory(note)}</td><td data-label="POS" class="note-record-pos">${esc(note.posNo||'–')}</td><td data-label="작성자" class="note-record-author">${esc(note.author||'–')}</td><td data-label="기록 시각" class="note-record-created">${esc(String(note.createdAt||'').replace('T',' ').slice(0,16))}</td><td data-label="관리" class="note-record-action"><div class="rn-record-actions"><button type="button" class="btn sm" data-act="append-note">내용 추가</button><button type="button" class="btn sm danger" data-act="void-note">기록 제외</button></div></td>`;
    tr.querySelector('[data-act="append-note"]').addEventListener('click',()=>beginReceiptAppend(note));const btn=tr.querySelector('[data-act="void-note"]');btn.addEventListener('click',()=>voidReceiptNote(note,btn));body.appendChild(tr);
  });
}
async function voidReceiptNote(note,button){
  if(receiptSaving||settlementBusy)return;const issue=note.recordKind==='stock_issue'||note.category==='stock_issue';
  if(!confirm((issue?'출고 '+(note.referenceNo||''):'영수증 '+note.orderNo)+' 기록을 제외할까요? 원본과 이력은 보관됩니다.'+(issue?' 차감한 현장 재고를 한 번 복원합니다.':'')))return;
  const answer=prompt('기록 제외 사유를 입력해 주세요. (최대 200자)','오입력');if(answer===null)return;const reason=answer.trim();if(!reason||reason.length>200){$('rnListError').textContent='제외 사유는 1~200자로 입력해 주세요.';return;}
  const session=receiptSession,event=evKey;button.disabled=true;button.classList.add('busy');$('rnListError').textContent='';
  try{await api('voidReceiptNote',{id:note.id,version:note.version,event:note.eventName,reason});if(session!==receiptSession||event!==evKey)return;toast(issue?'공용 출고 기록을 제외했습니다. 일일 마감 재고에 자동 반영됩니다':'기록을 목록에서 제외했습니다');loadReceiptNotes(receiptPage);if(settlementImportId)loadSettlementCompare(settlementPage);if(issue)await refreshReceiptInventory();}
  catch(e){if(session===receiptSession&&event===evKey)$('rnListError').textContent='기록 제외 실패: '+receiptError(e);}
  finally{button.disabled=false;button.classList.remove('busy');}
}
function syncSettlementContext(events,contextChanged){
  const all=receiptContext==='all',selected=all?$('rsEvent').value:'';
  $('rsEvent').innerHTML='<option value="">행사를 선택하세요</option>'+(events||[]).map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('');
  $('rsEvent').value=selected|| (all?$('rnEvent').value:'');$('rsEventWrap').classList.toggle('hide',!all);
  const next=all?$('rsEvent').value:receiptContext||'';
  if(next!==settlementEvent){settlementEvent=next;resetSettlementView();if(next&&next!=='all')loadSettlementImports();}
  $('rsContext').textContent=next?'정산 행사: '+next:'정산할 행사를 먼저 선택해 주세요.';
  $('rsPreviewBtn').disabled=!next;$('rsReload').disabled=!next;
}
function resetSettlementView(){
  ++settlementRequest;++settlementImportRequest;settlementImportId='';settlementImports=[];settlementRows=[];settlementPage=1;settlementTotal=0;settlementFile=null;settlementPreview=null;
  $('rsFile').value='';$('rsImport').innerHTML='<option value="">업로드한 파일을 선택하세요</option>';$('rsRows').innerHTML='';$('rsSummary').textContent='';$('rsStatus').textContent='';$('rsError').textContent='';$('rsPreview').classList.add('hide');$('rsPreview').innerHTML='';$('rsImportBtn').disabled=true;$('rsImportBtn').textContent='확인한 파일 가져오기';$('rsVoidImport').disabled=true;$('rsBrowseFields').classList.add('hide');$('rsPager').classList.add('hide');updateSettlementPager(false);
}
function settlementValid(event,session,request){return !!key&&event===settlementEvent&&session===receiptSession&&(request===undefined||request===settlementRequest);}
function setSettlementBusy(busy){
  settlementBusy=busy;$('rnSettlementCard').setAttribute('aria-busy',String(busy));$('rsUploadFields').disabled=busy||receiptSaving;$('rsBrowseFields').disabled=busy||receiptSaving;$('rsEvent').disabled=busy||receiptSaving;$('evSel').disabled=busy||receiptSaving;
  $('rnSave').disabled=busy||receiptSaving||!receiptActualEvent();$('rnFields').disabled=busy||receiptSaving;
  $('rsRows').querySelectorAll('fieldset').forEach(el=>{el.disabled=busy;});
}
function updateSettlementPager(loading){const pages=Math.max(1,Math.ceil(settlementTotal/20));$('rsPageInfo').textContent=settlementPage+' / '+pages;$('rsPrev').disabled=loading||settlementBusy||settlementPage<=1;$('rsNext').disabled=loading||settlementBusy||settlementPage>=pages;$('rsTotal').textContent='총 '+fmt(settlementTotal)+'건 · 한 페이지 20건';}
async function loadSettlementImports(preferred){
  const event=settlementEvent;if(!event||event==='all'||!key)return;const request=++settlementImportRequest,session=receiptSession;
  $('rsError').textContent='';$('rsStatus').textContent='이번 행사에 업로드한 파일을 확인하는 중…';
  try{const r=await api('receiptSettlementImports',{event});if(!settlementValid(event,session)||request!==settlementImportRequest)return;settlementImports=r.imports||[];$('rsBrowseFields').classList.toggle('hide',!settlementImports.length);$('rsPager').classList.toggle('hide',!settlementImports.length);const wanted=String(preferred||settlementImportId||'');
    $('rsImport').innerHTML='<option value="">업로드한 파일을 선택하세요</option>'+settlementImports.map(i=>`<option value="${esc(i.id)}">${esc(i.fileName)} · ${esc(i.dateFrom||'')}~${esc(i.dateTo||'')} · ${fmt(i.transactionCount)}거래</option>`).join('');
    settlementImportId=settlementImports.some(i=>String(i.id)===wanted)?wanted:'';$('rsImport').value=settlementImportId;$('rsVoidImport').disabled=!settlementImportId;
    $('rsStatus').textContent=settlementImports.length?'이번 행사에 업로드한 파일 '+fmt(settlementImports.length)+'개 · 대조할 파일을 선택하세요.':'아직 이번 행사 정산 파일을 업로드하지 않았습니다. 행사 후 위에서 새 파일을 선택해 주세요.';
    if(settlementImportId)loadSettlementCompare(1);else{$('rsRows').innerHTML='';settlementTotal=0;updateSettlementPager(false);}
  }catch(e){if(settlementValid(event,session)&&request===settlementImportRequest){$('rsError').textContent='파일 목록 조회 실패: '+receiptError(e);$('rsStatus').textContent='';}}
}
function readSettlementFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('파일을 읽지 못했습니다. 다시 선택해 주세요.'));reader.onabort=()=>reject(new Error('파일 읽기가 중단되었습니다.'));reader.onload=()=>{const value=String(reader.result||''),comma=value.indexOf(',');if(comma<0)reject(new Error('파일을 읽지 못했습니다.'));else resolve(value.slice(comma+1));};reader.readAsDataURL(file);});}
function validateSettlementFile(){const file=$('rsFile').files[0];if(!settlementEvent||settlementEvent==='all')throw new Error('정산할 행사를 선택해 주세요.');if(!file)throw new Error('정산 XLSX 파일을 선택해 주세요.');if(!/\.xlsx$/i.test(file.name))throw new Error('.xlsx 파일만 가져올 수 있습니다.');if(!file.size||file.size>8*1024*1024)throw new Error('파일 크기는 8 MiB 이하여야 합니다.');return file;}
async function previewSettlementFile(){
  if(settlementBusy||receiptSaving)return;$('rsError').textContent='';$('rsStatus').textContent='';let file;try{file=validateSettlementFile();}catch(e){$('rsError').textContent=e.message;return;}
  const event=settlementEvent,session=receiptSession,request=++settlementRequest;settlementPreview=null;settlementFile=null;$('rsImportBtn').disabled=true;$('rsImportBtn').textContent='확인한 파일 가져오기';setSettlementBusy(true);$('rsPreviewBtn').classList.add('busy');$('rsStatus').textContent='선택한 시트의 거래 내용을 확인하는 중…';
  try{const base64=await readSettlementFile(file);if(!settlementValid(event,session,request))return;const r=await api('previewReceiptSettlement',{event,fileName:file.name,fileBase64:base64});if(!settlementValid(event,session,request))return;settlementPreview=r.preview;settlementFile={name:file.name,size:file.size,lastModified:file.lastModified,base64,event};renderSettlementPreview(r.preview);$('rsImportBtn').disabled=false;$('rsStatus').textContent=r.preview.previouslyArchived ? '이 행사에서 이전에 제외한 파일입니다. 확인 후 다시 가져오면 기존 거래와 메모 연결이 복원됩니다.' : '행사와 거래 기간을 확인한 뒤 가져오세요.';}
  catch(e){if(settlementValid(event,session,request)){$('rsError').textContent='미리보기 실패: '+receiptError(e);$('rsStatus').textContent='선택한 파일은 유지됩니다.';}}
  finally{if(session===receiptSession){$('rsPreviewBtn').classList.remove('busy');setSettlementBusy(false);updateSettlementPager(false);}}
}
function renderSettlementPreview(p){
  if(!p)return;$('rsImportBtn').textContent=p.previouslyArchived ? '제외한 파일 다시 가져오기' : '확인한 파일 가져오기';const warnings=Array.isArray(p.warnings)?p.warnings:[];const samples=Array.isArray(p.samples)?p.samples:[];
  $('rsPreview').classList.remove('hide');$('rsPreview').innerHTML=`<h4>가져오기 전 확인</h4>${p.previouslyArchived?'<p class="rs-warning">이전에 제외한 파일입니다. 다시 가져오면 같은 파일의 기존 거래와 메모 연결을 유지한 채 대조 목록에 복원합니다.</p>':''}<p><b>${esc(settlementEvent)}</b> · ${esc(p.fileName||settlementFile&&settlementFile.name||'')}</p><p>대상 시트: ${esc(p.sheetName)}<br>거래일 ${esc(p.dateFrom||'–')} ~ ${esc(p.dateTo||'–')}<br>${fmt(p.rowCount)}개 상품 행 · ${fmt(p.transactionCount)}거래 · 완료 ${fmt(p.completedCount)} · 취소 ${fmt(p.cancelledCount)}</p>${warnings.length?'<ul class="rs-warnings">'+warnings.map(w=>'<li>'+esc(typeof w==='string'?w:JSON.stringify(w))+'</li>').join('')+'</ul>':''}${samples.length?'<details><summary>대상 시트 거래 예시</summary>'+samples.slice(0,5).map(t=>`<p>${esc(t.startedAt||t.saleDate||'')} · 영수증 ${esc(t.orderNo||'')} · ${esc(t.productName||t.items&&t.items.map(i=>i.productName).join(', ')||'')} · ${fmt(t.salesTotal!==undefined?t.salesTotal:t.salesAmount)}원</p>`).join('')+'</details>':''}<small>원본의 다른 시트는 표시하거나 가져오지 않습니다.</small>`;
}
async function importSettlementFile(){
  if(settlementBusy||receiptSaving||!settlementPreview||!settlementFile)return;const file=$('rsFile').files[0],cached=settlementFile;
  if(!file||file.name!==cached.name||file.size!==cached.size||file.lastModified!==cached.lastModified||cached.event!==settlementEvent){$('rsError').textContent='파일 또는 행사가 바뀌었습니다. 다시 미리보기해 주세요.';$('rsImportBtn').disabled=true;$('rsImportBtn').textContent='확인한 파일 가져오기';return;}
  const event=settlementEvent,session=receiptSession,request=++settlementRequest,restoreArchived=!!(settlementPreview&&settlementPreview.previouslyArchived);setSettlementBusy(true);$('rsImportBtn').classList.add('busy');$('rsError').textContent='';$('rsStatus').textContent='파일을 가져오는 중…';
  try{const r=await api('importReceiptSettlement',{event,fileName:cached.name,fileBase64:cached.base64,...(restoreArchived?{restoreArchived:true}:{})});if(!settlementValid(event,session,request))return;const info=r.import||r.importInfo;if(!info||!info.id)throw new Error('가져온 파일 정보를 확인하지 못했습니다. 목록을 갱신해 주세요.');settlementImportId=String(info.id);await loadSettlementImports(info.id);if(!settlementValid(event,session))return;$('rsStatus').textContent=r.restored?'제외했던 파일을 대조 목록에 복원했습니다. 기존 거래와 메모 연결은 그대로 유지됩니다.':r.duplicate?(restoreArchived?'이미 복원된 파일을 선택했습니다. 중복 거래 없이 기존 메모 연결을 유지합니다.':'같은 파일이 이미 있습니다. 기존 파일을 선택했습니다.'):'파일을 가져왔습니다. 시각과 상품을 확인해 메모를 연결하세요.';$('rsImportBtn').disabled=true;$('rsImportBtn').textContent='확인한 파일 가져오기';settlementFile=null;settlementPreview=null;$('rsFile').value='';}
  catch(e){if(settlementValid(event,session,request)){$('rsError').textContent='가져오기 실패: '+receiptError(e);$('rsStatus').textContent='파일과 미리보기를 유지합니다. 같은 파일 재시도는 중복으로 가져오지 않습니다.';}}
  finally{if(session===receiptSession){$('rsImportBtn').classList.remove('busy');setSettlementBusy(false);updateSettlementPager(false);}}
}
function settlementDraftId(transaction){return settlementEvent+'::'+settlementImportId+'::'+transaction.id;}
function saveSettlementDrafts(){try{sessionStorage.setItem(receiptSettlementDraftKey,JSON.stringify(settlementDrafts));}catch(e){}}
function captureSettlementRowDraft(card,transaction){
  const id=settlementDraftId(transaction),old=settlementDrafts[id]||{},selected=card.querySelector('input[name="rsNote'+transaction.id+'"]:checked');
  settlementDrafts[id]={...old,noteId:selected?String(selected.value):'',comment:card.querySelector('[data-rs-comment]').value};saveSettlementDrafts();return settlementDrafts[id];
}
async function loadSettlementCompare(page){
  const event=settlementEvent,importId=settlementImportId;if(!event||!importId||!key)return;
  const session=receiptSession,request=++settlementRequest;settlementPage=Math.max(1,Number(page)||1);const requestedPage=settlementPage;
  $('rsError').textContent='';$('rsSummary').textContent='거래와 메모 후보를 대조하는 중…';$('rsRows').setAttribute('aria-busy','true');updateSettlementPager(true);
  try{const r=await api('receiptSettlementCompare',{event,importId:Number(importId),q:$('rsQ').value.trim(),date:$('rsDate').value,filter:$('rsFilter').value,page:requestedPage,pageSize:20});if(!settlementValid(event,session,request)||importId!==settlementImportId)return;settlementTotal=Number(r.total)||0;const last=Math.max(1,Math.ceil(settlementTotal/20));if(requestedPage>last){loadSettlementCompare(last);return;}settlementPage=Number(r.page)||requestedPage;settlementRows=r.rows||[];renderSettlementRows(settlementRows);const s=r.summary||{};$('rsSummary').textContent='전체 '+fmt(s.transactions)+'거래 · 연결 '+fmt(s.linked)+' · 메모 있음 '+fmt(s.withNotes)+' · 없음 '+fmt(s.noNote)+' · 후보 중복 '+fmt(s.ambiguous);}
  catch(e){if(settlementValid(event,session,request)&&importId===settlementImportId){$('rsError').textContent='대조 조회 실패: '+receiptError(e);$('rsSummary').textContent='입력 중인 추가 설명은 유지됩니다. 조회를 다시 시도해 주세요.';}}
  finally{if(settlementValid(event,session,request)){$('rsRows').setAttribute('aria-busy','false');updateSettlementPager(false);}}
}
const settlementFlagLabels={zero:'0원 포함',discount:'할인 포함',cancelled:'취소',standard_gift:'기본 0원 사은품',voucher:'상품권',full_discount:'유상 상품 전액 할인'};
function renderSettlementRows(rows){
  const box=$('rsRows');box.innerHTML='';if(!rows.length){box.innerHTML='<p class="muted rs-empty">조건에 맞는 거래가 없습니다.</p>';return;}
  rows.forEach(row=>{const t=row.transaction||{},notes=(row.notes||[]).filter(n=>n.recordKind!=='stock_issue'),draft=settlementDrafts[settlementDraftId(t)]||{},linked=row.matchState==='linked'||notes.some(n=>n.linked),card=document.createElement('article');card.className='rs-transaction';card.dataset.transactionId=t.id;
    const flags=(t.flags||[]).filter(f=>settlementFlagLabels[f]);
    const items=(t.items||[]).map(i=>`<li><div><b>${esc(i.productName||'상품명 없음')}</b>${i.option?'<small>'+esc(i.option)+'</small>':''}${i.productDiscount||i.orderDiscount?'<small>'+esc([i.productDiscount,i.orderDiscount].filter(Boolean).join(' · '))+'</small>':''}</div><div>${fmt(i.qty)}개<br><b>${fmt(i.salesAmount)}원</b>${Number(i.gross)!==Number(i.salesAmount)?'<small>상품가 '+fmt(i.gross)+'원</small>':''}</div></li>`).join('');
    const candidates=notes.map((n,index)=>`<label class="rs-candidate"><input type="radio" name="rsNote${t.id}" value="${esc(n.id)}" ${draft.noteId===String(n.id)?'checked':''} ${linked?'disabled':''}><span><b>메모 #${esc(n.id)} · 영수증 ${esc(n.orderNo)}</b><small>${esc(n.saleDate)} · ${esc(n.timeHint?n.timeHint+'경':'시각 미입력')} · ${esc(n.author||'작성자 미입력')}${n.posNo?' · '+esc(n.posNo):''}</small><small>${n.matchReason==='normalized'?'앞자리 0을 정리한 번호 후보':'같은 번호 후보'}${n.timeMatches?' · 시각 일치':''}${n.linked?' · 연결 완료':''}</small><span class="rs-candidate-memo">${esc(n.memo||'')}</span>${receiptNoteHistory(n)}</span></label>`).join('');
    card.innerHTML=`<div class="rs-transaction-heading"><div><span class="muted">${esc(t.saleDate)} · ${esc(t.status||'')}</span><h4>영수증 ${esc(t.orderNo)}</h4><b class="rs-time">거래 시작 ${esc(t.startedAt||'시각 없음')}</b></div><div class="rs-total">${fmt(t.salesTotal)}원${linked?'<span class="rn-settlement-link">연결 완료</span>':''}</div></div><div class="rs-flags">${flags.map(f=>'<span class="rs-flag">'+esc(settlementFlagLabels[f])+'</span>').join('')}</div><ul class="rs-items">${items}</ul><details class="rs-amounts"><summary>금액 자세히</summary><p>상품 ${fmt(t.grossTotal)}원 + 옵션 ${fmt(t.optionTotal)}원 + 상품 할인 ${fmt(t.productDiscountTotal)}원 + 주문 할인 ${fmt(t.orderDiscountTotal)}원 = 실판매 ${fmt(t.salesTotal)}원</p></details>${Number(row.transactionMultiplicity)>1?'<p class="rs-warning">같은 날짜·번호의 거래가 여러 건입니다. 거래 시작 시각과 상품을 꼭 확인하세요.</p>':''}<fieldset class="rs-link-fields"><legend>${linked?'연결한 메모':'연결할 메모를 직접 선택하세요'}</legend>${candidates}${!notes.length?'<p class="muted">같은 날짜·번호의 메모가 없습니다.</p>':''}${!linked?`<label class="rs-candidate"><input type="radio" name="rsNote${t.id}" value="0" ${draft.noteId==='0'?'checked':''}><span><b>이 거래의 새 기록 만들기</b><small>원본 거래 내역과 출처를 보존하고 추가 설명을 기록합니다.</small></span></label>`:''}${!linked?`<label class="note-field"><span>추가 설명 (선택)</span><textarea data-rs-comment rows="3" maxlength="2000" placeholder="상품·시각을 확인한 내용 또는 보충 설명">${esc(draft.comment||'')}</textarea></label><button type="button" class="btn primary rs-apply" data-rs-apply>시각·상품 확인 후 연결 · 내용 추가</button><p class="err" data-rs-error role="alert"></p>`:'<p class="muted">이 거래는 이미 연결했습니다. 추가할 내용은 위 메모 목록의 ‘내용 추가’를 이용하세요.</p>'}</fieldset>`;
    if(!linked){card.querySelectorAll('input,textarea').forEach(el=>el.addEventListener('input',()=>captureSettlementRowDraft(card,t)));card.querySelector('[data-rs-apply]').addEventListener('click',()=>applySettlementRow(row,card));}
    box.appendChild(card);
  });
}
async function applySettlementRow(row,card){
  if(receiptSaving||settlementBusy)return;const t=row.transaction,notes=row.notes||[],draft=captureSettlementRowDraft(card,t),error=card.querySelector('[data-rs-error]');error.textContent='';
  if(draft.noteId===''){error.textContent='거래 시각과 상품을 확인하고 연결할 메모 또는 새 기록을 선택해 주세요.';return;}
  const noteId=Number(draft.noteId),note=noteId?notes.find(n=>Number(n.id)===noteId):null;
  if(noteId&&!note){error.textContent='선택한 메모를 다시 조회해 주세요.';return;}
  const event=settlementEvent,importId=settlementImportId,session=receiptSession;
  const payload={event,importId:Number(importId),transactionId:t.id,noteId,version:note?note.version:undefined,comment:draft.comment.trim(),author:$('rnAuthor').value.trim()};
  const signature=JSON.stringify(payload);if(!draft.pending||draft.pending.signature!==signature)draft.pending={signature,uuid:receiptUuid()};settlementDrafts[settlementDraftId(t)]=draft;saveSettlementDrafts();setSettlementBusy(true);const button=card.querySelector('[data-rs-apply]');button.classList.add('busy');
  try{const r=await api('applyReceiptSettlement',{...payload,uuid:draft.pending.uuid});if(!settlementValid(event,session)||importId!==settlementImportId)return;delete settlementDrafts[settlementDraftId(t)];saveSettlementDrafts();$('rsStatus').textContent=r.duplicate?'이미 연결한 거래입니다. 중복 기록 없이 확인했습니다.':noteId?'원래 메모를 보존하고 거래 내역과 설명을 추가했습니다.':'거래 내역과 출처를 담은 새 메모를 만들었습니다.';loadReceiptNotes(receiptPage);await loadSettlementCompare(settlementPage);}
  catch(e){if(settlementValid(event,session)&&importId===settlementImportId){error.textContent='연결 실패: '+receiptError(e)+' 선택과 설명은 유지됩니다.';}}
  finally{if(session===receiptSession){button.classList.remove('busy');setSettlementBusy(false);updateSettlementPager(false);}}
}
async function voidSettlementImport(){
  if(settlementBusy||receiptSaving||!settlementImportId)return;const info=settlementImports.find(i=>String(i.id)===settlementImportId);if(!confirm((info&&info.fileName||'선택한 파일')+'을 대조 목록에서 제외할까요? 이미 추가한 메모와 원본 출처는 보관됩니다.'))return;
  const answer=prompt('파일 제외 사유 (최대 200자)','다른 행사 파일 / 잘못된 파일');if(answer===null)return;const reason=answer.trim();if(!reason||reason.length>200){$('rsError').textContent='파일 제외 사유는 1~200자로 입력해 주세요.';return;}
  const event=settlementEvent,importId=settlementImportId,session=receiptSession;setSettlementBusy(true);$('rsError').textContent='';
  try{await api('voidReceiptSettlementImport',{event,importId:Number(importId),reason});if(!settlementValid(event,session)||importId!==settlementImportId)return;settlementImportId='';$('rsRows').innerHTML='';settlementTotal=0;await loadSettlementImports();$('rsStatus').textContent='잘못 올린 파일을 목록에서 제외했습니다. 기존 메모와 출처는 보존됩니다.';loadReceiptNotes(receiptPage);}
  catch(e){if(settlementValid(event,session))$('rsError').textContent='파일 제외 실패: '+receiptError(e);}
  finally{if(session===receiptSession){setSettlementBusy(false);updateSettlementPager(false);}}
}
function initializeReceiptNotes(){
  $('receiptNoteForm').addEventListener('submit',saveReceiptNote);
  $('receiptNoteForm').addEventListener('input',e=>{if(e.target.dataset.stockProduct!==undefined)receiptStockRows[Number(e.target.dataset.stockProduct)].product=e.target.value;if(e.target.dataset.stockQty!==undefined)receiptStockRows[Number(e.target.dataset.stockQty)].qty=e.target.value;updateReceiptQuickUI();$('rnSaveStatus').textContent='';$('rnSaveError').textContent=navigator.onLine===false?'오프라인입니다. 입력 내용은 유지됩니다. 연결 후 저장해 주세요.':'';saveReceiptDraft();});
  $('receiptNoteForm').addEventListener('change',e=>{if(e.target.name==='rnTemplate'){if(e.target.value==='zero_stock'&&$('rnQuickPos').value==='none')$('rnQuickPos').value='zero';updateReceiptQuickUI();saveReceiptDraft();}});
  $('rnEvent').addEventListener('change',()=>{saveReceiptDraft();restoreReceiptDraft('all::'+$('rnEvent').value);$('rnSave').disabled=!receiptActualEvent();ensureReceiptStockProducts();saveReceiptDraft();});
  $('rnDetails').addEventListener('toggle',saveReceiptDraft);$('rnAppendCancel').addEventListener('click',cancelReceiptAppend);
  $('rnStockAdd').addEventListener('click',()=>{if(receiptStockRows.length>=20){$('rnStockError').textContent='한 번에 최대 20개 상품까지 선택할 수 있습니다.';return;}receiptStockRows.push({product:'',qty:'1'});renderReceiptStockRows();updateReceiptQuickUI();saveReceiptDraft();});
  $('rnStockItems').addEventListener('click',e=>{const btn=e.target.closest('[data-stock-remove]');if(!btn)return;receiptStockRows.splice(Number(btn.dataset.stockRemove),1);if(!receiptStockRows.length)receiptStockRows.push({product:'',qty:'1'});renderReceiptStockRows();updateReceiptQuickUI();saveReceiptDraft();});
  $('receiptNoteFilters').addEventListener('submit',e=>{e.preventDefault();loadReceiptNotes(1);});$('rnDate').addEventListener('change',()=>loadReceiptNotes(1));$('rnFilterCategory').addEventListener('change',()=>loadReceiptNotes(1));$('rnPrev').addEventListener('click',()=>loadReceiptNotes(receiptPage-1));$('rnNext').addEventListener('click',()=>loadReceiptNotes(receiptPage+1));
  $('rsEvent').addEventListener('change',()=>{if(settlementBusy||receiptSaving)return;settlementEvent=$('rsEvent').value;resetSettlementView();$('rsContext').textContent=settlementEvent?'정산 행사: '+settlementEvent:'정산할 행사를 선택해 주세요.';$('rsPreviewBtn').disabled=!settlementEvent;$('rsReload').disabled=!settlementEvent;if(settlementEvent)loadSettlementImports();});
  $('rsFile').addEventListener('change',()=>{settlementPreview=null;settlementFile=null;$('rsImportBtn').disabled=true;$('rsImportBtn').textContent='확인한 파일 가져오기';$('rsPreview').classList.add('hide');$('rsError').textContent='';});
  $('rsPreviewBtn').addEventListener('click',previewSettlementFile);$('rsImportBtn').addEventListener('click',importSettlementFile);$('rsReload').addEventListener('click',()=>loadSettlementImports());$('rsVoidImport').addEventListener('click',voidSettlementImport);
  $('rsImport').addEventListener('change',()=>{++settlementRequest;settlementImportId=$('rsImport').value;$('rsVoidImport').disabled=!settlementImportId;$('rsRows').innerHTML='';$('rsSummary').textContent='';$('rsError').textContent='';settlementTotal=0;updateSettlementPager(false);if(settlementImportId)loadSettlementCompare(1);});
  $('rsFilters').addEventListener('submit',e=>{e.preventDefault();loadSettlementCompare(1);});$('rsDate').addEventListener('change',()=>loadSettlementCompare(1));$('rsFilter').addEventListener('change',()=>loadSettlementCompare(1));$('rsPrev').addEventListener('click',()=>loadSettlementCompare(settlementPage-1));$('rsNext').addEventListener('click',()=>loadSettlementCompare(settlementPage+1));
  window.addEventListener('offline',()=>{if(key&&!$('tab-notes').classList.contains('hide'))$('rnSaveError').textContent='오프라인입니다. 입력 내용은 유지됩니다. 연결 후 다시 저장해 주세요.';});
  renderReceiptStockRows();updateReceiptQuickUI();updateReceiptAppendUI();
}

function receiptStatsEvent(snapshot){return snapshot&&snapshot.selected==='all'?'all':snapshot&&(snapshot.selected||snapshot.event&&snapshot.event.name)||'';}
function patchReceiptProductRemaining(remaining){
  // Match the original row identity; leave unsaved product edits untouched.
  Array.from($('prodTable').tBodies[0].rows).forEach(tr=>{const input=tr.querySelector('.pName'),name=input&&input.defaultValue.trim(),item=name&&remaining.get(name);if(item&&tr.cells[7])tr.cells[7].textContent=fmt(item.remaining);});
}
function syncReceiptCanonicalInventory(snapshot){
  const event=receiptStatsEvent(snapshot),session=receiptSession,viewEvent=evKey,revision=statsRequest;
  if(!snapshot||!key||!event||event==='all'||viewEvent==='all')return Promise.resolve(null);
  const cached=receiptCanonicalReports.get(snapshot);if(cached&&cached.event===event&&cached.session===session)return cached.promise;
  const valid=()=>!!key&&session===receiptSession&&snapshot===stats&&viewEvent===evKey&&revision===statsRequest&&receiptStatsEvent(snapshot)===event;
  const promise=Promise.resolve().then(()=>fetchReceiptClosingReport(event)).then(report=>{
    if(!valid())return null;const remaining=receiptClosingItems(report);
    // Closing supplies the final value. No inventory arithmetic is duplicated here.
    (snapshot.products||[]).forEach(p=>{if(remaining.has(p.name))p.remaining=remaining.get(p.name).remaining;});
    renderDash(snapshot);patchReceiptProductRemaining(remaining);
    if(receiptStockEvent===event){receiptStockProducts.forEach(p=>{p.remaining=remaining.has(p.name)?remaining.get(p.name).remaining:null;});renderReceiptStockRows();}
    return report;
  }).catch(error=>{if(valid())$('rnStockError').textContent='일일 마감 재고 조회 실패: '+receiptError(error);return null;});
  // Cache before the request starts; renderDash's second call reuses this promise.
  receiptCanonicalReports.set(snapshot,{event,session,promise});return promise;
}
async function refreshReceiptInventory(){
  const session=receiptSession,viewEvent=evKey,event=receiptActualEvent(),request=++receiptInventoryRequest;
  await refresh();if(session!==receiptSession||viewEvent!==evKey||event!==receiptActualEvent()||request!==receiptInventoryRequest||!stats||!key)return;
  const report=receiptStatsEvent(stats)===event?await syncReceiptCanonicalInventory(stats):null;
  if(session!==receiptSession||viewEvent!==evKey||event!==receiptActualEvent()||request!==receiptInventoryRequest||!key)return;
  await ensureReceiptStockProducts(true,report);
}
