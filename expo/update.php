<?php
/* 박람회 접수 페이지 자가 업데이트 (expo 폴더 전용 초경량 버전)
 *
 * 사용법:
 *  1. 아래 $TOKEN 을 아무 비밀 문자열로 바꾼 뒤, order.html 과 함께
 *     www/cwjung/expo/ 에 업로드 (최초 1회)
 *  2. 이후 페이지가 수정되면 브라우저에서 아래 URL만 열면 최신본 반영:
 *     https://track.도메인/cwjung/expo/update.php?token=<TOKEN>
 *
 * GitHub의 order.html 만 내려받아 교체합니다. 다른 파일은 건드리지 않습니다.
 */

$TOKEN  = 'CHANGE-ME';   // ← 업로드 전에 반드시 임의 문자열로 변경
$BRANCH = 'claude/expo-delivery-order-planning-m7y9mt';
$URL    = "https://raw.githubusercontent.com/miro375-alt/Delivery-journey/$BRANCH/expo/order.html";

header('Content-Type: text/plain; charset=utf-8');

if ($TOKEN === 'CHANGE-ME') { http_response_code(500); exit("TOKEN을 먼저 변경하세요.\n"); }
if (($_GET['token'] ?? '') !== $TOKEN) { http_response_code(403); exit("forbidden\n"); }

$ch = curl_init($URL);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_TIMEOUT => 30,
]);
$html = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if (!$html || $code >= 400) {
  http_response_code(502);
  exit("다운로드 실패 (HTTP $code) $err\n");
}
// 내려받은 내용이 진짜 접수 페이지인지 최소 검증 (절반만 받다 끊긴 파일로 덮어쓰기 방지)
if (strpos($html, '<!DOCTYPE html>') !== 0 || strpos($html, '</html>') === false
    || strpos($html, '택배 배송 접수') === false) {
  http_response_code(502);
  exit("파일 검증 실패 — 반영하지 않음\n");
}

$dst = __DIR__ . '/order.html';
$tmp = $dst . '.tmp';
if (file_put_contents($tmp, $html) === false) { http_response_code(500); exit("쓰기 실패 (폴더 권한 확인)\n"); }
if (!rename($tmp, $dst)) { @unlink($tmp); http_response_code(500); exit("교체 실패\n"); }

echo "완료 — order.html 갱신됨 (" . number_format(strlen($html)) . " bytes)\n";
