# CircuitByte — CircleCI quality checks

CircleCI is responsible for **testing only**. GitHub remains the source of truth and Vercel handles preview/production deployment. This configuration does not call `vercel deploy`, run `build:vercel`, modify the database, or require production secrets.

## One-time CircleCI connection

1. Sign in at https://app.circleci.com/ and connect your **GitHub** account (authorize the CircleCI GitHub App if prompted).
2. Create/follow the project for **engrken/CircuitByte** and select the repository config at `.circleci/config.yml`. For initial testing, choose the branch `ci/circleci-quality-gates-20261030` if `main` does not yet contain the configuration.
3. Enable the default GitHub push / PR triggers. Check that **web-quality** and **arduino-uno-compile** both run and succeed.
4. After successful runs, require the corresponding CircleCI status checks in GitHub branch protection/rulesets if appropriate to your repository settings.
5. Do **not** add `DATABASE_URL`, `circuitbyte_DATABASE_URL`, authentication secrets, Vercel tokens, or Blob credentials to this project. Quality checks use synthetic/local data and public Arduino dependencies.

## What runs

| Job | Checks | External dependencies |
| --- | --- | --- |
| `web-quality` | `npm ci`, existing `npm test`, `scripts/validate-learning.mjs`, ordinary `next build` | npm registry; no live database |
| `arduino-uno-compile` | Verify SHA-256 of Arduino CLI v1.5.1 release tarball; install UNO AVR platform, DHT/Unified Sensor/hd44780 libs; compile the four newest Arduino UNO tutorials | GitHub releases and Arduino package indexes |

The build intentionally calls **`npm run build`**, not `npm run build:vercel`, because the Vercel-specific script includes migration and seeding logic when `VERCEL_ENV=production`. CI must never invoke production mutation scripts.

## Troubleshooting

- **Project never builds**: CircleCI must first be connected to the correct GitHub repository and the config branch enabled. Committing the YAML alone does not create a CircleCI project.
- **Arduino CLI checksum mismatch**: investigate the release archive rather than disabling verification. Confirm the pinned version and checksum before updating either.
- **Missing Arduino library**: inspect compiler diagnostics for the exact header; install the documented library or correct code without bypassing the compilation check.
- **Node build error**: compare with a clean `npm ci && npm test && npm run build` on Node 24; no production secrets should be needed.
- **Content validation failure**: inspect missing catalog part IDs, reference keys, code paths or SVG assets. Repair the source rather than deleting the quality gate.
- **New DIY targets other than UNO**: add a separate board-specific compilation matrix; do not force ESP32, GSM or ESP8266 examples through `arduino:avr:uno`.

## Verification boundaries

Passing an Arduino **compile** job does not prove correct pin wiring, electrical safety, calibration, real sensor readings, mobile browser layout or reliable real-world operation. Those still need physical testing and (for the website) browser-based QA.

Source: CircleCI configuration reference https://circleci.com/docs/reference/configuration-reference/ and Arduino CLI reference https://arduino.github.io/arduino-cli/latest/.
