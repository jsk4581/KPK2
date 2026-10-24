"""Guards for scripts/pii_scan.py: it must actually read files, and say how many.

PII samples are assembled at runtime so this file never contains a literal
email or phone number (the repo-wide hygiene scan would flag it).
[SIMULATION] All sample values below are synthetic.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / "scripts" / "pii_scan.py"

SAMPLE_EMAIL = "sim" + "@" + "hthn-sim" + ".kr"
SAMPLE_PHONE = "010" + "-1234-" + "5678"


def run_scan(root, *extra):
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(root), *extra],
        capture_output=True, text=True, timeout=60,
    )


def summary_line(out):
    lines = [l for l in out.splitlines() if l.startswith("SUMMARY ")]
    return lines[-1] if lines else ""


def summary_value(out, key):
    for part in summary_line(out).split()[1:]:
        k, _, v = part.partition("=")
        if k == key:
            return int(v)
    raise AssertionError(f"SUMMARY has no {key}=: {summary_line(out)!r}")


class PiiScanTest(unittest.TestCase):
    def test_repo_scan_reads_files(self):
        proc = run_scan(REPO)
        self.assertEqual(0, proc.returncode, proc.stdout + proc.stderr)
        self.assertGreater(summary_value(proc.stdout, "scanned"), 20)
        self.assertEqual(0, summary_value(proc.stdout, "hits"))

    def test_detects_email_and_phone(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "note.md").write_text(
                "연락: " + SAMPLE_EMAIL + "\n전화: " + SAMPLE_PHONE + "\n", encoding="utf-8")
            Path(tmp, "clean.md").write_text("역할: PM\n", encoding="utf-8")
            proc = run_scan(tmp)
        self.assertEqual(1, proc.returncode, proc.stdout)
        self.assertEqual(2, summary_value(proc.stdout, "scanned"))
        self.assertEqual(2, summary_value(proc.stdout, "hits"))
        self.assertEqual(1, summary_value(proc.stdout, "files_with_hits"))
        # Output must mask the match, not republish it.
        self.assertNotIn(SAMPLE_EMAIL, proc.stdout)
        self.assertNotIn(SAMPLE_PHONE, proc.stdout)

    def test_zero_files_fails_loudly(self):
        with tempfile.TemporaryDirectory() as tmp:
            proc = run_scan(tmp)
        self.assertEqual(1, proc.returncode, proc.stdout)
        self.assertIn("FAIL", proc.stdout)
        self.assertEqual(0, summary_value(proc.stdout, "scanned"))

    def test_skips_git_and_node_modules_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            for d in (".git", "node_modules", ".github"):
                Path(tmp, d).mkdir()
                Path(tmp, d, "x.md").write_text(SAMPLE_EMAIL + "\n", encoding="utf-8")
            proc = run_scan(tmp)
        self.assertEqual(1, summary_value(proc.stdout, "scanned"))
        self.assertEqual(1, summary_value(proc.stdout, "hits"))
        self.assertIn(".github", proc.stdout)


    def test_binary_files_are_reported_not_silently_passed(self):
        # A slide PDF with contact details is binary: the scan cannot read it, so it must say so.
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "slides.pdf").write_bytes(
                b"%PDF-1.4\n\x00\x01" + (SAMPLE_EMAIL + " " + SAMPLE_PHONE).encode("utf-8"))
            Path(tmp, "clean.md").write_text("역할: PM\n", encoding="utf-8")
            proc = run_scan(tmp)
            strict = run_scan(tmp, "--strict")
        self.assertEqual(0, proc.returncode, proc.stdout)
        self.assertIn("SKIPPED binary=1", proc.stdout)
        self.assertIn("slides.pdf", proc.stdout)
        out_lines = proc.stdout.splitlines()
        skipped_at = next(i for i, l in enumerate(out_lines) if l.startswith("SKIPPED "))
        summary_at = next(i for i, l in enumerate(out_lines) if l.startswith("SUMMARY "))
        self.assertLess(skipped_at, summary_at, "SKIPPED must come before SUMMARY")
        self.assertEqual(1, strict.returncode, strict.stdout)


if __name__ == "__main__":
    unittest.main()
