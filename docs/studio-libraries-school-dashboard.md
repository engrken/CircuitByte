# CircuitByte Studio — automatic libraries, custom library import, member dashboard and schools

## What ships in this release

### Guided Arduino libraries

`lib/studio-libraries.mjs` is a curated allowlist mapping supported CircuitByte product IDs and `#include` headers to the official Arduino Library Manager names. The Studio UI shows recommended libraries and inserts missing header statements when preparing a project or when users click **Insert missing library includes**.

Supported profiles include: UNO core, LCD1602 I²C (`hd44780` + `Wire`), DHT11/DHT22 (`DHT sensor library` + `Adafruit Unified Sensor`), SSD1306 OLED (`Adafruit SSD1306` + `Adafruit GFX Library`), microSD (`SD` + `SPI`), DS3231 (`RTClib`), NEO-6M GPS (`TinyGPSPlus`), IR modules (`IRremote`), servos (`Servo`), steppers (`Stepper`) and serial peripherals (`SoftwareSerial`).

**Do not treat all catalog parts as pre-verified.** Some electronics need no library at all; some controller variants have ambiguous dependencies; ESP8266/ESP32 firmware cannot be compiled for Arduino UNO. Installed names must be checked against Library Manager for version compatibility.

### User-supplied library ZIPs

- Browser accepts one Arduino ZIP archive for the current build (max 250 KB compressed).
- Zip is not stored in the database, sent to a shared library directory, or published to other customers.
- When the compiler is enabled for an authenticated **administrator**, the ZIP is written to an isolated ephemeral Vercel Sandbox. Network is disabled before extraction/compilation.
- ZIP extractor rejects traversal, symlinks, excess files or expanded size, unknown file formats and archives without headers; only a library-layout folder is made available through the compiler's `--libraries` option.
- User code must include its own matching headers for private ZIPs. Server sends base64 solely for that compilation and stops the sandbox after.
- This does not change the **existing** default `STUDIO_COMPILER_ENABLED=false`, admin-only access, or available compiler quotas. The custom ZIP path is a feature of the restricted runtime, **not yet a public SaaS entitlement**.
- Do not treat ZIPs or board firmware as safe just because they parse; arbitrary C/C++ still demands isolated execution and resource controls. No arbitrary shell hooks, external git URLs or unbounded uploads.

### Member dashboard

- `/dashboard` allows existing authenticated users to view/edit their private profile and school/program information and save up to 10 Arduino project sources.
- Project APIs read and delete by `user_id` and use DB advisory locking around the 10-project quota.
- Sign-up opens only when `STUDIO_PUBLIC_SIGNUPS_ENABLED=true` and Gmail OAuth2 sender variables are configured (`GMAIL_SENDER_EMAIL`, client ID, client secret and refresh token). The Gmail API sends verification links. See `docs/studio-guest-checkout-gmail-invites.md`.
- The pre-existing administrator account is unverified and remains allowed to sign in with its existing credentials. Non-administrator accounts must verify email before accessing saved projects and school profiles. The admin email is reserved by a Better Auth user creation hook.
- Avoid mass registration until a verified domain/from-address, signup abuse limits, password resets, retention and privacy policy are in place.

### School affiliation and homepage

- `studio_profiles.school_name` and `program` are private by default, **unverified** until reviewed.
- A member may explicitly consent to the school name (never the member's name, email, or program) being listed.
- Administrators use a review queue on `/dashboard` to mark independently verified affiliations as approved. The public `/api/studio/schools` returns **only** profiles with `public_consent=true AND school_verified=true AND school_public_approved=true`.
- Changing the school or withdrawing consent resets the publication flags; unapproved names are not published.
- Home page section is labelled **“Schools represented by our members”**, not schools officially partnered with or endorsing CircuitByte; it displays an honest empty state if no school is approved. Do not seed fictional school users or insert institution names without verified opt-in.

### Database and deployment

`scripts/studio-schema.sql` contains only additive schema for `studio_profiles` and `studio_projects`. The normal production build applies it **after** Better Auth's migration so it is idempotent. No existing marketplace, inventory, receipt or CLEAR System tables are altered.

Environment configuration (optional, never expose secrets in client code):

```env
STUDIO_PUBLIC_SIGNUPS_ENABLED=false
GMAIL_SENDER_EMAIL=                # dedicated Gmail account
GMAIL_OAUTH_CLIENT_ID=             # server-only Google OAuth2 client ID
GMAIL_OAUTH_CLIENT_SECRET=         # server-only OAuth2 client secret
GMAIL_OAUTH_REFRESH_TOKEN=         # server-only gmail.send refresh token
STUDIO_ORDER_INVITES_ENABLED=false # enable only after Gmail has been tested
STUDIO_COMPILER_ENABLED=false     # remain off until compiled-archive sandbox runtime and costs validated
STUDIO_AI_ENABLED=false
```

## Testing and limitations

CircleCI runs tests in `tests/studio-libraries-schools.test.mjs`, the existing web suite and UNO sketch compile checks. Production Next.js build should validate all new routes.

**Pending independent runtime QA:** Gmail API verification emails, registration + login, Neon user profile/persistence after migration, actual Arduino custom ZIP compilation, sandbox resource quotas, school approval and public list in a real browser, as well as admin account verification. The features should not be marketed as fully public SaaS until tested and activated. Subscription billing remains disabled.
