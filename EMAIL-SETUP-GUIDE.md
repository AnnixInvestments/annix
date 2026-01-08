# Email Service Setup Guide

## Quick Start (Mailtrap for Development)

### 1. Get Mailtrap Credentials (2 minutes)

1. Go to: https://mailtrap.io
2. Sign up for free account
3. Click: "Email Testing" → "Inboxes" → "My Inbox"
4. Find "SMTP Settings" section and copy:
   - Host: `sandbox.smtp.mailtrap.io`
   - Port: `2525`
   - Username: `[your username]`
   - Password: `[your password]`

### 2. Update `.env` File

Add these lines to `annix-backend/.env`:

```env
# Email Service Configuration (Mailtrap - Development)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=YOUR_MAILTRAP_USERNAME_HERE
SMTP_PASS=YOUR_MAILTRAP_PASSWORD_HERE
EMAIL_FROM=noreply@annix.com

# Frontend URL (for email verification links)
FRONTEND_URL=http://localhost:3000
```

### 3. Enable Email Verification

In `annix-backend/src/customer/customer-auth.service.ts` (around line 335):

**Change from:**
```typescript
// Check email verification (temporarily disabled for development)
// TODO: Re-enable when email service is configured
// if (!profile.emailVerified) {
//   await this.logLoginAttempt(...);
//   throw new ForbiddenException('Email not verified...');
// }
```

**To:**
```typescript
// Check email verification
if (!profile.emailVerified) {
  await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.EMAIL_NOT_VERIFIED, dto.deviceFingerprint, clientIp, userAgent);
  throw new ForbiddenException('Email not verified. Please check your email for the verification link.');
}
```

### 4. Restart Backend Server

```bash
# Stop current server (Ctrl+C)
pnpm start:dev
```

Look for: `[EmailService] Email transporter configured successfully`

### 5. Test It Works

**Quick Test (Admin API):**
```
GET http://localhost:4001/admin/auth/test-email?to=your-email@example.com
```
This sends a test email without authentication. Check your Mailtrap inbox to verify it arrived.

**Full Test (Customer Registration):**
1. Register a new customer at: http://localhost:3000/customer/register
2. Check your Mailtrap inbox: https://mailtrap.io/inboxes
3. Click the verification link in the email
4. Try to login - should work!

**View Emails in Mailtrap:**
- Dashboard: https://mailtrap.io/inboxes
- All emails sent from development appear here (not in real inboxes)
- You can preview HTML, check spam score, and view raw source

Or use the HTTP test file: `test-email-verification.http`

---

## Email Types Sent by the System

The application sends the following types of emails:

| Email Type | Trigger | Recipient |
|------------|---------|-----------|
| **Email Verification** | Customer/Supplier registration | New user |
| **Customer Invitation** | Admin clicks "Invite Customer" | Prospective customer |
| **Supplier Invitation** | Admin clicks "Invite Supplier" | Prospective supplier |
| **Password Reset** | User requests password reset | User |
| **Onboarding Approved** | Admin approves onboarding | Customer/Supplier |
| **Onboarding Rejected** | Admin rejects onboarding | Customer/Supplier |

**Admin Portal Invitation Feature:**
- Navigate to: Admin Portal → Customers/Suppliers
- Click "Invite Customer" or "Invite Supplier" button
- Enter email address and optional message
- Invitation email contains a link to the registration page

---

## Switching Email Providers Later

Just update 4 lines in `.env` and restart - no code changes needed!

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_16_char_app_password  # Get from: https://myaccount.google.com/apppasswords
EMAIL_FROM=your.email@gmail.com
```

**Setup:**
1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Select "Mail" → "Other" → "Annix Backend"
4. Copy 16-character password

### SendGrid (Production)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey  # Literally "apikey"
SMTP_PASS=YOUR_SENDGRID_API_KEY
EMAIL_FROM=noreply@yourdomain.com
```

**Setup:**
1. Sign up: https://sendgrid.com (100 free emails/day)
2. Settings → API Keys → Create API Key
3. Give "Mail Send" permission
4. Copy API key

### Microsoft 365 / Outlook

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your.email@outlook.com
SMTP_PASS=your_password
EMAIL_FROM=your.email@outlook.com
```

### Custom SMTP

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_password
EMAIL_FROM=noreply@yourdomain.com
```

---

## How Email Service Works

The email service automatically detects if SMTP is configured:

- ✅ **All 4 settings present** → Sends real emails
- ❌ **Any missing** → Console mode (logs only)

You can check which mode it's in by looking at backend startup logs.

---

## Troubleshooting

### "SMTP not configured" in logs
- Check all 4 env variables are set (no typos)
- Restart backend server after changing .env

### Emails not arriving
- Check Mailtrap inbox (not your real email!)
- Verify SMTP credentials are correct
- Check backend logs for errors

### "Email not verified" error when logging in
- Check Mailtrap inbox for verification email
- Click the verification link
- Or use the verify-email endpoint directly

### Gmail "Less secure app" error
- You MUST use App Password (not regular password)
- 2FA must be enabled first
- Generate new App Password if issues persist

---

## API Endpoints for Email

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/admin/auth/test-email?to=email` | GET | None | Send test email (dev only) |
| `/admin/customers/invite` | POST | Admin | Send customer invitation |
| `/admin/suppliers/invite` | POST | Admin | Send supplier invitation |
| `/customer/auth/verify-email` | POST | None | Verify email with token |
| `/customer/auth/resend-verification` | POST | None | Resend verification email |

**Invitation Request Body:**
```json
{
  "email": "user@example.com",
  "message": "Optional personal message"
}
```

---

## Useful Links

- **Mailtrap Dashboard:** https://mailtrap.io/inboxes
- **Mailtrap Docs:** https://mailtrap.io/blog/nodemailer-gmail/
- **SendGrid Signup:** https://sendgrid.com
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
