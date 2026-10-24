#!/usr/bin/env python3
"""Scan a directory tree for personal contact data (emails, Korean phone numbers).

Usage:
    python3 scripts/pii_scan.py <root> [--exclude <path-prefix> ...] [--strict]

Prints "<file>:<line>: <kind> <masked match>" per hit, then
"SKIPPED binary=<n> large=<n>: <paths>" when files could not be read as text, then
"SUMMARY hits=<n> files_with_hits=<n> scanned=<n>" (scanned = text files actually read).
Exit 1 if anything is found, or if zero files were scanned (a scan that read nothing
must not pass), or with --strict when any file was skipped (slides as PDF/PPTX are
binary: their text must be checked separately). Exit 0 otherwise.
Skips .git, node_modules and __pycache__.
Standard library only. Python 3.9+.
"""

import argparse
import os
import re
import sys
from typing import Dict, List, Optional, Tuple

Hit = Tuple[str, int, str, str]  # (relative path, line number, kind, masked match)

SKIP_DIRS = {".git", "node_modules", "__pycache__"}
MAX_BYTES = 5 * 1024 * 1024

EMAIL_RE = re.compile(r"(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")

# Addresses that are not personal data: git remotes, no-reply bots, RFC 2606 example domains.
EMAIL_ALLOW = (
    re.compile(r"^git@"),
    re.compile(r"noreply", re.I),
    re.compile(r"@(?:[A-Za-z0-9-]+\.)*(?:example\.(?:com|org|net)|example|test|invalid|localhost)$", re.I),
)

PHONE_PATTERNS = (
    # Mobile: 010-XXXX-XXXX, with space/dot/no separator (also 011/016/017/018/019)
    ("phone-mobile", re.compile(r"(?<![0-9A-Za-z])01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?![0-9A-Za-z])")),
    # International: +82 then area/mobile code and two digit groups
    ("phone-intl", re.compile(r"\+82[-. ]?\(?0?\d{1,2}\)?[-. ]?\d{3,4}[-. ]?\d{4}(?!\d)")),
    # Seoul landline: 02-XXX(X)-XXXX, also 02) and (02) forms
    ("phone-seoul", re.compile(r"(?<![0-9A-Za-z])\(?02\)?[-) ]\s?\d{3,4}-\d{4}(?!\d)")),
    # Other area codes 031..064 and VoIP 070: 0AA-XXX(X)-XXXX
    ("phone-area", re.compile(r"(?<![0-9A-Za-z])\(?0(?:[3-6][1-5]|70)\)?[-) ]\s?\d{3,4}-\d{4}(?!\d)")),
)


def mask(value: str) -> str:
    """Mask a match so the scan output does not re-publish the data."""
    if "@" in value:
        local, _, domain = value.partition("@")
        return local[:1] + "***@" + domain
    digits = [i for i, ch in enumerate(value) if ch.isdigit()]
    keep = set(digits[:3] + digits[-2:])
    return "".join(ch if (not ch.isdigit() or i in keep) else "*" for i, ch in enumerate(value))


def scan_line(line: str) -> List[Tuple[str, str]]:
    found = []
    for m in EMAIL_RE.finditer(line):
        addr = m.group(0)
        if any(p.search(addr) for p in EMAIL_ALLOW):
            continue
        found.append(("email", addr))
    for kind, pat in PHONE_PATTERNS:
        for m in pat.finditer(line):
            found.append((kind, m.group(0)))
    return found


def read_file(path: str) -> Tuple[Optional[str], str]:
    """Return (text, "") or (None, reason) with reason in {"large", "binary", "unreadable"}."""
    try:
        if os.path.getsize(path) > MAX_BYTES:
            return None, "large"
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return None, "unreadable"
    if b"\0" in data[:8192]:
        return None, "binary"
    try:
        return data.decode("utf-8"), ""
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace"), ""


def read_text(path: str) -> Optional[str]:
    return read_file(path)[0]


def scan(root: str, exclude: Optional[List[str]] = None) -> List[Hit]:
    """Return every hit under root as (relative path, line, kind, masked match)."""
    return scan_with_count(root, exclude)[0]


def scan_with_count(root: str, exclude: Optional[List[str]] = None) -> Tuple[List[Hit], int]:
    """Return (hits, number of text files read) for root."""
    hits, scanned, _ = scan_full(root, exclude)
    return hits, scanned


def scan_full(root: str, exclude: Optional[List[str]] = None) -> Tuple[List[Hit], int, Dict[str, List[str]]]:
    """Return (hits, number of text files read, skipped paths by reason) for root."""
    exclude = [os.path.normpath(e) for e in (exclude or [])]
    hits: List[Hit] = []
    scanned = 0
    skipped: Dict[str, List[str]] = {"binary": [], "large": [], "unreadable": []}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, root)
            if any(rel == e or rel.startswith(e + os.sep) for e in exclude):
                continue
            text, reason = read_file(path)
            if text is None:
                skipped[reason].append(rel)
                continue
            scanned += 1
            for lineno, line in enumerate(text.splitlines(), start=1):
                for kind, value in scan_line(line):
                    hits.append((rel, lineno, kind, mask(value)))
    return hits, scanned, skipped


def main(argv: Optional[List[str]] = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Scan for emails and Korean phone numbers.")
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--exclude", action="append", default=[],
                        help="path prefix relative to root to skip (repeatable)")
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 when any file could not be read as text (binary, >5MB)")
    args = parser.parse_args(argv)
    if not os.path.isdir(args.root):
        print("FAIL pii_scan 폴더 없음: " + args.root)
        return 1
    hits, scanned, skipped = scan_full(args.root, args.exclude)
    for rel, lineno, kind, masked in hits:
        print(rel + ":" + str(lineno) + ": " + kind + " " + masked)
    files_with_hits = len({h[0] for h in hits})
    n_skipped = sum(len(v) for v in skipped.values())
    if n_skipped:
        paths = [p for v in skipped.values() for p in v]
        print("SKIPPED binary=" + str(len(skipped["binary"])) + " large=" + str(len(skipped["large"]))
              + " unreadable=" + str(len(skipped["unreadable"])) + ": " + ", ".join(paths[:20])
              + (" …" if len(paths) > 20 else ""))
        print("→ 이 파일들은 읽지 못했다 (0건이 아니라 미검사). 슬라이드 PDF·PPTX는 텍스트로 내보내 따로 검색한다.")
    print("SUMMARY hits=" + str(len(hits)) + " files_with_hits=" + str(files_with_hits)
          + " scanned=" + str(scanned))
    if scanned == 0:
        print("FAIL pii_scan 읽은 파일 0개: " + args.root + " — 아무것도 검사하지 않았으므로 통과로 보지 않습니다.")
        return 1
    if hits:
        print("→ 개인 연락처는 repo에 두지 않습니다. 위 줄을 지우고 역할명(PM·Build·GTM·Sales)으로 바꾸세요.")
    if args.strict and n_skipped:
        print("FAIL pii_scan --strict: 읽지 못한 파일 " + str(n_skipped) + "개")
        return 1
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
