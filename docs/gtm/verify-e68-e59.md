# E68 · E59 1차 출처 검증 (2026-10-24)

방법: BLS 페이지 WebFetch → XLSX 원본(`ai-exposure-categories.xlsx`, 95.8KB)을 `C:\Users\mrpar\repos\work\dl\`에 저장 후 `python -I`(표준 라이브러리 zipfile+xml, openpyxl 설치 불가로 미사용)로 집계. Challenger는 공식 PDF 본문(Table 4: JOB CUTS BY REASON)을 zlib 스트림 추출로 직접 확인하고 블로그 글과 교차 확인.

## Task 1 — BLS AI exposure categories (E68)

| 항목 | 값 | 상태 | 출처 (제목) | URL | 연도 |
|---|---|---|---|---|---|
| 분류 체계 | **4단계**: Low / Moderate / High / Very high (five-level "very low~very high"가 아님) | CORRECTED | Artificial Intelligence (AI) exposure categories, BLS | https://www.bls.gov/emp/publications/ai-exposure-categories.htm | 2026 (페이지 최종수정 2026-08-27) |
| 대상 직업 수 | 831개 세부 직업 (Very high 206 · High 206 · Moderate 206 · Low 213) | PASS (206 확인) | AI exposure categories and 2025–35 employment projections (XLSX) | https://www.bls.gov/emp/ind-occ-matrix/ai-exposure-categories.xlsx | 2026 |
| (a) Very high 2025 고용 합계 | **53,209.2천 명 (약 5,321만 명)**, 206개 직업, 전체 831개 합계 170,267.2천 명의 31.3% | PASS (직접 계산) | 상동 XLSX | 상동 | 2025 기준 |
| (b) High 2025 고용 합계 | **42,142.0천 명 (약 4,214만 명)**, 206개 직업, 24.8% | PASS (직접 계산) | 상동 XLSX | 상동 | 2025 기준 |
| 참고: Moderate / Low | 44,651.3천 명 / 30,264.7천 명 | PASS (직접 계산) | 상동 XLSX | 상동 | 2025 기준 |
| 분류 근거 | 외부 5개 소스 결합: Felten·Raj·Seamans / Eloundou·Manning·Mishkin·Rock / Eisfeldt·Schubert·Taska·Zhang / Massenkoff·McCrory (Anthropic) / Tomlinson·Jaffe·Wang·Counts·Suri (Microsoft) | PASS | BLS AI exposure categories 페이지 | 상동 htm | 2026 |

주의: 고용 단위는 BLS 원표 그대로 "천 명(thousands)". Very high+High 합계 = 95,351.2천 명(56.0%).

### Very high 노출 상위 15개 직업 (2025 고용 기준)

| # | 직업 (BLS 명칭) | SOC | 2025 고용 (천 명) | 2025–35 변화율 (%) | 2025 중위 연봉 ($) |
|---|---|---|---|---|---|
| 1 | Retail salespersons | 41-2031 | 3,998.1 | -0.3 | 35,410 |
| 2 | Customer service representatives | 43-4051 | 2,666.0 | -5.3 | 44,770 |
| 3 | Office clerks, general | 43-9061 | 2,600.0 | -6.0 | 45,010 |
| 4 | Secretaries and administrative assistants, except legal, medical, and executive | 43-6014 | 1,889.8 | -6.0 | 47,540 |
| 5 | Software developers | 15-1252 | 1,717.8 | +10.2 | 135,980 |
| 6 | Accountants and auditors | 13-2011 | 1,595.2 | +5.0 | 83,680 |
| 7 | Bookkeeping, accounting, and auditing clerks | 43-3031 | 1,532.4 | -5.6 | 50,670 |
| 8 | First-line supervisors of office and administrative support workers | 43-1011 | 1,506.1 | +0.1 | 69,500 |
| 9 | Sales representatives, wholesale and manufacturing, except technical and scientific products | 41-4012 | 1,279.4 | -0.9 | 72,080 |
| 10 | Sales representatives of services, except advertising, insurance, financial services, and travel | 41-3091 | 1,272.7 | +2.7 | 69,990 |
| 11 | Business operations specialists, all other | 13-1199 | 1,157.6 | +3.9 | 83,050 |
| 12 | Project management specialists | 13-1082 | 1,094.3 | +6.7 | 102,320 |
| 13 | Management analysts | 13-1111 | 1,077.1 | +10.1 | 101,860 |
| 14 | Medical secretaries and administrative assistants | 43-6013 | 979.0 | +4.8 | 45,930 |
| 15 | Market research analysts and marketing specialists | 13-1161 | 952.7 | +7.0 | 78,760 |

출처: BLS, "AI exposure categories and 2025–35 employment projections" (XLSX), https://www.bls.gov/emp/ind-occ-matrix/ai-exposure-categories.xlsx. 상위 15개 중 8개는 감소, 7개는 증가 전망 — 노출 ≠ 감소를 데이터 자체가 보여줌.

### BLS 주의문 (원문 그대로)

출처: https://www.bls.gov/emp/publications/ai-exposure-categories.htm

> "An exposure category is not a forecast of employment growth or decline."
>
> "“High” or “Very high” relative AI exposure does not necessarily mean employment will decline."
>
> "Exposure signifies that AI technology could be or has been used to assist or complete some of the work performed in an occupation. Exposure does not imply job loss, productivity gains, automation probability, or wage effects."

(세 번째 문장은 XLSX 'Field Descriptions' 시트와 데이터 시트 Note에도 동일하게 수록.)

## Task 2 — Challenger, Gray & Christmas AI 사유 감원 (E59)

| 항목 | 값 | 상태 | 출처 (제목 · 월) | URL | 연도 |
|---|---|---|---|---|---|
| (a) 2025년 연간 AI 사유 감원 | **54,836명** (2025 총 감원 1,206,374명의 4.5%; 12월 단월 142명; 2023년 집계 시작 이후 누적 71,825명) | PASS | Challenger, Gray & Christmas, Inc. Job Cut Announcement Report · December 2025 (Table 4: JOB CUTS BY REASON) | https://www.challengergray.com/wp-content/uploads/2026/01/Challenger-Report-December-2025.pdf | 2026-01-08 발표 |
| (a) 교차 확인 | "So far this year, AI has been responsible for 54,836 announced layoff plans." | PASS | 2025 Year-End Challenger Report: Highest Q4 Layoffs Since 2008; Lowest YTD Hiring Since 2010 | https://www.challengergray.com/blog/2025-year-end-challenger-report-highest-q4-layoffs-since-2008-lowest-ytd-hiring-since-2010/ | 2026-01-08 |
| (b) 2026 YTD AI 사유 감원 — 기존 수치 | 87,714명 **through May 2026** (5월 단월 38,579명, 사유 1위; YTD 총 감원 397,755명) | PASS (5월 기준으로는 정확) | Challenger Job Cut Announcement Report · May 2026 (Table 4) / 블로그 "Challenger Report: May Job Cuts Rise 16% from April; Highest May Total Since 2020" | https://www.challengergray.com/wp-content/uploads/2026/06/Challenger-Report-May-2026.pdf · https://www.challengergray.com/blog/challenger-report-may-job-cuts-rise-16-from-april-highest-may-total-since-2020/ | 2026-06-04 |
| (b) 2026 YTD AI 사유 감원 — 최신 | **120,136명 through September 2026** (9월 단월 3,961명, 사유 5위; YTD 총 감원 573,195명의 약 21%, YTD 사유 1위) | CORRECTED (최신 월로 갱신) | Challenger Report · September 2026 (Table 4: JOB CUTS BY REASON, p.8) / 블로그 "Job Cuts Fall in September; Hiring Plans Up 3% Over 2025 On Weak Early Seasonal Hiring" | https://www.challengergray.com/wp-content/uploads/2026/10/Challenger-Report-September-2026.pdf · https://www.challengergray.com/blog/job-cuts-fall-in-september-hiring-plans-up-3-over-2025-on-weak-early-seasonal-hiring/ | 2026-10-01 |
| (c) AI 사유 카테고리 공식 표기 | 표(Table 4) 라벨: **"Artificial Intelligence"**; 본문 표기: "Artificial Intelligence (AI)". 별도 카테고리 **"Technological Update (possibly AI)"** 가 존재(2025년 20,219명)하며 AI 수치에 **포함되지 않음** | PASS | December 2025 PDF Table 4 · September 2026 PDF Table 4 | 위 PDF URL | 2026 |

월별 AI 사유 흐름(블로그·PDF 기준): 5월 38,579(추적 시작 이후 최고) → 7월 10,970 → 8월 3,462 → 9월 3,961. 3~7월 5개월 연속 월간 사유 1위, 8월부터 순위 하락. 10월 보고서(2026-11 초 발표 예정)는 아직 없음.

## 요약
- E68: "5단계(very low~very high)" 표기는 오류 → BLS 공식은 **4단계(Low/Moderate/High/Very high)**, Very high 206개 직업은 정확. 신규 계산값: Very high 2025 고용 **5,320.9만 명**, High **4,214.2만 명**(각 전체 831개 직업의 31.3%·24.8%); BLS 원문 주의문 3문장 확보 → 라벨 **verified** (BLS 원데이터 직접 집계).
- E59: 2025 연간 **54,836명 PASS**(PDF Table 4 + 블로그 이중 확인); 2026 YTD 87,714명은 "through May"로 정확하나 최신은 **120,136명 through September 2026**(2026-10-01 발표)로 갱신 필요; 공식 라벨은 "Artificial Intelligence"(별도 "Technological Update (possibly AI)" 20,219명은 미포함) → 라벨 **verified** (Challenger 1차 출처).
- 변경 사항: E68은 카테고리 명칭 수정 + 고용 합계·상위 15개 표 신규 추가, E59는 YTD 수치·기준월을 9월(120,136)로 교체하고 "AI 사유 = 고용주가 명시적으로 AI를 언급한 경우만" 주석을 추가할 것.
