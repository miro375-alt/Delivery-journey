<?php
/* config.sample.php → 복사해서 config.php 로 저장 후 키 입력.
   config.php 는 .gitignore 처리되어 git/외부로 안 나갑니다. (키 보관용) */
return [
  // 배송조회 (스마트택배)
  'SMART_PARCEL_API_KEY' => '',

  // 동기화 보호 토큰 (cron/sync.php?token=... 호출용 — 아무 임의 문자열)
  'SYNC_TOKEN' => '',

  // 카페24
  'CAFE24_CLIENT_ID' => '',
  'CAFE24_CLIENT_SECRET' => '',
  'CAFE24_MALLID_AGUARD' => '',
  'CAFE24_REFRESH_AGUARD' => '',
  'CAFE24_MALLID_BABYSTANDARD' => '',
  'CAFE24_REFRESH_BABYSTANDARD' => '',

  // 인스타그램
  'IG_TOKEN_AGUARD' => '',
  'IG_USERID_AGUARD' => '',
  'IG_TOKEN_BABYSTANDARD' => '',
  'IG_USERID_BABYSTANDARD' => '',
];
