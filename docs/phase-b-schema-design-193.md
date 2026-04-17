# Phase B Schema Design — Unified Auth Schema (#193)

**Date:** 2026-04-17
**Status:** Implemented (migrations 1820100000001-1820100000009)

## Design Summary

### User Table Extensions
Added to `user`: `password_hash` (canonical bcrypt), `email_verified`, `email_verification_token/expires`, `reset_password_token/expires`. Legacy `password`+`salt` columns kept but deprecated.

### Per-App Profile Extension Tables (new)
- `stock_control_profiles` — hide_tooltips, notification prefs, linked_staff_id
- `cv_assistant_profiles` — match_alert_threshold, digest/push prefs
- `comply_sa_profiles` — terms_accepted_at, terms_version

All link to `user(id)` and `companies(id)`. Roles live in `user_app_access` (RBAC), not profiles.

### Company Extensions
Added to `companies`: trading_name, legal_name, industry, company_size, country, currency_code, BEE fields, legacy pointers for Customer/Supplier/Comply/CV companies.

`comply_sa_company_details` extension table holds 28 Comply-specific columns (PII, subscription, compliance config).

### Sessions
Added `user_id` FK to `customer_sessions` and `supplier_sessions`. Per-app session tables kept (different shapes). Admin/AnnixRep already FK to `user_id`.

### RBAC Bridges
SC users already bridged. Comply SA -> administrator role. Customer/Supplier profiles -> rfq-platform roles.

### Password Collision Resolution
- Users 1-7 (original): `user.password` copied to `user.password_hash`
- Users 8-17 (SC-bridged, no password): SC `password_hash` copied to `user.password_hash`
- User 3 (also Comply SA): shared password is canonical, Comply linked without conflict

## Migration Inventory

| # | Migration | Type |
|---|-----------|------|
| 1 | AddAuthColumnsToUser | Schema (additive) |
| 2 | CreateProfileTables | Schema (additive) |
| 3 | ExtendCompaniesTable | Schema (additive) |
| 4 | CreateComplySaCompanyDetails | Schema (additive) |
| 5 | MigrateUserPasswords | Data (idempotent) |
| 6 | MigrateCompaniesToUnified | Data (idempotent) |
| 7 | MigrateComplySaCompanyDetails | Data (idempotent) |
| 8 | PopulateProfiles | Data (idempotent) |
| 9 | AddUserIdToSessions | Schema + Data |

## What Comes Next (Phase D)
- Auth services migrate to read from unified tables (dual-write period)
- StockControlAuthGuard switches from StockControlUser to User + StockControlProfile
- Per-app auth services adopt shared TokenService/PasswordService primitives
