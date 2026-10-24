"""Safety and truth rules locked as text (finding: the rules lived only in prose, so an edit
that dropped one would stay green). Each assertion is an exact substring of the team contract.
If a rule really changes, change CONTRACT.md first, then this file — never the other way round.
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SKILLS = REPO / ".claude" / "skills"


def read(rel):
    return (REPO / rel).read_text(encoding="utf-8")


class ContractRulesTest(unittest.TestCase):

    def test_contract_rules(self):
        text = read("CONTRACT.md")
        for needle in (
            "미션 공개(09:00) 이후 타 AI 금지",
            "팀당 1회",
            "재제출 불가",
            "`verified` · `single-source` · `hypothesis` · `simulation`",
            "외부 게시·유료 API·계정 생성·공개 push·최종 제출",
            "16:50",
            "면제 불가 F1–F5",
            "타임아웃 시 재전송 금지",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, text)

    def test_label_set_has_exactly_four_values(self):
        line = next(l for l in read("CONTRACT.md").splitlines() if "라벨 집합" in l)
        labels = re.findall(r"`([a-z-]+)`", line.split("라벨 집합", 1)[1])
        self.assertEqual(["verified", "single-source", "hypothesis", "simulation"], labels)

    def test_claude_md_rules(self):
        self.assertIn("09:00 이후 타 AI 금지", read("CLAUDE.md"))

    def test_hthn_start_rules(self):
        text = read(".claude/skills/hthn-start/SKILL.md")
        self.assertIn("No other AI after the 09:00", text)
        self.assertIn("never infer", text)

    def test_submit_gate_rules(self):
        text = read(".claude/skills/submit-gate/SKILL.md")
        for needle in ("One submission per team", "The AI never submits", "do not resend", "16:50"):
            with self.subTest(needle=needle):
                self.assertIn(needle, text)


class NoSkillSubmitsTest(unittest.TestCase):
    """No SKILL.md sentence tells the AI to submit or post without a negation."""

    VERB = re.compile(r"(?i)\b(submit|post)\b(?!-)")
    NEGATION = re.compile(r"(?i)\b(never|not|no)\b|do not|don't")

    def test_no_instruction_to_submit_or_post(self):
        offenders = []
        for path in sorted(SKILLS.glob("*/SKILL.md")):
            text = path.read_text(encoding="utf-8")
            text = re.sub(r"`[^`]*`", " ", text)              # code spans name commands, not actions
            text = re.sub(r"--stage \S+", " ", text)          # validator stage names
            text = re.sub(r"/?submit-gate", " ", text)        # the skill's own name
            for sentence in re.split(r"(?<=[.!?])\s+|\n", text):
                if self.VERB.search(sentence) and not self.NEGATION.search(sentence):
                    offenders.append(f"{path.parent.name}: {sentence.strip()[:100]}")
        self.assertEqual([], offenders)


if __name__ == "__main__":
    unittest.main()
