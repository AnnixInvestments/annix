# OAuth Setup Guide for Voice Filter

## Quick Links
- Google: https://console.cloud.google.com/apis/credentials
- Microsoft/Teams: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- Zoom: https://marketplace.zoom.us/develop/create

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
   - Authorized redirect URIs: `http://localhost:47823/oauth/callback`
6. Copy the **Client ID** and **Client Secret**

---

## 2. Microsoft/Teams OAuth Setup

1. Go to [Azure Portal App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **"New registration"**
3. Fill in:
   - Name: "Voice Filter"
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: Select **Web** → `http://localhost:47823/oauth/callback`
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
   - Redirect URL: `http://localhost:47823/oauth/callback`
   - Add Scopes: `user:read:email` (for basic user info)
6. Copy the **Client ID** and **Client Secret**

---

## 4. Update .env File

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
```

---

## 5. Restart Voice Filter

After adding credentials, restart the Voice Filter app for changes to take effect.
