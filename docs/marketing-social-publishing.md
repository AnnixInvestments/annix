# Marketing Social Publishing — setup & operations

The marketing CMS can share a resource's cover image (or a custom image) and caption to
LinkedIn, Facebook, Instagram and X. This document explains how the feature works and the
exact credentials each platform needs.

## How it works

- Each resource card in the marketing CMS (`/admin/portal/marketing` → Edit → Resources) has a
  **Share to socials** button. It opens a composer pre-loaded with that resource's cover image and
  an auto-built caption (title + excerpt). A **Custom post** tab lets you upload any image and write
  any caption instead.
- Each platform has a backend **adapter** that reports `configured: false` until its credentials are
  present. Until then its toggle is greyed out ("Not connected") and nothing can be posted to it.
- The composer shows a per-platform success/failure result after posting.

Source:
- Backend module: `annix-backend/src/marketing/social/` (`social-publishing.service.ts`, `adapters/`).
- Endpoints: `GET /admin/marketing/social/status`, `POST /admin/marketing/social/share` (admin-guarded).
- Frontend composer: `annix-frontend/src/app/lib/marketing/components/SocialShareModal.tsx`.

## Where credentials live

All credentials are **Fly secrets** — never commit them, never paste them in chat or PRs.

```bash
fly secrets set KEY=value -a <annix-app-name>
```

After setting secrets the app restarts and the relevant toggle activates.

| Env var | Platform | What it is |
|---|---|---|
| `SOCIAL_PUBLIC_BASE_URL` | all | Public site origin that serves marketing images, e.g. `https://annix.co.za`. Meta and X fetch the image from this URL, so it must be publicly reachable (localhost will not work). Falls back to `FRONTEND_URL`. |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn | OAuth 2.0 access token authorised for the company Page. |
| `LINKEDIN_AUTHOR_URN` | LinkedIn | The Page author URN, e.g. `urn:li:organization:1234567`. |
| `META_PAGE_ACCESS_TOKEN` | Facebook + Instagram | One long-lived Page access token covers both. |
| `FACEBOOK_PAGE_ID` | Facebook | Numeric Facebook Page ID. |
| `INSTAGRAM_USER_ID` | Instagram | The Instagram Business account ID linked to the Page. |
| `X_API_KEY`, `X_API_SECRET` | X | App consumer key/secret. |
| `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | X | Account access token/secret (OAuth 1.0a). |

The image URL sent to each platform is made absolute by prefixing the stored marketing-asset path
(`/api/public/marketing/asset?key=...`) with `SOCIAL_PUBLIC_BASE_URL`.

## Platform setup

### LinkedIn (start here — simplest, best B2B fit)

1. Create an app at <https://www.linkedin.com/developers> and associate it with the Annix company
   **Page** (the app's "Company" must be the Annix Page).
2. Under **Products**, request the **Community Management API** (this requires approval).
3. Generate an OAuth 2.0 access token with scope `w_organization_social` (and `r_organization_social`),
   authorised by a Page **admin**.
4. Set:
   - `LINKEDIN_ACCESS_TOKEN` = the token.
   - `LINKEDIN_AUTHOR_URN` = `urn:li:organization:<your-page-id>`.

**Token lifetime:** LinkedIn access tokens expire (~60 days). For now, refresh manually when posting
starts failing with a 401; automatic refresh can be added later.

### Meta — Facebook Page + Instagram (start the review early, it is the slowest)

1. Create a **Business**-type app at <https://developers.facebook.com>.
2. Add the **Facebook Login** and **Instagram Graph API** products.
3. Convert the Instagram account to a **Business** (or Creator) account and **link it to the Annix
   Facebook Page** (Page → Settings → Linked accounts).
4. Request permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
   `instagram_content_publish`. These require **App Review + Business Verification** — allow days to
   weeks; begin immediately.
5. Generate a **long-lived Page access token** and collect:
   - `META_PAGE_ACCESS_TOKEN` = the long-lived Page token.
   - `FACEBOOK_PAGE_ID` = the Page's numeric ID.
   - `INSTAGRAM_USER_ID` = the IG Business account ID linked to the Page
     (`GET /<page-id>?fields=instagram_business_account`).

**Instagram constraints:** the image must be a publicly reachable JPEG/PNG URL (hence
`SOCIAL_PUBLIC_BASE_URL`). Instagram does not allow plain-text posts — an image is always required.

### X / Twitter (requires a paid tier)

1. Create a developer account at <https://developer.x.com>. Posting requires a **paid plan**
   (Basic or higher).
2. Create a **Project** and **App**. Enable **OAuth 1.0a** with **Read and Write** permissions.
3. Generate the four credentials and set:
   - `X_API_KEY`, `X_API_SECRET` (consumer key/secret).
   - `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` (access token/secret).

Captions over 280 characters are truncated when posting to X.

## Verifying a platform

Once a platform's secrets are set and the app has restarted:

1. Open `/admin/portal/marketing` → Edit → Resources, and confirm the platform's toggle is no longer
   greyed out (or check `GET /admin/marketing/social/status`).
2. Pick a resource with a cover image, select only that one platform, and post.
3. Confirm the post appears on the live account. The composer reports per-platform success/failure;
   backend failures are logged with the platform name in the API response.

Each platform should get **one live test** before relying on it — the adapters are written to the
documented API flows but cannot be exercised without real credentials and a public image host.

## Security notes

- Tokens are read from environment/Fly secrets only — they are never stored in the database or the
  CMS content tree.
- The share endpoints are behind the admin auth guard.
- Treat every token as a secret with posting rights to a public account; rotate if exposed.
