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

### Catalog photos and administration

The admin inventory supports marketplace category filters combined with search and inventory status. New and existing products accept a JPEG, PNG or WebP photo up to 3 MB, with a preview before saving. Product details save first; if the photo upload fails, the form retains the saved product and selected file for retry.

Legacy photo URLs are recorded in `scripts/legacy-images.json`. Production initialization restores only missing image URLs and records each restoration in the product audit log. To regenerate the manifest from downloaded original JPEG files, run `node --env-file=.env.local scripts/upload-legacy.mjs /path/to/images` with the Blob token configured. The uploader resumes from the existing manifest.


## Orders and Roxas City meetups

Guest checkout stores orders in PostgreSQL. Customers propose a meetup point anywhere
within Roxas City, Capiz; the admin agrees on the exact location and schedule through
the supplied contact number. Payment for this rollout is cash at meetup.

- `/admin/orders`: authenticated queue, search, status filters, paging and customer updates.
- `/track.html`: private tracking code/link, no customer account required. Keep the code
  safe; it grants access to order contents and meetup details (not phone/name).
- Pending orders do not reserve stock. Confirmed orders reserve counted inventory;
  Ready preserves reservations; Completed deducts on-hand and reserved quantities.
  Cancelled releases reservations. Closed orders cannot be reopened.
- Catalog quantities exclude reservations. Uncounted items can be requested but must
  be counted before confirmation. Product edits cannot reduce stock below reservations.
- Checkout snapshots server-validated prices, rejects stale prices and unavailable items,
  serializes duplicate request IDs, and limits submissions per IP/contact per hour.
- Stock transitions run in transactions, locking the order and all products in ID order.
  Product versions and audit records change with reservations and deductions.
- Customer updates are visible on tracking; this rollout does not send SMS/email.

`scripts/schema.sql` is additive and repeatable. The existing production migration
command applies it before the build. No existing catalog rows or stock counts are reset.
Run `npm test` (Node 24) and `npm run build` before release. Integration tests use an
isolated PGlite PostgreSQL engine, not production data. PGlite does not test real
multi-session advisory-lock contention; production PostgreSQL supplies those locks.

## Learning Lab and DIY guides

- `/learn` browses the live product catalog with category/search filters and learning profiles.
- `/learn/[id]` explains the component, interface, reference specifications, applications,
  variant checks and related builds. Current catalog prices and availability come from `/api/products`.
- `/diy` has thirteen searchable Beginner/Basic/Intermediate guides; `/diy/[slug]` includes introduction,
  purpose, catalog-linked BOM, additional supplies, circuit schematic, pin table, operation
  diagram, full sketch, installation steps, expected behavior and troubleshooting.
- Storefront product dialogs link to lessons. `/index.html?product=cb-059` opens a product directly.
- Lessons and projects are authored in `content/`; source sketches are in `public/education/code`.
  Supplier notes are labelled separately from reference facts, and known disputed notes are
  omitted on educational detail pages in favor of explicit component corrections.
- Regenerate diagrams with `python scripts/build-education-diagrams.py` and
  `python scripts/build-project-schematics.py`. Module schematics and pin maps are complementary;
  check both against the sketch whenever changing pins.
- Code and SVG assets can be downloaded from each guide; print styles support Save as PDF.
  Listed parts do not imply confirmed stock. External supplies and GSM support hardware are
  clearly separated from catalog lines. No lessons claim physical hardware validation.
- Validation: `npm test`, `npm run build`, and real Arduino CLI compilation (toolchain details
  are in each guide). No production database migration is introduced by the learning pages.
