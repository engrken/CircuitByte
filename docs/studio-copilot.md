# CircuitByte Copilot integration

## Implementation and activation are separate

Repository Copilot instructions and Codespaces settings already exist. They assist development; they do not start paid cloud coding sessions automatically. Sign in as engrken in VS Code/Codespaces or assign a specific task to Copilot on GitHub. No automated task assignment, CI run or Codespace is created by this change.

Studio now implements optional per-user GitHub OAuth, an encrypted eight-hour browser connection, provider selection, and Copilot-backed AI drafts and compiler repairs through the same sketch validation and electrical review as existing drafts. Copilot is unavailable until all required configuration exists. The owner's token is never shared with visitors. GitHub connection alone is not proof of an active Copilot subscription; the first requested generation determines whether GitHub allows access.

## Administrator setup

1. Register a GitHub OAuth App at https://github.com/settings/developers . Name: CircuitByte Studio; homepage: https://circuitbyte.vercel.app/studio ; callback: https://circuitbyte.vercel.app/api/studio/copilot/callback . Use the authorization-code flow with PKCE. Do not grant repository or organization administration access.
2. Deploy the isolated service in `services/copilot` to a container host with HTTPS ingress. Build using that directory as the Docker context. Supply a random `COPILOT_SERVICE_SECRET` of at least 32 characters. It must match the web application's secret. The service has no database, repository mount or application secrets. The pinned SDK manages its compatible runtime; allow outbound access to GitHub's runtime download and Copilot inference endpoints. Provision sufficient memory for up to two concurrent runtime processes. `COPILOT_MODEL` defaults to `gpt-5.4`; access depends on each user's subscription.
3. Set server-only Vercel production variables: `COPILOT_CLIENT_ID`, `COPILOT_CLIENT_SECRET`, `COPILOT_COOKIE_SECRET` (a separate random secret of at least 32 characters), `COPILOT_SERVICE_URL` (the HTTPS service origin), `COPILOT_SERVICE_SECRET`, and `STUDIO_COPILOT_ENABLED=true`. Keep `STUDIO_AI_ENABLED=true`. Existing `BETTER_AUTH_URL` must be the canonical HTTPS origin. Never put these values in chat, git, or NEXT_PUBLIC variables.
4. Deploy the application once after configuring these variables. Verified Studio members open the GitHub Copilot section, connect their own GitHub account, and select My GitHub Copilot. Existing drafts survive the OAuth round trip via workspace draft storage. Connections expire within eight hours; reconnect instead of storing refresh tokens indefinitely.
5. Owner UAT: connect, cancel authorization, generate a draft, repair a compiler error, disconnect, verify a second Studio account cannot reuse the first account's connection, and check exhausted/revoked GitHub access. No tests or live Copilot requests were run during implementation, per the owner's resource limits. The separate runtime has not been deployed or authenticated.

## Billing and isolation

Studio's existing monthly request cap still applies to validated drafts and repairs. Failed attempts and electrically rejected AI drafts should not consume completed-operation Studio credits. Copilot also charges the requesting user's own GitHub allowance. There is no automatic paid-provider fallback for a Copilot request. Image illustrations still use AI Gateway; Copilot is not substituted for that image API. The observed image-provider 403 remains unresolved by this integration.

Tokens are AES-GCM encrypted in Secure, HttpOnly, SameSite=Lax host-only cookies, bound to the current verified Studio user. OAuth state expires after ten minutes and includes PKCE. No token is returned to JavaScript or saved in localStorage. Disconnect clears this browser's connection; revoke the OAuth app in GitHub Settings > Applications to revoke authorization across devices.

Each completion has a fresh SDK process and temporary directory, `mode: empty`, no tools, and an explicit user token. Environment inheritance excludes host credentials. The service limits input size, request duration and concurrency, authenticates the application with a separate service secret, suppresses provider logs, and removes request state after termination. HTTPS ingress is required; do not expose a raw Copilot headless port publicly.

References: https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth and https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/multi-tenancy .

## Container-host preparation (November 2026)

`services/copilot/README.md` now documents the isolated Docker service and deployment checklist for a dedicated container host such as Railway. The HTTP bridge protocol has standalone tests (`npm test` from `services/copilot`) that require no external GitHub credentials. It includes a public liveness endpoint `GET /healthz` for container health checks, but `/health` and `/completion` remain protected by a strong shared secret. Production Copilot stays disabled until hosting, OAuth authorization and credentialed end-to-end UAT succeed. The existing `copilot` Vercel project must stay Git-disabled; do not turn its Next.js deployment back on.
