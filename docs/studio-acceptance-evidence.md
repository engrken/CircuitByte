# CircuitByte Studio — user-owned physical acceptance evidence

Increment for GitHub issue #45, designed to land in the same controlled release as PR #50. Requires no additional server, provider, backend tables, or paid AI/Sandbox calls.

## What students can do
- In Studio, after loading a starter/template or generating a project, open **Hardware acceptance & measured evidence** from the existing Studio workbench. The former separate checkbox-only bench checklist has been consolidated so there is one clear evidence workflow.
- Record **exact board and breakout revisions**, measured operating supply/logic notes, and four prefilled tests: power-off continuity/polarity, measured voltage, actual sensor/actuator responses and end-to-end behavior. Rename tests, edit measurable expectations or add up to two custom criteria.
- For each test, record actual observations and self-report *Not tested*, *Failed on physical hardware* or *Passed by me on physical hardware*. A result cannot be marked passed/failed until hardware model, power notes and an adequate observed result have been supplied.
- Export/restore the evidence with the **existing** browser JSON draft; the printable project sheet includes criteria and observations. There is **no assertion of server-side synchronization**, independent verification or certification by the AI or Arduino compiler.

## Revision integrity and safety
- The acceptance record is schema version 1, with a monotonically increasing local revision number.
- Its scope is an exact comparison of selected board, sketch content, project objective, selected parts, selected reference modules, recorded hardware models and power specifications. Reordering selected part IDs alone does not stale the record.
- If any of these inputs change after observations exist, the UI marks the evidence **stale**, stops counting the previous passes, and requires an explicit *Start new verification revision*. This retains the old observations on-screen until reset and creates a new, untested record; export the old evidence first if it must be archived.
- Imported JSON is constrained: up to six unique criterion IDs; bounded titles (100 chars), expected results (300), observations (600), hardware model (120), power notes (300); no accepted `independently-reviewed` status or success outcome with insufficient evidence.
- This feature never runs, uploads or flashes code automatically. It does not certify electrical safety and is limited to educational low-voltage work. Students remain responsible for hardware measurement and physical testing.
- Evidence is local to the existing draft format. Dashboard cloud saves continue to store code and selected materials, **not** acceptance records until a separate versioned private-record backend is designed and authorized.

## Verification and release
- Deterministic Node tests cover project-scoped criteria, stale evidence, data validation, backwards-compatible draft import/export and nonduplication of checklist UI.
- Add the small acceptance test to the existing Vercel pre-build unit gate, not a paid AI call or multi-board Sandbox compile.
- Authenticated Studio/mobile UAT and actual physical device tests remain separately pending. Code compilation is not proof of physical behavior.
