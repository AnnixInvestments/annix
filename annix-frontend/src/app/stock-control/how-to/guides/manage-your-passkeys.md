---
title: Manage Your Passkeys
slug: manage-your-passkeys
category: Account
roles: [admin, manager, viewer, quality, storeman, accounts]
order: 2
tags: [auth, passkey, webauthn, security, settings]
lastUpdated: 2026-04-25
summary: Add new passkeys, rename existing ones, and revoke a passkey when you change devices.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/components/PasskeyManagementSection.tsx
  - annix-frontend/src/app/stock-control/portal/settings/page.tsx
---

## Where to find it

The **Your passkeys** section appears in:

- Stock Control → **Settings** (admin only)
- Admin Portal → **Settings**
- AU Rubber → **Settings**
- CV Assistant → **Settings**
- Customer Portal → **Profile**
- Supplier Portal → **Profile**

If you do not see it in your portal, your browser may not support passkeys. Modern Chrome, Edge, Safari, and Firefox all do.

## Add a passkey

1. Open your portal's settings or profile page.
2. Find **Your passkeys**.
3. Click **Add passkey**.
4. Optionally type a name like "Work iPhone" — this helps you identify the credential later.
5. Approve the device prompt (Face ID, Touch ID, Windows Hello, or your security key).

The new passkey appears in the list immediately. You can repeat this for each device you use.

## Rename a passkey

1. Click **Rename** next to the passkey.
2. Type a new name (e.g. "MacBook 2024", "YubiKey 5C") and press **Save**.

Renaming does not affect the passkey itself — it only changes the label you see in the list.

## Remove a passkey

1. Click **Remove** next to the passkey.
2. Confirm in the dialog.

Removing is required when:

- You sell or recycle a device
- You lose a hardware key
- You want to rotate to a fresh credential

If you only have **one** passkey AND your account has no password set, the system will block the removal so you cannot lock yourself out. Set a password first, or add a second passkey, then try again.

## What the badges mean

- **Synced** — the passkey is backed up to your cloud account (iCloud Keychain, Google Password Manager, 1Password) and will follow you to new devices automatically.
- **Device-bound** — the passkey only works on the original device. If you replace the device, register a new passkey on the new one.
- **Last used** — when this passkey was last used to sign in. A long-unused passkey on a device you no longer have is a good candidate to remove.

## Tips

- Add a hardware security key as a backup if you only have one device.
- Keep at least two passkeys on file so you do not have to fall back to your password if one device is unavailable.
- After replacing a phone or laptop, remove the old passkey and add one for the new device.
