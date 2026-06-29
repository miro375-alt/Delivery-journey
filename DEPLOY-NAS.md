# 🖥️ NAS 배포 가이드 (풀스택: 프론트 + 동기화 + 배송조회)

구성: NAS 한 대가 **정적 프론트 서빙 + 데이터 동기화(cron 대체) + 배송조회 API**를 모두 담당.
키(카페24/인스타/스마트택배)와 고객 개인정보가 **NAS 밖으로 나가지 않습니다.**

> ⚠️ 이 저장소가 도는 클라우드 환경에서는 사내 NAS(`smb://...local`)에 직접 접근할 수 없어,
> 아래 단계는 **NAS 관리자(사장님/담당자)가 직접** 수행해야 합니다. 코드는 모두 준비돼 있습니다.

---

## 0. 준비물
- 코드: 이 저장소 (GitHub에서 NAS로 가져오기)
- `.env`: `.env.example` 복사 후 키 입력 (절대 git 커밋 금지 — `.gitignore` 처리됨)
- NAS: Docker(시놀로지 **Container Manager**/QNAP **Container Station**) 권장

---

## 1. 코드 가져오기 (택1)
- **A. SMB 복사**: 공유폴더(`www/cwjung/logis`)에 저장소 파일 전체 복사
- **B. Git**: NAS에서 `git clone <repo> /volume1/web/logis` 후 갱신 시 `git pull`
- **C. (추천) 자동배포**: NAS에 **GitHub self-hosted runner** 설치 → 푸시 시 NAS가 자동으로 pull/재시작
  (러너가 NAS에서 돌기 때문에 LAN 안에서 처리됨)

## 2. 키 설정
```bash
cp .env.example .env
# .env 편집 → 카페24/인스타/스마트택배 키 입력
```

## 3. 실행 (Docker 권장)
```bash
docker compose up -d --build
# 컨테이너 로그 확인
docker logs -f logis
```
- 기동 시 1회 + 이후 6시간마다 카페24/인스타 동기화 → `data/*.json` 생성
- `http://NAS_IP:8080` 으로 접속 확인 (`/healthz` → {"ok":true})

> Docker 없이 실행: `node server/server.js` (Node 18+ 필요, 무의존성이라 npm install 불필요)
> 정적만 Web Station으로 서빙해도 되지만, **배송조회 API/키 보관 때문에 Docker 권장.**

## 4. 외부 공개 (고객 접속) 🔐
1. **도메인 연결**: 시놀로지 DDNS(`xxx.synology.me`) 또는 보유 도메인
2. **리버스 프록시**: DSM → 제어판 → 로그인 포털 → 고급 → 리버스 프록시
   - 소스: `https://track.회사도메인` (443)
   - 대상: `http://localhost:8080`
3. **HTTPS 인증서**: Let's Encrypt 자동 발급(DSM 기본 지원) → 소스 도메인에 적용
4. 공유기/방화벽: 80·443만 NAS로 포워딩 (8080은 외부 직접 노출 금지)

## 5. 보안 체크 ✅
- `.env`(키)는 **NAS 안에만**, git/외부로 절대 반출 금지
- 배송조회 응답은 서버에서 **이름/주소/전화 마스킹** 후 전달 (server.js `mask*`)
- 8080 직접 노출 금지 — 반드시 리버스 프록시(HTTPS) 경유
- 카페24 `refresh_token`은 2주 회전/만료 → 갱신 운영 필요(자동갱신 단계 추후 추가)
- (권장) 리버스 프록시에 접근 제한/요청 수 제한으로 API 키 남용 방지

---

## 동작 요약
```
고객 ── https://track.회사도메인 ──▶ [NAS 리버스프록시(HTTPS)]
                                         └▶ [Docker: node server]
                                              ├ 정적 프론트(index/css/js/assets)
                                              ├ /api/track  → 스마트택배(키는 NAS 내부)
                                              └ 6h 동기화   → 카페24/인스타 → data/*.json
```
GitHub는 "소스 보관/배포 트리거" 용도로만 쓰고, **실데이터·키·개인정보는 전부 NAS**에 둡니다.
