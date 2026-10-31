# CircuitByte — Guest checkout to optional Studio registration

## Purchase-to-Studio journey

1. Buyers browse and buy from the original CircuitByte storefront at `/`. Guest checkout requires **no account, email or Studio subscription**. The store prominently links to the free Arduino Project Studio before checkout.
2. The cart advertises free code, diagrams, component-library guidance and supported LED previews. The checkout form has an **unchecked** optional checkbox for a Studio account invitation. The email field becomes visible and required only if selected.
3. The purchase API validates email and explicit consent on the server. In the same transaction as the order, it writes one row to the `studio_order_invites` table. Customer phone numbers are not used to infer consent, passwords are not created, and nobody is silently subscribed to newsletters.
4. After an accepted order, **every buyer**, including non-subscribers, sees links to free Studio and optional registration. When an opted-in customer is queued before Gmail setup, the receipt clearly says the email isn't sent yet. The private order-tracking link remains separate.
5. When `STUDIO_ORDER_INVITES_ENABLED=true` **and** Gmail OAuth credentials exist, the app tries to send a single invitation after the database transaction. A failed email never changes the accepted order, cart financial values, stock or idempotency keys. The opted-in outbox stays retryable.
6. Existing opted-in invitations can be reviewed and retried *individually* in `/admin/studio-invites`, accessible from `/admin/orders`. Only an authenticated CircuitByte administrator may list addresses or send individual invitations. No bulk campaign feature.

The default behavior is **no outgoing email** until configured and explicitly enabled.

## Gmail App Password setup (small initial rollout)

The sender supports **Gmail SMTP using an App Password** over `smtp.gmail.com:465` with TLS. The older Gmail API OAuth2 option remains supported but is not needed for App Password SMTP.

1. Use a dedicated Gmail address. Enable Google **2-Step Verification** at <https://myaccount.google.com/security>.
2. Generate a **16-character App Password** at <https://myaccount.google.com/apppasswords> and label it `CircuitByte Studio`. Do not use your ordinary Gmail account password.
3. In **Vercel → CircuitByte → Settings → Environment Variables**, set these for **Production** (secrets should be sensitive/encrypted):

```env
STUDIO_PUBLIC_SIGNUPS_ENABLED=true
GMAIL_SENDER_EMAIL=your-dedicated-address@gmail.com
GMAIL_APP_PASSWORD=<16-character App Password>
STUDIO_ORDER_INVITES_ENABLED=false
```

4. Redeploy once so Vercel loads the variables. Test a new member signup at `/dashboard?register=1`, actual Gmail delivery, verification link, login and private project saving.
5. Only after successful delivery tests, set `STUDIO_ORDER_INVITES_ENABLED=true` and redeploy to enable checkout opt-in invitation delivery. Until then, guests can order, and invitation requests stay queued.

**Security:** Do not paste App Passwords into chat, public GitHub files, checkout pages or client-side variables. Store them directly in Vercel. Google may restrict App Passwords for Workspace or Advanced Protection accounts. Changing your main Google password will revoke existing App Passwords. App Passwords are less secure than OAuth2, and Gmail is not suited to bulk marketing.

### Alternative Gmail API OAuth2

The existing `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN` options remain supported when combined with `GMAIL_SENDER_EMAIL`. The App Password option takes priority when valid. See <https://support.google.com/accounts/answer/185833>.

## Consent and privacy rules

- A buyer's optional email is ignored entirely if Studio invitation consent is not checked.
- The outgoing message contains a public dashboard URL only, never the private order tracking token.
- `studio_order_invites.email` is visible only through the authenticated administrator endpoint, not public order confirmation or tracking results.
- The invitation is transactional and specific to the request. It is **not** marketing newsletter consent. Any future marketing messages need a separate opt-in, unsubscribe and privacy-policy coverage.
- Invitations use an atomic `pending → sending → sent` outbox state with a stale-claim expiry and five-attempt cap. A successful Gmail API acknowledgment is recorded before a message is marked sent. Rare provider-success/DB-failure conditions can still permit duplicate retries; manual verification is advised after ambiguous responses.
- An email provider outage cannot cause a duplicate paid order or double-reserve stock. Existing item validation and order stock reconciliation are unchanged.

## Testing and release gates

`tests/studio-checkout-invites.test.mjs` tests opt-in validation, Gmail encoding, simulated OAuth token exchange and secure messages.

`tests/studio-purchase-integration.test.mjs` uses isolated PostgreSQL to test order idempotency, outbox enrollment, guest checkout and email non-disclosure.

CircleCI additionally runs web quality and original Arduino UNO compilation. **The Gmail server is intentionally not tested without credentials**, and the checkout integration should be mobile-QA tested before production release.

PR #14 has an existing Vercel build-rate-limit failure. Do not merge before a successful Vercel preview, or explicit acceptance of that deployment risk.
