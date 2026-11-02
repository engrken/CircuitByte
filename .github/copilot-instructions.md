# CircuitByte development instructions

CircuitByte is a Next.js electronics storefront and learning Studio using PostgreSQL, Better Auth and Vercel Blob.

Preserve integer-centavo prices, stock reservation transactions and server-side admin authorization. Studio projects must use the selected board and BOM. Distinguish simulation, compilation and physical hardware validation. Check voltage levels, pin assignments and power requirements against authoritative board/module documentation. Retain desktop guidance and mobile/tablet usability. Do not proxy the owner's personal Copilot entitlement to public Studio visitors.

## Working practice

- Read existing code and applicable AGENTS.md files before editing. Keep changes focused and preserve unrelated work.
- Use the repository's existing dependencies and package manager. Do not invent test commands.
- Never print or commit credentials, environment files, personal student/customer data or production database exports.
- Prefer focused local checks. Batch changes to conserve CI and deployment quotas. Do not start cloud builds, deployments or migrations solely to validate documentation or development configuration.
- State what was actually verified and what remains untested. Successful compilation is not proof of live service or hardware correctness.
- GitHub Education entitlements belong to the eligible account/organization; repository configuration does not redeem benefits or supply public SaaS inference credits.

## Setup and validation

Use Node 24. Available checks: npm test and npm run build. Never use build:vercel for routine development: it runs database migrations.

See GITHUB_EDUCATION.md for cloud development and activation steps.
