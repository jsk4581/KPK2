# PRD — 2026-10-20 [SIMULATION] 골격 예시
버전: v1 (22:40)

<!-- [SIMULATION] 행사 전 골격 앱(app/)이 하는 일을 6문장 PRD 형식으로 적은 예시다. 실제 미션의 PRD가 아니다.
app/SMOKE.md 2단계에 3번 빈칸 텍스트가, 「완료 조건」에 6번 빈칸 텍스트가 글자 그대로 들어 있어야 한다 (X-2·X-4).
app/tests/logic.test.mjs가 이 파일을 v1.1 문장 프레임(fullmatch)으로 읽어 그 규칙을 확인한다.
당일에는 이 파일을 고치지 않는다 — 진짜 PRD는 mission/PRD.md이고, 그 파일이 생기면 검증기와 logic.test.mjs 모두 X-2·X-4를 mission/PRD.md로 본다. -->

1. 사용자는 해커톤 데모를 처음 여는 심사위원 한 명입니다.
2. 이 사람은 데모가 무엇을 하는지 10초 안에 알 수 없기 때문에 불편합니다.
3. 이 도구의 핵심 행동은 한 줄 입력으로 다음 행동 고르기 하나입니다.
4. 한 줄 문장을 넣으면 다음 행동 한 줄을 보여줍니다.
5. 오늘은 로그인, 데이터 저장, 실제 AI 호출을 하지 않습니다.
6. 입력한 문장과 다음 행동 한 줄을 출력 패널에 표시하면 완료입니다.

## C·U·T

Clear: PASS — 화면 첫 줄과 버튼 이름만으로 입력→출력이 보인다 [SIMULATION]
Usable: PASS — 입력칸·출력 패널·데이터 표시기가 한 화면에 있다 [SIMULATION]
Tiny: PASS — 순수 함수 하나(decideNextAction)로 끝난다 [SIMULATION]
