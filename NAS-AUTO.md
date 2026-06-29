# 🔄 NAS 자동 배포 설정 (한 번만 설정하면 이후 자동)

> 전제: 저(클라우드 AI)는 NAS에 직접 접근할 수 없어, **GitHub 쪽 자동화는 제가 세팅 완료**했습니다.
> 아래는 NAS에서 **한 번만** 하는 등록 작업입니다. 이후엔 제가 GitHub에 푸시 → NAS 자동 반영.

두 가지 방법 중 **하나만** 고르세요.

---

## 방법 A — DSM 작업 스케줄러 (간단, 추천) ⭐

GitHub 토큰/러너 없이, NAS가 주기적으로 최신 코드를 받아 재배포합니다.

### 1) 코드를 git clone 으로 받기 (자동 업데이트하려면 zip 말고 clone 필요)
DSM → **터미널(SSH)** 또는 **Git** 이용:
```sh
cd /volume1/web/cwjung/logis
git clone https://github.com/miro375-alt/Delivery-journey.git logis-app
cd logis-app
cp .env.example .env        # 키 입력(File Station 텍스트편집기로 열어도 됨)
docker compose up -d --build
```
> 이미 푼 `logisnas` 폴더는 지우셔도 됩니다(아래부터는 `logis-app` 사용).

### 2) 작업 스케줄러 등록
DSM → **제어판 → 작업 스케줄러 → 생성 → 예약된 작업 → 사용자 정의 스크립트**
- 사용자: `root`
- 일정: 10분마다(또는 원하는 주기)
- 명령:
```sh
sh /volume1/web/cwjung/logis/logis-app/scripts/nas-update.sh
```
→ 끝. 이제 제가 푸시하면 10분 내 자동 반영됩니다.

---

## 방법 B — GitHub self-hosted 러너 (푸시 즉시 반영)

GitHub Actions가 NAS 러너에서 바로 재배포합니다(지연 없음).

### 1) 러너 등록 토큰 받기
GitHub 저장소 → **Settings → Actions → Runners → New self-hosted runner** → Linux 선택 → 표시되는 **토큰** 복사

### 2) NAS에 러너 컨테이너 실행 (Container Manager 또는 SSH)
```sh
docker run -d --restart always --name gh-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e REPO_URL="https://github.com/miro375-alt/Delivery-journey" \
  -e RUNNER_TOKEN="<위에서 복사한 토큰>" \
  -e LABELS="nas" \
  -e RUNNER_NAME="nas-runner" \
  myoung34/github-runner:latest
```
→ 등록되면, 제가 푸시할 때마다 `.github/workflows/deploy-nas.yml` 가 NAS에서 실행되어 자동 재배포됩니다.

> 도커 소켓 마운트가 필요합니다(컨테이너가 docker compose 실행). 보안상 신뢰된 사내 NAS에서만 사용.

---

## 어떤 걸 고를까?
- **방법 A**: 설정 쉬움, 10분 등 약간의 지연. 대부분 이걸로 충분.
- **방법 B**: 즉시 반영, 설정이 조금 더 복잡(토큰/러너).

설정 중 막히면 화면 캡처 주세요. 같이 풀어드립니다.
