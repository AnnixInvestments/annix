# Per-portal hosts — production deployment runbook (Phase 4)

This runbook covers the production rollout of the per-portal hostnames refactor. **Phases 1–3 are merged in code; Phase 4 is the manual production deploy you (the operator) need to execute.** Phase 5 (admin re-registers passkey + verification) follows once Phase 4 is live.

For background and the canonical hostname mapping see `docs/portal-hosts-dev-setup.md` and `MEMORY.md` → "Per-portal hosts refactor".

## Prerequisites

- Cloudflare admin access for `annix.co.za` and `aurubber.co.za` (you'll need to add the latter as a Cloudflare zone if it isn't already there)
- Fly.io admin access for the `annix-app` Fly app
- `flyctl` installed locally and authenticated (`flyctl auth status`)
- All Phase 1–3 commits merged to `main` and the existing single-host deploy still healthy

## Order of operations

The order matters. Don't skip steps.

### 1. Cloudflare DNS records

Add the following records under the `annix.co.za` zone. All should be **proxied** (orange cloud) so Cloudflare handles SSL termination and the origin can stay on the existing single Fly hostname.

| Type | Name | Content | TTL | Proxy |
|---|---|---|---|---|
| CNAME | admin | annix-app.fly.dev | Auto | Proxied |
| CNAME | stockcontrol | annix-app.fly.dev | Auto | Proxied |
| CNAME | complysa | annix-app.fly.dev | Auto | Proxied |
| CNAME | fieldflow | annix-app.fly.dev | Auto | Proxied |
| CNAME | annixrep | annix-app.fly.dev | Auto | Proxied |
| CNAME | cv | annix-app.fly.dev | Auto | Proxied |
| CNAME | rfq | annix-app.fly.dev | Auto | Proxied |

For `aurubber.co.za` (separate zone):

| Type | Name | Content | TTL | Proxy |
|---|---|---|---|---|
| CNAME | @ | annix-app.fly.dev | Auto | Proxied |
| CNAME | www | aurubber.co.za | Auto | Proxied |

`auind.co.za` is already configured.

### 2. SSL certificates on Fly.io

Fly issues Let's Encrypt certs per hostname automatically when you add the hostname to the app:

```bash
flyctl certs add admin.annix.co.za --app annix-app
flyctl certs add stockcontrol.annix.co.za --app annix-app
flyctl certs add complysa.annix.co.za --app annix-app
flyctl certs add fieldflow.annix.co.za --app annix-app
flyctl certs add annixrep.annix.co.za --app annix-app
flyctl certs add cv.annix.co.za --app annix-app
flyctl certs add rfq.annix.co.za --app annix-app
flyctl certs add aurubber.co.za --app annix-app
flyctl certs add www.aurubber.co.za --app annix-app
```

After each `certs add`, verify provisioning:

```bash
flyctl certs check admin.annix.co.za --app annix-app
```

Wait for `Configured: yes` and `Verified: yes` before proceeding. Cloudflare proxy mode means the cert is technically only used for the Cloudflare → origin hop, but Fly still requires it for the hostname to be routable through their edge.

### 3. Backend `CORS_ORIGINS` env var

The CORS allowlist now includes all canonical hosts via `corsOriginsFor("prod")` (see `annix-backend/src/main.ts`). For belt-and-braces, also set `CORS_ORIGINS` explicitly:

```bash
flyctl secrets set CORS_ORIGINS="https://annix.co.za,https://www.annix.co.za,https://admin.annix.co.za,https://stockcontrol.annix.co.za,https://complysa.annix.co.za,https://fieldflow.annix.co.za,https://annixrep.annix.co.za,https://cv.annix.co.za,https://rfq.annix.co.za,https://aurubber.co.za,https://www.aurubber.co.za,https://auind.co.za,https://www.auind.co.za" --app annix-app
```

### 4. WebAuthn env vars (legacy fallback)

These are no longer used when the request host matches a known portal (`PasskeyConfig.rpId(host)` derives RP ID from the host directly). They're kept as a fallback for unknown hosts:

```bash
flyctl secrets set WEBAUTHN_RP_ID=annix.co.za --app annix-app
flyctl secrets set WEBAUTHN_RP_NAME=Annix --app annix-app
flyctl secrets set WEBAUTHN_ORIGIN="https://annix.co.za" --app annix-app
```

### 5. Smoke-test each host before announcing

For each new hostname, verify:

1. `https://<host>/health` returns 200
2. The portal-specific landing page renders (e.g. `https://aurubber.co.za` shows the AU Rubber login)
3. The redirect from `www.<host>` to canonical works (where applicable)
4. Login flow succeeds with password (passkey will fail until Phase 5 — see below)

### 6. Update marketing/email links

After the new hosts are live, update the email templates that hardcode `${frontendUrl}/<portal>/portal/...` paths to use the new portal-specific hostnames. File: `annix-backend/src/email/email.service.ts` (~15 hardcoded links). The cleanest refactor is to replace `${frontendUrl}/<portal>/portal/...` with `https://<portal-host>/portal/...` driven by the canonical portal-hosts config.

This is a separate commit/PR and can wait until users start using the new hostnames in earnest.

## Rollback plan

If anything breaks during cutover:

1. **Cloudflare DNS** — set the new CNAME records to "DNS only" (grey cloud) or delete them. Old `annix-app.fly.dev` keeps serving everything via path-based routing as before.
2. **Fly certs** — leave them; they don't break anything if unused.
3. **Backend code** — the host-aware path is opt-in. Requests that don't match a known portal (i.e. `annix-app.fly.dev`) fall through to the env-based config, which is unchanged.

The whole change is **forwards-compatible without DNS** — code is already deployed and doing nothing until you wire up DNS.

## After cutover — Phase 5

See `docs/portal-hosts-phase-5-verification.md` for the admin passkey re-registration and per-portal isolation verification checklist.
