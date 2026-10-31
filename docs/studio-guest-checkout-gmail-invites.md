# CircuitByte — Guest checkout to optional Studio registration

## Purchase-to-Studio journey

1. Buyers browse and buy from the original CircuitByte storefront at `/`. Guest checkout requires **no account, email or Studio subscription**. The store prominently links to the free Arduino Project Studio before checkout.
2. The cart advertises free code, diagrams, component-library guidance and supported LED previews. The checkout form has an **unchecked** optional checkbox for a Studio account invitation. The email field becomes visible and required only if selected.
3. The purchase API validates email and explicit consent on the server. In the same transaction as the order, it writes one row to the `studio_order_invites` table. Customer phone numbers are not used to infer consent, passwords are not created, and nobody is silently subscribed to newsletters.
4. After an accepted order, **every buyer**, including non-subscribers, sees links to free Studio and optional registration. When an opted-in customer is queued before Gmail setup, the receipt clearly says the email isn't sent yet. The private order-tracking link remains separate.
5. When `STUDIO_ORDER_INVITES_ENABLED=true` **and** Gmail OAuth credentials exist, the app tries to send a single invitation after the database transaction. A failed email never changes the accepted order, cart financial values, stock or idempotency keys. The opted-in outbox stays retryable.
6. Existing opted-in invitations can be reviewed and retried *individually* in `/admin/studio-invites`, accessible from `/admin/orders`. Only an authenticated CircuitByte administrator may list addresses or send individual invitations. No bulk campaign feature.

The default behavior is **no outgoing email** until configured and explicitly enabled.

## Configure Gmail OAuth2 (later)

The implementation uses Google's Gmail API with the narrow `https://www.googleapis.com/auth/gmail.send` OAuth2 scope, not a Gmail primary password or ChatGPT credentials. No extra npm packages are required.

1. Choose a **dedicated CircuitByte Gmail or Google Workspace sender account**. Activate 2-Step Verification, secure the account and ensure its sender identity can send mail. Configure a Google Cloud project, enable the Gmail API and create an OAuth 2.0 client. Complete consent/authorization for the `gmail.send` scope and obtain a refresh token using a secure local process.
2. In Vercel **CircuitByte project → Settings → Environment Variables → Production**, add these as **server-side encrypted environment variables**, never as `NEXT_PUBLIC_*` or committed GitHub files:

```env
STUDIO_PUBLIC_SIGNUPS_ENABLED=true
GMAIL_SENDER_EMAIL=
GMAIL_OAUTH_CLIENT_ID=
GMAIL_OAUTH_CLIENT_SECRET=
GMAIL_OAUTH_REFRESH_TOKEN=
STUDIO_ORDER_INVITES_ENABLED=false
```

3. After adding the Gmail settings, redeploy. Validate in a disposable test account: register → verification email → click link → sign in → save Studio project. The existing administrator email remains exempt from the new verified-member gate because its pre-existing Better Auth record is unverified; do not bypass verification for ordinary new members.
4. Confirm new email invitations work on a small test order, then set `STUDIO_ORDER_INVITES_ENABLED=true` and redeploy. Only opted-in new orders will send automatically. The administrator may send previously queued invitations, individually.

**Note:** Google may restrict OAuth development/test refresh tokens or unverified apps; plan for proper Google OAuth consent-screen setup. Gmail is not a bulk-marketing delivery service, and Google may restrict rate, sender and outgoing volume. A transactional email provider is generally preferable after growth. Google's official Gmail sending limits and authentication requirements apply.

Do **not** send a Gmail primary account password, App Password, OAuth client secret, or refresh token through customer checkout or a ChatGPT message. Configure them directly in Vercel's secure settings.

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
