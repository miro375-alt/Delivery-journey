<?php
/* 배송조회 프록시 (스마트택배) — 키는 서버에만, 개인정보 마스킹 후 응답 */
require __DIR__ . '/../lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$key = cfg('SMART_PARCEL_API_KEY');
if (!$key) { http_response_code(503); echo json_encode(['error' => '배송조회 미설정(SMART_PARCEL_API_KEY 없음)'], JSON_UNESCAPED_UNICODE); exit; }

$invoice = preg_replace('/\D/', '', $_GET['invoice'] ?? '');
$code = preg_replace('/\D/', '', $_GET['code'] ?? '');
if (!$invoice) { http_response_code(400); echo json_encode(['error' => 'invoice(송장번호) 필요'], JSON_UNESCAPED_UNICODE); exit; }

try {
  if (!$code) {
    $rec = http_get_json("https://info.sweettracker.co.kr/api/v1/recommend?t_key=$key&t_invoice=$invoice");
    $code = $rec['Recommend'][0]['Code'] ?? '';
    if (!$code) { http_response_code(404); echo json_encode(['error' => '택배사 자동인식 실패 — code 필요'], JSON_UNESCAPED_UNICODE); exit; }
  }
  $t = http_get_json("https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=$key&t_code=$code&t_invoice=$invoice");
  echo json_encode(map_tracking($t), JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  http_response_code(502);
  echo json_encode(['error' => '조회 실패'], JSON_UNESCAPED_UNICODE);
}
