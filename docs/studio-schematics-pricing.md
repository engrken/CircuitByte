# CircuitByte Studio — schematics, BOM and pricing launch plan

## Shipped features (safe for public guided use)

- New Studio **Diagrams** tab: displays existing published schematic and labelled wiring SVG assets for the five reviewed guide templates. Allows downloading those SVGs. **These are functional module-level / pin-to-pin drawings, not guarantees of breadboard physical position or certification of the exact hardware variant.** No drawings are fabricated for AI-generated unreviewed sketches.
- New **Connections** tab: renders a deterministic UNO pin/net/type table from `content/studio-project-specs.json`; `lib/studio-documentation.mjs` checks for duplicate signal pins, malformed rows and invalid asset paths.
- New **Parts / BOM** tab: displays quantities, catalog item IDs, snapshot unit prices in Philippine pesos, computed line totals, optional variants, and explicitly unlisted prerequisites. No claims of live inventory, tax-inclusive price, shipping, guaranteed pack quantities or approved customer quotation.
- Guided-only **Print / Save PDF sheet** button: standard browser print dialog with A4-specific print CSS, including editable sketch, wiring table, schematic references, BOM, original prompt, and safety notes. Users select **Save as PDF** in their print destination. This is not a generated PDF file or a one-click server PDF endpoint.
- Printed schematic from an existing guided guide is marked illustrative. If the user changes code, the export warns the diagram refers to the original template, not the edited sketch.
- **AI-generated sketch:** wiring suggestions remain unverified; the Diagrams tab does **not** create a confident-looking but imaginary schematic, and BOM pricing is withheld until the hardware spec is reviewed.

## Hardware exception examples

- **microSD logger:** a 3.3 V regulator on the catalog adapter does **not** establish 5 V-tolerant SPI logic. MicroSD card and analog LDR module are required but not in the tracked Studio BOM; appropriate level shifting may also be required. Clearly excluded from estimated total and flagged as physical prerequisites.
- **DHT22 LCD:** whether a 10 kΩ pull-up is needed depends on the exact sensor/module board; the BOM marks it optional.
- **LEDs:** a separate 330 Ω resistor for each bare LED is included in both the connection notes and BOM.
- **HC-SR04:** refer to the correct 5 V pinout. Project is educational and not collision protection.

## Proposed SaaS prices (not activated)

| Proposed plan | Indicative monthly price (PHP) | Scope |
| --- | ---: | --- |
| Free | 0 | Guided templates, diagrams, connection charts, print-to-PDF |
| Student / Hobby | 99 | Intended 15 AI drafts, 25 cloud compiles, 10 cloud projects per month |
| Pro Maker | 499 | Intended 60 AI drafts, 100 cloud compiles, 50 cloud projects per month |
| School / Classroom | from 2,999 | Custom negotiated institutional seats and shared quotas |

The frontend at `/studio/pricing` labels **every paid plan as a non-binding proposal**. No checkout links, subscription products, Stripe/PayMongo integration, webhook, permission or user entitlement change exists.

### Commercialization gates before subscriptions can go live

1. Benchmark **actual** AI model token usage, failures/retries, and 95th percentile expense; select a current provider/model with token budget and rate limits.
2. Benchmark sandbox cost per compilation using a **prebaked trusted Arduino CLI image** rather than paying to download board cores and libraries every time. Set session concurrency limits, timeouts, day/month usage ceilings, per-tenant isolation and abuse detection.
3. Establish auth roles, secure project ownership, Neon migration/backup, paid entitlements, refunds, cancellations, invoice/tax treatment, data privacy and school seat administration.
4. Introduce explicit billing provider integration with idempotent webhook handling and receipt integrity, independent of CLEAR System. Do not claim subscription activated based on pricing UI alone.
5. Require competent electrical engineering review of higher-risk projects. Compilation success is not proof of physical function or electrical safety.

## Source-of-truth rules

1. Published guided drawings: `/public/education/diagrams/{slug}-{schematic,wiring}.svg`
2. Reviewed pin tables and quantities: `content/studio-project-specs.json`
3. Illustrative unit prices: `scripts/catalog.json` (existing static catalog only, may not represent live production inventory)
4. Proposed subscriptions: `content/studio-pricing.json` with `salesEnabled:false`.

Regression tests: `npm test` includes `tests/studio-documentation.test.mjs`; CircleCI additionally runs the production Next.js build and the original Uno compilation targets.

No payments, stock edits, production data migrations or unrestricted compiler access are required for this update.
