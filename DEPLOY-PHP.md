# 🟢 PHP 배포 가이드 (회사 NAS · Web Station · 파일 업로드만으로 끝)

Docker/SSH 불필요. **사장님 웹폴더(`www/cwjung/logis`)에 파일만 올리면** 배송조회·동기화까지 동작합니다.

## 구조
```
index.html, css/, js/, data/, assets/   ← 정적(웹스테이션이 그대로 서빙)
lib.php                                  ← 공용 헬퍼
config.php                               ← 키 보관(직접 생성, git/외부 비공개)
api/track.php                            ← 배송조회(스마트택배, 마스킹)
cron/sync.php                            ← 카페24/인스타 동기화 → data/*.json
```

---

## 1. 파일 올리기
이 저장소 파일들을 `www/cwjung/logis/` 에 업로드(File Station 또는 SMB 복사).
> Web Station에서 이 폴더가 가상호스트/문서루트로 잡혀 있어야 합니다(이미 PHP 사이트가 도는 서버이므로 보통 OK).

## 2. 키 입력 (config.php 생성)
`config.sample.php` 를 복사해 **`config.php`** 로 만들고 값 입력:
- 지금은 `SMART_PARCEL_API_KEY`(배송조회), `SYNC_TOKEN`(임의 문자열)만 채워도 됨
- 카페24/인스타 키는 발급되면 추가
> `config.php` 는 키가 들어있으니 **절대 외부 공유 금지**(.gitignore 처리됨).

## 3. 확인
- 브라우저: `https://track.도메인/cwjung/logis/` (또는 해당 문서루트) → 화면 표시
- 배송조회: 송장번호 입력 → `api/track.php` 가 응답 (키 없으면 예시번호 목업으로 동작)

## 4. 동기화 자동화 (상품/인스타) — 택1
키 입력 후, 주기적으로 `cron/sync.php` 가 실행되면 `data/*.json` 이 갱신됩니다.

- **A. DSM 작업 스케줄러(관리자 가능 시)**: `php /volume1/web/cwjung/logis/cron/sync.php` 를 6시간마다
- **B. 외부 무료 cron(관리자 권한 없을 때)**: cron-job.org 등에서
  `https://track.도메인/cwjung/logis/cron/sync.php?token=<SYNC_TOKEN>` 을 6시간마다 호출
- **C. 수동**: 위 URL을 가끔 직접 열기

> 토큰(`SYNC_TOKEN`)이 있어야 웹 호출이 됩니다(무단 실행 방지).

---

## 업데이트 방법 (제가 개선분을 올리면)

### ⭐ 완전 자동 — 자가 업데이트(self-update) [권장, SSH/관리자 불필요]
NAS가 GitHub에서 최신 코드를 **스스로 받아** 갱신합니다. `config.php`(키)와 `data/*.json`은 보존됩니다.
- 한 번만 처음 업로드 + `config.php`의 `SYNC_TOKEN` 설정
- 그 다음, 아래 URL이 주기적으로 호출되게만 하면 됨(둘 중 하나):
  - **외부 무료 cron**(cron-job.org 등): `https://track.도메인/cwjung/logis/cron/selfupdate.php?token=<SYNC_TOKEN>` 를 예: 1시간마다
  - **DSM 작업 스케줄러**(관리자 가능 시): `php /volume1/web/cwjung/logis/cron/selfupdate.php`
- 그러면 제가 GitHub에 푸시한 개선이 **사장님이 NAS를 안 만져도** 자동 반영됩니다.
- ⚠️ 전제: NAS PHP에 `ZipArchive`, `curl` 확장 사용 가능(시놀로지 기본 PHP는 보통 OK).

### 수동
- 변경된 파일만 File Station으로 다시 업로드.
- git clone 받은 경우 `git pull` (config.php·data/*.json 유지 — gitignore).

## 보안 체크 ✅
- `config.php`(키)는 서버에만, 외부 공유 금지
- 배송조회 응답은 이름/주소/전화 **마스킹**되어 나감(lib.php)
- 실제 배송 개인정보를 `data/*.json` 으로 저장하지 않음(실시간 조회만)
- `cron/sync.php` 는 토큰 없으면 웹 실행 차단(403)

## 참고
- Node/Docker 버전(server/, Dockerfile, docker-compose.yml)은 **이 PHP 방식에서는 불필요**합니다(다른 환경용 대안으로만 보관).
