# CircuitByte — deployment/action budget policy (2026-11-04)

## Intent
Use the **existing** GitHub, CircleCI and Vercel Hobby infrastructure, without Railway, duplicate Vercel Copilot builds, paid CI runners or extra hosting. Keep Studio's existing AI Gateway and Vercel Sandbox. Conserve *deployments, CI minutes, bandwidth and successful-build credits* without bypassing correctness gates.

## Git branch and release policy
- Production Git branch: `main`; merges are a **single batched release**, not one push per small fix. Prefer one short-lived feature branch/PR for related improvements. Do not repeatedly trigger GitHub Actions or manually run CircleCI workflows during development.
- `vercel.json` disables automatic non-`main` previews via `git.deploymentEnabled: {"**": false, "main": true}`; Vercel branch patterns are minimatch and a true match takes precedence. A developer must deliberately request a manual preview for a hardware/compiler/auth change when the risk warrants it.
- Vercel's `ignoreCommand` is `node scripts/ci/ignore-vercel-build.mjs`. **Exit 0 = skip; exit 1 = build.** With a single parent and readable diff, skip only README/CHANGELOG Markdown, documentation Markdown, CircleCI-only configuration, issue templates or unused `services/copilot` sidecar changes. Code, product assets, env/config, migration, dependency or unknown/history-limited changes always build.
- An ignored deployment is not proof that the feature was tested. CI and GitHub PR review still apply. If a docs-only change also affects the application, update the allowlist and its tests before relying on the skip.
- Do not enable paid test calls in Vercel build-time environment variables. Maintain the existing build-only Node gate plus idempotent migrations. No actual AI/ESP32 cloud compile during general builds.

## CI policy
- CircleCI `web-quality` remains on branches and main, with the existing `npm test`, education validation, and Next.js build. Cache **only npm download cache**, keyed by `package-lock.json`, with 7-day retention. Always run `npm ci` with the frozen lockfile, never cache `node_modules`, and keep all production database secrets out of CI.
- CircleCI `arduino-uno-compile` starts with `scripts/ci/uno-affected.sh`. A simple diff against the single parent skips expensive Arduino CLI, board-core and library downloads when **none** of `public/education/code/**`, `.circleci/config.yml`, or the impact checker itself changed. Unknown history or a changed teaching sketch invokes the full four-sketch Uno gate. The job may report success with a *skipped Arduino stage*; **do not interpret a skipped check as hardware compilation evidence**.
- Existing Uno jobs do **not** certify all 10 Studio board targets. ESP8266, ESP32 and M5Stack need separately scheduled, explicit, capped UAT per GitHub issues #25/#42.

## Studio consumption rules
- AI requests still require authenticated Studio user, selected materials/board, limits and validated low-voltage output. Provider failures, timeouts and invalid drafts must not settle usage credits; no provider is secretly substituted.
- Cloud build reserves the 50-success/month Student/Hobby allowance, settles only successfully completed builds, and stops Sandbox afterward. This is a *user credit policy*, **not** a claim that failed Sandbox work is free to operate.
- The Studio browser now reuses an already-successful compilation of the **exact same** board, code, selected materials, manual and custom libraries. It avoids another API call, Sandbox invocation and credit consumption within the same loaded page. Changing inputs makes the old result stale; server-side cross-device caching is intentionally not claimed.
- Avoid large, expensive all-board test suites on every deploy. Instead, keep cheap deterministic board/pin/library tests in regular CI; run one controlled end-to-end compiler UAT per board family only when compiler/core compatibility changes.

## Release checklist (one controlled merge/deployment)
1. Group related changes in one PR; check changes against open issues and recent PRs to avoid duplicate work.
2. Run local, deterministic unit tests and repository policy tests; review root `vercel.json`, CircleCI config and actual changed files.
3. Allow one CircleCI PR pipeline; resolve failures without pushing dozens of tiny commits. Do not merge unless the web-quality job and any *applicable* Arduino compilation job are green.
4. Merge the verified PR **once** to `main`; verify one Vercel production deployment reaches READY with the expected exact commit.
5. Perform read-only /health, /studio, /api/studio/access, /api/studio/capabilities smoke checks and scoped runtime error review. Authenticated paid AI/Sandbox or physical hardware tests require a separately capped UAT session with owner-controlled test accounts.
6. If release fails, inspect build/runtime logs and roll back, rather than blindly redeploying. Record release SHA and evidence in issue/PR.

**Known limitations:** Browser-only repeat-build reuse does not deduplicate across multiple tabs/devices. The CircleCI package cache has storage and download costs; review usage after the first week. Vercel's ignored-build hook can still incur a small deployment check, so it does not guarantee *zero* platform usage. If automatic previews are required for a risky change, temporarily override the branch policy in a deliberately reviewed, scoped release.
