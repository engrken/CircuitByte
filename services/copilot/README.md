# CircuitByte Copilot bridge (optional)

This is a **container** service for signed-in CircuitByte Studio members who separately authorize their own GitHub Copilot. It is not a Next.js app and must not be deployed as the Vercel `copilot` project. The main CircuitByte AI Gateway remains the default.

## Test without GitHub credentials

From `services/copilot`: `npm test` (Node 24). The 7 tests exercise authentication, request validation, payload limits, per-user concurrency, public health readiness, and generic error handling using a fake model. They do **not** call GitHub Copilot or require the SDK binary. A real subscription and live end-to-end request remain necessary before production activation.

## Container host setup (Railway example)

1. Connect Railway to `engrken/CircuitByte`; create a single service named `circuitbyte-copilot-bridge`, not an entire replica of the Next.js site. Select repository root directory **`/services/copilot`** and the existing `Dockerfile`. Do not move the Next.js app.
2. Limit **watch paths** to **`/services/copilot/**`** at the repository root. Turn off automatic preview/PR environments for this bridge and review projected usage before enabling automated builds. Prefer a single replica initially.
3. Configure health check `GET /healthz` (unauthenticated; only `{ready:true}`), container port from platform-provided `PORT`, and HTTPS public ingress. Do not publicly expose the SDK's internal JSON-RPC port. Configure an appropriate monthly spending cap before activation.
4. Set **only** `COPILOT_SERVICE_SECRET` as a secret environment variable (a unique random value of at least 32 characters). Optionally set `COPILOT_MODEL` to a model authorized for the connecting user. Never configure owner-wide GitHub tokens or production database secrets on this host. The bridge requires outbound access to GitHub endpoints.
5. Check `GET /healthz` over HTTPS. `GET /health` **must return HTTP 401** without the shared bearer secret. Invalid or unauthorized `POST /completion` requests must be rejected. Do not put the shared secret or users' OAuth tokens in URLs, logs, repository files, or browser code.
6. In the main **CircuitByte Vercel project only**, add server-side production variables `COPILOT_SERVICE_URL` (verified HTTPS Railway origin), `COPILOT_SERVICE_SECRET` (matching the bridge), `COPILOT_CLIENT_ID`, `COPILOT_CLIENT_SECRET`, and `COPILOT_COOKIE_SECRET`. Configure the corresponding GitHub OAuth app callback `https://circuitbyte.vercel.app/api/studio/copilot/callback`. Keep `STUDIO_COPILOT_ENABLED` **unset or false** until the deployment and authorization smoke tests pass. All secrets must remain private.
7. With a non-production test account, verify GitHub connect/cancel/disconnect, actual Copilot entitlement, one validated sketch, rejected wiring, expired credentials, and 429/503 scenarios. Then set `STUDIO_COPILOT_ENABLED=true` and perform one controlled CircuitByte production deploy. Keep the AI Gateway enabled and the old duplicate `copilot` Vercel project disabled.

**Billing:** Copilot model usage is attributed to the requesting GitHub user; CircuitByte Studio's own usage rules also apply. Failed generations should not consume successful-operation Studio credits. Do not assert available GitHub allowance based on faculty status alone.

**Operational note (November 2026):** Railway's legacy `railway.json` configuration-as-code is deprecated for **new** services. Set the service root, Dockerfile, watch paths and health check through Railway's current service settings/API, rather than relying on a new `railway.json`. This directory intentionally does not add one.

The bridge runs each request in a fresh Copilot SDK client with `mode:'empty'`, no tools, a per-user session token, a private temporary directory, a concurrency cap, and forced SDK shutdown on completion. Do not add filesystem, shell, MCP or repo tools to public sessions without a separate security review.
