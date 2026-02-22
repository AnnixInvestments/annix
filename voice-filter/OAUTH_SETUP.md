# OAuth Setup Guide for Annix Platform

## Architecture Overview

Annix Platform uses a unified OAuth system for all apps:
- **OAuth initiation**: `/api/auth/oauth/{provider}?returnUrl=/your-app-path`
- **OAuth callback**: `/api/auth/oauth/callback` (single callback for ALL Annix apps)
- **Token exchange**: Handled by backend on port 47823

**All Annix apps share ONE callback URL**: `http://localhost:3000/api/auth/oauth/callback`

Configure this single URL in each OAuth provider - it works for voice-filter, and any future Annix apps.

## Quick Links
- Google: https://console.cloud.google.com/apis/credentials
- Microsoft/Teams: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- Zoom: https://marketplace.zoom.us/develop/create
- Apple: https://developer.apple.com/account/resources/identifiers/list/serviceId

---

## 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (if you don't have one)
3. Click **"Create Credentials"** → **"OAuth client ID"**
4. If prompted, configure the OAuth consent screen first:
   - User Type: External
   - App name: "Voice Filter"
   - User support email: your email
   - Developer contact: your email
   - Save and continue through all steps
5. Back to Credentials → Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Voice Filter"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/oauth/callback`
6. Copy the **Client ID** and **Client Secret**

---

## 2. Microsoft/Teams OAuth Setup

1. Go to [Azure Portal App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **"New registration"**
3. Fill in:
   - Name: "Voice Filter"
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: Select **Web** → `http://localhost:3000/api/auth/oauth/callback`
4. Click **Register**
5. On the Overview page, copy the **Application (client) ID**
6. Go to **"Certificates & secrets"** in left menu
7. Click **"New client secret"**
   - Description: "Voice Filter Secret"
   - Expires: 24 months (or your preference)
8. Copy the secret **Value** immediately (you can't see it again!)

---

## 3. Zoom OAuth Setup

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/develop/create)
2. Click **"Build App"** (or sign in first)
3. Choose **"OAuth"** app type
4. Fill in:
   - App Name: "Voice Filter"
   - App Type: User-managed
5. In the app settings:
   - Redirect URL: `http://localhost:3000/api/auth/oauth/callback`
   - Add Scopes: `user:read:email` (for basic user info)
6. Copy the **Client ID** and **Client Secret**

---

## 4. Apple Sign In Setup

Apple Sign In requires an Apple Developer account ($99/year).

### Step 1: Create an App ID
1. Go to [Apple Developer - Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **"+"** to create a new identifier
3. Select **"App IDs"** and continue
4. Select **"App"** type and continue
5. Fill in:
   - Description: "Voice Filter"
   - Bundle ID: `com.yourcompany.voicefilter` (explicit)
6. Scroll down and enable **"Sign in with Apple"**
7. Click **Continue** then **Register**

### Step 2: Create a Service ID
1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Click **"+"** to create a new identifier
3. Select **"Services IDs"** and continue
4. Fill in:
   - Description: "Voice Filter Web"
   - Identifier: `com.yourcompany.voicefilter.web` (this is your **Client ID**)
5. Click **Continue** then **Register**
6. Click on the newly created Service ID
7. Enable **"Sign in with Apple"**
8. Click **Configure** next to Sign in with Apple:
   - Primary App ID: Select your App ID from Step 1
   - Domains: `localhost`
   - Return URLs: `http://localhost:3000/api/auth/oauth/callback`
9. Click **Save** then **Continue** then **Save**

### Step 3: Create a Key
1. Go to [Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click **"+"** to create a new key
3. Fill in:
   - Key Name: "Voice Filter Sign In"
4. Enable **"Sign in with Apple"**
5. Click **Configure** and select your Primary App ID
6. Click **Save** then **Continue** then **Register**
7. **IMPORTANT**: Download the `.p8` file immediately (you can only download it once!)
8. Note the **Key ID** shown on the page

### Step 4: Find Your Team ID
1. Go to [Membership](https://developer.apple.com/account/#!/membership/)
2. Your **Team ID** is displayed on this page

### Step 5: Add to .env
```env
APPLE_CLIENT_ID=com.yourcompany.voicefilter.web
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=C:\path\to\AuthKey_XXXXXX.p8
```

**Note**: Apple Sign In is more complex than other providers because it uses a dynamically generated client secret (JWT signed with your private key) instead of a static secret.

---

## 5. Update Environment Files

### annix-frontend/.env.local

Add OAuth credentials to the Next.js frontend:

```env
# OAuth credentials (needed for OAuth initiation)
GOOGLE_CLIENT_ID=paste-your-google-client-id
GOOGLE_CLIENT_SECRET=paste-your-google-client-secret

MICROSOFT_CLIENT_ID=paste-your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=paste-your-microsoft-client-secret

ZOOM_CLIENT_ID=paste-your-zoom-client-id
ZOOM_CLIENT_SECRET=paste-your-zoom-client-secret

APPLE_CLIENT_ID=com.yourcompany.voicefilter.web
APPLE_TEAM_ID=paste-your-team-id
APPLE_KEY_ID=paste-your-key-id
APPLE_PRIVATE_KEY_PATH=C:\path\to\AuthKey_XXXXXX.p8

# Voice filter backend URL
VOICE_FILTER_BACKEND_URL=http://localhost:47823
```

### voice-filter/.env

Add OAuth credentials to the voice-filter backend (needed for token exchange):

Open `C:\Users\andy\Documents\Annix-sync\voice-filter\.env` and add:

```env
# Google OAuth
GOOGLE_CLIENT_ID=paste-your-google-client-id
GOOGLE_CLIENT_SECRET=paste-your-google-client-secret

# Microsoft OAuth (works for Microsoft and Teams)
MICROSOFT_CLIENT_ID=paste-your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=paste-your-microsoft-client-secret

# Zoom OAuth
ZOOM_CLIENT_ID=paste-your-zoom-client-id
ZOOM_CLIENT_SECRET=paste-your-zoom-client-secret

# Apple OAuth
APPLE_CLIENT_ID=com.yourcompany.voicefilter.web
APPLE_TEAM_ID=paste-your-team-id
APPLE_KEY_ID=paste-your-key-id
APPLE_PRIVATE_KEY_PATH=C:\path\to\AuthKey_XXXXXX.p8
```

---

## 6. Restart Both Servers

After adding credentials, restart both servers for changes to take effect:

1. **annix-frontend** (Next.js on port 3000):
   ```bash
   cd annix-frontend && pnpm dev
   ```

2. **voice-filter** (API server on port 47823):
   ```bash
   cd voice-filter && pnpm dashboard
   ```

## 7. Test OAuth Flow

1. Go to `http://localhost:3000/voice-filter/login`
2. Click "Continue with Google" (or another provider)
3. You should be redirected through:
   - Next.js API → OAuth provider → Next.js callback → `/voice-filter`
4. Check that you're logged in on the voice-filter dashboard
