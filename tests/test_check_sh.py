"""scripts/check.sh and scripts/ci.sh contract (HTHn v1.1 A2-A3).

check.sh prints one "RESULT <id> PASS|FAIL|NOT_RUN [note]" line per check
(ids: unittest · validate-good · validate-bad · pii · node-tests · event-mission) and exits
1 when a check FAILed, 2 when a required check (unittest · pii · event-mission in mode=event)
did NOT_RUN, 0 when every required check PASSed. A check that did not run is never a pass.

ci.sh runs check.sh --strict and names the commit, mode and stage it checked.

The runs use a bare PATH (bash only, plus an optional python3 shim) so a laptop without python
or node is simulated on any machine. HTHN_CHECK_NESTED=1 keeps check.sh from re-running this suite.
"""

import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BASH = shutil.which("bash")
GOOD = REPO / "tests" / "fixtures" / "missions" / "good-01"
BAD = REPO / "tests" / "fixtures" / "missions" / "bad-01"
CHECK_IDS = {"unittest", "validate-good", "validate-bad", "pii", "node-tests", "event-mission"}
RESULT_RE = re.compile(r"^RESULT (\S+) (PASS|FAIL|NOT_RUN)(?: .*)?$")


def make_bin(tmp, python=None):
    """A PATH dir with bash and, optionally, a python3 shim: 'real' execs this interpreter,
    'stub' is a python3 that exists but fails (like the macOS /usr/bin/python3 stub)."""
    bindir = Path(tmp) / "bin"
    bindir.mkdir()
    os.symlink(BASH, bindir / "bash")
    if python is not None:
        shim = bindir / "python3"
        body = 'exec "%s" "$@"' % sys.executable if python == "real" else 'echo "no developer tools" >&2; exit 1'
        shim.write_text("#!/bin/sh\n" + body + "\n", encoding="utf-8")
        shim.chmod(shim.stat().st_mode | stat.S_IXUSR)
    return bindir


def run_script(root, bindir, script="check.sh", *args, nested=True, extra_env=None):
    env = {"PATH": str(bindir), "HOME": str(root), "PYTHONDONTWRITEBYTECODE": "1"}
    if nested:
        env["HTHN_CHECK_NESTED"] = "1"
    env.update(extra_env or {})
    proc = subprocess.run([BASH, str(root / "scripts" / script), *args], cwd=str(root),
                          capture_output=True, timeout=180, env=env)
    return proc.returncode, proc.stdout.decode("utf-8", errors="replace")


def results(out):
    rows = {}
    for line in out.splitlines():
        m = RESULT_RE.match(line)
        if m:
            rows[m.group(1)] = m.group(2)
    return rows


def mini_repo(tmp, handoff, mission=None, with_tests=False):
    """A throwaway repo: scripts, HANDOFF.md, fixtures, optional mission/ and a trivial test suite."""
    root = Path(tmp) / "repo"
    (root / "scripts").mkdir(parents=True)
    for name in ("check.sh", "ci.sh", "validate_mission.py", "pii_scan.py"):
        shutil.copy(REPO / "scripts" / name, root / "scripts" / name)
    (root / "HANDOFF.md").write_text(handoff, encoding="utf-8")
    shutil.copytree(GOOD, root / "tests" / "fixtures" / "missions" / "good-01")
    shutil.copytree(BAD, root / "tests" / "fixtures" / "missions" / "bad-01")
    if with_tests:
        (root / "tests" / "test_ok.py").write_text(
            "import unittest\n\nclass Ok(unittest.TestCase):\n    def test_ok(self):\n        self.assertTrue(True)\n",
            encoding="utf-8")
    if mission is not None:
        shutil.copytree(mission, root / "mission")
    return root


@unittest.skipIf(BASH is None, "bash not available")
class CheckShTest(unittest.TestCase):

    def test_no_python_no_node_is_not_run_exit_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, out = run_script(REPO, make_bin(tmp))
        rows = results(out)
        self.assertEqual(2, code, out)
        for check in ("unittest", "validate-good", "validate-bad", "pii", "node-tests"):
            self.assertEqual("NOT_RUN", rows.get(check), out)
        self.assertIn("PASS 아님", out)
        self.assertNotIn("CHECK 상태: PASS", out)
        self.assertIn("[이 환경에는 python", out)

    def test_shadowed_python_stub_is_not_run(self):
        # A python3 that exists on PATH but cannot run is the same as no python: NOT_RUN, exit 2.
        with tempfile.TemporaryDirectory() as tmp:
            code, out = run_script(REPO, make_bin(tmp, python="stub"))
        self.assertEqual(2, code, out)
        self.assertEqual("NOT_RUN", results(out).get("unittest"), out)
        self.assertEqual("NOT_RUN", results(out).get("pii"), out)

    def test_every_check_reports_one_of_three_states(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, out = run_script(REPO, make_bin(tmp))
        self.assertEqual(CHECK_IDS, set(results(out)))
        for line in out.splitlines():
            if line.startswith("RESULT "):
                self.assertRegex(line, RESULT_RE)

    def test_all_required_pass_is_exit_0(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF [SIMULATION]\n\nmode: pre_event\nstage: -\n", with_tests=True)
            code, out = run_script(root, make_bin(tmp, python="real"), nested=False)
        rows = results(out)
        self.assertEqual(0, code, out)
        for check in ("unittest", "validate-good", "validate-bad", "pii"):
            self.assertEqual("PASS", rows.get(check), out)
        self.assertEqual("NOT_RUN", rows.get("node-tests"), "optional NOT_RUN is still listed")
        self.assertIn("CHECK 상태: PASS", out)

    def test_failing_check_is_exit_1(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF\n\nmode: pre_event\nstage: -\n")
            shutil.rmtree(root / "tests" / "fixtures" / "missions" / "good-01" / "app")
            code, out = run_script(root, make_bin(tmp, python="real"))
        self.assertEqual(1, code, out)
        self.assertEqual("FAIL", results(out).get("validate-good"), out)

    def test_event_mode_without_python_is_required_not_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF\n\nmode: event\nstage: decide\n")
            code, out = run_script(root, make_bin(tmp))
        self.assertEqual(2, code, out)
        self.assertEqual("NOT_RUN", results(out).get("event-mission"), out)

    def test_event_mode_bad_stage_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF\n\nmode: event\nstage: lunch\n")
            code, out = run_script(root, make_bin(tmp))
        self.assertEqual(1, code, out)
        self.assertEqual("FAIL", results(out).get("event-mission"), out)

    def test_event_mode_validates_real_mission_up_to_stage(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF\n\nmode: event\nstage: submit\n", GOOD)
            bindir = make_bin(tmp, python="real")
            _, out = run_script(root, bindir)
            self.assertEqual("PASS", results(out).get("event-mission"), out)
            (root / "mission" / "PRD.md").unlink()
            code, out = run_script(root, bindir)
            self.assertEqual(1, code, out)
            self.assertEqual("FAIL", results(out).get("event-mission"), out)
            # At stage "board" a missing PITCH.md is not checked yet, but a missing PRD.md (decide) is.
            # (No receipt yet at board: a filled receipt verdict would raise the check to submit.)
            (root / "mission" / "SUBMISSION.md").unlink()
            (root / "HANDOFF.md").write_text("mode: event\nstage: board\n", encoding="utf-8")
            _, out = run_script(root, bindir)
            self.assertEqual("FAIL", results(out).get("event-mission"), out)
            shutil.copy(GOOD / "PRD.md", root / "mission" / "PRD.md")
            (root / "mission" / "PITCH.md").unlink()
            _, out = run_script(root, bindir)
            self.assertEqual("PASS", results(out).get("event-mission"), out)

    def test_lagging_stage_with_a_final_verdict_is_checked_at_submit(self):
        # Dry-run finding: HANDOFF stuck at "board" made check.sh print PASS at 15:45 while
        # --stage submit had FAILs. A receipt with a final verdict now forces the submit check.
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "mode: event\nstage: board\n", GOOD)
            bindir = make_bin(tmp, python="real")
            (root / "mission" / "PITCH.md").unlink()
            _, out = run_script(root, bindir)
            self.assertEqual("FAIL", results(out).get("event-mission"), out)
            self.assertIn("WARN HANDOFF stage=board", out)
            self.assertIn("submit으로 검사", out)

    def test_rehearsal_flag_on_event_day_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "mode: event\nstage: decide\nrehearsal: true\n", GOOD)
            bindir = make_bin(tmp, python="real")
            _, out = run_script(root, bindir, extra_env={"HTHN_TODAY": "2026-10-22"})
            self.assertNotEqual("FAIL", results(out).get("event-mission"), out)
            self.assertIn("rehearsal", out)
            _, out = run_script(root, bindir, extra_env={"HTHN_TODAY": "2026-10-24"})
            self.assertEqual("FAIL", results(out).get("event-mission"), out)
            self.assertIn("rehearsal: true", out)

    def test_stage_override(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "mode: event\nstage: decide\n", GOOD)
            bindir = make_bin(tmp, python="real")
            (root / "mission" / "SUBMISSION.md").unlink()
            _, out = run_script(root, bindir)
            self.assertEqual("PASS", results(out).get("event-mission"), out)
            _, out = run_script(root, bindir, "check.sh", "--stage", "submit")
            self.assertEqual("FAIL", results(out).get("event-mission"), out)
            self.assertIn("--stage submit", out)

    def test_pre_event_mode_does_not_require_mission(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF\n\nmode: pre_event\nstage: -\n")
            _, out = run_script(root, make_bin(tmp))
        self.assertEqual("NOT_RUN", results(out).get("event-mission"), out)
        self.assertIn("필수 아님", out)


@unittest.skipIf(BASH is None, "bash not available")
class CiShTest(unittest.TestCase):

    def test_ci_names_commit_and_stage_and_checks_mission(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "# HANDOFF\n\nmode: event\nstage: decide\n", GOOD)
            code, out = run_script(root, make_bin(tmp, python="real"), "ci.sh",
                                   extra_env={"GITHUB_SHA": "abc1234"})
        lines = [ln for ln in out.splitlines() if ln.strip()]
        self.assertEqual("CI commit=abc1234 mode=event stage=decide", lines[0], out)
        self.assertRegex(lines[-1], r"^CI RESULT commit=abc1234 mode=event stage=decide status=(PASS|FAIL|NOT_RUN) exit=\d$")
        self.assertEqual("PASS", results(out).get("event-mission"), out)
        self.assertIn("strict", out)
        # Strict: node is missing here, so the run cannot be PASS.
        self.assertEqual(2, code, out)
        self.assertTrue(lines[-1].endswith("status=NOT_RUN exit=2"), out)

    def test_ci_fails_on_broken_event_mission(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = mini_repo(tmp, "mode: event\nstage: board\n", BAD)
            code, out = run_script(root, make_bin(tmp, python="real"), "ci.sh",
                                   extra_env={"GITHUB_SHA": "def5678"})
        self.assertEqual(1, code, out)
        self.assertEqual("FAIL", results(out).get("event-mission"), out)
        self.assertIn("CI RESULT commit=def5678 mode=event stage=board status=FAIL exit=1", out)


if __name__ == "__main__":
    unittest.main()
