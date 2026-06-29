<?php
/* 자가 업데이트: NAS가 GitHub에서 최신 코드를 받아 스스로 갱신.
   - SSH/Docker/관리자 권한 불필요. NAS의 아웃바운드(GitHub)만 있으면 됨.
   - config.php(키)와 data/*.json(동기화 데이터)은 보존.
   호출:
   - 웹/외부 cron:  https://track.도메인/cwjung/logis/cron/selfupdate.php?token=SYNC_TOKEN
   - CLI(작업스케줄러): php /path/cron/selfupdate.php */
require __DIR__ . '/../lib.php';

if (php_sapi_name() !== 'cli') {
  $token = cfg('SYNC_TOKEN');
  if (!$token || ($_GET['token'] ?? '') !== $token) { http_response_code(403); exit('forbidden'); }
  header('Content-Type: text/plain; charset=utf-8');
}
function uout($m) { echo "[selfupdate] $m\n"; @ob_flush(); @flush(); }

$ROOT   = realpath(__DIR__ . '/..');
$REPO   = 'miro375-alt/Delivery-journey';
$BRANCH = 'claude/shipping-product-info-system-kigrde';
$URL    = "https://codeload.github.com/$REPO/zip/refs/heads/$BRANCH";

// 절대 덮어쓰지 않을 항목(키/데이터/임시/깃)
$KEEP = ['config.php', 'data', '.update_tmp', '.git', '.github'];

$tmp = $ROOT . '/.update_tmp';
rrm($tmp); @mkdir($tmp, 0775, true);
$zipPath = "$tmp/src.zip";

// 1) 다운로드
$fp = fopen($zipPath, 'w');
$ch = curl_init($URL);
curl_setopt_array($ch, [CURLOPT_FILE => $fp, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
$ok = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch); fclose($fp);
if (!$ok || $code >= 400) { uout("다운로드 실패 (HTTP $code) $err"); http_response_code(502); rrm($tmp); exit; }
uout("다운로드 완료");

// 2) 압축 해제
if (!class_exists('ZipArchive')) { uout('ZipArchive 미지원 — 서버 PHP 설정 확인 필요'); rrm($tmp); exit; }
$zip = new ZipArchive;
if ($zip->open($zipPath) !== true) { uout('zip 열기 실패'); rrm($tmp); exit; }
$zip->extractTo($tmp); $zip->close();

// 3) 최상위 소스 폴더 탐색
$top = null;
foreach (scandir($tmp) as $e) {
  if ($e === '.' || $e === '..') continue;
  if (is_dir("$tmp/$e") && strpos($e, 'Delivery-journey-') === 0) { $top = "$tmp/$e"; break; }
}
if (!$top) { uout('소스 폴더를 찾지 못함'); rrm($tmp); exit; }

// 4) 적용 (KEEP 제외하고 덮어쓰기)
$count = rcopy($top, $ROOT, $KEEP, true);
uout("적용 완료 ($count 파일)");

// 5) 정리
rrm($tmp);
uout('완료 — 최신 버전 반영됨');

/* ---- 헬퍼 ---- */
function rcopy($src, $dst, $keepTop, $isTop = false) {
  $n = 0;
  foreach (scandir($src) as $e) {
    if ($e === '.' || $e === '..') continue;
    if ($isTop && in_array($e, $keepTop, true)) continue;
    $s = "$src/$e"; $d = "$dst/$e";
    if (is_dir($s)) { if (!is_dir($d)) @mkdir($d, 0775, true); $n += rcopy($s, $d, $keepTop, false); }
    else { if (@copy($s, $d)) $n++; }
  }
  return $n;
}
function rrm($p) {
  if (!file_exists($p)) return;
  if (is_dir($p)) { foreach (scandir($p) as $e) { if ($e !== '.' && $e !== '..') rrm("$p/$e"); } @rmdir($p); }
  else @unlink($p);
}
