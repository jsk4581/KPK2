# Google Sheet 데이터 레이어 (Apps Script Web App)

원데이 해커톤 정적 웹 데모(`app/index.html`, `app/app.js`)를 위한 기본 백엔드 가이드입니다. 별도 서버 없이 Google Sheet와 Apps Script만으로 JSON 조회(`GET`) 및 행 추가(`POST`) API를 구성합니다.

## 1. 데이터 보안 및 Synthetic 전용 규칙 (필수)

- **모든 샘플 및 테스트 데이터는 반드시 `label: "synthetic"` 표기를 포함해야 합니다.**
- **실제 개인정보(실명, 이메일, 전화번호, 계정 정보 등)는 절대 입력하거나 저장하지 마세요.**
- 웹 앱 배포 시 실행 주체를 **'나(Me)'**, 액세스 권한을 **'모든 사용자(Anyone)'**로 설정하므로 배포된 URL은 인증 없이 누구나 호출할 수 있는 **완전 공개(Public) 엔드포인트**가 됩니다.

## 2. 5분 세팅 가이드

1. **새 Sheet 생성**: Google 스프레드시트에서 새 문서를 만듭니다.
2. **Apps Script 열기**: 상단 메뉴에서 **확장 프로그램 → Apps Script**를 클릭합니다.
3. **코드 붙여넣기**: 기본 편집기 내용을 지우고 이 폴더의 `Code.gs` 전체 코드를 붙여넣은 뒤 저장(`Ctrl+S` / `Cmd+S`)합니다.
4. **초기 데이터 시딩 (1회)**: 상단 함수 선택 드롭다운에서 `seedSyntheticSheet`를 선택하고 **실행(Run)** 버튼을 누릅니다. (권한 검토 팝업 시 승인 진행 → `'demo'` 시트와 5개의 가상 데이터가 자동 생성됨)
5. **웹 앱 배포**: 우측 상단 **배포 → 새 배포** 클릭 → 유형 선택(톱니바퀴)에서 **웹 앱** 선택:
   - 다음 사용자로 실행: **나 (Me)**
   - 액세스 권한이 있는 사용자: **모든 사용자 (Anyone)**
   - **배포** 클릭
6. **URL 연결**: 생성된 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec`)을 복사하여 `app/config.js`의 `SHEET_API_URL` 값에 붙여넣습니다.

## 3. `curl` 테스트 예시 (Synthetic Data)

Apps Script 웹 앱은 응답 시 리다이렉트(`302`)를 수행하므로 `curl` 호출 시 반드시 `-L` 옵션을 포함해야 합니다.

### GET: 시트 데이터 조회 (`?sheet=demo&limit=3`)

```bash
curl -sL "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?sheet=demo&limit=3"
```

### POST: 새 Synthetic 행 추가 (최대 10KB)

```bash
curl -sL -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?sheet=demo" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{
    "id": "syn-006",
    "user": "agent_foxtrot",
    "goal": "Test POST endpoint with synthetic payload",
    "status": "todo",
    "updated_at": "2026-10-20T10:30:00Z",
    "label": "synthetic"
  }'
```
> 응답 예시: `{"ok":true,"row":7}`

## 4. 기술적 한계 및 주의사항

- **응답 지연**: 요청당 평균 **~1초 내외의 지연(Latency)** 및 콜드 스타트 시간이 발생합니다.
- **일일 할당량(Quota)**: Google 계정의 일일 Apps Script 호출 횟수 및 동시 실행 제한이 적용됩니다.
- **인증 없음 & 공개 URL 주의**: 별도 API 키나 토큰 검증이 없으므로 URL이 외부 공개 저장소에 노출되지 않도록 주의하고, 오직 가상(`synthetic`) 데이터만 다루어야 합니다.
- **페이로드 제한**: `doPost`는 10KB를 초과하는 본문 요청을 거부합니다.

## 5. Firebase 전환 조건

다음 요구사항이 발생하는 시점에는 Google Sheet 백엔드에서 **Firebase (Auth + Firestore/Realtime DB)**로 전환하세요:

- **사용자 로그인 및 권한 제어**: 개별 유저 인증(OAuth/이메일)과 본인 데이터만 수정하는 보안 규칙이 필요할 때
- **실시간 동기화**: 새로고침 없이 다중 클라이언트 간 즉각적인 상태 반영(WebSocket/Snapshot 리스너)이 필요할 때
- **빈번한 동시 쓰기**: 여러 사용자가 동시에 데이터를 수정하여 시트 행 잠금(Lock)이나 덮어쓰기 충돌이 발생할 때
