#!/usr/bin/env bash
# deploy-nas.sh — expo/order.html → 나스 라이브 배포
# 라이브 주소: https://codes.aguard.synology.me/cwjung/expo_delivery/
# (index.html로도 복사해 폴더 주소만 쳐도 열리게 함)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/expo/order.html"
NAS="/Volumes/www/cwjung/expo_delivery"

if [ ! -d "$NAS" ]; then
  echo "✗ NAS 마운트를 찾을 수 없습니다: $NAS"
  echo "  (SMB //cwjung@Lipaco 마운트 확인 후 다시 실행)"
  exit 1
fi

cp "$SRC" "$NAS/order.html"
cp "$SRC" "$NAS/index.html"
echo "✓ 배포 완료 → https://codes.aguard.synology.me/cwjung/expo_delivery/"
echo "  (아이패드 캐시 갱신: 주소 뒤 ?v=숫자)"
