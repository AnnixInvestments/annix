# Per-portal hosts — local development setup

The Annix monorepo is migrating from a path-based portal layout (`localhost:3000/au-rubber/portal/...`) to a per-host layout (`aurubber.localhost:3000/portal/...` in dev, `aurubber.co.za/portal/...` in production). This isolates passkeys, cookies, and sessions per portal at the WebAuthn / browser level.

For background and the full 5-phase rollout plan see `docs/shared-registry.md` (entry: Portal hosts) and the `MEMORY.md` entry "Per-portal hosts refactor".

## One-time per-machine setup

Each developer needs the dev hostnames mapped to `127.0.0.1` in their hosts file. Modern Chrome / Edge / Firefox treat `*.localhost` as a secure context, so WebAuthn works without HTTPS and without certificate setup.

### Windows

1. Open Notepad **as Administrator**.
2. Open `C:\Windows\System32\drivers\etc\hosts`.
3. Append the block below.
4. Save. No restart required.

### macOS / Linux

```bash
sudo tee -a /etc/hosts <<'EOF'

# Annix per-portal dev hosts
127.0.0.1  admin.localhost
127.0.0.1  stockcontrol.localhost
127.0.0.1  aurubber.localhost
127.0.0.1  rfq.localhost
127.0.0.1  complysa.localhost
127.0.0.1  fieldflow.localhost
127.0.0.1  annixrep.localhost
127.0.0.1  cv.localhost
127.0.0.1  auind.localhost
EOF
```

### Hosts block to append (any OS)

```
# Annix per-portal dev hosts
127.0.0.1  admin.localhost
127.0.0.1  stockcontrol.localhost
127.0.0.1  aurubber.localhost
127.0.0.1  rfq.localhost
127.0.0.1  complysa.localhost
127.0.0.1  fieldflow.localhost
127.0.0.1  annixrep.localhost
127.0.0.1  cv.localhost
127.0.0.1  auind.localhost
```

`localhost` itself is reserved for the marketing landing page — do not add an entry for it.

## Verify

With the dev server running (`./run-dev.sh` or via the Claude Swarm orchestrator), open each URL in your browser:

| Portal | URL |
|---|---|
| Marketing | http://localhost:3000 |
| Platform admin | http://admin.localhost:3000 |
| Stock Control | http://stockcontrol.localhost:3000 |
| AU Rubber | http://aurubber.localhost:3000 |
| RFQ | http://rfq.localhost:3000 |
| Comply SA | http://complysa.localhost:3000 |
| FieldFlow | http://fieldflow.localhost:3000 |
| Annix Rep | http://annixrep.localhost:3000 |
| CV Assistant | http://cv.localhost:3000 |
| AU Industries | http://auind.localhost:3000 |

If a host fails to resolve, re-check the hosts file is saved with admin permissions and that no antivirus has reverted it.

## Production hosts (for reference)

The same portal codes resolve to the production hostnames below. The canonical source is `packages/product-data/portals/constants.ts` — never hardcode these elsewhere.

| Portal | Production host |
|---|---|
| Marketing | annix.co.za |
| Platform admin | admin.annix.co.za |
| Stock Control | stockcontrol.annix.co.za |
| Comply SA | complysa.annix.co.za |
| FieldFlow | fieldflow.annix.co.za |
| Annix Rep | annixrep.annix.co.za |
| CV Assistant | cv.annix.co.za |
| RFQ | rfq.annix.co.za |
| AU Rubber | aurubber.co.za |
| AU Industries | auind.co.za |

## WebAuthn / passkey notes

- Each portal has its own WebAuthn RP ID = its hostname. A passkey registered on `aurubber.localhost` cannot authenticate on `admin.localhost` (or any other portal) — the browser/OS enforces this at the WebAuthn protocol level.
- Cookies are scoped per host. Signing into one portal does not sign you into another.
- `admin@annix.co.za`'s existing passkey (created 2026-04-25 against the legacy single host) will become unusable once the per-host RP ID resolution lands. Re-register it on `admin.localhost:3000` (or `admin.annix.co.za` in production).
