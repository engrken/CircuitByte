# CircuitByte Arduino Project Studio — Beta MVP

Route: `/studio` (Next.js 16 App Router). Existing Marketplace, Learn, DIY, stock, payment/order and admin routes are unchanged.

## What works without external AI or paid compilers

1. Browse and select up to 16 products from the existing 101-item CircuitByte catalog.
2. Describe a low-voltage project in everyday language.
3. **Guided matching** chooses an existing educational project and its real `.ino` source: ultrasonic proximity alarm, three-LED scanner, joystick direction LEDs, DHT22 16×2 LCD, or microSD light logger.
4. Review missing selected parts, wiring table, module-specific caveats and the full existing DIY guide.
5. Edit the loaded source, download `.ino`, and optionally save one local browser-only draft. No account, database migration or checkout flow is involved.

This is explicitly a **curated matching system**, **not arbitrary AI synthesis** and **not a simulator**. A generated project is not a guarantee that the requested custom behavior is implemented: review the sketch. Product IDs are descriptive catalog references, not real-time inventory promises.

## Admin-only beta features (OFF unless configured)

### Cloud compilation

`POST /api/studio/compile` uses `@vercel/sandbox` with a fresh one-off 1 vCPU Vercel microVM for each compilation. This is an actual `arduino-cli compile --fqbn arduino:avr:uno` operation, not a syntax mock.

Guardrails:
- Authenticated CircuitByte **admin** required (`requireAdmin`), same-origin only.
- `STUDIO_COMPILER_ENABLED=true` must be explicitly set after service capability, cost quotas and operator testing are confirmed.
- Exactly Arduino UNO R3 and 10–15,000 characters of source; requires `setup()` and `loop()`.
- Arduino CLI 1.5.1 download checked against official SHA256; AVR core and DHT sensor, Unified Sensor, hd44780 and SD libraries installed.
- Network enabled solely for installing the toolchain, then set to **deny-all before untrusted sketch compilation**.
- No database, Vercel admin secrets, Blob storage tokens, or other application environment variables are sent to the VM.
- VM is stopped in a `finally` block. Errors and compilation diagnostics are returned, but generated `.hex` files and board flashing are not yet supported.

**Cost caveat:** cold-start toolchain installation for each compile can be slow and incur Vercel Sandbox compute/network usage. Before public availability, bake a version-pinned custom sandbox image with preinstalled Arduino toolchain, implement authenticated per-user quotas, build concurrency controls, cost budgets, and job history. Keep disabled on public production until these controls are completed.

### AI code drafts

`POST /api/studio/ai` connects to **Vercel AI Gateway** using the selected `STUDIO_AI_MODEL` and Vercel OIDC or `AI_GATEWAY_API_KEY`.

Set `STUDIO_AI_ENABLED=true` only after choosing a current valid Gateway `provider/model`, setting spend limits and verifying account access. Restricted to authenticated admin and same origin; max 800-character user prompt, max 16 catalog item IDs, no mains/safety-critical projects. AI output is JSON-validated, sketch-shaped and marked **unverified**.

A valid AI draft **is not proof** it compiles, uses electrically correct wiring, safely supports a part, or performs the exact intended action. Confirm with independent compiler and physical bench QA. Do not expose external AI charges or unrestricted compilation to the public.

### Suggested environment

```
STUDIO_AI_ENABLED=false
STUDIO_AI_MODEL=
STUDIO_COMPILER_ENABLED=false
# AI_GATEWAY_API_KEY=  # Optional server-only secret; prefer Vercel OIDC on Vercel.
```

No new database schema, user billing, subscription plans, permanent accounts, cloud files or payments were added in the MVP. Those require design and testing before public SaaS rollout.

## Testing

`npm test` covers matching, source-file availability and safety rejection. CircleCI continues to run `npm ci`, `npm test` and `npm run build` plus the four original UNO examples. The Studio's **cloud compile endpoint** requires an authenticated admin and enabled flag to run; until explicitly activated, its live behavior remains **unverified**. Never claim that a Vercel build or CircleCI compile validates that runtime endpoint.

## Safety and compliance

- No mains AC, high-voltage power control, safety-critical systems or medical systems.
- Never treat a breakout's PCB label as proof of 5 V logic tolerance.
- Check resistor sizing, sensor power, current and pinouts before wiring.
- Arduino CLI licensing, upstream libraries, SaaS terms, optional paid provider API, and hardware manufacturer licenses should be reviewed before commercial launch.
- Browser mobile UI does not provide reliable direct board flashing; download sketches for Arduino IDE. Direct USB upload can be considered later for supported desktop browsers with explicit permission.
