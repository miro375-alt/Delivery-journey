/**
 * 박람회 택배 주문 접수 — Google Apps Script 백엔드
 *
 * 배포 방법: SETUP.md 참고
 *  1. 구글시트에서 확장 프로그램 → Apps Script → 이 코드 붙여넣기
 *  2. 배포 → 새 배포 → 웹 앱
 *     - 실행 사용자: 나
 *     - 액세스 권한: 모든 사용자
 *  3. 배포 URL을 태블릿 스태프 화면의 "웹앱 URL"에 입력
 */

// ─── 설정 ───────────────────────────────────────────
var SHEET_NAME = '주문접수';

// 새 접수 알림을 받을 메일 주소 (쉼표로 여러 명 가능, 빈 문자열이면 알림 끔)
var NOTIFY_EMAILS = 'your-email@example.com';

var EVENT_NAME = '2026 박람회';
// ────────────────────────────────────────────────────

var HEADERS = [
  '접수번호', '접수시각', '영수증번호',
  '주문자명', '주문자연락처', '수령인명', '수령인연락처', '우편번호',
  '기본주소', '상세주소', '배송요청사항', '개인정보동의', '클라이언트UUID',
  '단말기', '중복의심',
];

var COL_ORDER_NO = 3;   // C: 영수증번호
var COL_UUID = 13;      // M: 클라이언트UUID

function doGet() {
  // 헬스체크용 — 브라우저에서 배포 URL을 열면 상태 확인 가능
  return jsonOut({ ok: true, service: 'expo-order', event: EVENT_NAME });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet();

    // 멱등 처리: 동일 UUID 재수신(오프라인 큐 재전송) 시 행 추가 없이 성공 응답
    var uuid = String(data.uuid || '');
    if (uuid && findInColumn(sheet, COL_UUID, uuid)) {
      return jsonOut({ ok: true, dup: true });
    }

    // 영수증번호 중복 의심 플래그 (차단하지 않음 — 분할 접수 등 정상 케이스 존재)
    var orderNo = String(data.orderNo || '');
    var dupFlag = orderNo && findInColumn(sheet, COL_ORDER_NO, orderNo) ? '중복의심' : '';

    sheet.appendRow([
      data.receiptNo || '', data.ts || new Date(), orderNo,
      data.name || '', prefix(data.phone), data.rName || '', prefix(data.rPhone),
      prefix(data.zipcode), data.addr1 || '', data.addr2 || '',
      data.memo || '', data.consent || '', uuid,
      data.device || '', dupFlag,
    ]);

    notify(data, dupFlag);   // 알림 실패가 접수 저장을 막지 않도록 내부 try/catch

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e8eef7');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findInColumn(sheet, col, value) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var found = sheet.getRange(2, col, last - 1, 1)
    .createTextFinder(value).matchEntireCell(true).findNext();
  return !!found;
}

// 전화번호·우편번호가 숫자로 변환돼 앞자리 0이 사라지지 않도록 텍스트로 강제
function prefix(v) {
  v = String(v || '');
  return v ? "'" + v : '';
}

function notify(data, dupFlag) {
  if (!NOTIFY_EMAILS) return;
  try {
    var subject = '[' + EVENT_NAME + ' 택배접수] ' + (data.receiptNo || '') + ' ' + (data.name || '')
      + (dupFlag ? ' ⚠중복의심' : '');
    var body =
      '새 택배 접수가 등록되었습니다.\n\n' +
      '접수번호: ' + (data.receiptNo || '') + '\n' +
      '접수시각: ' + (data.ts || '') + '\n' +
      '영수증번호: ' + (data.orderNo || '') + (dupFlag ? '  ⚠ 동일 번호 접수 이력 있음' : '') + '\n\n' +
      '주문자: ' + (data.name || '') + ' (' + (data.phone || '') + ')\n' +
      '수령인: ' + (data.rName || '') + ' (' + (data.rPhone || '') + ')\n' +
      '주소: [' + (data.zipcode || '') + '] ' + (data.addr1 || '') + ' ' + (data.addr2 || '') + '\n' +
      '요청사항: ' + (data.memo || '-') + '\n' +
      '단말기: ' + (data.device || '') + '\n\n' +
      '시트 바로가기: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();
    NOTIFY_EMAILS.split(',').forEach(function (addr) {
      addr = addr.trim();
      if (addr) MailApp.sendEmail(addr, subject, body);
    });
  } catch (err) {
    // 알림 실패는 무시 (접수 저장이 우선) — 실행 기록에서 확인 가능
    console.error('notify failed: ' + err);
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
