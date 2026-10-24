#!/usr/bin/env python3
"""Validate mission/ artifacts against the HTHn artifact contract
(HTHN_v1.0_PLAN section 4 as amended by HTHN_v1.1_AMENDMENT section B).

Usage:
    python3 scripts/validate_mission.py <mission_dir>
        [--stage intake|decide|board|evidence|pitch|submit|demoday|all]

Output: one line per rule "PASS|FAIL|WARN <stage> <rule-id> <message>", then
"SUMMARY pass=<n> fail=<n> warn=<n>". Exit code 1 if any rule fails, else 0. WARN never fails
the run: it names something a human must look at (a pending human value, an advisory cross check).

Stage -> files (v1.1 B0):
    intake    MISSION.md (C-M1..C-M3; the ## 후보 table may have 0 rows)
    decide    MISSION.md again (every intake rule, because options mode edits it) + C-M4 (3 candidates)
              + DECISION.md + PRD.md
    board     mission/BOARD.md (the only canonical board; there is no root BOARD.md)
    evidence  EVIDENCE.md (the simulation table may have 0 rows)
    board     also X-6 (WARN only): HANDOFF 「체크포인트」 T<n> statuses vs BOARD 「작업」 statuses
    pitch     PITCH.md + X-1 when EVIDENCE.md exists (labels must match before G5, not only at submit)
    submit    every earlier stage again + SUBMISSION.md + X-1..X-5 + DEMODAY.md when present
    demoday   DEMODAY.md
    all       same as submit

Rule-id prefixes (v1.1 B1):
    S-  structure (title, H2 headings, table columns, sentence lines)
    C-  content   (frames, enums, empty values)
    X-  cross-file rules (submit stage; X-1 also at pitch, X-6 at board)
When a file has an S- failure, its C- and X- results are still reported but marked
"[구조 실패로 신뢰 불가]".

Markdown rules (v1.1 B1): required H2s must appear in order (trimmed, exact); extra H2s are
allowed; a duplicated required H2 is S-dup-heading. In MISSION.md every line between "## 원문" and
"## 사실" is the organizer text, so H2 lines inside it are content, not headings. Tables are GFM (separator row required),
header cells must match exactly after trimming, "\\|" inside a cell is an escaped pipe. Any line
or table row containing "[예시]" is a template example and is skipped. An empty value is a blank
cell or one matching ^<.*>$, ______, TBD or [예시]. A template slot is any <...> that is not a real
inline HTML tag (br, b, i, sub, sup, code, kbd, a, ...) or an autolink, so <n>, <HHMM> and E<n> are
slots. The [SIMULATION] check is a substring match.

Standard library only. Python 3.9+.
"""

import argparse
import os
import re
import sys
import zipfile
from typing import Dict, List, Optional, Set, Tuple

Result = Tuple[str, str, str, str]  # (status, stage, rule_id, message)

STAGES = ["intake", "decide", "board", "evidence", "pitch", "submit"]
CLI_STAGES = STAGES + ["demoday", "all"]

UNRELIABLE = " [구조 실패로 신뢰 불가]"
EXAMPLE_MARK = "[예시]"
SIM_MARK = "[SIMULATION"

LABELS = ("verified", "single-source", "hypothesis", "simulation")
LABEL_RE = re.compile(r"(?<![A-Za-z-])(verified|single-source|hypothesis|simulation)(?![A-Za-z-])")
PRODUCT_SPEC = "(제품 사양)"
# A value a human still has to measure or export (AI-only runs never fake it): WARN before submit.
PENDING_RE = re.compile(r"사람\s*(기입|측정)\s*대기")
# Words that say the slide file was never exported or measured.
NOT_EXPORTED_RE = re.compile(r"계획|미측정|미기록|미내보냄|미정")
# Receipt rows that could not exist in a rehearsal carry this marker and stay NOT_RUN (never PASS).
SUBSTITUTE_MARK = "[SIMULATION 대체]"

# Required H2 headings, in order (v1.0 section 4 + v1.1 B2).
HEADINGS = {
    "MISSION": ["원문", "사실", "해석", "미확인", "심사기준", "금지사항 · 도구 규칙", "제출물", "후보"],
    "DECISION": ["선택", "점수", "기각", "시장 주장", "수용 리스크", "결정"],
    "PRD": ["C·U·T"],
    "BOARD": ["게이트", "작업", "파일 소유", "예산", "슬롯"],
    "EVIDENCE": ["주장", "Buyer simulation [SIMULATION — 실제 고객 아님]"],
    "PITCH": ["Slide 1", "Slide 2", "스크립트 (90초)", "심사기준 매핑", "라벨 점검", "반론과 수정", "제출 파일"],
    "SUBMISSION": ["체크", "산출물", "테스트", "알려진 결함", "판정", "제출"],
    "DEMODAY": ["타임라인 (10분)", "데모 경로", "예상 질문 10", "복구", "리허설 기록"],
}

CANDIDATE_IDS = ("A", "B", "C")
CANDIDATE_COLUMNS = ["#", "고객", "문제", "구매 이유", "8h 데모 장면", "라운드"]
SCORE_COLUMNS = ["후보", "Mission Fit", "8h 데모 가능성", "구매 이유", "근거", "합계"]
REJECT_COLUMNS = ["후보", "이유"]
# Extra 기각 rows for a rejected reading of the mission (not a candidate): "해석: <읽기>".
INTERPRETATION_REJECT = "해석:"

# PRD six sentences, matched with fullmatch after strip (v1.1 B2).
PRD_FRAMES = [
    re.compile(r"1\. 사용자는 (.+) 한 명입니다\."),
    re.compile(r"2\. 이 사람은 (.+) 때문에 불편합니다\."),
    re.compile(r"3\. 이 도구의 핵심 행동은 (.+) 하나입니다\."),
    re.compile(r"4\. (.+?)(을|를) 넣으면 (.+?)(을|를|이|가) (보여줍니다|보여 줍니다|표시합니다)\."),
    re.compile(r"5\. 오늘은 ([^,，]+), ([^,，]+), ([^,，]+)(을|를) 하지 않습니다\."),
    re.compile(r"6\. (.+)하면 완료입니다\."),
]
# Capture groups that hold content (the others are particles / verb forms).
PRD_CONTENT_GROUPS = {1: (1,), 2: (1,), 3: (1,), 4: (1, 3), 5: (1, 2, 3), 6: (1,)}
PRD_VERSION_RE = re.compile(r"버전:\s*v(\d+)\s*\(\s*\d{1,2}:\d{2}\s*\)")
CUT_RE = re.compile(r"(Clear|Usable|Tiny):\s*(\S+)\s*(?:[—–-]\s*(.*))?")

GATE_COLUMNS = ["게이트", "시각", "확인", "상태"]
GATES = ("G1", "G2", "G3", "G4", "G5", "G6")
GATE_STATES = ("todo", "doing", "done", "blocked")
G6_STATES = ("ready", "approved", "submitted")
TASK_COLUMNS = ["#", "작업", "담당", "소유 파일", "마감", "게이트", "의존", "상태"]
OWNERSHIP_COLUMNS = ["파일", "소유", "쓰기 규칙"]
OWNERSHIP_ROWS = (
    "mission/MISSION.md", "mission/DECISION.md", "mission/PRD.md", "mission/BOARD.md",
    "mission/EVIDENCE.md#주장", "mission/EVIDENCE.md#Buyer simulation", "mission/PITCH.md",
    "mission/SUBMISSION.md", "app/", "HANDOFF.md#제안",
)
WRITE_RULES = ("소유자만", "append-only")
BUDGET_COLUMNS = ["사람", "세션 수", "모델", "잔여 중단선", "시간 상한"]
SLOT_COLUMNS = ["시각", "남은 슬롯", "출처"]
SLOT_TIME_RE = re.compile(r"(\d{1,2}):(\d{2})")
SLOT_MAX = 8  # first-round pass slots (official: 8 teams)
SLOT_UNOBSERVED = "미관측"
CHECKPOINT_STATUS_RE = re.compile(r"(?<![A-Za-z0-9])(T\d+)\s+(todo|doing|done|blocked)(?![A-Za-z])")

CLAIM_COLUMNS = ["ID", "주장", "출처", "연도", "지역·단위", "라벨", "신뢰", "쓰이는 곳"]
SIM_HEADING = "Buyer simulation [SIMULATION — 실제 고객 아님]"
SIM_NOTICE = "> 구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지"
SIM_COLUMNS = ["ID", "페르소나", "시도", "결과", "반론", "지불 조건", "라벨"]
CLAIM_ID_RE = re.compile(r"E\d+")
SIM_ID_RE = re.compile(r"S\d+")
TASK_ID_RE = re.compile(r"T\d+")
# A verified source must be a real, dated source; these markers mean it is not.
NOT_A_SOURCE_RE = re.compile(r"\[SIMULATION|가상|시뮬레이션|추론|없음")

MAPPING_COLUMNS = ["심사기준", "어디서 다루나"]
LABEL_CHECK_COLUMNS = ["주장 ID", "슬라이드", "라벨"]
# Any slide-like H2 ("## Slide 3", "## slide 3", "## 슬라이드 3", bare "## Slide") other than the two
# required headings fails C-T1. "Slides"/"슬라이드별" style words are not slide headings.
SLIDE_HEADING_RE = re.compile(r"(?i)^##\s+(?:slide|슬라이드)(?![A-Za-z가-힣])")
ALLOWED_SLIDE_HEADINGS = ("## Slide 1", "## Slide 2")
# Market / result numbers: a unit next to a number (v1.1 B2 C-T2). Time and count units are included,
# because a before/after claim ("절감 11분") is exactly the claim that needs a label.
NUMBER_RE = re.compile(r"\d[\d,.]*\s*(%|원|달러|억|만|천|배|명|건|분|시간|초|곳|개|팀|종|MAU|DAU)"
                       r"|\$\s*\d|(MAU|DAU)\s*\d")
# Traction vocabulary (v1.1 B2 C-T5), shared with DEMODAY C-Y3 (one list, roles/gtm-pitch.md).
TRACTION_RE = re.compile(r"계약|인터뷰|실사용자|매출|파일럿|MOU|결제|구매\s*의향|지불|고객\s*\d+")
# Inline claim reference on a slide line: "(E3 · simulation)".
CLAIM_TAG_RE = re.compile(r"\(\s*(E\d+)\s*[·,/]\s*(verified|single-source|hypothesis|simulation)\s*\)")
READ_TIME_RE = re.compile(r"낭독:\s*(\d+)\s*초")
READ_MEASURED_RE = re.compile(r"\(\s*측정\s+\d{1,2}:\d{2}[^)]*\)")
READ_ESTIMATE = "(추정)"
SCRIPT_WORD_LIMIT = 220        # contract C-T3 (HTHN_v1.0_PLAN section 4)
SCRIPT_WORD_TARGET_KO = 150    # Korean read-aloud: about 130-150 어절 fit 90 s; above it is a WARN
READ_SECONDS_LIMIT = 95
PITCH_VERSION_RE = re.compile(r"·\s*v(\d)")
OBJECTION_ROLES = ("pm", "build", "gtm-pitch", "sales-buyer")
OBJECTION_COLUMNS = ["역할", "반론", "수정"]
SLIDE_FILE_RE = re.compile(r"pitch/slides\.(pdf|pptx)")

SUBMISSION_HEADER_KEYS = ["검사자", "확정", "시각", "소스 커밋", "배포 버전", "발표 파일 sha256"]
CHECK_COLUMNS = ["#", "확인", "결과", "증거", "검사자", "시각"]
# The ten submit-gate checks; the 확인 cell must equal these strings (C-S1).
CHECK_ITEMS = [
    "데모 URL 접근", "핵심 행동 실행 (SMOKE 3/3)", "2장 파일 (페이지 ≤ 2)", "개인정보 0",
    "라벨·시뮬레이션 표기", "심사기준 매핑", "제출 양식 필드", "복구 경로", "해시·커밋", "시각·슬롯",
]
CHECK_RESULTS = ("PASS", "FAIL", "NOT_RUN")
NON_WAIVABLE = (1, 3, 4, 5, 10)  # F1-F5: never waived (C-S2)
VERDICT_RE = re.compile(r"(approve-with-defects|approve|revise|fail)(?![A-Za-z-])")
APPROVING = ("approve", "approve-with-defects")
ARTIFACT_COLUMNS = ["종류", "파일/링크", "버전", "크기", "sha256"]
ARTIFACT_KINDS = ("소스 커밋", "배포 URL", "발표 파일")
COMMIT_REF_RE = re.compile(r"커밋 [0-9a-f]{7,40}")
SHA256_RE = re.compile(r"[0-9a-f]{64}")
# Without git: the sha256 of the app/ content manifest (submit-gate SKILL "no git"), marked as such.
NOGIT_REF_RE = re.compile(r"내용 sha256 [0-9a-f]{64} \(no git\)")
TEST_TARGETS = ("배포 URL", "로컬", "fallback")
TEST_COLUMNS = ["회차", "시각", "통과 단계", "실패", "조치"]
SUBMIT_TIMEOUT_TEXT = "재전송 금지, 접수 상태 확인"

QUESTION_COLUMNS = ["질문", "답", "라벨"]
REHEARSAL_COLUMNS = ["회차", "낭독 시간(초)", "메모"]
DEMODAY_TRACTION_RE = TRACTION_RE

# X-5 inspector rows -> BOARD 파일 소유 rows the inspector must not own.
X5_OWNER_ROWS = {
    1: ("app/",), 2: ("app/",), 8: ("app/",), 9: ("app/",),
    3: ("mission/PITCH.md",), 6: ("mission/PITCH.md",),
    5: ("mission/PITCH.md", "mission/EVIDENCE.md#Buyer simulation"),
}

# Roles and given names map to one canonical role, so "Build" and "준서" are the same person (X-5).
ROLE_ALIASES = {
    "pm": "pm", "우영": "pm",
    "build": "build", "빌드": "build", "준서": "build",
    "gtm": "gtm-pitch", "gtm-pitch": "gtm-pitch", "피치": "gtm-pitch", "곤살로": "gtm-pitch",
    "sales": "sales-buyer", "sales-buyer": "sales-buyer", "구매자": "sales-buyer", "판매": "sales-buyer",
    "태진": "sales-buyer",
}

# Template slot like <이름>, <n>, <HHMM>, E<n>; only real inline HTML tags (<br>, <sup>...) and
# autolinks (<https://...>) are not slots.
PLACEHOLDER_RE = re.compile(r"<(?![\s!/])([^<>\n]{1,80}?)(?<!\s)>")
HTML_TAGS = ("br", "b", "i", "u", "s", "em", "strong", "sub", "sup", "code", "kbd", "a", "span", "small",
             "mark", "img", "details", "summary", "p", "div", "hr", "ul", "ol", "li")
HTML_TAG_RE = re.compile(r"^(/?(?:" + "|".join(HTML_TAGS) + r")(\s[^>]*)?/?|https?://\S+)$", re.I)
EMPTY_SEARCH_RE = re.compile(r"_{3,}|(?<![A-Za-z])TBD(?![A-Za-z])|\[예시\]")


# ---------------------------------------------------------------------------
# Markdown helpers
# ---------------------------------------------------------------------------

def norm_heading(line: str) -> str:
    return "## " + line[3:].strip()


def _clean_lines(text: str) -> List[str]:
    """Drop fenced code blocks and HTML comments; keep line structure otherwise."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    out = []
    in_fence = False
    for ln in text.splitlines():
        if ln.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            out.append(ln.rstrip("\r"))
    return out


# Sections pasted verbatim: (start heading, end heading). The organizer's own H2s stay content.
VERBATIM = {"MISSION": ("## 원문", "## 사실")}


class Doc:
    """Parsed markdown file: comment-free lines, H2 list and H2 sections."""

    def __init__(self, name: str, path: str, text: str):
        self.name = name
        self.path = path
        self.raw = text
        self.lines = _clean_lines(text)
        self.h2: List[str] = []
        self.preamble: List[str] = []
        self.sections: Dict[str, List[str]] = {}
        current: Optional[str] = None
        verbatim = VERBATIM.get(name)
        inside = False
        for ln in self.lines:
            if verbatim and ln.startswith("## "):
                head = norm_heading(ln)
                if head == verbatim[0]:
                    inside = True
                elif head == verbatim[1]:
                    inside = False
                elif inside:
                    self.sections[current].append(ln)  # an H2 inside the pasted organizer text
                    continue
            if ln.startswith("## "):
                self.h2.append(norm_heading(ln))
                current = norm_heading(ln)
                self.sections.setdefault(current, [])
            elif current is None:
                self.preamble.append(ln)
            else:
                self.sections[current].append(ln)

    def section(self, heading: str) -> Optional[List[str]]:
        return self.sections.get("## " + heading)


def is_example(line: str) -> bool:
    return EXAMPLE_MARK in line


def clean_cell(value: str) -> str:
    v = value.strip().strip("`").strip()
    return re.sub(r"^\*\*(.*)\*\*$", r"\1", v).strip()


def is_empty(value: str) -> bool:
    """Empty value (v1.1 B1): blank, ^<.*>$, ______, TBD or [예시]."""
    v = clean_cell(value)
    return not v or bool(re.fullmatch(r"<.*>", v)) or bool(EMPTY_SEARCH_RE.search(v))


def split_row(line: str) -> List[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", s)]


def is_separator(cells: List[str]) -> bool:
    return bool(cells) and all(re.fullmatch(r":?-+:?", c.replace(" ", "")) for c in cells)


class Table:
    def __init__(self, header: List[str], rows: List[List[str]]):
        self.header = header
        self.rows = rows

    def col(self, row: List[str], name: str) -> str:
        idx = self.header.index(name)
        return row[idx] if idx < len(row) else ""

    def cell(self, row: List[str], name: str) -> str:
        return clean_cell(self.col(row, name))


def find_tables(section: Optional[List[str]]) -> List[Table]:
    """GFM tables in a section; rows containing [예시] are skipped as template examples."""
    tables: List[Table] = []
    lines = section or []
    i = 0
    while i < len(lines):
        if not lines[i].strip().startswith("|"):
            i += 1
            continue
        block = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            block.append(lines[i])
            i += 1
        if len(block) >= 2 and is_separator(split_row(block[1])):
            header = split_row(block[0])
            rows = []
            for raw in block[2:]:
                if is_example(raw):
                    continue
                cells = split_row(raw)
                if all(c == "" for c in cells):
                    continue
                rows.append((cells + [""] * len(header))[:max(len(header), len(cells))])
            tables.append(Table(header, rows))
    return tables


def find_table(section: Optional[List[str]], columns: List[str]) -> Tuple[Optional[Table], str]:
    """The first table whose header equals columns exactly, or (None, reason)."""
    if section is None:
        return None, "섹션 없음"
    tables = find_tables(section)
    if not tables:
        return None, "표 없음 (열: " + "|".join(columns) + ")"
    for t in tables:
        if t.header == columns:
            return t, ""
    return None, "표 열 불일치: 기대 '" + "|".join(columns) + "' / 실제 '" + "|".join(tables[0].header) + "'"


def content_lines(section: Optional[List[str]], include_quotes: bool = False,
                  include_tables: bool = True) -> List[str]:
    """Non-blank, non-example lines of a section; table header/separator rows dropped."""
    out: List[str] = []
    lines = section or []
    for idx, ln in enumerate(lines):
        s = ln.strip()
        if not s or s.startswith("#") or is_example(s):
            continue
        if s.startswith(">") and not include_quotes:
            continue
        if s.startswith("|"):
            if not include_tables:
                continue
            cells = split_row(s)
            if is_separator(cells):
                continue
            nxt = lines[idx + 1].strip() if idx + 1 < len(lines) else ""
            if nxt.startswith("|") and is_separator(split_row(nxt)):
                continue  # header row
        out.append(s)
    return out


def strip_marker(line: str) -> str:
    s = re.sub(r"^>\s*", "", line.strip())
    s = re.sub(r"^([-*+]|\d+[.)])\s+", "", s)
    return s.strip()


def placeholders(text: str) -> List[str]:
    return [m.group(0) for m in PLACEHOLDER_RE.finditer(text) if not HTML_TAG_RE.match(m.group(1))]


def labels_in(text: str) -> List[str]:
    return sorted(set(LABEL_RE.findall(text)))


def as_int(value: str) -> Optional[int]:
    v = clean_cell(value)
    return int(v) if re.fullmatch(r"-?\d+", v) else None


def header_value(lines: List[str], key: str) -> Optional[str]:
    """Value of a 'key: value' line (tolerates list/quote markers and bold keys)."""
    pat = re.compile(r"^\s*(?:>\s*)?(?:[-*+]\s*)?(?:\*\*)?" + re.escape(key) + r"(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$")
    for ln in lines:
        m = pat.match(ln)
        if m:
            return m.group(1).strip()
    return None


def person_keys(value: str) -> Set[str]:
    """Canonical identities in a cell: known roles/names map to a role, other tokens stay as-is.

    Template placeholders such as `<이름>` are dropped first, so blank `Sales(<이름>)` and
    `Build(<이름>)` do not collapse into the same person through the shared token.
    """
    keys = set()
    for tok in re.findall(r"[A-Za-z][A-Za-z-]*|[가-힣]+", re.sub(r"<[^<>]*>", " ", value)):
        keys.add(ROLE_ALIASES.get(tok.lower(), tok.lower()))
    return keys


def known_people(value: str) -> Set[str]:
    """Distinct team members named in a cell through known role/name aliases ("준서 태진" -> 2)."""
    toks = re.findall(r"[A-Za-z][A-Za-z-]*|[가-힣]+", re.sub(r"<[^<>]*>", " ", value))
    return {ROLE_ALIASES[t.lower()] for t in toks if t.lower() in ROLE_ALIASES}


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

class Report:
    def __init__(self, mission_dir: str = "", target: str = "") -> None:
        self.stage = ""
        self.target = target          # the stage the caller asked for (submit/all = final rules)
        self.mission_dir = mission_dir
        self.results: List[Result] = []
        self.broken: Set[str] = set()  # docs with an S- failure

    def add(self, ok: bool, rule_id: str, message: str) -> None:
        self.results.append(("PASS" if ok else "FAIL", self.stage, rule_id, message))

    def warn(self, rule_id: str, message: str) -> None:
        """Something a human must look at; never fails the run."""
        self.results.append(("WARN", self.stage, rule_id, message))

    @property
    def final(self) -> bool:
        """True when the submit-time (final) rules apply."""
        return self.target in ("submit", "all")

    def table(self, doc: Doc, heading: str, columns: List[str], s_id: str,
              c_ids: Tuple[str, ...]) -> Optional[Table]:
        """Structural table rule; on mismatch the dependent content rules FAIL too."""
        table, err = find_table(doc.section(heading), columns)
        if table is None:
            self.add(False, s_id, "## " + heading + ": " + err)
            for c_id in c_ids:
                self.add(False, c_id, "## " + heading + ": 표 구조 불일치로 내용 검사 불가")
            return None
        self.add(True, s_id, "## " + heading + ": 표 열 일치")
        return table

    def run_file(self, doc: Doc, checker) -> None:
        """Run one file checker, then mark its C- results unreliable when an S- rule failed."""
        start = len(self.results)
        checker(self, doc)
        segment = self.results[start:]
        if any(st == "FAIL" and rid.startswith("S-") for st, _, rid, _ in segment):
            self.broken.add(doc.name)
            self.results[start:] = [
                (st, sg, rid, msg + UNRELIABLE) if rid.startswith("C-") else (st, sg, rid, msg)
                for st, sg, rid, msg in segment
            ]


def mission_doc(mission_dir: str, name: str) -> Optional[Doc]:
    path = os.path.join(mission_dir, name + ".md")
    if not os.path.isfile(path):
        return None
    # utf-8-sig: a BOM written by Notepad must not break the title rule.
    with open(path, "r", encoding="utf-8-sig") as fh:
        return Doc(name, path, fh.read())


# ---------------------------------------------------------------------------
# Common rules
# ---------------------------------------------------------------------------

def check_common(rep: Report, doc: Doc) -> None:
    first = doc.raw.splitlines()[0].rstrip() if doc.raw.strip() else ""
    prefix = "# " + doc.name + " — "
    ok = first.startswith(prefix)
    rep.add(ok, "S-" + doc.name + "-title",
            "첫 줄 '" + prefix + "<YYYY-MM-DD>'" + ("" if ok else " 아님: '" + first[:60] + "'"))
    ok_date = bool(re.match(re.escape(prefix) + r"\d{4}-\d{2}-\d{2}", first))
    rep.add(ok_date, "C-" + doc.name + "-date", "제목 날짜 " + ("기입" if ok_date else "빈 값 또는 형식 오류"))

    required = ["## " + h for h in HEADINGS[doc.name]]
    missing = [h for h in required if h not in doc.h2]
    positions = [doc.h2.index(h) for h in required if h in doc.h2]
    problems = ["없음 '" + h + "'" for h in missing]
    if positions != sorted(positions):
        problems.append("순서 불일치")
    rep.add(not problems, "S-" + doc.name + "-headings",
            "필수 H2 " + str(len(required)) + "개 순서대로 존재" if not problems else "; ".join(problems))

    dups = [h for h in required if doc.h2.count(h) > 1]
    rep.add(not dups, "S-dup-heading", doc.name + ": 필수 H2 중복 없음" if not dups else
            doc.name + ": 필수 H2 중복 " + ", ".join(dups))

    slots: List[str] = []
    for ln in doc.lines:
        if is_example(ln):
            continue
        slots.extend(placeholders(ln))
        slots.extend(m.group(0) for m in EMPTY_SEARCH_RE.finditer(ln))
    rep.add(not slots, "C-empty", doc.name + ": 빈 값 없음" if not slots else
            doc.name + ": 빈 값(템플릿 빈칸) " + str(len(slots)) + "건: " + ", ".join(slots[:5]))


# ---------------------------------------------------------------------------
# MISSION / DECISION / PRD
# ---------------------------------------------------------------------------

def check_mission(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    raw = [strip_marker(x) for x in content_lines(doc.section("원문"), include_quotes=True)]
    raw = [x for x in raw if not is_empty(x)]
    rep.add(bool(raw), "C-M1", "원문 " + (str(len(raw)) + "줄" if raw else "비어 있음"))

    lines = content_lines(doc.section("해석"))
    bad = [x for x in lines if not re.search(r"\(해석:\s*[^()<>\s][^()]*\)\s*$", x)]
    ok = bool(lines) and not bad
    rep.add(ok, "C-M2", "해석 " + str(len(lines)) + "줄 모두 '(해석: <이름/역할>)'로 끝남" if ok else
            ("해석 비어 있음" if not lines else "출처 꼬리 없는 줄 " + str(len(bad)) + ": " + bad[0][:50]))

    lines = content_lines(doc.section("미확인"))
    bad = [x for x in lines if "가정:" not in x or is_empty(x.split("가정:", 1)[1])]
    ok = bool(lines) and not bad
    rep.add(ok, "C-M3", "미확인 " + str(len(lines)) + "줄 모두 '가정:' 포함" if ok else
            ("미확인 비어 있음" if not lines else "'가정:' 없는 줄 " + str(len(bad)) + ": " + bad[0][:50]))

    # intake: the heading and the table shape must exist; 0 rows is allowed until decide.
    rep.table(doc, "후보", CANDIDATE_COLUMNS, "S-MISSION-table-candidates", ())


def check_mission_candidates(rep: Report, doc: Doc) -> None:
    """decide stage: every intake rule again (options mode edits MISSION.md) + C-M4.

    Inside a submit/all run the intake stage has already reported the intake rules, so only C-M4 runs.
    """
    if rep.final:
        t = rep.table(doc, "후보", CANDIDATE_COLUMNS, "S-MISSION-table-candidates", ("C-M4",))
    else:
        check_mission(rep, doc)
        t, _ = find_table(doc.section("후보"), CANDIDATE_COLUMNS)
        if t is None:
            rep.add(False, "C-M4", "## 후보: 표 구조 불일치로 내용 검사 불가")
    if t is None:
        return
    ids = [t.cell(r, "#") for r in t.rows]
    errs = []
    if len(t.rows) != 3:
        errs.append(str(len(t.rows)) + "행 (정확히 3행 필요)")
    if len(set(ids)) != len(ids) or any(i not in CANDIDATE_IDS for i in ids):
        errs.append("# 값 " + ",".join(ids) + " (A·B·C 각 1번)")
    empty = sum(1 for r in t.rows for c in r[:len(CANDIDATE_COLUMNS)] if is_empty(c))
    if empty:
        errs.append("빈 칸 " + str(empty))
    rep.add(not errs, "C-M4", "후보 A·B·C 3행" if not errs else "; ".join(errs))


def decision_choice(doc: Doc) -> Optional[str]:
    lines = content_lines(doc.section("선택"), include_quotes=True)
    if not lines:
        return None
    m = re.match(r"^선택\s*:\s*([ABC])(?![A-Za-z0-9])", strip_marker(lines[0]))
    return m.group(1) if m else None


def check_decision(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    choice = decision_choice(doc)
    rep.add(choice is not None, "C-D5", "선택: " + choice if choice else "## 선택 첫 줄이 '선택: <A|B|C>' 아님")

    totals: Dict[str, int] = {}
    t = rep.table(doc, "점수", SCORE_COLUMNS, "S-DECISION-table-scores", ("C-D1", "C-D6"))
    if t is not None:
        errs = []
        ids = [t.cell(r, "후보") for r in t.rows]
        if len(t.rows) != 3 or sorted(ids) != list(CANDIDATE_IDS):
            errs.append("후보 " + ",".join(ids) + " (A·B·C 각 1행, 3행 필요)")
        for r in t.rows:
            cid = t.cell(r, "후보") or "?"
            scores = [as_int(t.col(r, c)) for c in SCORE_COLUMNS[1:5]]
            total = as_int(t.col(r, "합계"))
            if any(s is None or s < 1 or s > 5 for s in scores):
                errs.append(cid + ": 점수는 1–5 정수")
            elif total != sum(s for s in scores if s is not None):
                errs.append(cid + ": 합계 불일치")
            if cid in CANDIDATE_IDS and total is not None:
                totals.setdefault(cid, total)
        rep.add(not errs, "C-D1", "점수 A·B·C 3행 · 1–5 정수 · 합계 일치" if not errs else "; ".join(errs[:4]))

        decided = content_lines(doc.section("결정"), include_quotes=True)
        if not totals:
            rep.add(False, "C-D6", "합계 값이 없어 동점 판단 불가")
        else:
            top = max(totals.values())
            tied = sorted(k for k, v in totals.items() if v == top)
            if len(tied) < 2:
                rep.add(True, "C-D6", "최고점 동점 없음")
            else:
                rule = header_value(decided, "동점 처리")
                ok = rule is not None and not is_empty(rule)
                rep.add(ok, "C-D6", "동점(" + ",".join(tied) + ") 처리 기록" if ok else
                        "최고점 동점 " + ",".join(tied) + " — ## 결정에 '동점 처리:' 줄 필요")

    t = rep.table(doc, "기각", REJECT_COLUMNS, "S-DECISION-table-rejects", ("C-D2",))
    if t is not None:
        # Rows "해석: <읽기>" record a rejected reading of the mission; they are not candidates.
        rows = [r for r in t.rows if not t.cell(r, "후보").startswith(INTERPRETATION_REJECT)]
        ids = [t.cell(r, "후보") for r in rows]
        expected = sorted(c for c in CANDIDATE_IDS if c != choice) if choice else None
        errs = []
        if len(rows) != 2:
            errs.append(str(len(rows)) + "행 (후보 2행 필요 — '해석:' 행은 세지 않음)")
        if expected is not None and sorted(ids) != expected:
            errs.append("후보 " + ",".join(ids) + " ≠ 선택하지 않은 " + ",".join(expected))
        if expected is None and (len(set(ids)) != len(ids) or any(i not in CANDIDATE_IDS for i in ids)):
            errs.append("후보 " + ",".join(ids) + " (A·B·C 중 서로 다른 둘)")
        if any(is_empty(t.col(r, "이유")) for r in t.rows):
            errs.append("이유 빈 값")
        rep.add(not errs, "C-D2", "기각 2행 · 각 이유 있음" if not errs else "; ".join(errs))

    lines = content_lines(doc.section("시장 주장"))
    bad = [x for x in lines if len(labels_in(x)) != 1]
    ok = bool(lines) and not bad
    rep.add(ok, "C-D3", "시장 주장 " + str(len(lines)) + "줄 각 라벨 1개" if ok else
            ("시장 주장 비어 있음" if not lines else "라벨이 0개 또는 2개 이상인 줄: " + bad[0][:50]))

    ok = False
    for x in content_lines(doc.section("결정"), include_quotes=True):
        if "결정자:" in x and "시각:" in x:
            who = re.split(r"[·|,]|시각:", x.split("결정자:", 1)[1])[0]
            when = re.split(r"[·|,]|결정자:", x.split("시각:", 1)[1])[0]
            if not is_empty(who) and not is_empty(when):
                ok = True
                break
    rep.add(ok, "C-D4", "결정 줄에 결정자:·시각: 기입" if ok else "결정 줄에 '결정자:'와 '시각:' 값이 없음")


def prd_body(doc: Doc) -> List[str]:
    """Stripped lines between the title and the first H2."""
    return [ln.strip() for ln in doc.preamble[1:]]


def prd_numbered(doc: Doc) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for x in prd_body(doc):
        m = re.match(r"^(\d+)\.\s", x)
        if m:
            out.setdefault(int(m.group(1)), x)
    return out


def prd_captures(doc: Optional[Doc]) -> Dict[int, List[str]]:
    """Content captures of each PRD sentence that matches its frame (sentence number -> texts)."""
    if doc is None:
        return {}
    numbered = prd_numbered(doc)
    out: Dict[int, List[str]] = {}
    for i, frame in enumerate(PRD_FRAMES, start=1):
        m = frame.fullmatch(numbered.get(i, ""))
        if m:
            out[i] = [m.group(g).strip() for g in PRD_CONTENT_GROUPS[i]]
    return out


def check_prd(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    body = prd_body(doc)
    first_sentence = next((i for i, x in enumerate(body) if re.match(r"^\d+\.\s", x)), len(body))
    version = next((x for x in body[:first_sentence] if PRD_VERSION_RE.fullmatch(x)), None)
    rep.add(version is not None, "C-P4", "버전 줄 '" + version + "'" if version else
            "제목 뒤·문장 앞에 '버전: v<n> (<HH:MM>)' 줄 없음")

    numbered_order = [int(re.match(r"^(\d+)\.", x).group(1)) for x in body if re.match(r"^\d+\.\s", x)]
    ok = numbered_order == [1, 2, 3, 4, 5, 6]
    rep.add(ok, "S-PRD-lines", "번호 줄 6개(1–6) 존재" if ok else
            "번호 줄 " + str(numbered_order) + " (1–6 순서대로 6개 필요)")

    numbered = prd_numbered(doc)
    bad = [str(i) for i, frame in enumerate(PRD_FRAMES, start=1) if not frame.fullmatch(numbered.get(i, ""))]
    rep.add(not bad, "C-P1", "6문장 프레임 fullmatch" if not bad else "프레임 위반 문장: " + ",".join(bad))

    captures = prd_captures(doc)
    empty = [str(i) for i, caps in captures.items() if any(is_empty(c) for c in caps)]
    blanks = sum(len(EMPTY_SEARCH_RE.findall(x)) + len(placeholders(x)) for x in numbered.values())
    ok = not empty and blanks == 0
    rep.add(ok, "C-P2", "캡처 빈 값 0" if ok else
            "빈 값/플레이스홀더: 문장 " + (",".join(empty) or "-") + " · 빈칸 " + str(blanks) + "건")

    cut = content_lines(doc.section("C·U·T"))
    found: Dict[str, Tuple[str, str]] = {}
    for ln in cut:
        m = CUT_RE.fullmatch(strip_marker(ln))
        if m and m.group(1) not in found:
            found[m.group(1)] = (clean_cell(m.group(2)), (m.group(3) or "").strip())
    missing = [k for k in ("Clear", "Usable", "Tiny") if k not in found]
    rep.add(not missing, "S-PRD-cut", "C·U·T 세 줄 존재" if not missing else "C·U·T 줄 없음: " + ",".join(missing))
    errs = []
    for k in ("Clear", "Usable", "Tiny"):
        value, reason = found.get(k, ("?", ""))
        if value != "PASS":
            errs.append(k + "=" + value)
        elif is_empty(reason):
            errs.append(k + " 근거 없음")
    rep.add(not errs, "C-P3", "C·U·T 전부 PASS · 근거 있음" if not errs else
            "PASS·근거 아님: " + ", ".join(errs))


# ---------------------------------------------------------------------------
# BOARD
# ---------------------------------------------------------------------------

def gate_states(board: Optional[Doc]) -> Optional[Dict[str, str]]:
    if board is None:
        return None
    t, _ = find_table(board.section("게이트"), GATE_COLUMNS)
    if t is None:
        return None
    out: Dict[str, str] = {}
    for r in t.rows:
        out.setdefault(t.cell(r, "게이트"), t.cell(r, "상태"))
    return out


def board_owners(board: Optional[Doc]) -> Optional[Dict[str, str]]:
    if board is None:
        return None
    t, _ = find_table(board.section("파일 소유"), OWNERSHIP_COLUMNS)
    if t is None:
        return None
    out: Dict[str, str] = {}
    for r in t.rows:
        out.setdefault(t.cell(r, "파일"), t.cell(r, "소유"))
    return out


def find_cycle(deps: Dict[str, List[str]]) -> Optional[List[str]]:
    state: Dict[str, int] = {}
    stack: List[str] = []

    def visit(node: str) -> Optional[List[str]]:
        state[node] = 1
        stack.append(node)
        for nxt in deps.get(node, []):
            if state.get(nxt) == 1:
                return stack[stack.index(nxt):] + [nxt]
            if state.get(nxt) is None:
                found = visit(nxt)
                if found:
                    return found
        stack.pop()
        state[node] = 2
        return None

    for node in deps:
        if state.get(node) is None:
            found = visit(node)
            if found:
                return found
    return None


def check_board(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    t = rep.table(doc, "게이트", GATE_COLUMNS, "S-BOARD-table-gates", ("C-B1",))
    if t is not None:
        names = [t.cell(r, "게이트") for r in t.rows]
        errs = []
        missing = [g for g in GATES if g not in names]
        if missing:
            errs.append("게이트 행 없음: " + ",".join(missing))
        dups = sorted({g for g in names if names.count(g) > 1})
        if dups:
            errs.append("게이트 행 중복: " + ",".join(dups))
        for r in t.rows:
            gate, state = t.cell(r, "게이트"), t.cell(r, "상태")
            allowed = G6_STATES if gate == "G6" else GATE_STATES
            if state not in allowed:
                errs.append(gate + " 상태 '" + state + "' (허용: " + "/".join(allowed) + ")")
        rep.add(not errs, "C-B1", "게이트 G1–G6 · 상태 값 정상 (G6 = ready/approved/submitted)" if not errs else
                "; ".join(errs[:5]))

    t = rep.table(doc, "작업", TASK_COLUMNS, "S-BOARD-table-tasks", ("C-B2",))
    if t is not None:
        errs = []
        ids = [t.cell(r, "#") for r in t.rows]
        deps: Dict[str, List[str]] = {}
        if not t.rows:
            errs.append("작업 0행")
        for r in t.rows:
            no = t.cell(r, "#") or "?"
            if not TASK_ID_RE.fullmatch(no):
                errs.append("# '" + no + "' (T<n> 형식)")
            elif no in deps:
                errs.append(no + " 중복")
            owner = t.cell(r, "담당")
            if is_empty(owner) or re.search(r"[,，、/&]| 와 | 및 ", owner) or len(known_people(owner)) > 1:
                errs.append(no + " 담당은 1명")
            if t.cell(r, "상태") not in GATE_STATES:
                errs.append(no + " 상태 '" + t.cell(r, "상태") + "'")
            dep = t.cell(r, "의존")
            refs: List[str] = []
            if dep != "-":
                refs = [x.strip() for x in re.split(r"[,，]", dep)]
                for x in refs:
                    if not TASK_ID_RE.fullmatch(x) or x not in ids:
                        errs.append(no + " 의존 '" + x + "' 없음 ('-' 또는 존재하는 T 번호)")
            deps[no] = [x for x in refs if x in ids]
        cycle = find_cycle(deps)
        if cycle:
            errs.append("의존 순환: " + " → ".join(cycle))
        rep.add(not errs, "C-B2", "작업 " + str(len(t.rows)) + "행 · T 번호 · 담당 1명 · 의존 정상" if not errs else
                "; ".join(errs[:5]))

    t = rep.table(doc, "파일 소유", OWNERSHIP_COLUMNS, "S-BOARD-table-ownership", ("C-B3",))
    if t is not None:
        files = [t.cell(r, "파일") for r in t.rows]
        errs = ["행 없음 " + f for f in OWNERSHIP_ROWS if f not in files]
        for r in t.rows:
            f = t.cell(r, "파일")
            if is_empty(t.col(r, "소유")):
                errs.append(f + " 소유 빈 값")
            if t.cell(r, "쓰기 규칙") not in WRITE_RULES:
                errs.append(f + " 쓰기 규칙 '" + t.cell(r, "쓰기 규칙") + "' (소유자만|append-only)")
        rep.add(not errs, "C-B3", "필수 소유 " + str(len(OWNERSHIP_ROWS)) + "행 · 쓰기 규칙 정상" if not errs else
                "; ".join(errs[:5]))

    t = rep.table(doc, "예산", BUDGET_COLUMNS, "S-BOARD-table-budget", ("C-B4",))
    if t is not None:
        empty = sum(1 for r in t.rows for c in r[:len(BUDGET_COLUMNS)] if is_empty(c))
        ok = len(t.rows) == 4 and empty == 0
        if ok:
            msg = "예산 4행 (사람별)"
        elif len(t.rows) == 4:
            msg = "예산 4행이지만 빈 칸 " + str(empty)
        else:
            msg = "예산 " + str(len(t.rows)) + "행 (4행 필요)" + (" · 빈 칸 " + str(empty) if empty else "")
        rep.add(ok, "C-B4", msg)

    t = rep.table(doc, "슬롯", SLOT_COLUMNS, "S-BOARD-table-slots", ("C-B5",))
    if t is not None:
        check_slots(rep, t)


def minutes(value: str) -> Optional[int]:
    m = SLOT_TIME_RE.fullmatch(clean_cell(value))
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def check_slots(rep: Report, t: Table) -> None:
    """C-B5: every row HH:MM (ascending) · 0-8 or 미관측 · a source; WARN on <= 2 and on a stale log."""
    errs = []
    empty = sum(1 for r in t.rows for c in r[:len(SLOT_COLUMNS)] if is_empty(c))
    if empty:
        errs.append("슬롯 빈 칸 " + str(empty))
    last_time = None
    last_value = None
    for r in t.rows:
        when = minutes(t.col(r, "시각"))
        value = t.cell(r, "남은 슬롯")
        if when is None:
            errs.append("시각 '" + t.cell(r, "시각") + "' (HH:MM — 늦은 기록은 출처에 '(HH:MM 늦게 기록)')")
        elif last_time is not None and when < last_time:
            errs.append("시각 " + t.cell(r, "시각") + " 이 앞 행보다 이르다 (시간순 append)")
        else:
            last_time = when
        n = as_int(value)
        if value != SLOT_UNOBSERVED and (n is None or not 0 <= n <= SLOT_MAX):
            errs.append("남은 슬롯 '" + value + "' (0–" + str(SLOT_MAX) + " 정수 또는 '" + SLOT_UNOBSERVED + "')")
        elif n is not None:
            last_value = n
    rep.add(not errs, "C-B5", "슬롯 " + str(len(t.rows)) + "행 · HH:MM 오름차순 · 값 정상" if not errs else
            "; ".join(errs[:4]))
    if last_value is not None and last_value <= 2:
        rep.warn("C-B5", "최신 남은 슬롯 " + str(last_value) + " ≤ 2 — Sales의 🚨 한 결정과 HANDOFF 「결정」 답이 있어야 한다")
    if rep.final and last_time is not None:
        receipt = mission_doc(rep.mission_dir, "SUBMISSION")
        stamp = minutes(header_value(receipt.preamble[1:], "시각") or "") if receipt else None
        if stamp is not None and stamp - last_time > 30:
            rep.warn("C-B5", "최신 슬롯 행이 영수증 시각보다 " + str(stamp - last_time) + "분 이르다 (30분마다 관측)")


def find_beside(mission_dir: str, rel: str) -> Optional[str]:
    """rel inside the mission dir (fixtures) or next to mission/ (the real repo)."""
    for c in (os.path.join(mission_dir, rel), os.path.join(os.path.dirname(os.path.abspath(mission_dir)), rel)):
        if os.path.isfile(c):
            return c
    return None


def check_checkpoints(rep: Report, board: Doc) -> None:
    """X-6 (WARN only): the newest 'T<n> <status>' line in HANDOFF 「체크포인트」 vs the BOARD 작업 상태.

    The PM is the board's only writer, so a status reported in HANDOFF but never copied is drift.
    """
    path = find_beside(rep.mission_dir, "HANDOFF.md")
    if path is None:
        rep.warn("X-6", "HANDOFF.md 없음 — 체크포인트 ↔ BOARD 상태 비교 못 함")
        return
    with open(path, "r", encoding="utf-8-sig") as fh:
        handoff = Doc("HANDOFF", path, fh.read())
    reported: Dict[str, str] = {}
    for ln in handoff.section("체크포인트") or []:
        if ln.strip().startswith(">"):
            continue
        for tid, status in CHECKPOINT_STATUS_RE.findall(ln):
            reported[tid] = status
    t, _ = find_table(board.section("작업"), TASK_COLUMNS)
    if t is None:
        rep.warn("X-6", "BOARD 작업 표 없음 — 비교 못 함")
        return
    board_status = {t.cell(r, "#"): t.cell(r, "상태") for r in t.rows}
    drift = [tid + " 체크포인트 " + st + " ≠ BOARD " + board_status.get(tid, "행 없음")
             for tid, st in sorted(reported.items(), key=lambda kv: int(kv[0][1:]))
             if board_status.get(tid) != st]
    if drift:
        rep.warn("X-6", "BOARD 상태가 체크포인트보다 늦다 (PM이 integrate 0단계로 옮긴다): " + "; ".join(drift[:5]))
    else:
        rep.add(True, "X-6", "체크포인트 T 상태 " + str(len(reported)) + "건 = BOARD")


# ---------------------------------------------------------------------------
# EVIDENCE
# ---------------------------------------------------------------------------

def evidence_claims(doc: Optional[Doc]) -> Optional[Dict[str, str]]:
    """Claim ID (E<n>) -> label from EVIDENCE ## 주장, or None when the table is unusable."""
    if doc is None:
        return None
    t, _ = find_table(doc.section("주장"), CLAIM_COLUMNS)
    if t is None:
        return None
    out: Dict[str, str] = {}
    for r in t.rows:
        cid = t.cell(r, "ID")
        if CLAIM_ID_RE.fullmatch(cid):
            out.setdefault(cid, t.cell(r, "라벨"))
    return out


def check_evidence(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    t = rep.table(doc, "주장", CLAIM_COLUMNS, "S-EVIDENCE-table-claims", ("C-E1", "C-E2"))
    if t is not None:
        errs = []
        seen: Set[str] = set()
        if not t.rows:
            errs.append("주장 0행")
        for r in t.rows:
            cid = t.cell(r, "ID") or "?"
            if not CLAIM_ID_RE.fullmatch(cid):
                errs.append("ID '" + cid + "' (E<n> 형식)")
            elif cid in seen:
                errs.append("ID 중복 " + cid)
            seen.add(cid)
            if t.cell(r, "라벨") not in LABELS:
                errs.append(cid + " 라벨 '" + t.cell(r, "라벨") + "'")
            trust = as_int(t.col(r, "신뢰"))
            if trust is None or not 1 <= trust <= 5:
                errs.append(cid + " 신뢰는 1–5")
            if is_empty(t.col(r, "주장")):
                errs.append(cid + " 주장 빈 값")
        rep.add(not errs, "C-E1", "주장 " + str(len(t.rows)) + "행 · ID·라벨·신뢰 정상" if not errs else
                "; ".join(errs[:5]))

        bad = []
        for r in t.rows:
            label = t.cell(r, "라벨")
            if label not in ("verified", "single-source"):
                continue
            cid = t.cell(r, "ID") or "?"
            src = t.col(r, "출처")
            if is_empty(src) or clean_cell(src) in ("-", "—"):
                bad.append(cid + " 출처 빈 값")
            if not re.fullmatch(r"\d{4}", t.cell(r, "연도")):
                bad.append(cid + " 연도(4자리) 빈 값")
            if NOT_A_SOURCE_RE.search(src):
                bad.append(cid + " " + label + " 출처가 가상·추론·없음 (→ hypothesis)")
        rep.add(not bad, "C-E2", "verified·single-source 행 출처·연도 기입" if not bad else "; ".join(bad[:5]))

    sec = doc.section(SIM_HEADING)
    first = next((ln.strip() for ln in (sec or []) if ln.strip()), "")
    ok = first.startswith(SIM_NOTICE)
    rep.add(ok, "C-E4", "시뮬레이션 절 첫 줄 고지 있음" if ok else "시뮬레이션 절 첫 줄이 '" + SIM_NOTICE + "' 아님")

    t = rep.table(doc, SIM_HEADING, SIM_COLUMNS, "S-EVIDENCE-table-simulation", ("C-E3",))
    if t is not None:
        bad = []
        ids = [t.cell(r, "ID") for r in t.rows]
        for r in t.rows:
            sid = t.cell(r, "ID") or "?"
            if not SIM_ID_RE.fullmatch(sid) or ids.count(sid) > 1:
                bad.append(sid + " ID (S<n>, 유일)")
            if t.cell(r, "라벨") != "simulation":
                bad.append(sid + " 라벨 '" + t.cell(r, "라벨") + "'")
            if SIM_MARK not in t.col(r, "페르소나"):
                bad.append(sid + " 페르소나에 [SIMULATION] 없음")
        rep.add(not bad, "C-E3", "시뮬레이션 " + str(len(t.rows)) + "행 · S<n> · 라벨 simulation" if not bad else
                "; ".join(bad[:5]))


# ---------------------------------------------------------------------------
# PITCH
# ---------------------------------------------------------------------------

def slide_lines(doc: Doc) -> List[str]:
    out: List[str] = []
    for h in ("Slide 1", "Slide 2"):
        out.extend(content_lines(doc.section(h), include_quotes=True))
    return out


def has_label(line: str) -> bool:
    return bool(labels_in(line)) or PRODUCT_SPEC in line


def pitch_label_rows(doc: Doc) -> Tuple[Optional[List[Tuple[str, str]]], str]:
    """Rows (claim ID, label) of ## 라벨 점검; [] for an '없음' line; None + reason when malformed."""
    sec = doc.section("라벨 점검")
    if sec is None:
        return None, "섹션 없음"
    if not find_tables(sec):
        if any(strip_marker(x) == "없음" for x in content_lines(sec)):
            return [], ""
        return None, "표 없음 (열: " + "|".join(LABEL_CHECK_COLUMNS) + ") 또는 '없음' 한 줄"
    t, err = find_table(sec, LABEL_CHECK_COLUMNS)
    if t is None:
        return None, err
    return [(t.cell(r, "주장 ID"), t.cell(r, "라벨")) for r in t.rows], ""


def check_pitch(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    extra = [h for h in doc.h2 if SLIDE_HEADING_RE.match(h) and h.strip() not in ALLOWED_SLIDE_HEADINGS]
    rep.add(not extra, "C-T1", "Slide 1·2만 있음" if not extra else "허용되지 않은 슬라이드: " + ", ".join(extra))

    lines = slide_lines(doc)
    numbers = [x for x in lines if NUMBER_RE.search(x)]
    bad = [x for x in numbers if not has_label(x)]
    rep.add(not bad, "C-T2", "숫자 줄 " + str(len(numbers)) + "개 전부 라벨/(제품 사양)" if not bad else
            "라벨 없는 숫자 줄 " + str(len(bad)) + ": " + bad[0][:60])

    traction = [x for x in lines if TRACTION_RE.search(x)]
    bad = [x for x in traction if not has_label(x)]
    rep.add(not bad, "C-T5", "실적 어휘 줄 " + str(len(traction)) + "개 전부 라벨/(제품 사양)" if not bad else
            "라벨 없는 실적 어휘 줄 " + str(len(bad)) + ": " + bad[0][:60])

    level = pitch_level(rep, doc)
    script = content_lines(doc.section("스크립트 (90초)"), include_quotes=True)
    read_line = None
    words: List[str] = []
    for ln in script:
        s = strip_marker(ln)
        if s.startswith("낭독:"):
            read_line = read_line or s
            continue
        if is_empty(s):
            continue  # a placeholder-only line is not script
        words.extend(s.split())
    empty = not words
    ok = not empty and len(words) <= SCRIPT_WORD_LIMIT
    rep.add(ok, "C-T3", "스크립트 " + str(len(words)) + "어절 (≤220)" if ok else
            ("스크립트 비어 있음" if empty else "스크립트 " + str(len(words)) + "어절 (220 초과)"))
    if ok and len(words) > SCRIPT_WORD_TARGET_KO:
        rep.warn("C-T3", "스크립트 " + str(len(words)) + "어절 — 한국어 90초 낭독은 약 130–150어절 (낭독 실측으로 확인)")
    check_read_time(rep, read_line, level)

    t = rep.table(doc, "심사기준 매핑", MAPPING_COLUMNS, "S-PITCH-table-mapping", ("C-T4",))
    if t is not None:
        empty_cells = sum(1 for r in t.rows for c in r[:2] if is_empty(c))
        criteria = mission_criteria(rep.mission_dir)
        cells = [t.cell(r, "심사기준") for r in t.rows]
        missing = [c for c in criteria if not any(c in cell or cell in c for cell in cells if cell)]
        ok = bool(t.rows) and empty_cells == 0 and not missing
        if ok:
            msg = "매핑 " + str(len(t.rows)) + "행" + (" · MISSION 심사기준 " + str(len(criteria)) + "개 전부" if criteria else "")
        elif not t.rows:
            msg = "매핑 0행"
        elif empty_cells:
            msg = "매핑 빈 칸 " + str(empty_cells)
        else:
            msg = "MISSION 심사기준이 매핑에 없음: " + ", ".join(missing[:4])
        rep.add(ok, "C-T4", msg)

    rows, err = pitch_label_rows(doc)
    if rows is None:
        rep.add(False, "S-PITCH-table-labels", "## 라벨 점검: " + err)
        rep.add(False, "C-T7", "## 라벨 점검: 표 구조 불일치로 내용 검사 불가")
    else:
        rep.add(True, "S-PITCH-table-labels", "## 라벨 점검: 표 열 일치 (또는 '없음')")
        flagged = len(set(numbers) | set(traction))
        errs = [cid + " (E<n> 형식)" for cid, _ in rows if not CLAIM_ID_RE.fullmatch(cid)]
        errs += [cid + " 라벨 '" + lab + "'" for cid, lab in rows if lab not in LABELS]
        if flagged and not rows:
            errs.append("숫자·실적 줄 " + str(flagged) + "개인데 라벨 점검 0행")
        rep.add(not errs, "C-T7", "라벨 점검 " + str(len(rows)) + "행" if not errs else "; ".join(errs[:5]))

    check_slide_file(rep, doc, level)
    check_objections(rep, doc, level)


def pitch_level(rep: Report, doc: Doc) -> str:
    """'submit' (final receipt run) · 'final' (title tail v3) · 'draft' (v0-v2 or no tail)."""
    if rep.final:
        return "submit"
    m = PITCH_VERSION_RE.search(doc.raw.splitlines()[0] if doc.raw.strip() else "")
    return "final" if m and m.group(1) == "3" else "draft"


def check_read_time(rep: Report, line: Optional[str], level: str) -> None:
    """C-T6: '낭독: <n>초 (측정 HH:MM <발표자>)' at submit; '(추정)' or '사람 측정 대기' only before it."""
    if line is None:
        rep.add(level == "draft", "C-T6", "낭독 줄 없음" + (" (초안)" if level == "draft" else
                                                          " — v3·제출에는 '낭독: <n>초 (측정 HH:MM <발표자>)' 필요"))
        return
    if PENDING_RE.search(line):
        if level == "submit":
            rep.add(False, "C-T6", "낭독 사람 측정 대기 — 제출 전 발표자가 재서 적는다")
        else:
            rep.warn("C-T6", "낭독 사람 측정 대기 (submit에서 FAIL)")
        return
    m = READ_TIME_RE.search(line)
    if m is None:
        rep.add(False, "C-T6", "낭독 값 없음: '" + line[:40] + "' (숫자·초 또는 '사람 측정 대기')")
        return
    seconds = int(m.group(1))
    if seconds > READ_SECONDS_LIMIT:
        rep.add(False, "C-T6", "낭독 " + str(seconds) + "초 (95초 초과)")
        return
    measured = bool(READ_MEASURED_RE.search(line))
    if level == "submit" and not measured:
        rep.add(False, "C-T6", "낭독 " + str(seconds) + "초 — 측정 표기 '(측정 HH:MM <발표자>)' 없음 (추정은 제출 불가)")
    elif level == "final" and not measured:
        rep.warn("C-T6", "낭독 " + str(seconds) + "초 추정 — 제출 전 실측 '(측정 HH:MM <발표자>)'")
    else:
        rep.add(True, "C-T6", "낭독 " + str(seconds) + "초" + (" (측정)" if measured else " (초안)"))


def mission_criteria(mission_dir: str) -> List[str]:
    """Bold names (**...**) under MISSION ## 심사기준 — the criteria C-T4 requires in the mapping."""
    doc = mission_doc(mission_dir, "MISSION")
    if doc is None:
        return []
    names: List[str] = []
    for ln in content_lines(doc.section("심사기준"), include_quotes=True):
        for name in re.findall(r"\*\*([^*]+)\*\*", ln):
            if name.strip() and name.strip() not in names:
                names.append(name.strip())
    return names


def count_pages(path: str) -> Optional[int]:
    """Pages of an exported PDF (/Type /Page objects) or slides of a PPTX (ppt/slides/slideN.xml)."""
    try:
        if path.endswith(".pptx"):
            with zipfile.ZipFile(path) as z:
                return sum(1 for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n))
        with open(path, "rb") as fh:
            data = fh.read()
        return len(re.findall(rb"/Type\s*/Page(?![a-zA-Z])", data)) or None
    except (OSError, zipfile.BadZipFile):
        return None


def check_slide_file(rep: Report, doc: Doc, level: str) -> None:
    """C-T8: 파일 · 페이지 · 크기. v3 and submit: the exported file exists, 크기 = its bytes, pages counted."""
    sec = content_lines(doc.section("제출 파일"), include_quotes=True)
    values = {k: clean_cell(header_value(sec, k) or "") for k in ("파일", "페이지", "크기")}
    if any(PENDING_RE.search(v) for v in values.values()):
        if level == "submit":
            rep.add(False, "C-T8", "제출 파일 사람 기입 대기 — 내보낸 파일의 쪽수·크기가 제출 전 필요")
        else:
            rep.warn("C-T8", "제출 파일 사람 기입 대기 (파일 내보내기·쪽수·크기) — submit에서 FAIL")
        return
    errs = [k + ":" for k, v in values.items() if is_empty(v)]
    m = re.match(r"\d+", values["페이지"])
    pages = int(m.group(0)) if m else None
    if "페이지:" not in errs and (pages is None or not 1 <= pages <= 2):
        errs.append("페이지 ≤ 2")
    if level != "draft" and not errs:
        for k, v in values.items():
            if NOT_EXPORTED_RE.search(v):
                errs.append(k + " '" + v + "' (내보낸 파일 값이 아님)")
        if not re.fullmatch(r"\d+", values["페이지"]):
            errs.append("페이지는 숫자만")
        if not re.fullmatch(r"\d+", values["크기"]):
            errs.append("크기는 바이트 정수 ('" + values["크기"] + "')")
        if not SLIDE_FILE_RE.fullmatch(values["파일"]):
            errs.append("파일은 pitch/slides.pdf 또는 pitch/slides.pptx")
        else:
            path = find_beside(rep.mission_dir, values["파일"])
            if path is None:
                errs.append(values["파일"] + " 없음 (내보내 커밋)")
            else:
                size = os.path.getsize(path)
                if re.fullmatch(r"\d+", values["크기"]) and int(values["크기"]) != size:
                    errs.append("크기 " + values["크기"] + " ≠ 실제 " + str(size))
                counted = count_pages(path)
                if counted is None:
                    errs.append("쪽수를 셀 수 없음")
                elif pages is not None and counted != pages:
                    errs.append("페이지 " + str(pages) + " ≠ 실제 " + str(counted))
                elif counted > 2:
                    errs.append("실제 " + str(counted) + "쪽 (≤ 2)")
    rep.add(not errs, "C-T8", "제출 파일 줄 정상 (페이지 " + str(pages) + (" · 파일 확인" if level != "draft" else "") + ")"
            if not errs else "제출 파일 줄 없음/위반: " + ", ".join(errs[:4]))


def check_objections(rep: Report, doc: Doc, level: str) -> None:
    """C-T9 (v3 and submit): ## 반론과 수정 has one row per role — PM, Build, GTM, Sales."""
    if level == "draft":
        return
    t, err = find_table(doc.section("반론과 수정"), OBJECTION_COLUMNS)
    if t is None:
        rep.add(False, "C-T9", "## 반론과 수정: " + err)
        return
    roles = [ROLE_ALIASES.get(re.split(r"[\s(]", t.cell(r, "역할").lower())[0], "?") for r in t.rows]
    empty = sum(1 for r in t.rows for c in r[:3] if is_empty(c))
    ok = len(t.rows) == 4 and sorted(roles) == sorted(OBJECTION_ROLES) and not empty
    rep.add(ok, "C-T9", "반론과 수정 4행 (PM·Build·GTM·Sales)" if ok else
            "반론과 수정 " + str(len(t.rows)) + "행 · 역할 " + ",".join(roles) + (" · 빈 칸 " + str(empty) if empty else "")
            + " (역할마다 1행, 4행 필요)")


# ---------------------------------------------------------------------------
# SUBMISSION
# ---------------------------------------------------------------------------

def check_table_rows(doc: Optional[Doc]) -> Tuple[Optional[Table], Dict[int, List[str]]]:
    if doc is None:
        return None, {}
    t, _ = find_table(doc.section("체크"), CHECK_COLUMNS)
    rows: Dict[int, List[str]] = {}
    if t is not None:
        for r in t.rows:
            n = as_int(t.col(r, "#"))
            if n is not None:
                rows.setdefault(n, r)
    return t, rows


def submission_verdict(doc: Optional[Doc]) -> Optional[str]:
    if doc is None:
        return None
    lines = content_lines(doc.section("판정"), include_quotes=True)
    if not lines:
        return None
    m = VERDICT_RE.match(clean_cell(strip_marker(lines[0])))
    return m.group(1) if m else None


def check_test_rows(rep: Report, t: Table, rows: List[List[str]]) -> None:
    """C-S4 WARNs: every SMOKE row names its target and method — '<n>/3 (<배포 URL|로컬|fallback> · <방식>)'.

    Only 배포 URL rows count for check 2 and F1; a 판독 (read, not run) row is not an execution.
    """
    runs = [r for r in rows if not t.cell(r, "회차").lower().startswith("precheck")]
    untagged = [t.cell(r, "회차") for r in runs if not any(k in t.col(r, "통과 단계") for k in TEST_TARGETS)]
    if untagged:
        rep.warn("C-S4", "대상 표기 없는 회차 " + ",".join(untagged[:5]) + " — 통과 단계에 '(배포 URL|로컬|fallback · 방식)'")
    read_only = [t.cell(r, "회차") for r in runs if "판독" in t.col(r, "통과 단계")]
    if read_only:
        rep.warn("C-S4", "판독 회차 " + ",".join(read_only[:5]) + " — 실행이 아니다 (그 단계는 NOT_RUN)")
    if runs and not any("배포 URL" in t.col(r, "통과 단계") for r in runs):
        rep.warn("C-S4", "배포 URL에서 돈 회차 없음 — 체크 2·F1의 근거가 아니다")
    if not any(t.cell(r, "회차").lower().startswith("precheck") for r in rows):
        rep.warn("C-S4", "precheck 행 없음 — precheck(T11)가 돌지 않았으면 「알려진 결함」에 'precheck 미실행'")


def check_submission(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    head = doc.preamble[1:]
    values = {k: header_value(head, k) for k in SUBMISSION_HEADER_KEYS}
    missing = [k for k, v in values.items() if v is None]
    rep.add(not missing, "S-SUBMISSION-header", "머리 줄 6개 존재" if not missing else
            "머리 줄 없음: " + ", ".join(missing))
    empty = [k for k, v in values.items() if v is not None and is_empty(v)]
    rep.add(not missing and not empty, "C-SUBMISSION-header", "머리 줄 값 기입" if not missing and not empty else
            "머리 줄 빈 값: " + ", ".join(missing + empty))

    t = rep.table(doc, "체크", CHECK_COLUMNS, "S-SUBMISSION-table-checks", ("C-S1",))
    _, rows = check_table_rows(doc)
    if t is not None:
        errs = []
        if len(t.rows) != 10:
            errs.append(str(len(t.rows)) + "행 (10행 필요)")
        for i, r in enumerate(t.rows[:10], start=1):
            no, item, result = t.cell(r, "#"), t.cell(r, "확인"), t.cell(r, "결과")
            if no != str(i) or item != CHECK_ITEMS[i - 1]:
                errs.append(str(i) + "행 '" + no + " " + item + "' ≠ '" + str(i) + " " + CHECK_ITEMS[i - 1] + "'")
            if result not in CHECK_RESULTS:
                errs.append(str(i) + "행 결과 '" + result + "'")
            if SUBSTITUTE_MARK in t.col(r, "증거") and result != "NOT_RUN":
                errs.append(str(i) + "행 " + SUBSTITUTE_MARK + "는 NOT_RUN만 (PASS 금지)")
        rep.add(not errs, "C-S1", "체크 10행 · 확인 문구 고정 · 결과 PASS/FAIL/NOT_RUN" if not errs else
                "; ".join(errs[:4]))

    def result_of(n: int) -> str:
        r = rows.get(n)
        return clean_cell(t.col(r, "결과")) if t is not None and r is not None else ""

    verdict = submission_verdict(doc)
    not_pass = [n for n in range(1, 11) if result_of(n) != "PASS"]
    if verdict is None:
        rep.add(False, "C-S2", "판정이 approve | approve-with-defects | revise | fail 중 하나가 아님")
    elif verdict == "approve" and not_pass:
        rep.add(False, "C-S2", "approve 불가: PASS 아닌 체크 #" + ", #".join(map(str, not_pass)))
    elif verdict == "approve-with-defects" and any(n in not_pass for n in NON_WAIVABLE):
        blocked = [n for n in NON_WAIVABLE if n in not_pass]
        rep.add(False, "C-S2", "면제 불가 체크가 PASS 아님: #" + ", #".join(map(str, blocked)))
    else:
        rep.add(True, "C-S2", "판정 " + verdict + (" (면제 불가 1·3·4·5·10 PASS)" if verdict in APPROVING else ""))

    if verdict == "approve-with-defects":
        text = "\n".join(content_lines(doc.section("알려진 결함"), include_quotes=True))
        listed = set(int(x) for x in re.findall(r"#(\d+)", text))
        unlisted = [n for n in not_pass if n not in listed]
        approval = header_value(doc.lines, "PM 승인")
        errs = []
        if unlisted:
            errs.append("알려진 결함에 없는 체크 #" + ", #".join(map(str, unlisted)))
        if approval is None or is_empty(approval):
            errs.append("'PM 승인:' 줄 없음")
        rep.add(not errs, "C-S6", "결함 " + str(len(not_pass)) + "건 기재 · PM 승인" if not errs else "; ".join(errs))
    else:
        rep.add(True, "C-S6", "해당 없음 (판정 " + (verdict or "?") + ")")

    t2 = rep.table(doc, "산출물", ARTIFACT_COLUMNS, "S-SUBMISSION-table-artifacts", ("C-S3",))
    if t2 is not None:
        errs = []
        kinds = [t2.cell(r, "종류") for r in t2.rows]
        errs += ["'" + k + "' 행 없음" for k in ARTIFACT_KINDS if k not in kinds]
        empty_cells = sum(1 for r in t2.rows for c in r[:len(ARTIFACT_COLUMNS)] if is_empty(c))
        if empty_cells:
            errs.append("빈 칸 " + str(empty_cells))
        nogit = False
        for r in t2.rows:
            kind, digest = t2.cell(r, "종류"), t2.cell(r, "sha256")
            if kind in ("배포 URL", "소스 커밋"):
                if NOGIT_REF_RE.fullmatch(digest):
                    nogit = True
                elif not COMMIT_REF_RE.fullmatch(digest):
                    errs.append(kind + " sha256 칸은 '커밋 <7-40자리 hex>' (git 없음: '내용 sha256 <64자리> (no git)')")
            if kind == "배포 URL" and not re.match(r"^https?://\S+$", t2.cell(r, "파일/링크").strip("<>")):
                errs.append("배포 URL 파일/링크가 http(s) 주소 아님 ('" + t2.cell(r, "파일/링크")[:30] + "') — F1 FAIL")
            if kind == "발표 파일":
                if not (SHA256_RE.fullmatch(digest) or digest.startswith("mtime ")):
                    errs.append("발표 파일 sha256은 64자리 hex (해시 도구가 전혀 없을 때만 'mtime <시각>')")
                if not re.fullmatch(r"\d+", t2.cell(r, "크기")):
                    errs.append("발표 파일 크기는 바이트 정수")
        rep.add(not errs, "C-S3", ("산출물 소스 커밋·배포 URL·발표 파일" +
                                   (" · no git (체크 9의 git diff는 NOT_RUN)" if nogit else "")) if not errs else
                "; ".join(errs[:4]))

    t3 = rep.table(doc, "테스트", TEST_COLUMNS, "S-SUBMISSION-table-tests", ("C-S4",))
    if t3 is not None:
        filled = [r for r in t3.rows if not is_empty(t3.col(r, "회차")) and not is_empty(t3.col(r, "시각"))]
        rep.add(bool(filled), "C-S4", "테스트 " + str(len(filled)) + "회 기록" if filled else "테스트 기록 0행")
        check_test_rows(rep, t3, filled)

    sub = content_lines(doc.section("제출"), include_quotes=True)
    errs = []
    who = header_value(sub, "담당")
    if who is None or not re.match(r"^PM(?![A-Za-z])", clean_cell(who)):
        errs.append("담당: PM")
    for key in ("시각", "접수 확인"):
        v = header_value(sub, key)
        if v is None or is_empty(v):
            errs.append(key + ":")
    if clean_cell(header_value(sub, "타임아웃 시") or "") != SUBMIT_TIMEOUT_TEXT:
        errs.append("타임아웃 시: " + SUBMIT_TIMEOUT_TEXT)
    rep.add(not errs, "C-S7", "제출 줄 4개 정상 (제출 전에는 '미제출')" if not errs else
            "제출 줄 없음/위반: " + ", ".join(errs))


# ---------------------------------------------------------------------------
# DEMODAY
# ---------------------------------------------------------------------------

def check_demoday(rep: Report, doc: Doc) -> None:
    check_common(rep, doc)

    t = rep.table(doc, "예상 질문 10", QUESTION_COLUMNS, "S-DEMODAY-table-questions", ("C-Y1", "C-Y3"))
    if t is not None:
        bad_label = [i + 1 for i, r in enumerate(t.rows) if t.cell(r, "라벨") not in LABELS]
        empty = sum(1 for r in t.rows for c in r[:2] if is_empty(c))
        ok = len(t.rows) == 10 and not bad_label and empty == 0
        msg = "예상 질문 " + str(len(t.rows)) + "행" + ("" if len(t.rows) == 10 else " (10행 필요)")
        if bad_label:
            msg += ", 라벨 오류 행 " + ",".join(str(b) for b in bad_label[:5])
        if empty:
            msg += ", 빈 칸 " + str(empty)
        rep.add(ok, "C-Y1", msg)

        hits = []
        for i, r in enumerate(t.rows, start=1):
            if DEMODAY_TRACTION_RE.search(t.col(r, "답")) and t.cell(r, "라벨") not in ("simulation", "hypothesis"):
                hits.append(str(i))
        rep.add(not hits, "C-Y3", "답의 실적 표현은 simulation/hypothesis" if not hits else
                "실적 표현 답에 simulation/hypothesis 아님: 행 " + ",".join(hits[:5]))

    t = rep.table(doc, "리허설 기록", REHEARSAL_COLUMNS, "S-DEMODAY-table-rehearsal", ("C-Y2",))
    if t is not None:
        rows = [r for r in t.rows if not is_empty(t.col(r, "회차"))]
        rep.add(len(rows) >= 2, "C-Y2", "리허설 기록 " + str(len(rows)) + "행" + ("" if len(rows) >= 2 else " (≥2 필요)"))


CHECKERS = {
    "MISSION": check_mission,
    "DECISION": check_decision,
    "PRD": check_prd,
    "BOARD": check_board,
    "EVIDENCE": check_evidence,
    "PITCH": check_pitch,
    "SUBMISSION": check_submission,
    "DEMODAY": check_demoday,
}


# ---------------------------------------------------------------------------
# Cross rules (submit stage)
# ---------------------------------------------------------------------------

def find_smoke(mission_dir: str) -> Optional[str]:
    """app/SMOKE.md inside the mission dir (fixtures) or next to mission/ (the real repo)."""
    for c in (os.path.join(mission_dir, "app", "SMOKE.md"),
              os.path.join(os.path.dirname(os.path.abspath(mission_dir)), "app", "SMOKE.md")):
        if os.path.isfile(c):
            return c
    return None


def smoke_step(lines: List[str], n: int) -> str:
    """Body of numbered step n in SMOKE: from `n. ` up to the next numbered step or H2 (same as node smokeStep)."""
    out: List[str] = []
    inside = False
    for ln in lines:
        if inside and (re.match(r"\d+\. ", ln) or ln.startswith("## ")):
            break
        if not inside and ln.startswith(str(n) + ". "):
            inside = True
        if inside:
            out.append(ln)
    return "\n".join(out)


def cross_add(rep: Report, ok: bool, rule_id: str, message: str, involved: Tuple[str, ...]) -> None:
    if rep.broken & set(involved):
        message += UNRELIABLE
    rep.add(ok, rule_id, message)


def check_cross(rep: Report, mission_dir: str) -> None:
    check_x1(rep, mission_dir)
    check_x2_to_x5(rep, mission_dir)


def check_x1(rep: Report, mission_dir: str) -> None:
    pitch = mission_doc(mission_dir, "PITCH")
    evidence = evidence_claims(mission_doc(mission_dir, "EVIDENCE"))
    involved = ("PITCH", "EVIDENCE")
    if pitch is None or evidence is None:
        cross_add(rep, False, "X-1", "PITCH.md 또는 EVIDENCE.md 주장 표 없음", involved)
    else:
        rows, err = pitch_label_rows(pitch)
        if rows is None:
            cross_add(rep, False, "X-1", "PITCH 라벨 점검 표 확인 불가 — " + err, involved)
        else:
            refs = list(rows) + [tag for ln in slide_lines(pitch) for tag in CLAIM_TAG_RE.findall(ln)]
            errs = []
            for cid, label in refs:
                if cid not in evidence:
                    errs.append(cid + " 가 EVIDENCE에 없음")
                elif evidence[cid] != label:
                    errs.append(cid + " 라벨 " + label + " ≠ EVIDENCE " + evidence[cid] + " (라벨 상향 금지)")
            cross_add(rep, not errs, "X-1", "주장 ID " + str(len(refs)) + "건 EVIDENCE ID·라벨 일치" if not errs else
                      "; ".join(errs[:4]), involved)


def check_x2_to_x5(rep: Report, mission_dir: str) -> None:
    captures = prd_captures(mission_doc(mission_dir, "PRD"))
    smoke_path = find_smoke(mission_dir)
    smoke = None
    if smoke_path is not None:
        with open(smoke_path, "r", encoding="utf-8-sig") as fh:
            smoke = Doc("SMOKE", smoke_path, fh.read())
    for rule, n, where in (("X-2", 3, None), ("X-4", 6, "완료 조건")):
        cap = (captures.get(n) or [""])[0]
        if not cap or is_empty(cap):
            cross_add(rep, False, rule, "PRD " + str(n) + "번 문장 캡처 없음 (C-P1·C-P2 먼저)", ("PRD",))
        elif smoke is None:
            cross_add(rep, False, rule, "app/SMOKE.md 없음", ("PRD",))
        else:
            text = smoke_step(smoke.lines, 2) if where is None else "\n".join(smoke.section(where) or [])
            target = "app/SMOKE.md" + (" 2단계" if where is None else " ## " + where)
            if where is not None and smoke.section(where) is None:
                cross_add(rep, False, rule, target + " 섹션 없음", ("PRD",))
            else:
                cross_add(rep, cap in text, rule, "PRD " + str(n) + "번 캡처 '" + cap[:30] + "' " +
                          ("⊂ " if cap in text else "가 없음: ") + target, ("PRD",))

    board = mission_doc(mission_dir, "BOARD")
    submission = mission_doc(mission_dir, "SUBMISSION")
    verdict = submission_verdict(submission)
    involved = ("BOARD", "SUBMISSION")
    states = gate_states(board)
    if states is None or submission is None:
        cross_add(rep, False, "X-3", "BOARD 게이트 표 또는 SUBMISSION.md 없음", involved)
    else:
        not_done = [g + "=" + (states.get(g) or "없음") for g in GATES[:5] if states.get(g) != "done"]
        ok = not (not_done and verdict in APPROVING)
        msg = ("게이트 G1–G5 전부 done" if not not_done else "done 아닌 게이트: " + ", ".join(not_done))
        cross_add(rep, ok, "X-3", msg + " · 판정 " + (verdict or "?") + ("" if ok else " (approve 금지)"), involved)

    owners = board_owners(board)
    table, rows = check_table_rows(submission)
    if owners is None or table is None:
        cross_add(rep, False, "X-5", "BOARD 파일 소유 표 또는 SUBMISSION 체크 표 없음", involved)
        return
    errs = []
    for n in range(1, 11):
        r = rows.get(n)
        inspector = table.col(r, "검사자") if r is not None else ""
        if is_empty(inspector):
            errs.append("#" + str(n) + " 검사자 빈 값")
            continue
        if clean_cell(inspector) == "미실행":
            if clean_cell(table.col(r, "결과")) != "NOT_RUN":
                errs.append("#" + str(n) + " 검사자 '미실행'인데 결과가 NOT_RUN 아님")
            continue
        for f in X5_OWNER_ROWS.get(n, ()):
            owner = owners.get(f)
            if owner is None or is_empty(owner):
                errs.append("#" + str(n) + " BOARD 소유자 없음: " + f)
            elif person_keys(inspector) & person_keys(owner):
                errs.append("#" + str(n) + " 검사자 " + clean_cell(inspector) + " = " + f + " 소유자 " + owner)
    cross_add(rep, not errs, "X-5", "체크 10행 검사자 ≠ 해당 소유자" if not errs else "; ".join(errs[:4]), involved)


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

STAGE_FILES = {
    "intake": [("MISSION", check_mission)],
    "decide": [("MISSION", check_mission_candidates), ("DECISION", check_decision), ("PRD", check_prd)],
    "board": [("BOARD", check_board)],
    "evidence": [("EVIDENCE", check_evidence)],
    "pitch": [("PITCH", check_pitch)],
    "submit": [("SUBMISSION", check_submission)],
    "demoday": [("DEMODAY", check_demoday)],
}


def run_stage(rep: Report, mission_dir: str, stage: str) -> None:
    rep.stage = stage
    for name, checker in STAGE_FILES[stage]:
        doc = mission_doc(mission_dir, name)
        if doc is None:
            rep.add(False, "S-" + name + "-missing", ("mission/" if name == "BOARD" else "") + name + ".md 없음")
            rep.broken.add(name)
            continue
        rep.run_file(doc, checker)
        if name == "BOARD":
            check_checkpoints(rep, doc)
    if stage == "pitch" and not rep.final and mission_doc(mission_dir, "EVIDENCE") is not None:
        check_x1(rep, mission_dir)  # G5 is judged on --stage pitch: label upgrades must show here
    if stage == "submit":
        check_cross(rep, mission_dir)
        if mission_doc(mission_dir, "DEMODAY") is not None:
            run_stage(rep, mission_dir, "demoday")
            rep.stage = "submit"


def run(mission_dir: str, stage: str = "all") -> List[Result]:
    """Validate mission_dir for one stage. 'submit' and 'all' re-check every earlier stage first.
    Returns (status, stage, rule_id, message) tuples."""
    if stage not in CLI_STAGES:
        raise ValueError("unknown stage: " + stage)
    rep = Report(mission_dir, stage)
    if stage in ("submit", "all"):
        for s in STAGES:
            run_stage(rep, mission_dir, s)
    else:
        run_stage(rep, mission_dir, stage)
    return rep.results


def main(argv: Optional[List[str]] = None) -> int:
    # Korean Windows consoles default to cp949, which cannot print every character in the messages.
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Validate HTHn mission/ artifacts (contract v1.1).")
    parser.add_argument("mission_dir")
    parser.add_argument("--stage", default="all", choices=CLI_STAGES)
    args = parser.parse_args(argv)
    if not os.path.isdir(args.mission_dir):
        print("FAIL " + args.stage + " S-dir-missing 폴더 없음: " + args.mission_dir)
        print("SUMMARY pass=0 fail=1 warn=0")
        return 1
    results = run(args.mission_dir, args.stage)
    for status, stage, rule_id, message in results:
        print(status + " " + stage + " " + rule_id + " " + message)
    n_pass = sum(1 for r in results if r[0] == "PASS")
    n_fail = sum(1 for r in results if r[0] == "FAIL")
    n_warn = sum(1 for r in results if r[0] == "WARN")
    print("SUMMARY pass=" + str(n_pass) + " fail=" + str(n_fail) + " warn=" + str(n_warn))
    return 1 if n_fail else 0


if __name__ == "__main__":
    sys.exit(main())
