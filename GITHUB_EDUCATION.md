# GitHub Education development setup

This repository is prepared for the owner's verified faculty benefits. This configuration does not activate a subscription, guarantee a Codespaces allowance, or claim student-only partner offers.

## Use now

Use the repository's default branch, then Code > Codespaces > Create codespace. Confirm the billing owner and available quota first; use a 2-core machine where suitable. Alternatively, open the repository locally with VS Code Dev Containers. The container recommends the official GitHub Copilot extensions; sign in with the eligible GitHub account.

Dependencies are installed explicitly, not automatically: opening a container will not run application install hooks, database migrations or launch a server.

```sh
npm ci --no-audit --no-fund
npm run dev
```

Use Node 24. Available checks: npm test and npm run build. Never use build:vercel for routine development: it runs database migrations.

Forwarded ports must remain private. Configure only development credentials through Codespaces secrets or an ignored local environment file. Keep production credentials out of the Codespace. This setup has been structurally reviewed; an actual container launch and application runtime check are still pending.

## Benefit activation and quotas

- Redeem/verify Copilot at https://github.com/settings/copilot using the verified faculty account. A faculty approval does not by itself prove Copilot was redeemed.
- Teacher Team benefits are redeemed for an eligible educational organization through https://github.com/education/teachers . These personal repositories are not automatically converted to Team. Do not transfer repositories merely to claim a benefit.
- Confirm Codespaces usage and billing in GitHub settings before creating a machine. Do not assume the student/Pro 180 core-hour allowance applies to a faculty account. Core-hours scale with CPU count and storage is accounted separately.
- Set a short idle timeout (for example 15 minutes) in Codespaces settings; stop unused machines and delete those no longer needed. Closing a browser tab alone is not a reliable stop action. No prebuilds, scheduled jobs or paid overages are enabled by this change.
- Evaluate each partner offer for faculty eligibility, expiration and project use before redemption. Preserve a migration path for expiring credits.

## Release separation

This development setup is integrated into the default branch. Application code, production credentials, CI workflows and Vercel deployment settings are unchanged. The setup commit uses [skip ci] to avoid unnecessary CI runs. Existing hosting integrations may still react to the default-branch update; no separate deployment is required to use Copilot or Codespaces.

## Studio AI

Copilot here assists repository development. The public Studio AI provider is unchanged. A future optional Copilot SDK integration should authenticate each user with their own GitHub account and eligible subscription, or use separately provisioned organization/BYOK billing. Do not share the owner's token or treat a faculty subscription as unlimited public inference.

## References

- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers
- https://docs.github.com/en/education/about-github-education/github-education-for-teachers/about-github-education-for-teachers
