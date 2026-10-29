# CircuitByte

Next.js catalog and administration rebuild. Deployment uses the Vercel project circuitbyte. Initial database setup runs during production builds.

## Included

- Database API for the public catalog; 101 original products preserved in the import file.
- Admin sign-in using Better Auth; public registration disabled. Server-side email allowlist protects all inventory and photo mutations.
- Create/edit/archive products, prices in integer centavos, nullable stock, category and description editing.
- Optimistic version checks prevent silently overwriting another edit; product writes and audit records share a transaction.
- Authenticated JPEG/PNG/WebP uploads (3 MB maximum) to public Vercel Blob, with signature checks.
- Responsive existing storefront and Messenger inquiry cart. Inquiries do not reserve or decrement inventory.
- Utility links removed from the storefront footer.

## Setup

1. In Vercel project `circuitbyte`, create/connect a **Neon Postgres** database through Storage/Marketplace. Direct Neon project creation is rejected because the organization is Vercel-managed.
2. Connect Blob store `circuitbyte-products` (`store_u6P24Z7EQvBXiYyH`). Ensure `BLOB_READ_WRITE_TOKEN` is set on the project; store creation alone does not verify its environment binding.
3. Copy `.env.example` to `.env.local`; enter the database URL and Blob token, generate a random 32+ byte `BETTER_AUTH_SECRET`, and confirm `ADMIN_EMAIL`. Do not commit secrets. Use separate databases and credentials for preview and production.
4. Run `npm ci`, then `npm run db:seed` to create inventory tables and import the catalog without overwriting existing rows. Imported stock is NULL (uncounted); legacy quantity labels remain separate.
5. Provide `INITIAL_ADMIN_PASSWORD` locally, then run `node --env-file=.env.local scripts/setup-auth.mjs`. This creates auth tables and the initial administrator. Remove the initial password variable afterward. Public sign-up stays disabled in the deployed app.
6. `npm run build`; run locally with `npm run dev`. Set the local auth URL to the local origin while testing.
7. Link this repository to the existing Vercel project in its Git settings, use Next.js framework and repository root, and clear the previous static output directory override. Deploy only after integration validation.

## Validation and remaining work

Production compilation passed. Live database CRUD, administrator sign-in, upload, concurrency and mobile browser flows still need testing after provisioning. The admin panel includes the latest 100 audit entries with Philippine timestamps, plus published, archived, low-stock and uncounted filters. Existing Blob photos are retained when replaced, so historical audit references remain usable. No product photos were included in the source archive.

Before production, verify: anonymous mutation rejected; allowed admin login/logout; add/update/archive; stale edit returns 409; invalid uploads rejected; photo visible in storefront; prices and stock persisted after reload; stock display and cart quantity behavior; mobile cart and keyboard controls.

## First administrator
The owner receives a private one-time setup link. Its token is stored only in Vercel, not this repository. Set a password with at least 12 characters. Setup refuses to create another administrator after the configured account exists. The standard public auth handler keeps registration disabled.

Database variable fallback: DATABASE_URL or circuitbyte_DATABASE_URL. Production migrations use the same connection and never treat legacy quantity labels as inventory counts.
