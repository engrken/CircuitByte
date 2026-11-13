#!/usr/bin/env bash
set -euo pipefail
policy="scripts/ci/check-impact.sh"
expect() {
  local want="$1" job="$2"; shift 2
  local got=0
  bash "$policy" "$job" --paths "$@" >/dev/null || got=$?
  if [[ "$want" -ne "$got" ]]; then
    echo "CircleCI impact policy failed: $job paths=$* want=$want got=$got" >&2
    exit 1
  fi
}
expect 10 web-quality README.md
expect 10 web-quality docs/setup.md
expect 10 web-quality services/copilot/README.md
expect 0 web-quality app/page.tsx
expect 0 web-quality .circleci/config.yml
expect 0 web-quality public/education/code/three-led-scanner.ino
expect 10 arduino-uno-compile docs/setup.md
expect 10 arduino-uno-compile app/page.tsx
expect 10 arduino-uno-compile services/copilot/index.ts
expect 0 arduino-uno-compile public/education/code/three-led-scanner.ino
expect 0 arduino-uno-compile scripts/ci/check-impact.sh
expect 0 arduino-uno-compile .circleci/config.yml
echo "CircuitByte CI impact tests passed."
