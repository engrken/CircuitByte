# CircuitByte Copilot bridge — isolated Railway deployment

The **main CircuitByte Studio AI Gateway stays the default**. This service is optional, and must not receive the owner's personal GitHub token or any other shared Copilot identity. Users must connect their own GitHub account and remain subject to the existing Studio monthly usage limits.

## Railway service

- Repository: `engrken/CircuitByte`
- Root directory: `/services/copilot` — not the Next.js monorepo root.
- Build from `services/copilot/Dockerfile`; Node.js 24.
- Port: `PORT` set by Railway; the process binds to `0.0.0.0`.
- Healthcheck path: `/live` (public, minimal liveness only).
- `GET /health` and `POST /completion` require `Authorization: Bearer <service secret>` and must not be open to browser clients.
- Required secret: `COPILOT_SERVICE_SECRET` (at least 32 cryptographically random characters). Set the **same** value as the `circuitbyte` Vercel production project; do not commit or print it.
- Optional: `COPILOT_MODEL` (defaults to `gpt-5.4` and must be enabled for each requesting GitHub user).
- Runtime allowance: up to two simultaneous requests, no filesystem/shell/MCP tools, one fresh temporary directory and SDK session per user request, explicit per-session GitHub token. Do not bind a repository or cache user credentials.

## Production activation gate

The service may become healthy without enabling public Studio Copilot. Only **after** a successful HTTPS /live check and a valid authenticated /health check, and after the GitHub OAuth credentials are verified, configure server-only Vercel production variables:

- `COPILOT_CLIENT_ID` and `COPILOT_CLIENT_SECRET` from a GitHub OAuth App using callback `https://circuitbyte.vercel.app/api/studio/copilot/callback`. No repository administration scopes.
- `COPILOT_COOKIE_SECRET` (separate random secret, length >=32).
- `COPILOT_SERVICE_URL` (the verified Railway HTTPS origin).
- `COPILOT_SERVICE_SECRET` (matches Railway).
- `STUDIO_COPILOT_ENABLED=true`, **only after** all preceding checks.

A Vercel environment variable update may require a production redeployment to take effect. Do not auto-trigger repeated deployments while configuring. Confirm the GitHub OAuth app's callback registration and each user's Copilot access before UAT. The bridge must never substitute the owner's teacher Copilot allowance for public users.

## Validation

Run `npm test` from the repository root (includes bridge payload-validation tests), and `node --test services/copilot/tests/*.test.mjs` independently. Deploy no more than once per tested commit and keep branch/PR deploys disabled in Railway until production is proven.

A successful `/live` response proves the Node process is running; it is **not** proof that Copilot token, model entitlement or inference works. Before activation, conduct an authenticated `/health` check without leaking the bearer, then a real per-user GitHub OAuth/Copilot generation test. Verify a second account cannot use the first account's cookie, invalid tokens are refused, and failures do not deduct Studio AI credits.

Retain `services/copilot/vercel.json` with `git.deploymentEnabled=false`, because this Dockerized bridge is not intended for the old Vercel `copilot` project. The main Vercel `circuitbyte` project remains separate.
