# Web Push Notifications (VAPID)

Browser **push notifications** for Annix Orbit (e.g. the seeker "your job
matches are ready" alert) and Stock Control are delivered through a single
shared channel: `annix-backend/src/notifications/channels/web-push.channel.ts`.
Both apps wrap the same `WebPushChannel`, so there is **one VAPID keypair per
environment** that serves every app — not one per app.

## Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Yes | Public key. The browser fetches it at runtime from the backend (`GET /api/annix-orbit/notifications/vapid-key`), so **no frontend rebuild** is needed when it changes. |
| `VAPID_PRIVATE_KEY` | Yes | Private key. Treat as a secret — never commit it. |
| `VAPID_SUBJECT` | No | `mailto:` or URL contact. Defaults to `mailto:admin@example.com`. Set to `mailto:info@annix.co.za`. |

If `VAPID_PUBLIC_KEY` **or** `VAPID_PRIVATE_KEY` is missing, `WebPushChannel`
logs `VAPID keys not configured - web push disabled`, `isEnabled()` returns
`false`, and every send silently no-ops. The in-app return banner (Orbit Browse
Jobs) still works without push.

## Keys are per-environment

Each Fly app is independent and has its own push-subscription store, so each
needs its **own** keypair:

- `annix-app` — production
- `annix-app-test` — test

Within one environment the public key (used by the browser to subscribe) and
the private key (used by the backend to send) must be a matching pair. Across
environments they can — and should — differ. **Do not reuse one environment's
keypair for another**, and do not paste production private keys into chats,
tickets, or this repo. Fly secrets are write-only (`fly secrets list` shows
names only, never values), so a lost keypair can't be read back — regenerate
and re-set instead.

## Generate + set

```bash
# 1. Generate a keypair (do this where it will be used — ideally a terminal)
npx web-push generate-vapid-keys

# 2. Set as Fly secrets on the target app (triggers a restart that re-enables push)
fly secrets set \
  VAPID_PUBLIC_KEY=<public> \
  VAPID_PRIVATE_KEY=<private> \
  VAPID_SUBJECT=mailto:info@annix.co.za \
  -a annix-app-test
```

Phone-friendly alternative: Fly.io dashboard → app → **Secrets** → add each
name/value. No terminal required.

## Verify

After the app restarts, while logged into that environment:

```
GET /api/annix-orbit/notifications/vapid-key
```

Returns `{ "key": "<public key>" }` when configured, or `{ "key": null }` when
not. Then trigger "Help me Find a Job", lock the screen, and the completion
push should arrive — note OS-level push only reaches an **installed PWA**
(home-screen) with notifications allowed; Safari tabs cannot receive web push,
but always get the in-app return banner.

## Rotating keys

Changing `VAPID_PUBLIC_KEY` invalidates every existing push subscription in
that environment (clients must re-subscribe). Browsers re-subscribe
automatically on next visit via the hook, and stale endpoints are pruned on the
first failed send (HTTP 410/404). Only rotate when necessary.
