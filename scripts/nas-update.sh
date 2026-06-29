#!/bin/sh
# ──────────────────────────────────────────────────────────────
# DSM 작업 스케줄러용 자동 업데이트 스크립트 (self-hosted 러너 대신 쓰는 간단 방법)
# - 주기적으로 GitHub 최신 코드를 받아 컨테이너를 재빌드/재시작합니다.
# - 사용 전제: 이 폴더가 git clone 으로 받은 폴더여야 함(아래 NAS-AUTO.md 참고).
#
# 작업 스케줄러 등록 예:
#   사용자: root,  주기: 10분마다
#   명령:  sh /volume1/web/cwjung/logis/logis-app/scripts/nas-update.sh
# ──────────────────────────────────────────────────────────────
set -e

# 스크립트 위치 기준 프로젝트 루트로 이동
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

echo "[nas-update] $(date) — fetch"
git fetch --quiet origin
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse @{u})"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[nas-update] 변경 없음 — 종료"
  exit 0
fi

echo "[nas-update] 새 버전 감지 → pull & 재배포"
git pull --ff-only
docker compose up -d --build
docker image prune -f
echo "[nas-update] 완료"
