# Studio audit — 2026-11-03

Scope: local software verification, with no paid AI calls, remote sandbox compilation, GitHub Actions runs or physical hardware testing.

## Coverage

- 10 selectable board profiles: canonical IDs, pinned compiler targets, serial starter generation, export round trips, mocked build artifact delivery and network isolation.
- 30 reference modules: existing module/catalog and board-aware library checks. This does not certify each module on every board.
- 101 catalog products: explicit capabilities (26 hardware-only, 49 core IO, 2 serial, 16 managed library, 4 variant confirmation, 1 board core, 3 different-board products).
- 40 library registry entries: 37 named packages exist in the locally cached official Arduino library index; three entries represent built-in/core support. Metadata availability is not cross-board compilation certification.
- Guided specifications, BOM quantities, schematic references and structured nets; electrical conflict/voltage checks; alias normalization and rejection of variable names as physical parts.
- Browser upload protocol and firmware validation with fake serial ports. No connected hardware was flashed.
- 137 local automated checks passed (134 Studio checks plus three new connection/image-credit checks).

## Fixes

Compilation reserves allowance before work and increments consumed credits only on success. Failed source compilation, library/toolchain failures, service errors and abandoned/expired requests consume no compilation credit. Reservations serialize against each member/month/operation ledger and expire after ten minutes. Duplicate settlement cannot charge twice. Failed settlement preserves successful build output without charging; an uncommitted reservation expires.

AI drafts/repairs and image generation use the same reservation mechanism: provider errors, invalid responses and image-processing errors do not consume AI credits. A successfully returned draft or image uses the separate AI allowance; successful draft generation is not proof of compilation or electrical correctness. Prior deductions are not automatically refunded because the legacy counter does not identify which requests failed.

Signal playback now requires explicit output configuration in a simple setup() and declines unmodeled setup behavior. It remains a limited digitalWrite/delay visualization, not a general firmware or electrical simulator.

Updated stale assertions for ESP firmware image arrays, expanded upload profiles, catalog links, electrical review dependencies, and board-neutral firmware errors.

## Remaining verification

Actual board/module variants, supply and signal voltage limits, library API compatibility for arbitrary generated sketches, installation/building of every library against every board core, provider availability/entitlements, physical upload and runtime behavior still require targeted integration or bench testing. AI images are illustrative and cannot establish exact pin placement or schematic validity. Software checks must not be described as universal hardware certification.
