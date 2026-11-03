# Bootstrap integration

Bootstrap 5.3.8 compiled CSS is vendored in public/vendor/bootstrap and loaded through /bootstrap.css. Both the Next.js root layout and static index/track pages load it. The downloaded file matches the SHA-384 published in the official Bootstrap introduction documentation; the bundled copyright/license header is retained.

Bootstrap is placed in a named CSS cascade layer so existing unlayered CircuitByte styles retain priority. Shared theme overrides define the CircuitByte button palette and focus styling. Studio applies Bootstrap nav, button and form classes; its React state still controls step gating. Native dialogs and details elements remain native. Bootstrap JavaScript is intentionally not loaded: no Bootstrap data API components are used, avoiding competing handlers and extra runtime code. This is a CSS/framework foundation, not a replacement of every existing page with a Bootstrap template.

To update: retrieve the chosen version from the official distribution, verify its published integrity, preserve its license notice, and update the import path. No package-lock change or installation lifecycle scripts are needed for this vendored CSS approach.

Source: https://getbootstrap.com/docs/5.3/getting-started/introduction/
Validation: vendor integrity and JSX syntax only; no tests or browser UAT run per user instruction.
