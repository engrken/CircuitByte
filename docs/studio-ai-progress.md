# CircuitByte Studio — progressive AI draft status (opt-in transport)

## Purpose
GitHub issue #43. The legacy `POST /api/studio/ai` endpoint remains a complete JSON response. New Studio UI requests use `POST /api/studio/ai/progress` with NDJSON for **status-only** updates while generation runs. The final `complete` event includes only the validated JSON from the existing handler. Intermediate code or wiring is never rendered.

## Contract
- Request: same JSON body as the legacy AI endpoint (authenticated, same-origin, active Student/Hobby UAT).
- Response content type: `application/x-ndjson`, `no-store, no-transform`.
- One or more `{"type":"status","message":"…"}` events; messages are progress notices, **not verified engineering results**. Heartbeats every 12 seconds show that processing is still underway without claiming a percentage.
- On success: exactly one `{"type":"complete","result":{...}}` containing the full validated draft, then EOF.
- On rejection/failure: `{"type":"error","status":422,"error":"…"}` then EOF. Streaming clients must treat errors, missing final events, and invalid frames as failure and **must not** apply incomplete wiring/code.
- Browser checks bound response size to 250 KB; aborts at same timeout as legacy UI.

## Security and costs
The progress route delegates to the same server-side `POST` used by the JSON endpoint: same auth, quota reservation, model fallback, electrical and pin validation. Client disconnects propagate abort to the provider; interrupted requests cannot settle an AI success credit. Successful drafts count once. No tokens are displayed, persisted or streamed. Failure preserves the existing editor sketch; repairs keep recovery snapshots.

## Validation
The Node tests cover split frames, provider rejection, missing/malformed completion, cancellation and abort. These lightweight tests are included in `npm test` and the existing Vercel pre-build test gate. All environment and paid inference checks remain in #40: do not claim authenticated end-to-end production UAT from unit tests. Before public release, test one verified Studio account, confirm final draft validity and usage settlement, and verify mobile slow-network behavior and server proxy streaming support.
