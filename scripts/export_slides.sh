#!/usr/bin/env bash
# export_slides.sh — print the two-page pitch HTML to the PDF the submission needs, then report what submit-gate asks for.
#
# Usage:  bash scripts/export_slides.sh [pitch/slides.html] [pitch/slides.pdf]
# Does:   copies the kit footer images next to the HTML if missing (the kit template references them by file name),
#         prints with headless Google Chrome (1920×1080 pages from the template's @page rule, no browser header/footer,
#         background graphics on — fonts are embedded by Chrome, which is what rehearsal defect H3 needs),
#         then prints the three `## 제출 파일` lines for mission/PITCH.md and the sha256 line for SUBMISSION.md.
# Needs:  Google Chrome (macOS path below, or CHROME=/path/to/chrome). Without it: open the HTML in Chrome → ⌘P →
#         Save as PDF, margins None, Background graphics on — then run this script with the PDF to get the report only.
set -euo pipefail
HTML="${1:-pitch/slides.html}"
PDF="${2:-pitch/slides.pdf}"
KIT="$(cd "$(dirname "$0")/.." && pwd)/templates/slide-kit"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

report() {
  local pdf="$1"
  local pages bytes sha
  pages="$(python3 - "$pdf" <<'PY'
import re,sys
data=open(sys.argv[1],'rb').read()
n=len(re.findall(rb"/Type\s*/Page(?![s/])",data))
print(n)
PY
)"
  bytes="$(wc -c < "$pdf" | tr -d ' ')"
  if command -v shasum >/dev/null; then sha="$(shasum -a 256 "$pdf" | cut -d' ' -f1)"; else sha="$(sha256sum "$pdf" | cut -d' ' -f1)"; fi
  echo "파일: $pdf"
  echo "페이지: $pages"
  echo "크기: $bytes"
  echo "발표 파일 sha256: $sha"
  if [ "$pages" -gt 2 ]; then echo "FAIL: 페이지 $pages > 2 (F2)"; exit 2; fi
  echo "확인할 것(사람): 두 장 모두 하단 로고 띠가 보이고 가려지지 않았는가 · 한글이 깨지지 않았는가 · 왼쪽 위 팀 이름"
}

if [ -f "$HTML" ]; then
  dir="$(dirname "$HTML")"
  for f in footer-for-dark-slides.png footer-for-light-slides.png; do
    [ -f "$dir/$f" ] || cp "$KIT/$f" "$dir/$f"
  done
  if [ ! -x "$CHROME" ]; then
    echo "Chrome을 찾지 못했습니다 ($CHROME). 브라우저에서 $HTML 을 열어 인쇄 → PDF 저장(여백 없음·배경 그래픽) 후 다시 실행하세요: bash scripts/export_slides.sh $HTML $PDF"; exit 1
  fi
  abs_html="$(cd "$dir" && pwd)/$(basename "$HTML")"
  abs_pdf="$(cd "$(dirname "$PDF")" 2>/dev/null && pwd || { mkdir -p "$(dirname "$PDF")" && cd "$(dirname "$PDF")" && pwd; })/$(basename "$PDF")"
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header \
    --virtual-time-budget=4000 --run-all-compositor-stages-before-draw \
    --print-to-pdf="$abs_pdf" "file://$abs_html" >/dev/null 2>&1
  [ -s "$abs_pdf" ] || { echo "FAIL: PDF가 만들어지지 않았습니다"; exit 1; }
  report "$PDF"
elif [ -f "$PDF" ]; then
  report "$PDF"
else
  echo "usage: bash scripts/export_slides.sh [pitch/slides.html] [pitch/slides.pdf]  (HTML 또는 PDF 중 하나는 있어야 합니다)"; exit 1
fi
