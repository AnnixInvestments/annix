---
title: Sign in with a Passkey
slug: sign-in-with-passkey
category: Account
roles: [admin, manager, viewer, quality, storeman, accounts]
order: 1
tags: [auth, passkey, webauthn, security, login]
lastUpdated: 2026-04-25
summary: Use Face ID, Touch ID, Windows Hello, or a security key to sign in without typing your password.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/components/PasskeyLoginButton.tsx
  - annix-frontend/src/app/lib/passkey
  - annix-backend/src/passkey
---

## What is a passkey

A passkey is a phishing-resistant alternative to your password. It lives on your device (or syncs through iCloud Keychain / Google Password Manager / 1Password), and signs in by checking your fingerprint, face, or a security key — never by sending a secret over the network.

## How to add your first passkey

1. Sign in with your email and password as normal.
2. Open **Account settings** in any Annix portal.
3. Find the **Passkeys** section.
4. Click **Add passkey**, give it a name (e.g. "MacBook Touch ID"), and follow the device prompt.

You can add multiple passkeys — one per device, or use a hardware key like a YubiKey as a backup.

## How to sign in with a passkey

1. Open the login page for any Annix portal.
2. Optionally enter your email so the right credential is suggested.
3. Click **Sign in with passkey**.
4. Approve the prompt with Face ID, Touch ID, Windows Hello, or your security key.

You will be taken straight to the dashboard — no password needed.

## Where it works

Passkeys work in any modern browser:

- **macOS** — Touch ID on MacBooks, or your account password
- **Windows 10/11** — Windows Hello fingerprint, face, or PIN
- **iOS / Android** — Face ID, Touch ID, biometrics
- **Hardware keys** — YubiKey, Titan, Feitian, etc. (USB / NFC)
- **Cross-device** — scan a QR with your phone to sign in on a desktop

## Rules and constraints

- Each passkey is **bound to your user account** — you can register passkeys on multiple devices, but each one is yours alone.
- Removing your **last** passkey is blocked when you have no password set, so you cannot accidentally lock yourself out.
- A passkey replaces password entry but does **not** replace your password. You can still sign in the old way at any time.
- If you lose all your devices and your password, contact your administrator for an account reset.

## Tips

- Name your passkeys (e.g. "Work iPhone", "Home Mac") so you can spot which one to remove if a device is lost.
- Synced passkeys (iCloud Keychain, Google Password Manager) move with you to new devices automatically.
- Hardware keys are the strongest option for shared workstations — keep one in a safe as a recovery key.
