# Per-portal hosts — Phase 5 verification checklist

After the Phase 4 production cutover (see `portal-hosts-deployment-runbook.md`), the following one-off migration and end-to-end checks confirm that per-portal passkey isolation is working as intended.

## Why an existing passkey breaks

`admin@annix.co.za` had one passkey registered on **2026-04-25** against the legacy single-host RP ID (`annix.co.za` in production, `localhost` in dev). The Phase 2 backend changes derive the RP ID from the request host, so on `admin.annix.co.za` the RP ID is now `admin.annix.co.za` — different from what the original credential was bound to. WebAuthn will reject the assertion because the credential's RP ID doesn't match.

This is expected and intentional. The fix is one re-registration per affected user per portal.

## One-time migration

1. **Sign in with password** at `https://admin.annix.co.za/login` as `admin@annix.co.za`.
2. **Settings → Access Control → Your passkeys**.
3. **Delete** the existing "Andy's AU Laptop" passkey (id=1) — it's no longer usable.
4. **Add passkey** → name it "Andy's AU Laptop (admin)" → complete the Windows Hello / browser prompt.
5. Sign out, then sign back in using the new passkey to confirm.

Repeat for any other user that had a passkey registered before the cutover (database query: `SELECT id, user_id, device_name, created_at FROM passkeys WHERE created_at < '2026-05-01'`).

## Per-portal isolation checks

Run these after the migration to confirm Cross-portal passkey use is blocked.

### Test 1 — Admin passkey works on admin only

- On `https://admin.annix.co.za/login`, click "Sign in with passkey", complete Windows Hello → ✅ should sign in.
- On `https://stockcontrol.annix.co.za/login`, type `admin@annix.co.za`, click "Sign in with passkey" → ❌ should fail with "No passkey is registered for this account on this device."
- Same expectation on `https://aurubber.co.za`, `https://complysa.annix.co.za`, etc.

### Test 2 — A new portal-specific passkey isolates correctly

1. Password-sign-in to `https://aurubber.co.za` (user with permission).
2. Settings → register a new passkey called "AU Rubber test".
3. Sign out, then "Sign in with passkey" on `https://aurubber.co.za` → ✅ works.
4. On `https://admin.annix.co.za/login`, "Sign in with passkey" with same email → ❌ AU Rubber passkey is invisible/unusable.

### Test 3 — Cookie isolation

1. Sign in to `https://admin.annix.co.za` (password or passkey).
2. Open `https://stockcontrol.annix.co.za` in the same browser — should land on the login page, NOT auto-authenticated. Per-host cookie scoping is working.
3. Same for any other portal pair.

### Test 4 — Browser-level credential listing

1. On `https://aurubber.co.za/login`, click the email field and look at autofill suggestions — Windows Hello / Chrome password manager should only offer credentials registered for `aurubber.co.za`. The browser itself enforces this at the WebAuthn API level.
2. Repeat on `https://admin.annix.co.za` — should only see admin credentials.

If any of these tests fail, escalate — the rollback in the runbook is still available (revert DNS to the single-host setup).

## Sign-off

Once all 4 tests pass for at least 3 portal hosts, mark Phase 5 complete in `MEMORY.md` → `project_per_portal_hosts.md` and close out the per-portal hosts workstream.
