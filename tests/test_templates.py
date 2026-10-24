"""Template tests: blank templates are structurally valid but not "done".

Contract (HTHN_v1.0_PLAN.md section 3 G-T / G-R, HTHN_v1.1_AMENDMENT B1):
  * templates copied as-is into mission/ give structure PASS and content FAILs only:
    no S- FAIL at any stage, and C-empty FAILs (the template slots are empty values);
  * template slots use <...> placeholders, table example rows carry [예시]
    ([예시] rows are skipped by the validator);
  * filling every slot -- as the skills instruct -- leaves zero C-empty FAILs even though
    the instruction text stays (instructions live in HTML comments, which the validator ignores).

The temp layout mirrors the real repo: <tmp>/mission/*.md (BOARD.md included -- the canonical
board is mission/BOARD.md, v1.1 A4) and <tmp>/app/SMOKE.md next to mission/.
"""

import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_validators import collect_results, load_module  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
TEMPLATES = REPO / "templates"

MISSION_TEMPLATES = ("MISSION", "DECISION", "PRD", "BOARD", "EVIDENCE",
                     "PITCH", "SUBMISSION", "DEMODAY")
SUPPORT_TEMPLATES = ("log-entry", "me-common", "me-env", "me-style")
STAGES = ("intake", "decide", "board", "evidence", "pitch", "submit", "all")

SLOT_RE = re.compile(r"<[^<>\n]+>")
SEPARATOR_RE = re.compile(r"^\|(\s*:?-{3,}:?\s*\|)+\s*$")


def tables(text):
    """Yield lists of data rows (header and separator removed) per markdown table."""
    block = []
    for line in text.splitlines() + [""]:
        if line.strip().startswith("|"):
            block.append(line.strip())
            continue
        if len(block) >= 2 and SEPARATOR_RE.match(block[1]):
            yield block[2:]
        block = []


class TemplateFilesTest(unittest.TestCase):

    def test_all_template_files_exist(self):
        for name in MISSION_TEMPLATES + SUPPORT_TEMPLATES:
            with self.subTest(template=name):
                self.assertTrue((TEMPLATES / f"{name}.md").is_file(),
                                f"templates/{name}.md missing")

    def test_templates_have_slots(self):
        for name in MISSION_TEMPLATES:
            with self.subTest(template=name):
                text = (TEMPLATES / f"{name}.md").read_text(encoding="utf-8")
                self.assertRegex(text, SLOT_RE, "no <...> placeholder slot")

    def test_table_rows_are_examples_or_slots(self):
        # A row is an [예시] example, holds a <...> slot, or is a contract-fixed BOARD 파일 소유 row
        # (v1.1 B2: e.g. "HANDOFF.md#제안 | 전원 | append-only" is the same for every team).
        fixed = set(load_module().OWNERSHIP_ROWS) | {"HANDOFF.md#체크포인트", "HANDOFF.md#블로커"}
        for name in MISSION_TEMPLATES:
            path = TEMPLATES / f"{name}.md"
            for i, rows in enumerate(tables(path.read_text(encoding="utf-8"))):
                with self.subTest(template=name, table=i):
                    for row in rows:
                        first = row.strip("|").split("|")[0].strip()
                        self.assertTrue(
                            "[예시]" in row or SLOT_RE.search(row) or (name == "BOARD" and first in fixed),
                            f"row is neither [예시], a <...> slot nor a fixed ownership row: {row}")


class BlankTemplateValidationTest(unittest.TestCase):
    """Templates copied verbatim -> only C-/X- FAILs, zero S- FAILs."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        root = Path(cls._tmp.name)
        cls.mission = root / "mission"
        cls.mission.mkdir()
        for name in MISSION_TEMPLATES:
            shutil.copy(TEMPLATES / f"{name}.md", cls.mission / f"{name}.md")
        (root / "app").mkdir()
        smoke = REPO / "app" / "SMOKE.md"
        if smoke.is_file():
            shutil.copy(smoke, root / "app" / "SMOKE.md")

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_no_structure_fails_any_stage(self):
        for stage in STAGES:
            with self.subTest(stage=stage):
                results = collect_results(self.mission, stage)
                s_fails = [r for r in results
                           if r[0] == "FAIL" and r[2].startswith("S-")]
                self.assertEqual([], s_fails)

    def test_only_content_or_cross_fails(self):
        results = collect_results(self.mission, "all")
        odd = [r for r in results
               if r[0] == "FAIL" and not r[2].startswith(("C-", "X-"))]
        self.assertEqual([], odd)

    def test_blank_values_are_caught(self):
        results = collect_results(self.mission, "all")
        c_fails = {r[2] for r in results if r[0] == "FAIL" and r[2].startswith("C-")}
        self.assertIn("C-empty", c_fails, "blank templates must not pass as finished work")
        # PRD placeholders must never satisfy the 6-sentence gate.
        self.assertTrue(c_fails & {"C-P1", "C-P2", "C-P3", "C-P4"},
                        "blank PRD template passed C-P1..C-P4")

    def test_every_template_reports_c_empty(self):
        results = collect_results(self.mission, "all")
        empty_msgs = [r[3] for r in results if r[0] == "FAIL" and r[2] == "C-empty"]
        for name in MISSION_TEMPLATES:
            with self.subTest(template=name):
                self.assertTrue(any(m.startswith(name + ":") for m in empty_msgs),
                                f"{name}: template slots not reported as C-empty")


class FilledTemplateTest(unittest.TestCase):
    """Fill each slot (<...>, ______, TBD), keep the [예시] rows and the instruction comments
    -> no C-empty FAIL ([예시] rows are skipped, comments are ignored)."""

    SLOT = re.compile(r"<(?![\s!/])[^<>\n]+>|_{3,}|\bTBD\b")  # same exclusions as the validator: not <!-- or </tag>

    def fill(self, text):
        return self.SLOT.sub("채움", text)

    def test_filled_templates_have_no_placeholder_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mission = root / "mission"
            mission.mkdir()
            for name in MISSION_TEMPLATES:
                filled = self.fill((TEMPLATES / f"{name}.md").read_text(encoding="utf-8"))
                self.assertIn("<!--", filled, f"{name}: instruction comment must survive filling")
                (mission / f"{name}.md").write_text(filled, encoding="utf-8")
            results = collect_results(mission, "all")
        bad = [r for r in results if r[0] == "FAIL" and r[2] == "C-empty"]
        self.assertEqual([], bad)

    def test_instructions_are_comments_not_quotes(self):
        # A blockquote carrying [예시] or a slot would trip the placeholder rule after filling.
        for name in MISSION_TEMPLATES:
            with self.subTest(template=name):
                text = (TEMPLATES / f"{name}.md").read_text(encoding="utf-8")
                quotes = [ln for ln in text.splitlines() if ln.startswith(">")]
                self.assertEqual([], [q for q in quotes if "[예시]" in q or self.SLOT.search(q)])


if __name__ == "__main__":
    unittest.main()
