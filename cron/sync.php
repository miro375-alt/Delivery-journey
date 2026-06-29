<?php
/* 데이터 동기화: 카페24(상품/월령카테고리/쿠폰) + 인스타 → data/*.json
   호출 방법:
   - CLI(작업 스케줄러):  php /path/cron/sync.php
   - 웹/외부 cron:        https://track.도메인/cron/sync.php?token=SYNC_TOKEN
   시크릿 없으면 해당 항목 skip. */
require __DIR__ . '/../lib.php';

// 웹 호출이면 토큰 검증 (CLI 는 통과)
if (php_sapi_name() !== 'cli') {
  $token = cfg('SYNC_TOKEN');
  if (!$token || ($_GET['token'] ?? '') !== $token) { http_response_code(403); exit('forbidden'); }
  header('Content-Type: text/plain; charset=utf-8');
}
function out($m) { echo "[sync] $m\n"; }

/* ---------- 카페24 ---------- */
function cafe24_age_group($name) {
  $n = preg_replace('/\s+/u', '', (string)$name);
  if (preg_match('/출산준비/u', $n)) return '출산준비물';
  if (preg_match('/(\d+)[~\-](\d+)개월/u', $n, $m)) return "{$m[1]}~{$m[2]}개월";
  if (preg_match('/(\d+)개월(이상|~|\+)/u', $n, $m)) return "{$m[1]}개월~";
  return null;
}
function cafe24_refresh($mallId, $cid, $secret, $refresh) {
  $basic = base64_encode("$cid:$secret");
  return http_get_json("https://$mallId.cafe24api.com/api/v2/oauth/token", [
    'headers' => ["Authorization: Basic $basic", "Content-Type: application/x-www-form-urlencoded"],
    'post' => http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refresh]),
  ]);
}
function cafe24_mall($brand, $mallEnv, $refreshEnv) {
  $cid = cfg('CAFE24_CLIENT_ID'); $secret = cfg('CAFE24_CLIENT_SECRET');
  $mallId = cfg($mallEnv); $refresh = cfg($refreshEnv);
  if (!($cid && $secret && $mallId && $refresh)) { out("skip $brand (카페24 시크릿 없음)"); return [[], []]; }

  $tok = cafe24_refresh($mallId, $cid, $secret, $refresh);
  $at = $tok['access_token'] ?? '';
  if (!empty($tok['refresh_token']) && $tok['refresh_token'] !== $refresh) {
    out("⚠ $brand: 새 refresh_token 발급됨 → $refreshEnv 갱신 필요(회전/만료)");
  }
  $base = "https://$mallId.cafe24api.com/api/v2/admin";
  $ver = cfg('CAFE24_API_VERSION', '2024-06-01');
  $headers = ["Authorization: Bearer $at", "X-Cafe24-Api-Version: $ver"];

  // 카테고리 → ageGroup
  $cats = http_get_json("$base/categories?limit=100", ['headers' => $headers])['categories'] ?? [];
  $catAge = [];
  foreach ($cats as $c) { $ag = cafe24_age_group($c['category_name'] ?? ''); if ($ag) $catAge[$c['category_no']] = $ag; }
  out("$brand: 월령 카테고리 " . count($catAge) . "개");

  // product_no → ageGroup
  $prodAge = [];
  foreach (array_keys($catAge) as $catNo) {
    try {
      $r = http_get_json("$base/categories/$catNo/products?limit=100", ['headers' => $headers]);
      foreach ($r['products'] ?? [] as $p) $prodAge[$p['product_no']] = $catAge[$catNo];
    } catch (Exception $e) { out("cat $catNo 실패: " . $e->getMessage()); }
  }

  // 상품
  $items = [];
  for ($offset = 0; ; $offset += 100) {
    $r = http_get_json("$base/products?limit=100&offset=$offset&display=T&selling=T", ['headers' => $headers]);
    $ps = $r['products'] ?? [];
    foreach ($ps as $p) {
      $items[] = [
        'id' => "cafe24-$mallId-{$p['product_no']}",
        'brand' => $brand, 'mall' => $brand,
        'ageGroup' => $prodAge[$p['product_no']] ?? null,
        'category' => $p['category'][0]['category_name'] ?? '',
        'name' => $p['product_name'] ?? '',
        'price' => (float)($p['price'] ?? 0),
        'rating' => 0, 'reviewsCount' => 0,
        'image' => $p['detail_image'] ?? ($p['list_image'] ?? ($p['tiny_image'] ?? '')),
        'url' => "https://$mallId.cafe24.com/product/detail.html?product_no={$p['product_no']}",
      ];
    }
    if (count($ps) < 100) break;
  }
  out("$brand: 상품 " . count($items) . "개");

  // 쿠폰 → 행사(부가)
  $promos = [];
  try {
    $cr = http_get_json("$base/coupons?limit=20&coupon_status=A", ['headers' => $headers]);
    foreach ($cr['coupons'] ?? [] as $c) {
      $promos[] = ['title' => $c['coupon_name'] ?? '', 'period' => trim(($c['issued_start_date'] ?? '') . ' ~ ' . ($c['issued_end_date'] ?? '')), 'url' => "https://$mallId.cafe24.com"];
    }
  } catch (Exception $e) { out("$brand 쿠폰 생략: " . $e->getMessage()); }

  return [$items, $promos];
}

function sync_cafe24() {
  if (!(cfg('CAFE24_CLIENT_ID') && cfg('CAFE24_CLIENT_SECRET'))) { out('카페24 공통 시크릿 없음 → skip'); return; }
  $malls = [
    ['aguard', 'CAFE24_MALLID_AGUARD', 'CAFE24_REFRESH_AGUARD'],
    ['babystandard', 'CAFE24_MALLID_BABYSTANDARD', 'CAFE24_REFRESH_BABYSTANDARD'],
  ];
  $all = []; $promotions = [];
  foreach ($malls as $m) {
    try { [$items, $promos] = cafe24_mall($m[0], $m[1], $m[2]); $all = array_merge($all, $items); if ($promos) $promotions[$m[0]] = $promos; }
    catch (Exception $e) { out("{$m[0]} 실패: " . $e->getMessage()); }
  }
  if ($all) write_data('catalog.json', $all);
  if ($promotions) write_data('promotions.json', $promotions);
}

/* ---------- 인스타그램 ---------- */
function sync_instagram() {
  $brands = [
    ['aguard', 'IG_TOKEN_AGUARD', 'IG_USERID_AGUARD'],
    ['babystandard', 'IG_TOKEN_BABYSTANDARD', 'IG_USERID_BABYSTANDARD'],
  ];
  $graph = cfg('IG_GRAPH_VERSION', 'v19.0');
  $fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count';
  foreach ($brands as $b) {
    $token = cfg($b[1]); $user = cfg($b[2]);
    if (!($token && $user)) { out("skip {$b[0]} (인스타 시크릿 없음)"); continue; }
    try {
      $r = http_get_json("https://graph.facebook.com/$graph/$user/media?fields=$fields&limit=12&access_token=$token");
      $feed = [];
      foreach ($r['data'] ?? [] as $p) {
        $cap = $p['caption'] ?? '';
        $feed[] = [
          'image' => (($p['media_type'] ?? '') === 'VIDEO') ? ($p['thumbnail_url'] ?? ($p['media_url'] ?? '')) : ($p['media_url'] ?? ''),
          'caption' => mb_substr(explode("\n", $cap)[0], 0, 80, 'UTF-8'),
          'likes' => $p['like_count'] ?? 0,
          'permalink' => $p['permalink'] ?? '',
          'isReview' => (bool)preg_match('/(후기|리뷰|review|⭐|★)/iu', $cap),
        ];
      }
      if ($feed) write_data("insta-{$b[0]}.json", $feed);
    } catch (Exception $e) { out("{$b[0]} 실패: " . $e->getMessage()); }
  }
}

sync_cafe24();
sync_instagram();
out('완료');
