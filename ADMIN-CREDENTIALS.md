# Admin Portal - Default Credentials

A default admin user has been created for testing and initial setup.

## Login Credentials

**Email:** `admin@annix.co.za`
**Password:** `REDACTED_SECRET`

## Access

Navigate to: `http://localhost:3000/admin/login`

## Security Note

⚠️ **IMPORTANT**: This is a default admin account created for development and testing purposes.

**For production:**
1. Change the password immediately after first login
2. Create individual admin accounts for each administrator
3. Disable or delete this default account
4. Use strong, unique passwords for all admin accounts

## Account Details

- **Role:** Admin (full access)
- **Username:** System Administrator
- **Created:** Via migration `CreateDefaultAdminUser1766731000000`

## What You Can Do

With this account, you can:
- View the admin dashboard with metrics
- Manage customers (list, detail, approve/reject onboarding)
- Manage suppliers (list, detail, approve/reject onboarding)
- View all RFQs (read-only access)
- Create and manage other admin users
- Review pending approvals

---

**Next Steps After Login:**
1. Explore the dashboard at `/admin/portal/dashboard`
2. Click on any metric card to navigate to that section
3. Create additional admin users with appropriate roles
4. Set up your own admin account and disable this default one
