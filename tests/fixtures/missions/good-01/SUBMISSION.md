# SUBMISSION — 2026-10-24 [SIMULATION]

검사자: Sales(태진)
확정: PM(우영)
시각: 15:52
소스 커밋: 3f9c2ab
배포 버전: 3f9c2ab (15:30 배포)
발표 파일 sha256: d455eaf7652aad5bad18fbf9db028475b9a0c88b585e6a8fd64fb5e9f1cdbd67

> [SIMULATION] 제출이 끝난 뒤의 영수증이다 (「제출」 채워짐). 제출 직전 상태는 테스트가 이 파일을 변이해 만든다.

## 체크

| # | 확인 | 결과 | 증거 | 검사자 | 시각 |
|---|---|---|---|---|---|
| 1 | 데모 URL 접근 | PASS | 다른 기기 브라우저로 배포 URL 열림 · 첫 화면 표시 | Sales(태진) | 15:40 |
| 2 | 핵심 행동 실행 (SMOKE 3/3) | PASS | 배포 URL /tests/ 3/3 PASS · node --test app/tests 통과 | Sales(태진) | 15:41 |
| 3 | 2장 파일 (페이지 ≤ 2) | PASS | pitch/slides.pdf 2쪽 · PITCH에 Slide 3 없음 | PM(우영) | 15:42 |
| 4 | 개인정보 0 | PASS | pii_scan SUMMARY hits=0 · 슬라이드 텍스트 검색 0건 | Build(준서) | 15:43 |
| 5 | 라벨·시뮬레이션 표기 | PASS | validate --stage pitch C-T2·C-T5 PASS · X-1 PASS | PM(우영) | 15:44 |
| 6 | 심사기준 매핑 | PASS | 매핑 3행 = MISSION 심사기준 3개 | PM(우영) | 15:45 |
| 7 | 제출 양식 필드 | PASS | 팀명·데모 링크·파일·설명(사전 준비물 줄 포함) 준비 | Build(준서) | 15:46 |
| 8 | 복구 경로 | PASS | RECOVERY 마지막 정상 커밋 3f9c2ab · 재배포 실측 1회 | Sales(태진) | 15:47 |
| 9 | 해시·커밋 | PASS | 소스 커밋·배포 버전·발표 파일 sha256 일치 · CI check 링크 기록 | Sales(태진) | 15:48 |
| 10 | 시각·슬롯 | PASS | 창구 열림 · 슬롯 14:00 행 기록 · 16:50 이전 | Build(준서) | 15:49 |

## 산출물

| 종류 | 파일/링크 | 버전 | 크기 | sha256 |
|---|---|---|---|---|
| 소스 커밋 | main | 3f9c2ab | 커밋 | 커밋 3f9c2ab |
| 배포 URL | https://hthn-sim.invalid/ | 3f9c2ab | URL | 커밋 3f9c2ab |
| 발표 파일 | pitch/slides.pdf | v3 | 1003 | d455eaf7652aad5bad18fbf9db028475b9a0c88b585e6a8fd64fb5e9f1cdbd67 |

## 테스트

| 회차 | 시각 | 통과 단계 | 실패 | 조치 |
|---|---|---|---|---|
| 1 | 14:10 | 3/3 (배포 URL · 브라우저) | 0 | 없음 |
| precheck | 14:50 | 체크 PASS 9/9 | 없음 | 없음 |
| 2 | 15:35 | 3/3 (배포 URL · 브라우저) | 0 | 없음 |

## 알려진 결함

- (없음) — 체크 외 관찰: 재료가 2개 이하이면 추천이 한 가지로 고정된다

## 판정

approve

## 제출

- 담당: PM
- 시각: 15:55 [SIMULATION]
- 접수 확인: [SIMULATION] 리허설 접수 화면 스크린샷 (실제 제출 아님)
- 타임아웃 시: 재전송 금지, 접수 상태 확인
