<?php
/* 공용 PHP 헬퍼 (Web Station / PHP 환경)
   - 설정은 config.php(없으면 환경변수) 에서 읽음. config.php 는 git 에 안 올라감. */

function cfg($key, $default = '') {
  static $c = null;
  if ($c === null) {
    $f = __DIR__ . '/config.php';
    $c = file_exists($f) ? (include $f) : [];
    if (!is_array($c)) $c = [];
  }
  if (isset($c[$key]) && $c[$key] !== '') return $c[$key];
  $env = getenv($key);
  return $env !== false && $env !== '' ? $env : $default;
}

function http_get_json($url, $opts = []) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 15,
      CURLOPT_FOLLOWLOCATION => true,
    ]);
    if (!empty($opts['headers'])) curl_setopt($ch, CURLOPT_HTTPHEADER, $opts['headers']);
    if (isset($opts['post'])) { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, $opts['post']); }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($res === false) throw new Exception("curl: $err");
    if ($code >= 400) throw new Exception("HTTP $code");
  } else {
    // curl 없을 때 폴백
    $ctx = stream_context_create(['http' => ['timeout' => 15, 'header' => $opts['headers'] ?? []]]);
    $res = @file_get_contents($url, false, $ctx);
    if ($res === false) throw new Exception("fetch 실패");
  }
  $j = json_decode($res, true);
  if ($j === null) throw new Exception("JSON 파싱 실패");
  return $j;
}

/* ---- 개인정보 마스킹 ---- */
function mask_name($s) {
  $s = trim((string)$s);
  if ($s === '') return $s;
  $len = mb_strlen($s, 'UTF-8');
  if ($len <= 1) return $s;
  return mb_substr($s, 0, 1, 'UTF-8') . str_repeat('*', $len - 1);
}
function mask_phone($s) {
  return preg_replace('/(\d{2,3})\D?\d{3,4}\D?(\d{4})/', '$1-****-$2', (string)$s);
}
function mask_addr($s) {
  $s = (string)$s;
  if (preg_match('/^(.*?[동읍면리])(\s|$)/u', $s, $m)) return $m[1] . ' ***';
  return preg_replace('/\s\d.*$/', ' ***', $s);
}

/* ---- 데이터 파일 쓰기 (data/ 하위) ---- */
function write_data($file, $arr) {
  $dir = __DIR__ . '/data';
  if (!is_dir($dir)) @mkdir($dir, 0775, true);
  file_put_contents($dir . '/' . $file, json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
}

/* ---- 스마트택배 응답 → 프론트 형식 매핑 (+마스킹) ---- */
function map_tracking($t) {
  $stepByLevel = [1 => 'ordered', 2 => 'picked', 3 => 'transit', 4 => 'transit', 5 => 'delivery', 6 => 'delivered'];
  $details = $t['trackingDetails'] ?? [];
  $history = [];
  foreach ($details as $d) {
    $lv = $d['level'] ?? 3;
    $history[] = [
      'time'   => $d['timeString'] ?? ($d['time'] ?? ''),
      'status' => $d['kind'] ?? ($d['where'] ?? ''),
      'where'  => $d['where'] ?? '',
      'step'   => $stepByLevel[$lv] ?? 'transit',
    ];
  }
  $last = end($details) ?: [];
  $lastLv = $last['level'] ?? null;
  $current = $lastLv && isset($stepByLevel[$lastLv]) ? $stepByLevel[$lastLv] : (!empty($t['complete']) ? 'delivered' : 'transit');
  return [
    'carrier'     => $t['company'] ?? '',
    'carrierTel'  => $t['companyTel'] ?? '',
    'receiver'    => mask_name($t['receiverName'] ?? ''),
    'eta'         => $t['estimate'] ?? '',
    'etaDate'     => '',
    'currentStep' => $current,
    'product'     => null,
    'delivery'    => [
      'sender'        => $t['senderName'] ?? '',
      'receiverName'  => mask_name($t['receiverName'] ?? ''),
      'receiverAddr'  => mask_addr($t['receiverAddr'] ?? ''),
      'receiverPhone' => mask_phone($t['receiverTel'] ?? ''),
      'request'       => '',
    ],
    'history'     => $history,
  ];
}
