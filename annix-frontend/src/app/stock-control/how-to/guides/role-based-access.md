---
title: Understanding Role-Based Access
slug: role-based-access
category: Admin
roles: [admin]
order: 4
tags: [rbac, permissions, security]
lastUpdated: 2026-04-05
summary: What each role can see and do, and how to tailor access per module.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/stock-control/config/navItems.tsx, annix-backend/src/auth]
---

## Built-in roles

| Role | Typical use | Default access |
|------|-------------|----------------|
| viewer | Read-only observer | Dashboard, stock, documents |
| quality | QC inspector | Quality module + read on jobs |
| storeman | Warehouse staff | Stock, deliveries, requisitions |
| accounts | Finance team | Invoices, statements |
| manager | Supervisor | Everything except admin settings |
| admin | System owner | Everything |

## Customising module access

From **Settings → Roles**, you can override which top-toolbar modules each role sees. Overrides are stored per company, so you can differ from the defaults without affecting other companies.

## View As

As an admin, use **View As** in the toolbar dropdown to preview the portal as a specific role. This is the fastest way to verify your permission changes before rolling them out.
