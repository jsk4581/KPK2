"""L1 structure tests for the HTHn team repo.

Source of truth: HTHN_v1.0_PLAN.md section 4 (artifact contract) and the
G-T item list (1)-(12) in section 3, as amended by HTHN_v1.1_AMENDMENT
(A2 mode/stage branch, A4 single canonical board mission/BOARD.md, B2 PITCH
## 제출 파일). These tests never look at how other groups implemented
things; they only check what the contract promises.

Run from the repo root:
    python3 -m unittest discover -s tests -v
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

SKILLS = (
    "hthn-start",
    "mission-intake",
    "sprint-board",
    "evidence-research",
    "demo-build",
    "pitch-compile",
    "submit-gate",
)

ROLES = ("pm", "build", "gtm-pitch", "sales-buyer")

# Contract section 4: required H2 headings per template, order fixed.
TEMPLATE_H2 = {
    "MISSION": [
        "원문", "사실", "해석", "미확인", "심사기준",
        "금지사항 · 도구 규칙", "제출물", "후보",
    ],
    "DECISION": ["선택", "점수", "기각", "시장 주장", "수용 리스크", "결정"],
    "PRD": ["C·U·T"],
    "BOARD": ["게이트", "작업", "파일 소유", "예산", "슬롯"],
    "EVIDENCE": ["주장", "Buyer simulation [SIMULATION — 실제 고객 아님]"],
    "PITCH": [
        "Slide 1", "Slide 2", "스크립트 (90초)",
        "심사기준 매핑", "라벨 점검", "반론과 수정", "제출 파일",
    ],
    "SUBMISSION": ["체크", "산출물", "테스트", "알려진 결함", "판정", "제출"],
    "DEMODAY": [
        "타임라인 (10분)", "데모 경로", "예상 질문 10", "복구", "리허설 기록",
    ],
}

SKIP_DIRS = {".git", "node_modules"}
TEXT_SUFFIXES = {
    ".md", ".txt", ".py", ".js", ".mjs", ".cjs", ".ts", ".json", ".html",
    ".css", ".yml", ".yaml", ".sh", ".gs", ".toml", ".cfg", ".ini", ".csv",
    ".gitignore", ".env", "",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
# Korean mobile (010/011/016-019) and landline (02, 0XX) numbers.
# Boundaries exclude matches inside longer alphanumeric runs (hashes, ids).
PHONE_RES = (
    re.compile(r"(?<![0-9A-Za-z])01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?![0-9A-Za-z])"),
    re.compile(r"(?<![0-9A-Za-z])0(?:2|[3-6][1-5])[-. )]\d{3,4}[-. ]\d{4}(?![0-9A-Za-z])"),
    re.compile(r"\+82[-. ]?1[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)"),
)
# Secret markers are assembled at runtime so this file never contains them.
SECRET_MARKERS = (
    "sk-" + "ant-",
    "AI" + "za",
    "gh" + "p_",
    "-----" + "BEGIN",
)


# Host-only orchestration tools. They may appear in docs/ (design copy) but never in what the team runs.
HOST_TOOL_RE = re.compile(r"(?i)hermes|cmux|codexx|agyx|claudex")
TEAM_FACING = (".claude", "CLAUDE.md", "AGENTS.md", "CONTRACT.md", "HANDOFF.md", "roles", "templates", "app")
STAGE_VALUES = ("intake", "decide", "board", "evidence", "pitch", "submit")


def read(path):
    return path.read_text(encoding="utf-8")


def handoff_header(key):
    """Value of a 'key: value' line in the first 30 lines of HANDOFF.md, or None."""
    path = REPO / "HANDOFF.md"
    if not path.is_file():
        return None
    for line in read(path).splitlines()[:30]:
        m = re.match(r"^%s:\s*(\S*)\s*$" % re.escape(key), line)
        if m:
            return m.group(1)
    return None


def mission_overlay_problems(mode, mission_dir):
    """A2: before the event (mode pre_event) mission/ holds only README.md; during the event
    (mode event) anything goes here — check.sh/CI validate mission/ up to HANDOFF's stage."""
    if not mission_dir.is_dir():
        return ["mission/ missing"]
    if mode == "event":
        return []
    visible = sorted(p.name for p in mission_dir.iterdir() if not p.name.startswith("."))
    return [] if visible == ["README.md"] else ["mission/ holds " + ", ".join(visible)]


def h2_headings(text):
    """Return H2 heading texts, ignoring lines inside fenced code blocks."""
    out = []
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.startswith("## "):
            out.append(line[3:].strip())
    return out


def frontmatter(text):
    """Return the YAML-ish frontmatter block between the first two '---' lines."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return lines[1:i]
    return None


def fm_list(fm_lines, key):
    """Return list items under a top-level key, or None if the key is absent."""
    items = None
    for line in fm_lines:
        if re.match(r"^[A-Za-z_][A-Za-z0-9_-]*\s*:", line):
            if items is not None:
                break
            if re.match(r"^%s\s*:" % re.escape(key), line):
                items = []
                rest = line.split(":", 1)[1].strip()
                if rest:
                    items.append(rest)
            continue
        if items is not None:
            m = re.match(r"^\s+-\s*(.*)$", line)
            if m:
                items.append(m.group(1).strip())
    return items


def iter_text_files(root):
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        if not path.is_file():
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name != ".gitignore":
            continue
        try:
            yield path, path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue


class SkillHeaderTest(unittest.TestCase):
    """(1)(2) Seven skills, T0 capability header, human section, degrade block."""

    def skill_path(self, name):
        return REPO / ".claude" / "skills" / name / "SKILL.md"

    def test_exactly_seven_skills(self):
        skills_dir = REPO / ".claude" / "skills"
        self.assertTrue(skills_dir.is_dir(), ".claude/skills/ is missing")
        found = sorted(p.parent.name for p in skills_dir.glob("*/SKILL.md"))
        self.assertEqual(sorted(SKILLS), found)

    def test_requires_is_empty_t0(self):
        for name in SKILLS:
            with self.subTest(skill=name):
                path = self.skill_path(name)
                self.assertTrue(path.is_file(), f"{path} missing")
                fm = frontmatter(read(path))
                self.assertIsNotNone(fm, "frontmatter (--- ... ---) missing")
                req = fm_list(fm, "requires")
                self.assertIsNotNone(req, "requires: key missing")
                self.assertEqual(["(없음)"], req,
                                 "requires must hold exactly one item: (없음)")

    def test_capability_keys_present(self):
        for name in SKILLS:
            with self.subTest(skill=name):
                fm = frontmatter(read(self.skill_path(name))) or []
                for key in ("name", "enhanced_by", "degraded", "verified_on"):
                    self.assertIsNotNone(fm_list(fm, key), f"{key}: missing")
                    self.assertTrue(fm_list(fm, key), f"{key}: is empty")

    def test_name_matches_directory(self):
        for name in SKILLS:
            with self.subTest(skill=name):
                fm = frontmatter(read(self.skill_path(name))) or []
                self.assertEqual([name], fm_list(fm, "name"))

    def test_human_section_and_degrade_block(self):
        for name in SKILLS:
            with self.subTest(skill=name):
                text = read(self.skill_path(name))
                self.assertTrue(
                    any(h.startswith("사람이 하는 일") for h in h2_headings(text)),
                    "missing '## 사람이 하는 일' section")
                self.assertIn("[이 환경에는", text,
                              "missing degrade block example '[이 환경에는 ...'")


class KernelFilesTest(unittest.TestCase):
    """(3) Kernel files exist and CLAUDE.md points to the right places."""

    def test_kernel_files_exist(self):
        for name in ("CLAUDE.md", "AGENTS.md", "CONTRACT.md",
                     "HANDOFF.md", "README.md"):
            with self.subTest(file=name):
                self.assertTrue((REPO / name).is_file(), f"{name} missing")

    def test_no_root_board(self):
        # v1.1 A4: the only canonical board is mission/BOARD.md (created at G2 from templates/BOARD.md).
        self.assertFalse((REPO / "BOARD.md").exists(), "root BOARD.md must not exist (canonical = mission/BOARD.md)")

    def test_claude_md_mentions_entry_paths(self):
        text = read(REPO / "CLAUDE.md")
        for needle in ("CONTRACT.md", "HANDOFF.md", "mission/BOARD.md",
                       "roles/", ".claude/skills/"):
            with self.subTest(needle=needle):
                self.assertIn(needle, text)

    def test_agents_md_points_to_claude_md(self):
        self.assertIn("CLAUDE.md", read(REPO / "AGENTS.md"))

    def test_handoff_declares_mode_and_stage(self):
        # CI and check.sh read these two lines to decide whether mission/ is validated.
        mode = handoff_header("mode")
        stage = handoff_header("stage")
        self.assertIn(mode, ("pre_event", "event"), "HANDOFF.md needs 'mode: pre_event|event'")
        self.assertIsNotNone(stage, "HANDOFF.md needs a 'stage:' line")
        # A2: stage is one of the six stages; before the event "-" (no stage yet) is also accepted.
        allowed = STAGE_VALUES if mode == "event" else STAGE_VALUES + ("-",)
        self.assertIn(stage, allowed)
        # HANDOFF.md is merge=union (.gitattributes): two overlapping edits can silently keep both
        # 'mode:'/'stage:' lines, and check.sh/ci.sh would read the first (possibly stale) one.
        head = read(REPO / "HANDOFF.md").splitlines()[:30]
        for key in ("mode", "stage"):
            count = sum(1 for line in head if re.match(r"^%s:" % key, line))
            self.assertEqual(1, count, f"HANDOFF.md needs exactly one '{key}:' line in its first 30 lines "
                                       f"(found {count} — resolve the merge=union duplicate)")


class RoleKitTest(unittest.TestCase):
    """(4) Four role kits with environment, TDD and file-ownership sections."""

    def test_role_kits(self):
        for role in ROLES:
            with self.subTest(role=role):
                path = REPO / "roles" / f"{role}.md"
                self.assertTrue(path.is_file(), f"roles/{role}.md missing")
                heads = h2_headings(read(path))
                for prefix in ("환경 세팅", "내 TDD", "내 파일"):
                    self.assertTrue(
                        any(h.startswith(prefix) for h in heads),
                        f"roles/{role}.md lacks '## {prefix}'")


class TemplateContractTest(unittest.TestCase):
    """(5) Eight mission templates whose H2 headings equal the section-4 contract."""

    def test_templates_match_contract(self):
        for name, expected in TEMPLATE_H2.items():
            with self.subTest(template=name):
                path = REPO / "templates" / f"{name}.md"
                self.assertTrue(path.is_file(), f"templates/{name}.md missing")
                text = read(path)
                self.assertEqual(expected, h2_headings(text))

    def test_template_first_line(self):
        for name in TEMPLATE_H2:
            with self.subTest(template=name):
                path = REPO / "templates" / f"{name}.md"
                first = read(path).splitlines()[0] if path.is_file() else ""
                self.assertTrue(first.startswith(f"# {name} — "),
                                f"first line must start with '# {name} — '")


class MissionOverlayTest(unittest.TestCase):
    """(6) + v1.1 A2: mission/ holds only README.md while HANDOFF says mode: pre_event;
    in mode: event the structure test steps aside and check.sh/CI validate mission/ by stage."""

    def test_repo_mission_matches_mode(self):
        mode = handoff_header("mode") or "pre_event"
        self.assertEqual([], mission_overlay_problems(mode, REPO / "mission"))

    def test_mode_branch(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            mission = Path(tmp) / "mission"
            mission.mkdir()
            (mission / "README.md").write_text("[SIMULATION]\n", encoding="utf-8")
            (mission / ".gitkeep").write_text("", encoding="utf-8")
            self.assertEqual([], mission_overlay_problems("pre_event", mission))
            (mission / "MISSION.md").write_text("# MISSION — 2026-10-24 [SIMULATION]\n", encoding="utf-8")
            self.assertNotEqual([], mission_overlay_problems("pre_event", mission))
            self.assertEqual([], mission_overlay_problems("event", mission))


class HygieneScanTest(unittest.TestCase):
    """(7)(8) Zero emails, Korean phone numbers and secret markers in the repo."""

    def test_no_pii(self):
        hits = []
        for path, text in iter_text_files(REPO):
            rel = path.relative_to(REPO)
            for m in EMAIL_RE.finditer(text):
                hits.append(f"{rel}: email-like '{m.group(0)}'")
            for rx in PHONE_RES:
                for m in rx.finditer(text):
                    hits.append(f"{rel}: phone-like '{m.group(0)}'")
        self.assertEqual([], hits)

    def test_no_secrets(self):
        hits = []
        for path, text in iter_text_files(REPO):
            for marker in SECRET_MARKERS:
                if marker in text:
                    hits.append(f"{path.relative_to(REPO)}: '{marker}'")
        self.assertEqual([], hits)

    def test_scanners_see_files(self):
        # Guard against a scan that silently reads nothing.
        names = {p.name for p, _ in iter_text_files(REPO)}
        self.assertIn("test_structure.py", names)


class HostToolNameTest(unittest.TestCase):
    """Shared team files never name host-only tools (BE_HARNESS_v1 §8: tool names live only in me/)."""

    def test_no_host_tool_names_in_team_files(self):
        hits = []
        for name in TEAM_FACING:
            base = REPO / name
            paths = [base] if base.is_file() else [p for p in base.rglob("*") if p.is_file()]
            for path in paths:
                try:
                    text = path.read_text(encoding="utf-8")
                except (UnicodeDecodeError, OSError):
                    continue
                for m in HOST_TOOL_RE.finditer(text):
                    hits.append(f"{path.relative_to(REPO)}: '{m.group(0)}'")
        self.assertEqual([], hits)


class GitAttributesTest(unittest.TestCase):
    """LF line endings for Windows clones, and union merge for the append-only HANDOFF.md."""

    def test_gitattributes(self):
        path = REPO / ".gitattributes"
        self.assertTrue(path.is_file(), ".gitattributes missing")
        lines = [ln.split("#")[0].split() for ln in read(path).splitlines()]
        lines = [ln for ln in lines if ln]
        self.assertIn(["*", "text=auto", "eol=lf"], lines)
        self.assertIn(["*.sh", "text", "eol=lf"], lines)
        self.assertIn(["HANDOFF.md", "merge=union"], lines)


class GateTableTest(unittest.TestCase):
    """(9) CONTRACT.md gate table lists G1..G6, each owned by a skill."""

    def test_gates_have_owning_skill(self):
        text = read(REPO / "CONTRACT.md")
        rows = {}
        for line in text.splitlines():
            m = re.match(r"^\|\s*(G[1-6])\s*\|", line)
            if m and m.group(1) not in rows:
                rows[m.group(1)] = line
        for gate in ("G1", "G2", "G3", "G4", "G5", "G6"):
            with self.subTest(gate=gate):
                self.assertIn(gate, rows, f"{gate} row missing in gate table")
                self.assertTrue(any(s in rows[gate] for s in SKILLS),
                                f"{gate} row names no owning skill")


class AppSkeletonTest(unittest.TestCase):
    """(10) App TDD skeleton exists."""

    def test_app_files(self):
        for rel in ("app/SMOKE.md", "app/RECOVERY.md", "app/index.html"):
            with self.subTest(file=rel):
                self.assertTrue((REPO / rel).is_file(), f"{rel} missing")
        self.assertTrue((REPO / "app" / "tests").is_dir(), "app/tests/ missing")


class CiTest(unittest.TestCase):
    """(11) CI workflow exists."""

    def test_ci_workflow(self):
        self.assertTrue((REPO / ".github" / "workflows" / "check.yml").is_file())

    def test_ci_runs_ci_sh(self):
        # v1.1 A2: CI runs scripts/ci.sh (check.sh --strict + event-mode mission/ by stage).
        self.assertTrue((REPO / "scripts" / "ci.sh").is_file(), "scripts/ci.sh missing")
        self.assertIn("scripts/ci.sh", read(REPO / ".github" / "workflows" / "check.yml"))


class DocsTest(unittest.TestCase):
    """(12) Design docs exist; prior hypothesis is labelled up front."""

    def test_docs_exist(self):
        for name in ("TDD.md", "HTHN_DESIGN.md", "event-rules.md",
                     "prior-hypothesis.md"):
            with self.subTest(doc=name):
                self.assertTrue((REPO / "docs" / name).is_file(),
                                f"docs/{name} missing")

    def test_prior_hypothesis_label(self):
        path = REPO / "docs" / "prior-hypothesis.md"
        self.assertTrue(path.is_file(), "docs/prior-hypothesis.md missing")
        head = "\n".join(read(path).splitlines()[:20])
        self.assertIn("미션 전 가설", head)


if __name__ == "__main__":
    unittest.main()
