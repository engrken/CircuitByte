#!/usr/bin/env bash
# Exit 0 => run UNO compile; exit 1 => no UNO teaching-sketch changes.
set -euo pipefail
if ! git rev-parse 'HEAD^' >/dev/null 2>&1; then
  echo 'UNO CI: missing parent commit; compile rather than guess.'
  exit 0
fi
if ! changes=$(git diff --name-only 'HEAD^' HEAD); then
  echo 'UNO CI: cannot inspect git diff; compile for safety.'
  exit 0
fi
if [[ -z "$changes" ]]; then
  echo 'UNO CI: no comparable changes; compile for safety.'
  exit 0
fi
while IFS= read -r file; do
  case "$file" in
    public/education/code/*|.circleci/config.yml|scripts/ci/uno-affected.sh)
      echo "UNO CI: applicable change: $file"
      exit 0
      ;;
  esac
done <<< "$changes"
echo 'UNO CI: skipping Arduino CLI/library download; no Uno teaching-sketch changes.'
exit 1
