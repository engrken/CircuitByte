# CircuitByte Studio — private cloud project and acceptance synchronization

Release increment for GitHub issue #45. Uses the existing Vercel + Postgres architecture, not Railway or another paid service.

## What is stored
A saved Studio project stores owner-only `studio_projects` data: title, template slug, board ID, sketch code, selected catalog items, reference module IDs, project prompt, own material notes, and the versioned, **self-reported** hardware acceptance record.

The additive, retry-safe `scripts/studio-schema.sql` adds `prompt`, `own_materials`, `acceptance_record` (JSONB), and `revision` to existing `studio_projects`. The prior standalone selected-module migration remains compatible. Existing projects get safe defaults and are never deleted or rewritten. Private records are deleted on project deletion and cascade when the account is removed.

## Request policy
- `GET /api/studio/projects`: authenticated, owner-only and `no-store`, up to 20 records (the Student/Hobby tier saves up to 10); remains available after UAT closes.
- `POST /api/studio/projects`: same-origin, authenticated, active UAT and existing slot limit; creates a new project and returns `id`, `revision:1`, `updatedAt`.
- `PUT /api/studio/projects`: same guards plus required `id` and last-known `revision`. Updates the *existing owned* project only when the database revision matches. Returns revision+1; a stale/conflicting/deleted/other-user ID returns **409**, with no overwrite or additional project slot.
- `DELETE`: existing owner-scoped deletion, unchanged.
- Server validates bounded input (90 KB request maximum, sketch <=15k, 16 catalog items, eight reference modules, prompt <=800, own materials <=600, existing bounded acceptance schema). Forged `independently-reviewed` statuses and outcomes without observations are rejected.

## Browser workflow
- **Save to dashboard** creates an owned record only once; **Update saved project** uses PUT + optimistic concurrency. A second save does not consume another of the 10 slots.
- Opening **My Dashboard → Open in Studio** restores saved acceptance evidence, requirements, materials, board and code. Modifying code/parts/board/objective/power data triggers the existing stale-evidence flag; only actual user-reported results count toward a passing test.
- Starting a new template/starter, importing a downloaded JSON file, or restoring a browser-only draft clears the prior cloud project association; those remain local until the user explicitly saves a new cloud copy.
- Cloud writes are **explicit**, not every local keystroke. Existing 700ms browser recovery autosaves remain local. A conflict preserves the local draft and advises exporting JSON before reloading.
- The dashboard only indicates that a private, user-reported record is saved. It never claims hardware certification.
- The API does **not** expose records to the public, share acceptance results between accounts, or mark any result as independently reviewed.

## Validation and deployment
- CI uses PGlite for schema reruns, real SQL owner scoping, create/update/conflict, JSON round-trip, malformed evidence and post-UAT GET access. No paid AI or Sandbox calls.
- Deployment runs the existing idempotent production migration once via the normal Vercel build. Check one READY release for the exact merge SHA, `/api/health`, `/studio`, `/dashboard`, unauthenticated GET 401 and PUT 403, and targeted runtime logs.
- **Manual authenticated UAT still necessary:** a real verified Student/Hobby account must create, re-open, edit acceptance evidence and save; an older tab should receive 409. Never use production customer data as CI fixtures.
- Without a verified user session, read-only smoke tests cannot prove cross-device authenticated synchronization.
