# Feature: Unified OAuth System with Multi-Provider Support

## Summary

Implemented a unified OAuth authentication system that allows users to connect multiple OAuth providers (Google, Microsoft, Zoom) simultaneously without being logged out when adding a new provider. This system is centralized and can be extended to all Annix platform applications.

## What Was Implemented

### 1. Unified OAuth Callback URL

All OAuth providers now use a single callback endpoint:
```
http://localhost:3000/api/auth/oauth/callback
```

For production:
```
https://app.annix.co.za/api/auth/oauth/callback
```

### 2. Two OAuth Modes

The system supports two modes passed via the `state` parameter:

- **`login` mode**: Creates or finds a user account and returns a new JWT token. Used for initial sign-in.
- **`connect` mode**: Adds OAuth tokens to an existing authenticated user. Used for connecting additional calendar providers.

### 3. State Parameter Format

The OAuth state encodes three values:
```
{provider}:{mode}:{encodedReturnUrl}
```

Example: `google:connect:%2Fvoice-filter%2Fcalendar`

### 4. Authorization Header Support

The backend now accepts JWT tokens via both:
- Cookie (`vf_token`)
- Authorization header (`Bearer {token}`)

This allows server-side API routes to pass the user's token when making backend requests.

## Files Involved

### Frontend (annix-frontend)

| File | Purpose |
|------|---------|
| `src/app/api/auth/oauth/[provider]/route.ts` | Initiates OAuth flow, builds authorization URL with state |
| `src/app/api/auth/oauth/callback/route.ts` | Handles OAuth callback, exchanges code, sets cookies |
| `src/app/lib/api/voiceFilterApi.ts` | Helper functions for OAuth URLs |
| `.env.local` | OAuth client credentials |

### Backend (voice-filter)

| File | Purpose |
|------|---------|
| `src/gui/server.ts` | OAuth token exchange, user creation, connect mode handling |
| `src/auth/database.ts` | Token storage functions (`saveOAuthToken`, `removeOAuthToken`) |
| `.env` | OAuth client credentials |

## How to Extend to Other Annix Apps

### Step 1: Use the Unified OAuth Routes

Any Annix app can use the existing OAuth routes by redirecting to:

```typescript
// For login (creates/finds user)
window.location.href = `/api/auth/oauth/${provider}?returnUrl=/your-app-path&mode=login`;

// For connecting additional providers (requires existing auth)
window.location.href = `/api/auth/oauth/${provider}?returnUrl=/your-app-path&mode=connect`;
```

### Step 2: Add New OAuth Providers

To add a new provider (e.g., Slack, GitHub):

1. **Add credentials to `.env.local`:**
```env
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

2. **Update the provider route** (`src/app/api/auth/oauth/[provider]/route.ts`):
```typescript
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  // ... existing providers
  slack: {
    clientId: process.env.SLACK_CLIENT_ID ?? "",
    authUrl: "https://slack.com/oauth/v2/authorize",
    scopes: ["users:read", "users:read.email"],
  },
};
```

3. **Update the backend** (`voice-filter/src/gui/server.ts`):
- Add token exchange logic in `exchangeOAuthCode()`
- Add provider to the allowed list

4. **Configure redirect URI** in the provider's developer console:
```
http://localhost:3000/api/auth/oauth/callback
```

### Step 3: Integrate with App-Specific Auth Context

Example for a new app module:

```typescript
// src/app/context/YourAppAuthContext.tsx
import { voiceFilterApi } from "@/app/lib/api/voiceFilterApi";

export function YourAppAuthProvider({ children }) {
  const loginWithOAuth = (provider: string) => {
    // For initial login
    window.location.href = `/api/auth/oauth/${provider}?returnUrl=/your-app&mode=login`;
  };

  const connectProvider = (provider: string) => {
    // For adding additional providers to existing account
    window.location.href = `/api/auth/oauth/${provider}?returnUrl=/your-app&mode=connect`;
  };

  // ... rest of context
}
```

## OAuth Provider Configuration

### Google (AnnixApp Project)
- **Console**: https://console.cloud.google.com/apis/credentials?project=annixapp
- **Redirect URI**: `http://localhost:3000/api/auth/oauth/callback`
- **Scopes**: `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`

### Microsoft (Annix Platform)
- **Console**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
- **Redirect URI**: `http://localhost:3000/api/auth/oauth/callback`
- **Scopes**: `openid`, `email`, `profile`, `User.Read`, `Calendars.Read`, `offline_access`

### Zoom
- **Console**: https://marketplace.zoom.us/user/build
- **Redirect URI**: `http://localhost:3000/api/auth/oauth/callback`
- **Scopes**: `user:read:user`

### Apple (if needed)
- **Console**: https://developer.apple.com/account/resources/identifiers/list/serviceId
- **Redirect URI**: `http://localhost:3000/api/auth/oauth/callback`
- **Note**: Apple uses `response_mode: "form_post"` (POST callback)

## Security Considerations

1. **Token validation**: All tokens are verified using JWT before trusting user identity
2. **CSRF protection**: State parameter includes encoded return URL, preventing open redirects
3. **Cookie security**: `httpOnly`, `secure` (in production), `sameSite: lax`
4. **Fallback behavior**: If `connect` mode is used without valid token, falls back to `login` mode

## Testing Checklist

- [ ] Login with Google creates new user
- [ ] Login with Microsoft creates new user
- [ ] Login with Zoom creates new user
- [ ] Connect Google to existing Microsoft account (keeps Microsoft session)
- [ ] Connect Microsoft to existing Google account (keeps Google session)
- [ ] Connect Zoom to existing account
- [ ] Disconnect provider removes tokens
- [ ] Invalid/expired token falls back to login mode
- [ ] Production redirect URIs configured in all provider consoles

## Future Enhancements

1. **Account linking**: Detect when same email exists across providers, offer to link accounts
2. **Token refresh**: Implement automatic token refresh for expired OAuth tokens
3. **Provider icons**: Add proper icons for each provider in the UI
4. **Scope management**: Allow users to see and manage granted scopes per provider
5. **Revocation**: Add ability to revoke access from provider side (OAuth revocation endpoint)

## Related Files for Reference

```
annix-frontend/
├── src/app/api/auth/oauth/
│   ├── [provider]/route.ts    # OAuth initiation
│   └── callback/route.ts      # OAuth callback handling
├── src/app/lib/api/
│   └── voiceFilterApi.ts      # OAuth URL helpers
└── .env.local                 # OAuth credentials

voice-filter/
├── src/gui/server.ts          # Backend OAuth handling
├── src/auth/database.ts       # Token storage
├── OAUTH_SETUP.md             # Setup documentation
└── .env                       # OAuth credentials
```
