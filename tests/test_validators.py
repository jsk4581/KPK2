"""L2 tests for scripts/validate_mission.py (artifact validator), contract v1.1.

Source of truth: HTHN_v1.0_PLAN section 4 as amended by HTHN_v1.1_AMENDMENT section B
(B0 stage -> files, B1 markdown rules, B2 per-file rules, B3 cross rules, B4 tests).

Entry points:
  * Python API : run(mission_dir, stage) -> list of (status, stage, rule_id, message)
  * CLI        : python3 scripts/validate_mission.py <dir> --stage <stage>
                 prints "PASS|FAIL|WARN <stage> <rule-id> <message>" per rule,
                 then "SUMMARY pass=<n> fail=<n> warn=<n>", exit 0 (no FAIL) / 1. WARN never fails.

A fixture dir is a mission/ dir: BOARD.md (the canonical mission/BOARD.md) and app/SMOKE.md
sit inside it. In the real repo app/SMOKE.md sits next to mission/, and the validator looks
there too.

MutationTest copies good-01, breaks exactly one thing per rule, and checks that exactly that
rule FAILs (C-empty is the only allowed companion when the mutation itself is an empty value).
"""

import importlib.util
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / "scripts" / "validate_mission.py"
FIXTURES = REPO / "tests" / "fixtures" / "missions"
GOOD = FIXTURES / "good-01"   # state after submission (G6 submitted, 「제출」 filled)
BAD = FIXTURES / "bad-01"     # composite case: many rules broken at once

STAGES = ("intake", "decide", "board", "evidence", "pitch", "submit", "demoday", "all")

LINE_RE = re.compile(r"^(PASS|FAIL|WARN) (\S+) (\S+)(?: (.*))?$")
SUMMARY_RE = re.compile(r"^SUMMARY pass=(\d+) fail=(\d+) warn=(\d+)$")
UNRELIABLE = "[구조 실패로 신뢰 불가]"

# Every content and cross rule of the v1.1 contract. good-01 includes DEMODAY.md, so C-Y too.
ALL_CONTRACT_RULES = (
    "S-dup-heading", "C-empty",
    "C-M1", "C-M2", "C-M3", "C-M4",
    "C-D1", "C-D2", "C-D3", "C-D4", "C-D5", "C-D6",
    "C-P1", "C-P2", "C-P3", "C-P4",
    "C-B1", "C-B2", "C-B3", "C-B4", "C-B5",
    "C-E1", "C-E2", "C-E3", "C-E4",
    "C-T1", "C-T2", "C-T3", "C-T4", "C-T5", "C-T6", "C-T7", "C-T8", "C-T9",
    "C-S1", "C-S2", "C-S3", "C-S4", "C-S6", "C-S7",
    "C-Y1", "C-Y2", "C-Y3",
    "X-1", "X-2", "X-3", "X-4", "X-5", "X-6",
)

# Violations planted in bad-01 (each file says so in its [SIMULATION] header).
BAD_EXPECTED_FAILS = {
    "C-P1": "PRD sentence 1 breaks the frame",
    "C-P2": "PRD sentence 5 still holds ______",
    "C-P3": "PRD C·U·T has Tiny: FAIL",
    "C-P4": "PRD has no 버전 line",
    "C-B1": "BOARD gate table has no G6 row",
    "C-B2": "BOARD task owner cell has two people",
    "C-B3": "BOARD ownership table misses mission/EVIDENCE.md#Buyer simulation",
    "C-E1": "EVIDENCE label typo 'verifed'",
    "C-E2": "EVIDENCE verified row without a year",
    "C-E3": "EVIDENCE simulation row labelled hypothesis",
    "C-E4": "EVIDENCE simulation section lacks the notice line",
    "C-T1": "PITCH has ## Slide 3",
    "C-T2": "PITCH slide line with an unlabelled number",
    "C-T3": "PITCH script longer than 220 words",
    "C-T5": "PITCH says '계약 체결' without a label",
    "C-T8": "PITCH 제출 파일 says 3 pages",
    "C-S1": "SUBMISSION check table has 9 rows",
    "C-S2": "SUBMISSION verdict approve while a check FAILs",
    "C-S3": "SUBMISSION artifact table lacks 배포 URL and 발표 파일",
    "X-2": "SMOKE.md lacks the PRD sentence-3 text",
    "X-3": "SUBMISSION approve while BOARD G5 is doing",
    "X-4": "SMOKE.md has no ## 완료 조건",
    "X-5": "the app owner inspects the app rows",
}

# Rules bad-01 deliberately keeps valid: a FAIL here is a false positive.
BAD_EXPECTED_PASSES = (
    "C-M1", "C-M2", "C-M3", "C-M4",
    "C-D1", "C-D2", "C-D3", "C-D4", "C-D5", "C-D6",
    "C-B4", "C-B5", "C-T4", "C-T6", "C-T7", "C-S4", "C-S6", "C-S7", "X-1",
)

_MODULE = None


def load_module():
    """Import scripts/validate_mission.py once, without writing __pycache__ into scripts/."""
    global _MODULE
    if _MODULE is None:
        if not SCRIPT.is_file():
            raise AssertionError(f"{SCRIPT.relative_to(REPO)} does not exist yet")
        spec = importlib.util.spec_from_file_location("validate_mission", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        previous = sys.dont_write_bytecode
        sys.dont_write_bytecode = True
        try:
            spec.loader.exec_module(module)
        finally:
            sys.dont_write_bytecode = previous
        _MODULE = module
    return _MODULE


def run_cli(mission_dir, stage):
    """Run the CLI. Returns (exit_code, results, summary_tuple, raw_lines, stderr)."""
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), str(mission_dir), "--stage", stage],
        cwd=str(REPO), capture_output=True, text=True, timeout=60,
        env=dict(os.environ, PYTHONDONTWRITEBYTECODE="1"),
    )
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    results = []
    summary = None
    for ln in lines:
        m = LINE_RE.match(ln)
        if m:
            results.append((m.group(1), m.group(2), m.group(3), m.group(4) or ""))
            continue
        s = SUMMARY_RE.match(ln)
        if s:
            summary = (int(s.group(1)), int(s.group(2)))
    return proc.returncode, results, summary, lines, proc.stderr


def collect_results(mission_dir, stage):
    return [tuple(r) for r in load_module().run(str(mission_dir), stage)]


def fails(results):
    return [r for r in results if r[0] == "FAIL"]


def fail_ids(results):
    return {r[2] for r in fails(results)}


def edit(root, rel, old, new, count=1):
    """Replace one anchor in a fixture copy; the anchor must exist."""
    path = Path(root) / rel
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise AssertionError(f"mutation anchor missing in {rel}: {old!r}")
    path.write_text(text.replace(old, new, count), encoding="utf-8")


def make_presubmit(root):
    """good-01 -> the moment submit-gate runs: G6 approved, 「제출」 not yet filled."""
    edit(root, "BOARD.md", "| submitted |", "| approved |")
    edit(root, "SUBMISSION.md", "- 시각: 15:55 [SIMULATION]", "- 시각: 미제출")
    edit(root, "SUBMISSION.md", "- 접수 확인: [SIMULATION] 리허설 접수 화면 스크린샷 (실제 제출 아님)", "- 접수 확인: 미제출")


class FixtureHygieneTest(unittest.TestCase):
    """Fixtures are simulations: every file says so, and the full set exists."""

    def test_fixture_dirs_exist(self):
        for d in (GOOD, BAD):
            with self.subTest(dir=d.name):
                self.assertTrue(d.is_dir())

    def test_every_fixture_file_marked_simulation(self):
        files = [p for p in FIXTURES.rglob("*") if p.is_file()]
        self.assertTrue(files)
        for path in files:
            with self.subTest(file=str(path.relative_to(FIXTURES))):
                self.assertIn("[SIMULATION]", path.read_text(encoding="utf-8"))

    def test_good_fixture_has_full_set(self):
        for name in ("MISSION.md", "DECISION.md", "PRD.md", "BOARD.md", "EVIDENCE.md",
                     "PITCH.md", "SUBMISSION.md", "DEMODAY.md", "app/SMOKE.md"):
            with self.subTest(file=name):
                self.assertTrue((GOOD / name).is_file())


class ApiShapeTest(unittest.TestCase):
    """Result rows are (status, stage, rule_id, message) with S-/C-/X- ids."""

    def test_result_rows_shape(self):
        results = collect_results(GOOD, "all")
        self.assertTrue(results, "validator returned no results")
        for row in results:
            with self.subTest(row=row):
                self.assertEqual(4, len(row))
                status, stage, rule_id, message = row
                self.assertIn(status, ("PASS", "FAIL", "WARN"))
                self.assertIn(stage, STAGES)
                self.assertRegex(rule_id, r"^(S|C|X)-\S+$")
                self.assertIsInstance(message, str)


class GoodFixtureTest(unittest.TestCase):
    """good-01 passes every stage, and every contract rule is actually evaluated."""

    def test_every_stage_passes(self):
        for stage in STAGES:
            with self.subTest(stage=stage):
                results = collect_results(GOOD, stage)
                self.assertTrue(any(r[0] == "PASS" for r in results))
                self.assertEqual([], fails(results))

    def test_all_contract_rules_evaluated(self):
        seen = {r[2] for r in collect_results(GOOD, "all")}
        missing = [rid for rid in ALL_CONTRACT_RULES if rid not in seen]
        self.assertEqual([], missing, "rules never reported (silently skipped?)")

    def test_presubmit_state_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            make_presubmit(root)
            self.assertEqual([], fails(collect_results(root, "submit")))


class StageFilesTest(unittest.TestCase):
    """v1.1 B0: each stage checks its own files; submit re-checks every earlier stage."""

    PREFIX = {
        "intake": ("MISSION", "C-M"),
        "board": ("BOARD", "C-B"),
        "evidence": ("EVIDENCE", "C-E"),
        "pitch": ("PITCH", "C-T"),
        "demoday": ("DEMODAY", "C-Y"),
    }

    def test_single_file_stages_stay_in_their_file(self):
        for stage, (name, family) in self.PREFIX.items():
            with self.subTest(stage=stage):
                ids = {r[2] for r in collect_results(GOOD, stage)}
                content = {i for i in ids if re.match(r"^C-[A-Z]\d", i)}
                self.assertTrue(content, "no content rule ran")
                self.assertTrue(all(i.startswith(family) for i in content), sorted(content))
                structure = {i for i in ids if i.startswith("S-") and i != "S-dup-heading"}
                self.assertTrue(all(i.startswith("S-" + name) for i in structure), sorted(structure))

    def test_intake_allows_zero_candidates_decide_needs_three(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            text = (root / "MISSION.md").read_text(encoding="utf-8")
            text = "\n".join(ln for ln in text.splitlines() if not re.match(r"^\| [ABC] \|", ln)) + "\n"
            (root / "MISSION.md").write_text(text, encoding="utf-8")
            self.assertEqual([], fails(collect_results(root, "intake")))
            self.assertIn("C-M4", fail_ids(collect_results(root, "decide")))
            # Options mode edits MISSION.md again, so decide re-runs every intake rule (finding: G1 blind spot).
            self.assertIn("C-M1", {r[2] for r in collect_results(root, "decide")},
                          "decide re-checks the intake rules of MISSION too")

    def test_evidence_allows_zero_simulation_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            text = (root / "EVIDENCE.md").read_text(encoding="utf-8")
            text = "\n".join(ln for ln in text.splitlines() if not ln.startswith("| S")) + "\n"
            (root / "EVIDENCE.md").write_text(text, encoding="utf-8")
            self.assertEqual([], fails(collect_results(root, "evidence")))

    def test_submit_rechecks_previous_stages(self):
        ids = {r[2] for r in collect_results(GOOD, "submit")}
        for rid in ("C-M1", "C-M4", "C-D1", "C-P1", "C-B1", "C-E1", "C-T1", "C-S1", "X-1", "C-Y1"):
            with self.subTest(rule=rid):
                self.assertIn(rid, ids)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            edit(root, "PRD.md", "Tiny: PASS", "Tiny: FAIL")
            self.assertIn("C-P3", fail_ids(collect_results(root, "submit")))

    def test_demoday_is_optional_at_submit_but_required_for_demoday(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            (root / "DEMODAY.md").unlink()
            self.assertEqual([], fails(collect_results(root, "submit")))
            self.assertIn("S-DEMODAY-missing", fail_ids(collect_results(root, "demoday")))

    def test_root_board_is_not_canonical(self):
        # v1.1 A4: only mission/BOARD.md counts; a BOARD.md next to mission/ is ignored.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            shutil.move(str(root / "BOARD.md"), str(Path(tmp) / "BOARD.md"))
            self.assertIn("S-BOARD-missing", fail_ids(collect_results(root, "board")))

    def test_smoke_next_to_mission_is_found(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            shutil.move(str(root / "app"), str(Path(tmp) / "app"))
            self.assertEqual([], fails(collect_results(root, "submit")))


class BadFixtureTest(unittest.TestCase):
    """bad-01 (composite) trips many distinct rules across PRD/BOARD/EVIDENCE/PITCH/SUBMISSION."""

    @classmethod
    def setUpClass(cls):
        cls.results = collect_results(BAD, "all")
        cls.failed = fail_ids(cls.results)

    def test_at_least_eight_distinct_fails(self):
        self.assertGreaterEqual(len(self.failed), 8, sorted(self.failed))

    def test_fails_span_five_files(self):
        families = {rid[:3] for rid in self.failed if rid.startswith("C-")}
        for fam in ("C-P", "C-E", "C-T", "C-S", "C-B"):
            with self.subTest(family=fam):
                self.assertIn(fam, families)

    def test_each_planted_violation_detected(self):
        for rid, why in BAD_EXPECTED_FAILS.items():
            with self.subTest(rule=rid):
                self.assertIn(rid, self.failed, why)

    def test_no_false_positives_on_valid_parts(self):
        for rid in BAD_EXPECTED_PASSES:
            with self.subTest(rule=rid):
                self.assertNotIn(rid, self.failed)

    def test_no_structure_fails(self):
        # Every bad-01 violation is content or cross; the structure is intact.
        self.assertEqual(set(), {r for r in self.failed if r.startswith("S-")})

    def test_intake_stage_isolated(self):
        self.assertEqual([], fails(collect_results(BAD, "intake")))

    def test_stage_filters(self):
        expectations = {
            "decide": {"C-P1", "C-P2", "C-P3", "C-P4"},
            "board": {"C-B1", "C-B2", "C-B3"},
            "evidence": {"C-E1", "C-E2", "C-E3", "C-E4"},
            "pitch": {"C-T1", "C-T2", "C-T3", "C-T5", "C-T8"},
            "submit": {"C-S1", "C-S2", "C-S3", "X-2", "X-3", "X-4", "X-5"},
        }
        for stage, expected in expectations.items():
            with self.subTest(stage=stage):
                got = fail_ids(collect_results(BAD, stage))
                self.assertTrue(expected <= got, f"missing {sorted(expected - got)}")


class CliContractTest(unittest.TestCase):
    """CLI output lines, SUMMARY and exit codes (used by CI and check.sh)."""

    def assert_well_formed(self, lines, results, summary):
        self.assertTrue(lines, "no output")
        self.assertIsNotNone(summary, "missing SUMMARY line")
        self.assertTrue(SUMMARY_RE.match(lines[-1]), "SUMMARY must be the last line")
        for ln in lines[:-1]:
            self.assertRegex(ln, LINE_RE)
        npass = sum(1 for r in results if r[0] == "PASS")
        nfail = sum(1 for r in results if r[0] == "FAIL")
        self.assertEqual((npass, nfail), summary)

    def test_good_exit_zero(self):
        code, results, summary, lines, err = run_cli(GOOD, "all")
        self.assert_well_formed(lines, results, summary)
        self.assertEqual(0, code, err)
        self.assertEqual(0, summary[1])

    def test_bad_exit_one(self):
        code, results, summary, lines, err = run_cli(BAD, "all")
        self.assert_well_formed(lines, results, summary)
        self.assertEqual(1, code, err)
        self.assertGreaterEqual(summary[1], 8)

    def test_cli_matches_api(self):
        _, cli_results, _, _, _ = run_cli(BAD, "all")
        self.assertEqual(fail_ids(collect_results(BAD, "all")), fail_ids(cli_results))

    def test_demoday_stage_accepted(self):
        code, _, summary, _, err = run_cli(GOOD, "demoday")
        self.assertEqual(0, code, err)
        self.assertGreater(summary[0], 0)

    def test_missing_files_are_structure_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            empty = Path(tmp) / "mission"
            empty.mkdir()
            code, results, _, _, err = run_cli(empty, "intake")
            self.assertEqual(1, code, err)
            self.assertTrue(any(r[0] == "FAIL" and r[2].startswith("S-") for r in results))


class MarkdownRulesTest(unittest.TestCase):
    """v1.1 B1: heading order, extra H2, duplicates, GFM tables, [예시] rows, [SIMULATION] substring."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name) / "mission"
        shutil.copytree(GOOD, self.root)

    def test_extra_h2_between_required_is_allowed(self):
        edit(self.root, "MISSION.md", "## 미확인", "## 메모\n\n- 팀 메모 [SIMULATION]\n\n## 미확인")
        self.assertEqual([], fails(collect_results(self.root, "intake")))

    def test_heading_whitespace_is_trimmed(self):
        edit(self.root, "MISSION.md", "## 사실", "##   사실   ")
        self.assertEqual([], fails(collect_results(self.root, "intake")))

    def test_out_of_order_headings_fail(self):
        edit(self.root, "MISSION.md", "## 사실", "## 사실TMP")
        edit(self.root, "MISSION.md", "## 해석", "## 사실")
        edit(self.root, "MISSION.md", "## 사실TMP", "## 해석")
        self.assertIn("S-MISSION-headings", fail_ids(collect_results(self.root, "intake")))

    def test_table_without_separator_is_not_a_table(self):
        edit(self.root, "PITCH.md", "| 심사기준 | 어디서 다루나 |\n|---|---|\n", "| 심사기준 | 어디서 다루나 |\n")
        self.assertIn("S-PITCH-table-mapping", fail_ids(collect_results(self.root, "pitch")))

    def test_header_cells_are_trimmed_and_exact(self):
        edit(self.root, "PITCH.md", "| 심사기준 | 어디서 다루나 |", "|   심사기준|어디서 다루나   |")
        self.assertEqual([], fails(collect_results(self.root, "pitch")))
        edit(self.root, "PITCH.md", "|   심사기준|어디서 다루나   |", "| 심사 기준 | 어디서 다루나 |")
        self.assertIn("S-PITCH-table-mapping", fail_ids(collect_results(self.root, "pitch")))

    def test_escaped_pipe_stays_in_cell(self):
        edit(self.root, "PITCH.md", "| 데모 완성도 | Slide 2 데모 · 라이브 데모 |",
             "| 데모 완성도 | Slide 2 데모 \\| 라이브 데모 |")
        self.assertEqual([], fails(collect_results(self.root, "pitch")))

    def test_example_rows_are_skipped(self):
        edit(self.root, "MISSION.md", "| A | 혼자 사는 직장인 |",
             "| D | [예시] 템플릿 예시 고객 | 문제 | 이유 | 장면 | 1 |\n| A | 혼자 사는 직장인 |")
        edit(self.root, "MISSION.md", "## 사실\n", "## 사실\n\n- [예시] 템플릿 예시 줄\n")
        self.assertEqual([], fails(collect_results(self.root, "all")))

    def test_simulation_mark_is_a_substring(self):
        # "[SIMULATION] 리허설용 ..." already passes in good-01 (S3); another prefix form also passes.
        edit(self.root, "EVIDENCE.md", "| [SIMULATION] 가상 구매자 B", "| 리허설 [SIMULATION] 가상 구매자 B")
        self.assertEqual([], fails(collect_results(self.root, "evidence")))

    def test_structure_failure_marks_content_unreliable(self):
        edit(self.root, "EVIDENCE.md", "| ID | 주장 | 출처 | 연도 |", "| ID | 주장 | 출처 | 년도 |")
        results = collect_results(self.root, "submit")
        self.assertIn("S-EVIDENCE-table-claims", fail_ids(results))
        evidence_c = [r for r in results if r[2] in ("C-E1", "C-E3", "C-E4")]
        self.assertTrue(evidence_c)
        for r in evidence_c:
            with self.subTest(rule=r[2]):
                self.assertIn(UNRELIABLE, r[3])
        x1 = [r for r in results if r[2] == "X-1"]
        self.assertTrue(x1 and UNRELIABLE in x1[0][3])
        # Other files stay trusted.
        self.assertTrue(all(UNRELIABLE not in r[3] for r in results if r[2].startswith("C-M")))


# (rule, stage, file, old, new, extra allowed FAIL ids)
MUTATIONS = [
    ("S-dup-heading", "intake", "MISSION.md", "## 제출물", "## 사실\n\n- 중복 절\n\n## 제출물", ()),
    ("C-M4", "decide", "MISSION.md", "| C | 원룸 거주 대학생", "| B | 원룸 거주 대학생", ()),
    ("C-D1", "decide", "DECISION.md", "| B | 5 | 5 | 4 | 3 | 17 |", "| B | 5 | 5 | 4 | 3 | 18 |", ()),
    ("C-D2", "decide", "DECISION.md", "| C | 양면 시장", "| B | 양면 시장", ()),
    ("C-D5", "decide", "DECISION.md", "선택: B", "선택: 후보 2", ()),
    ("C-D6", "decide", "DECISION.md", "| A | 3 | 4 | 2 | 2 | 11 |", "| A | 5 | 5 | 4 | 3 | 17 |", ()),
    ("C-P1", "decide", "PRD.md", "4. 재료 목록을 넣으면 오늘 만들 메뉴와 조리 순서를 보여줍니다.", "4. 음성 요약", ()),
    ("C-P2", "decide", "PRD.md", "1. 사용자는 퇴근 후 혼자 저녁을 차리는 직장인 한 명입니다.",
     "1. 사용자는 <사용자> 한 명입니다.", ("C-empty",)),
    ("C-P3", "decide", "PRD.md", "Tiny: PASS — 메뉴 추천 하나만 G3 13:00까지 끝난다", "Tiny: PASS", ()),
    ("C-P4", "decide", "PRD.md", "버전: v1 (10:15)\n", "", ()),
    ("C-B1", "board", "BOARD.md", "| submitted |", "| done |", ()),
    ("C-B2", "board", "BOARD.md", "| mission/PRD.md | 10:35 | G2 | - |", "| mission/PRD.md | 10:35 | G2 | T7 |", ()),
    ("C-B3", "board", "BOARD.md", "| HANDOFF.md#제안 | 전원 | append-only |\n", "", ()),
    ("C-B4", "board", "BOARD.md", "| 태진 | 2 | Claude (행사 크레딧) | 잔여 30% 이하면 중단 | 30분 |\n", "", ()),
    ("C-B5", "board", "BOARD.md", "| 14:00 | 6 | [SIMULATION] 창구 확인 |", "| 14:00 | 6 |  |", ()),
    ("C-E1", "evidence", "EVIDENCE.md", "| hypothesis | 2 |", "| hypotesis | 2 |", ()),
    ("C-E2", "evidence", "EVIDENCE.md", "| 국내 · 분/일 | hypothesis |", "| 국내 · 분/일 | single-source |", ()),
    ("C-E3", "evidence", "EVIDENCE.md", "| 무료 체험 후 결정 | simulation |", "| 무료 체험 후 결정 | hypothesis |", ()),
    ("C-E4", "evidence", "EVIDENCE.md", "> 구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지\n", "", ()),
    ("C-T1", "pitch", "PITCH.md", "## 스크립트 (90초)", "## Slide 4\n\n- 팀 소개 [SIMULATION]\n\n## 스크립트 (90초)", ()),
    ("C-T2", "pitch", "PITCH.md", "- 제목: 냉장고 재료로 오늘 저녁 메뉴 하나",
     "- 제목: 냉장고 재료로 오늘 저녁 메뉴 하나\n- 1인 가구 80%가 매일 30분을 쓴다", ()),
    ("C-T3", "pitch", "PITCH.md", "감사합니다.", "감사합니다. " + "정말 " * 200, ()),
    ("C-T4", "pitch", "PITCH.md", "| 구매 이유 | Slide 2 구매자 반응 |", "| 구매 이유 |  |", ()),
    ("C-T5", "pitch", "PITCH.md", "- 다음 단계: 실제 사용자와 첫 테스트를 한다", "- 파일럿 고객 확보", ()),
    ("C-T6", "pitch", "PITCH.md", "낭독: 82초", "낭독: 110초", ()),
    ("C-T7", "pitch", "PITCH.md",
     "| E1 | Slide 1 시장 | hypothesis |\n| E2 | Slide 1 문제 | hypothesis |\n| E3 | Slide 2 구매자 반응 | simulation |\n",
     "", ("X-1",)),
    ("C-T8", "pitch", "PITCH.md", "- 페이지: 2", "- 페이지: 3", ()),
    ("C-T9", "pitch", "PITCH.md", "| Sales | 구매자 반응이 실제처럼 읽힌다 | 시뮬레이션 표기를 같은 줄에 붙였다 |\n", "", ()),
    ("C-S1", "submit", "SUBMISSION.md", "| 7 | 제출 양식 필드 |", "| 7 | 비밀 0건 |", ()),
    ("C-S2", "submit", "SUBMISSION.md", "| 7 | 제출 양식 필드 | PASS |", "| 7 | 제출 양식 필드 | NOT_RUN |", ()),
    ("C-S3", "submit", "SUBMISSION.md", "| 배포 URL | https://hthn-sim.invalid/ | 3f9c2ab | URL | 커밋 3f9c2ab |\n", "", ()),
    ("C-S4", "submit", "SUBMISSION.md", "| 1 | 14:10 | 3/3 (배포 URL · 브라우저) | 0 | 없음 |\n"
     "| precheck | 14:50 | 체크 PASS 9/9 | 없음 | 없음 |\n| 2 | 15:35 | 3/3 (배포 URL · 브라우저) | 0 | 없음 |\n", "", ()),
    ("C-S7", "submit", "SUBMISSION.md", "- 타임아웃 시: 재전송 금지, 접수 상태 확인", "- 타임아웃 시: 다시 보낸다", ()),
    ("X-1", "submit", "PITCH.md", "| E2 | Slide 1 문제 | hypothesis |", "| E2 | Slide 1 문제 | verified |", ()),
    ("X-2", "submit", "app/SMOKE.md", "냉장고 재료로 메뉴 추천:", "메뉴 추천:", ()),
    ("X-3", "submit", "BOARD.md", "| 2장과 90초 스크립트 확정 | done |", "| 2장과 90초 스크립트 확정 | doing |", ()),
    ("X-4", "submit", "app/SMOKE.md", "- 추천 메뉴와 조리 순서 세 단계를 화면에 표시하면", "- 추천 메뉴를 화면에 표시하면", ()),
    ("X-5", "submit", "SUBMISSION.md", "| 다른 기기 브라우저로 배포 URL 열림 · 첫 화면 표시 | Sales(태진) |",
     "| 다른 기기 브라우저로 배포 URL 열림 · 첫 화면 표시 | Build(준서) |", ()),
    ("C-empty", "intake", "MISSION.md", "| A | 혼자 사는 직장인 |", "| A | <고객> |", ()),
    ("C-Y2", "demoday", "DEMODAY.md", "| 2 | 86 | 통과 |\n", "", ()),
]


class MutationTest(unittest.TestCase):
    """v1.1 B4: one mutation of good-01 per rule -> exactly that rule FAILs."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.n = 0

    def copy(self):
        self.n += 1
        dst = Path(self._tmp.name) / f"m{self.n}" / "mission"
        shutil.copytree(GOOD, dst)
        return dst

    def failed_after(self, stage, *edits):
        root = self.copy()
        for rel, old, new in edits:
            edit(root, rel, old, new)
        return fail_ids(collect_results(root, stage))

    def test_each_rule_fails_alone(self):
        for rule, stage, rel, old, new, extra in MUTATIONS:
            with self.subTest(rule=rule):
                got = self.failed_after(stage, (rel, old, new))
                self.assertIn(rule, got)
                self.assertEqual(set(), got - {rule} - set(extra), f"collateral FAILs for {rule}")

    def test_minimum_rule_list_is_covered(self):
        required = ("S-dup-heading", "C-M4", "C-D1", "C-D5", "C-P1", "C-P2", "C-P3", "C-P4", "C-B1",
                    "C-B2", "C-B3", "C-E2", "C-E3", "C-E4", "C-T1", "C-T2", "C-T7", "C-T8", "C-S1",
                    "C-S2", "C-S6", "C-S7", "X-1", "X-2", "X-3", "X-4", "X-5", "C-empty")
        covered = {m[0] for m in MUTATIONS} | {"C-S6"}  # C-S6 has its own tests below
        self.assertEqual([], [r for r in required if r not in covered])

    # --- tightened rules (conformance review): each mutation FAILs only its rule ---

    def assert_only(self, rule, stage, *edits):
        got = self.failed_after(stage, *edits)
        self.assertIn(rule, got)
        self.assertEqual(set(), got - {rule}, f"collateral FAILs for {rule}")

    def test_duplicate_gate_row_c_b1(self):
        g3 = "| G3 | 13:00 | 핵심 장면이 배포 URL에서 작동 | done |"
        self.assert_only("C-B1", "board", ("BOARD.md", g3, g3 + "\n" + g3.replace("| done |", "| blocked |")))

    def test_two_space_separated_owners_c_b2(self):
        self.assert_only("C-B2", "board", ("BOARD.md", "| T4 | 시장 근거 | 곤살로 |", "| T4 | 시장 근거 | 곤살로 태진 |"))

    def test_one_owner_role_with_name_passes_c_b2(self):
        got = self.failed_after("board", ("BOARD.md", "| T4 | 시장 근거 | 곤살로 |", "| T4 | 시장 근거 | GTM(곤살로) |"))
        self.assertNotIn("C-B2", got)

    def test_slide_heading_variants_c_t1(self):
        for heading in ("## slide 3", "## 슬라이드 3", "## Slide", "## SLIDE 2b"):
            with self.subTest(heading=heading):
                self.assert_only("C-T1", "pitch", ("PITCH.md", "## 스크립트 (90초)",
                                                   heading + "\n\n- 팀 소개 [SIMULATION]\n\n## 스크립트 (90초)"))

    def test_x2_looks_only_at_step_2(self):
        # The sentence-3 text moved from step 2 to step 1: still in SMOKE.md, but X-2 must FAIL.
        self.assert_only("X-2", "submit",
                         ("app/SMOKE.md", "1. 페이지를 연다 — ", "1. 페이지를 연다 (냉장고 재료로 메뉴 추천 화면) — "),
                         ("app/SMOKE.md", "냉장고 재료로 메뉴 추천:", "메뉴 추천:"))

    # --- C-P1: sentence 4 variants ---------------------------------------

    def test_prd_sentence4_variants(self):
        line = "4. 재료 목록을 넣으면 오늘 만들 메뉴와 조리 순서를 보여줍니다."
        self.assertNotIn("C-P1", self.failed_after("decide", ("PRD.md", line, "4. 음성을 넣으면 요약을 보여줍니다.")))
        self.assertNotIn("C-P1", self.failed_after("decide", ("PRD.md", line, "4. 사진을 넣으면 항목이 표시합니다.")))
        self.assertIn("C-P1", self.failed_after("decide", ("PRD.md", line, "4. 음성 요약")))

    def test_prd_frame_is_fullmatch(self):
        line = "6. 추천 메뉴와 조리 순서 세 단계를 화면에 표시하면 완료입니다."
        self.assertIn("C-P1", self.failed_after("decide", ("PRD.md", line, line + " 끝")))

    def test_prd_blank_capture_c_p2(self):
        got = self.failed_after("decide", ("PRD.md", "회원가입, 장보기 결제, 영양 분석을", "______, 장보기 결제, 영양 분석을"))
        self.assertIn("C-P2", got)

    def test_cut_fail_value_c_p3(self):
        self.assertIn("C-P3", self.failed_after("decide", ("PRD.md", "Usable: PASS", "Usable: FAIL")))

    # --- DECISION ties -----------------------------------------------------

    def test_tie_with_rule_line_passes_c_d6(self):
        got = self.failed_after("decide",
                                ("DECISION.md", "| A | 3 | 4 | 2 | 2 | 11 |", "| A | 5 | 5 | 4 | 3 | 17 |"),
                                ("DECISION.md", "- 결정자: 우영", "- 동점 처리: 데모 가능성이 같아 Mission Fit 근거가 강한 B\n- 결정자: 우영"))
        self.assertEqual(set(), got)

    # --- BOARD -----------------------------------------------------------

    def test_g6_enum_c_b1(self):
        self.assertEqual(set(), self.failed_after("board", ("BOARD.md", "| submitted |", "| approved |")))
        self.assertIn("C-B1", self.failed_after("board", ("BOARD.md", "| submitted |", "| done |")))
        self.assertIn("C-B1", self.failed_after("board", ("BOARD.md", "| 핵심 장면이 배포 URL에서 작동 | done |",
                                                           "| 핵심 장면이 배포 URL에서 작동 | approved |")))

    def test_missing_g1_row_c_b1(self):
        self.assertIn("C-B1", self.failed_after("board", ("BOARD.md", "| G1 | 10:20 | 후보 3개 점수화 · 선택 · PRD 6문장 C·U·T | done |\n", "")))

    def test_task_rules_c_b2(self):
        for old, new in (("| T3 | 메뉴 추천 화면 구현과 배포 | 준서 |", "| T3 | 메뉴 추천 화면 구현과 배포 | 준서, 태진 |"),
                         ("| G3 | T2 | done |", "| G3 | T9 | done |"),
                         ("| T3 |", "| 3 |"),
                         ("| T3 |", "| T2 |")):
            with self.subTest(old=old, new=new):
                self.assertIn("C-B2", self.failed_after("board", ("BOARD.md", old, new)))

    def test_write_rule_enum_c_b3(self):
        self.assertIn("C-B3", self.failed_after("board", ("BOARD.md", "| app/ | Build(준서) | 소유자만 |", "| app/ | Build(준서) | 자유 |")))

    # --- SUBMISSION ------------------------------------------------------

    def _defect(self, row, item):
        return [("SUBMISSION.md", f"| {row} | {item} | PASS |", f"| {row} | {item} | FAIL |"),
                ("SUBMISSION.md", "## 판정\n\napprove", "## 판정\n\napprove-with-defects")]

    def test_approve_with_defects_complete_passes(self):
        got = self.failed_after("submit", *self._defect(7, "제출 양식 필드"),
                                ("SUBMISSION.md", "- (없음) — 체크 외 관찰", "- #7 FAIL — 설명란 미완 · 담당 PM\n- PM 승인: PM(우영) 16:05\n- 체크 외 관찰"))
        self.assertEqual(set(), got)

    def test_approve_with_defects_needs_pm_approval_c_s6(self):
        got = self.failed_after("submit", *self._defect(7, "제출 양식 필드"),
                                ("SUBMISSION.md", "- (없음) — 체크 외 관찰", "- #7 FAIL — 설명란 미완\n- 체크 외 관찰"))
        self.assertEqual({"C-S6"}, got)

    def test_approve_with_defects_lists_every_defect_c_s6(self):
        got = self.failed_after("submit", *self._defect(7, "제출 양식 필드"),
                                ("SUBMISSION.md", "- (없음) — 체크 외 관찰", "- PM 승인: PM(우영) 16:05\n- 체크 외 관찰"))
        self.assertEqual({"C-S6"}, got)

    def test_non_waivable_rows_block_approve_with_defects_c_s2(self):
        for row, item in ((1, "데모 URL 접근"), (3, "2장 파일 (페이지 ≤ 2)"), (4, "개인정보 0"),
                          (5, "라벨·시뮬레이션 표기"), (10, "시각·슬롯")):
            with self.subTest(row=row):
                got = self.failed_after("submit", *self._defect(row, item),
                                        ("SUBMISSION.md", "- (없음) — 체크 외 관찰",
                                         f"- #{row} FAIL\n- PM 승인: PM(우영) 16:05\n- 체크 외 관찰"))
                self.assertEqual({"C-S2"}, got)

    def test_verdict_enum_c_s2(self):
        self.assertIn("C-S2", self.failed_after("submit", ("SUBMISSION.md", "## 판정\n\napprove", "## 판정\n\n승인")))
        self.assertEqual(set(), self.failed_after("submit", ("SUBMISSION.md", "## 판정\n\napprove", "## 판정\n\nrevise")))

    def test_check_result_enum_c_s1(self):
        self.assertIn("C-S1", self.failed_after("submit", ("SUBMISSION.md", "| 6 | 심사기준 매핑 | PASS |", "| 6 | 심사기준 매핑 | SKIP |")))

    def test_last_check_label_is_fixed_c_s1(self):
        self.assertIn("C-S1", self.failed_after("submit", ("SUBMISSION.md", "| 10 | 시각·슬롯 |", "| 10 | 시각·슬롯·행사 모드 |")))

    def test_submit_lines_c_s7(self):
        self.assertIn("C-S7", self.failed_after("submit", ("SUBMISSION.md", "- 담당: PM", "- 담당: Sales")))
        self.assertIn("C-S7", self.failed_after("submit", ("SUBMISSION.md", "- 접수 확인: [SIMULATION] 리허설 접수 화면 스크린샷 (실제 제출 아님)\n", "")))

    # --- cross -----------------------------------------------------------

    def test_inline_tag_label_upgrade_x1(self):
        self.assertEqual({"X-1"}, self.failed_after("submit", ("PITCH.md", "(E1 · hypothesis)", "(E1 · verified)")))

    def test_unknown_claim_id_x1(self):
        self.assertEqual({"X-1"}, self.failed_after("submit", ("PITCH.md", "| E2 | Slide 1 문제 | hypothesis |",
                                                                 "| E9 | Slide 1 문제 | hypothesis |")))

    def test_x3_ignores_g6(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mission"
            shutil.copytree(GOOD, root)
            make_presubmit(root)
            self.assertNotIn("X-3", fail_ids(collect_results(root, "submit")))
            edit(root, "BOARD.md", "| 2장과 90초 스크립트 확정 | done |", "| 2장과 90초 스크립트 확정 | doing |")
            self.assertEqual({"X-3"}, fail_ids(collect_results(root, "submit")))

    def test_x3_allows_revise_with_open_gates(self):
        got = self.failed_after("submit", ("BOARD.md", "| 2장과 90초 스크립트 확정 | done |", "| 2장과 90초 스크립트 확정 | doing |"),
                                ("SUBMISSION.md", "## 판정\n\napprove", "## 판정\n\nrevise"))
        self.assertEqual(set(), got)

    def test_x4_needs_completion_section(self):
        self.assertEqual({"X-4"}, self.failed_after("submit", ("app/SMOKE.md", "## 완료 조건", "## 끝")))

    def test_x5_owner_lookup(self):
        row3 = "| pitch/slides.pdf 2쪽 · PITCH에 Slide 3 없음 | PM(우영) |"
        row5 = "| validate --stage pitch C-T2·C-T5 PASS · X-1 PASS | PM(우영) |"
        cases = (
            ("SUBMISSION.md", row3, row3.replace("PM(우영)", "GTM(곤살로)")),   # PITCH owner checks row 3
            ("SUBMISSION.md", row5, row5.replace("PM(우영)", "태진")),          # Buyer-simulation owner checks row 5
            ("SUBMISSION.md", "| 팀명·데모 링크·파일·설명(사전 준비물 줄 포함) 준비 | Build(준서) |",
             "| 팀명·데모 링크·파일·설명(사전 준비물 줄 포함) 준비 |  |"),          # row 7 blank
        )
        for rel, old, new in cases:
            with self.subTest(new=new):
                self.assertEqual({"X-5"}, self.failed_after("submit", (rel, old, new)))
        # Rows 4·7·10 may be checked by anyone, even the app owner.
        self.assertEqual(set(), self.failed_after("submit", ("SUBMISSION.md", "| 팀명·데모 링크·파일·설명(사전 준비물 줄 포함) 준비 | Build(준서) |",
                                                             "| 팀명·데모 링크·파일·설명(사전 준비물 줄 포함) 준비 | 준서 |")))

    def test_x5_follows_board_ownership(self):
        # Moving app/ ownership to Sales makes Sales' rows 1·2·8·9 self-checks.
        self.assertEqual({"X-5"}, self.failed_after("submit", ("BOARD.md", "| app/ | Build(준서) | 소유자만 |", "| app/ | Sales(태진) | 소유자만 |")))

    # --- labels on slides ------------------------------------------------

    def test_labelled_number_line_passes_c_t2(self):
        got = self.failed_after("pitch", ("PITCH.md", "- 제목: 냉장고 재료로 오늘 저녁 메뉴 하나",
                                          "- 제목: 냉장고 재료로 오늘 저녁 메뉴 하나\n- 1인 가구 80%가 매일 30분을 쓴다 (hypothesis)"))
        self.assertEqual(set(), got)

    def test_product_spec_line_passes(self):
        got = self.failed_after("pitch", ("PITCH.md", "- 다음 단계: 실제 사용자와 첫 테스트를 한다",
                                          "- 한 번에 1건 계약서 양식을 읽는다 (제품 사양)"))
        self.assertEqual(set(), got)

    def test_label_check_none_line_with_numbers_fails_c_t7(self):
        old = "| 주장 ID | 슬라이드 | 라벨 |\n|---|---|---|\n| E1 | Slide 1 시장 | hypothesis |\n| E2 | Slide 1 문제 | hypothesis |\n| E3 | Slide 2 구매자 반응 | simulation |\n"
        self.assertIn("C-T7", self.failed_after("pitch", ("PITCH.md", old, "없음\n")))

    # --- empty values ----------------------------------------------------

    def test_empty_value_forms(self):
        for value in ("<고객>", "______", "TBD", ""):
            with self.subTest(value=value):
                got = self.failed_after("decide", ("MISSION.md", "| A | 혼자 사는 직장인 |", f"| A | {value} |"))
                self.assertIn("C-M4", got)

    def test_empty_value_definition(self):
        # v1.1 B1: blank, ^<.*>$, ______, TBD, [예시]. "-" is a value (의존 "-", 연도 "-" on hypothesis rows).
        is_empty = load_module().is_empty
        for value in ("", "  ", "<이름>", "<PASS|FAIL>", "______", "TBD", "[예시] 고객", "`<x>`"):
            with self.subTest(value=value):
                self.assertTrue(is_empty(value))
        for value in ("-", "PM", "0", "A"):
            with self.subTest(value=value):
                self.assertFalse(is_empty(value))

    # --- encoding --------------------------------------------------------

    def test_bom_does_not_break_title(self):
        root = self.copy()
        path = root / "MISSION.md"
        path.write_bytes(b"\xef\xbb\xbf" + path.read_bytes())
        self.assertEqual([], fails(collect_results(root, "intake")))


def warn_ids(results):
    return {r[2] for r in results if r[0] == "WARN"}


class DryRunFindingsTest(unittest.TestCase):
    """Rules tightened after the overnight dry runs [SIMULATION]: each mutation hits only its rule."""

    setUp = MutationTest.setUp
    copy = MutationTest.copy
    failed_after = MutationTest.failed_after
    assert_only = MutationTest.assert_only

    def results_after(self, stage, *edits):
        root = self.copy()
        for rel, old, new in edits:
            edit(root, rel, old, new)
        return collect_results(root, stage)

    def test_organizer_headings_inside_raw_text_are_content(self):
        quote = '"1인 가구의 일상 문제를 AI로 해결하는 서비스를 만들어라." [SIMULATION]'
        pasted = quote + "\n\n## 심사기준\n\n- 원문 속 심사기준 줄 [SIMULATION]\n\n## 일정\n\n- 17:00 마감"
        self.assertEqual(set(), self.failed_after("intake", ("MISSION.md", quote, pasted)))

    def test_ascii_slots_are_empty_values(self):
        self.assert_only("C-empty", "board", ("BOARD.md", "재계획 0회", "재계획 <n>회"))
        self.assert_only("C-empty", "submit", ("SUBMISSION.md", "| 0 | 없음 |\n| precheck", "| E<n> | 없음 |\n| precheck"))

    def test_deploy_url_row_needs_a_url(self):
        self.assert_only("C-S3", "submit", ("SUBMISSION.md", "| 배포 URL | https://hthn-sim.invalid/ |", "| 배포 URL | 없음 |"))

    def test_bare_hash_needs_the_no_git_marker(self):
        digest = "a" * 64
        self.assert_only("C-S3", "submit", ("SUBMISSION.md", "| 커밋 | 커밋 3f9c2ab |", f"| 커밋 | {digest} |"))
        self.assertEqual(set(), self.failed_after("submit", ("SUBMISSION.md", "| 커밋 | 커밋 3f9c2ab |",
                                                             f"| 커밋 | 내용 sha256 {digest} (no git) |")))

    def test_slide_file_must_exist_and_match(self):
        self.assert_only("C-T8", "submit", ("PITCH.md", "- 크기: 1003", "- 크기: 1004"))
        self.assert_only("C-T8", "pitch", ("PITCH.md", "- 크기: 1003", "- 크기: 미측정"))
        root = self.copy()
        (root / "pitch" / "slides.pdf").unlink()
        self.assertIn("C-T8", fail_ids(collect_results(root, "pitch")))

    def test_pending_human_values_warn_then_fail(self):
        edits = (("PITCH.md", "- 크기: 1003", "- 크기: 사람 기입 대기"),
                 ("PITCH.md", "낭독: 82초 (측정 15:20 GTM)", "낭독: 사람 측정 대기"))
        pitch = self.results_after("pitch", *edits)
        self.assertEqual([], fails(pitch))
        self.assertTrue({"C-T8", "C-T6"} <= warn_ids(pitch))
        self.assertTrue({"C-T8", "C-T6"} <= fail_ids(self.results_after("submit", *edits)))

    def test_estimated_read_time_is_not_a_measurement(self):
        estimate = ("PITCH.md", "낭독: 82초 (측정 15:20 GTM)", "낭독: 82초 (추정)")
        self.assertEqual(set(), self.failed_after("pitch", estimate))
        self.assert_only("C-T6", "submit", estimate)
        self.assertIn("C-T6", self.failed_after("pitch", ("PITCH.md", "낭독: 82초 (측정 15:20 GTM)", "낭독: 초")))

    def test_minute_numbers_need_a_label(self):
        self.assert_only("C-T2", "pitch", ("PITCH.md", "- 제목: 냉장고 재료로 오늘 저녁 메뉴 하나",
                                           "- 제목: 냉장고 재료로 오늘 저녁 메뉴 하나\n- 저녁 결정 시간 절감 11분"))

    def test_payment_intent_is_traction(self):
        self.assert_only("C-T5", "pitch", ("PITCH.md", "- 다음 단계: 실제 사용자와 첫 테스트를 한다",
                                           "- 가상 구매자 결제 의향 있음"))

    def test_label_mismatch_shows_at_pitch_stage(self):
        self.assertIn("X-1", self.failed_after("pitch", ("PITCH.md", "| E2 | Slide 1 문제 | hypothesis |",
                                                         "| E2 | Slide 1 문제 | verified |")))

    def test_every_mission_criterion_is_mapped(self):
        self.assert_only("C-T4", "pitch", ("PITCH.md", "| 구매 이유 | Slide 2 구매자 반응 |\n", ""))

    def test_fake_source_is_never_single_source(self):
        self.assert_only("C-E2", "evidence", ("EVIDENCE.md", "| 팀 추론 | - | 국내 · 분/일 | hypothesis |",
                                              "| 팀 추론 | 2025 | 국내 · 분/일 | single-source |"))

    def test_rejected_interpretation_row_is_not_a_candidate(self):
        self.assertEqual(set(), self.failed_after("decide", ("DECISION.md", "| C | 양면 시장",
                                                             "| 해석: 감시형 읽기 [SIMULATION] | 개인별 데이터를 기관에 넘기는 읽기는 기각 |\n| C | 양면 시장")))

    def test_decide_rechecks_intake_rules(self):
        self.assertIn("C-M2", self.failed_after("decide", ("MISSION.md", "(해석: 준서)", "")))

    def test_slot_rows_are_ordered_numbers(self):
        self.assert_only("C-B5", "board", ("BOARD.md", "| 15:30 | 5 |", "| 15:30 | 다섯 |"))
        self.assert_only("C-B5", "board", ("BOARD.md", "| 15:30 | 5 |", "| 13:10 | 5 |"))
        low = self.results_after("board", ("BOARD.md", "| 15:30 | 5 |", "| 15:30 | 2 |"))
        self.assertEqual([], fails(low))
        self.assertIn("C-B5", warn_ids(low))

    def test_substitute_marker_is_never_pass(self):
        self.assert_only("C-S1", "submit", ("SUBMISSION.md", "| 창구 열림 · 슬롯 14:00 행 기록 · 16:50 이전 |",
                                            "| [SIMULATION 대체] 리허설 — 행사 계정 없음 |"))

    def test_unrun_row_checker_form(self):
        row7 = "| 7 | 제출 양식 필드 | PASS | 팀명·데모 링크·파일·설명(사전 준비물 줄 포함) 준비 | Build(준서) |"
        unrun = "| 7 | 제출 양식 필드 | NOT_RUN | Build 부재 | 미실행 |"
        self.assertEqual(set(), self.failed_after("submit", ("SUBMISSION.md", row7, unrun),
                                                  ("SUBMISSION.md", "## 판정\n\napprove", "## 판정\n\nrevise")))
        self.assertIn("X-5", self.failed_after("submit", ("SUBMISSION.md", row7, unrun.replace("NOT_RUN", "PASS"))))

    def test_checkpoint_drift_is_a_warning(self):
        results = self.results_after("board", ("HANDOFF.md", "15:52 T7 done", "15:52 T7 blocked"))
        self.assertEqual([], fails(results))
        self.assertIn("X-6", warn_ids(results))

    def test_cli_counts_warnings(self):
        root = self.copy()
        edit(root, "HANDOFF.md", "15:52 T7 done", "15:52 T7 blocked")
        code, results, summary, lines, err = run_cli(root, "board")
        self.assertEqual(0, code, err)
        self.assertRegex(lines[-1], r"warn=[1-9]")


class WindowsConsoleTest(unittest.TestCase):
    """Korean Windows consoles are cp949: the CLI must still print (no UnicodeEncodeError)."""

    def test_cp949_stdout(self):
        env = dict(os.environ, PYTHONIOENCODING="cp949", PYTHONDONTWRITEBYTECODE="1")
        env.pop("PYTHONUTF8", None)
        proc = subprocess.run([sys.executable, str(SCRIPT), str(GOOD), "--stage", "all"],
                              cwd=str(REPO), capture_output=True, timeout=60, env=env)
        out = proc.stdout.decode("utf-8", errors="replace")
        err = proc.stderr.decode("utf-8", errors="replace")
        self.assertNotIn("Traceback", err)
        self.assertEqual(0, proc.returncode, err)
        self.assertRegex(out.splitlines()[-1], SUMMARY_RE)


if __name__ == "__main__":
    unittest.main()
