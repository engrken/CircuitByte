#!/usr/bin/env bash
# Fail-open CircleCI change classifier: 0 = run, 10 = safe skip.
# On PR branches compare the whole branch with main, not only the last commit.
set -euo pipefail
job="${1:-}"
case "$job" in
  web-quality|arduino-uno-compile) ;;
  *) echo "CI impact: unknown job; running."; exit 0 ;;
esac
if [[ "${2:-}" == "--paths" ]]; then
  shift 2
  changed="$(printf '%s\n' "$@")"
else
  if [[ "${CIRCLE_BRANCH:-}" == "main" ]]; then
    if ! git rev-parse HEAD^ >/dev/null 2>&1; then
      echo "CI impact: no parent; run for safety."
      exit 0
    fi
    from='HEAD^'
  else
    if ! git fetch --no-tags --depth=100 origin main >/dev/null 2>&1; then
      echo "CI impact: cannot fetch base; run for safety."
      exit 0
    fi
    from="$(git merge-base origin/main HEAD 2>/dev/null || true)"
    if [[ -z "$from" ]]; then
      echo "CI impact: no merge base; run for safety."
      exit 0
    fi
  fi
  if ! changed="$(git -c diff.renames=false diff --name-only "$from" HEAD)"; then
    echo "CI impact: git diff failed; run for safety."
    exit 0
  fi
fi
if [[ -z "$changed" ]]; then
  echo "CI impact: empty diff; run for safety."
  exit 0
fi
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if [[ "$job" == "web-quality" ]]; then
    case "$file" in
      README.md|CHANGELOG.md|docs/*|.github/ISSUE_TEMPLATE/*|services/copilot/*) continue ;;
      *) echo "CI impact: $file requires web checks"; exit 0 ;;
    esac
  else
    case "$file" in
      public/education/code/*|.circleci/*|scripts/ci/check-impact.sh|scripts/ci/test-impact.sh|scripts/ci/uno-affected.sh)
        echo "CI impact: $file requires UNO compilation"
        exit 0 ;;
      *) continue ;;
    esac
  fi
done <<< "$changed"
echo "CI impact: no $job-affecting changes; skip expensive work."
exit 10
