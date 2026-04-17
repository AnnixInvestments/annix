# Phase A Discovery Report — Issue #193

> Unify per-app User / Company / Session backend schema

**Date:** 2026-04-17
**Database snapshot:** Production (Neon, neondb)

---

## 1. Row Counts (Production)

### User Tables

| Table | Rows | Uses shared `User`? |
|-------|------|---------------------|
| `user` (shared) | 17 | -- (IS the shared table) |
| `stock_control_users` | 11 | No |
| `cv_assistant_users` | 0 | No |
| `comply_sa_users` | 1 | No |
| `customer_profiles` | 2 | Yes (FK to `user.id`) |
| `supplier_profiles` | 0 | Yes (FK to `user.id`) |

### Company Tables

| Table | Rows | Has `unified_company_id`? |
|-------|------|---------------------------|
| `companies` (unified) | 5 | -- (IS the unified table) |
| `stock_control_companies` | 4 | Yes (all mapped) |
| `rubber_company` | 7 | Yes (1 of 7 — compound owners only) |
| `customer_companies` | 2 | No |
| `supplier_companies` | 0 | No |
| `cv_assistant_companies` | 0 | No |
| `comply_sa_companies` | 2 | No |

### Session Tables

| Table | Rows |
|-------|------|
| `admin_sessions` | 88 |
| `customer_sessions` | 52 |
| `annix_rep_sessions` | 0 |
| `supplier_sessions` | 0 |

**Key observation:** The data is small. 17 shared users, 11 SC users, 5 unified companies, 4 SC companies. This is the cheapest possible time to unify.

---

## 2. Email Collision Audit

12 emails exist in **both** `user` (shared) AND `stock_control_users`:

| Email | Tables |
|-------|--------|
| accounts@polymerliners.co.za | user, stock_control_users |
| andy@auind.co.za | user, comply_sa_users |
| andy@polymerliners.co.za | user, stock_control_users |
| info@annix.co.za | user, stock_control_users |
| mphelammati@gmail.com | user, stock_control_users |
| nick.barrett36@me.com | user, stock_control_users |
| polymerstoreman@gmail.com | user, stock_control_users |
| qc.shared@polymerlining.co.za | user, stock_control_users |
| queentonmntungwa07@gmail.com | user, stock_control_users |
| reception@polymerlining.co.za | user, stock_control_users |
| stores@polymerlining.co.za | user, stock_control_users |
| strausswillie13@gmail.com | user, stock_control_users |

**Pattern:** 11 of 11 SC users also exist in the shared `user` table. 1 Comply SA user (`andy@auind.co.za`) also exists in shared `user`. No CV Assistant or Supplier/Customer collisions (those tables are empty or use the shared User already).

**Risk:** Password hashes may differ between tables for the same email. The migration must pick one canonical password (or force a reset).

---

## 3. Unified Company Table — Current State

### What's in `companies` (the unified table)

| id | Name | Type | legacy_sc_company_id | legacy_rubber_company_id |
|----|------|------|---------------------|--------------------------|
| 1 | Annix Investments (Pty) Ltd | MANUFACTURER | 2 | null |
| 2 | Polymer lining system | MANUFACTURER | 4 | null |
| 3 | Polymer Lining System (Pty) Ltd | MANUFACTURER | 1 | null |
| 4 | Polymer Liners | MANUFACTURER | 3 | null |
| 5 | AU Industries | MANUFACTURER | null | 3 |

### Reverse pointers (per-app -> unified)

| stock_control_companies.id | Name | unified_company_id |
|---|---|---|
| 1 | Polymer Lining System (Pty) Ltd | 3 |
| 2 | Annix Investments (Pty) Ltd | 1 |
| 3 | Polymer Liners | 4 |
| 4 | Polymer lining system | 2 |

| rubber_company.id | Name | unified_company_id | is_compound_owner |
|---|---|---|---|
| 3 | AU Industries | 5 | true |

**6 of 7 rubber companies are NOT mapped** — only compound owners were migrated. The remaining 6 rubber companies (customers/suppliers) have no unified company row.

### Who reads/writes the unified `companies` table

- **Writes:** Only migrations (1809000000019, 1809000000020). `CompanyService` has zero write methods — the table is populated once and never updated by application code.
- **Reads:** `CompanyService.findByLegacyScCompanyId()`, `CompanyService.findByLegacyRubberCompanyId()`, `CompanyService.activeModules()`, `CompanyService.hasModule()`. Also read by Stock Control guards (feature flags: `qcEnabled`, `messagingEnabled`, `staffLeaveEnabled`, `workflowEnabled`), branding service, email service, PDF services, coating analysis services.

### Where the in-progress unification stopped

1. **Migration 1809000000019** created the unified `companies` table + `company_module_subscriptions`
2. **Migration 1809000000020** copied SC companies and rubber compound-owner companies into `companies`, set up bidirectional legacy pointers, and registered module subscriptions
3. **Then it stopped.** No subsequent migrations exist for:
   - Migrating Customer, Supplier, CV Assistant, or Comply SA companies
   - Updating any service code to read from the unified table
   - Migrating users to the shared `user` table
   - Updating FK references in downstream entities

The `unified_company_id` column exists in the database on `stock_control_companies` and `rubber_company` but is **not declared in the TypeORM entity classes** — it's invisible to the ORM layer.

---

## 4. Per-App User Entities — Column Comparison

### Shared Concepts (present in 3+ per-app user entities)

| Concept | User (shared) | StockControlUser | CvAssistantUser | ComplySaUser | CustomerProfile | SupplierProfile |
|---------|---------------|------------------|-----------------|--------------|-----------------|-----------------|
| id | `id` int PK | `id` int PK | `id` int PK | `id` int PK | `id` int PK | `id` int PK |
| email | `email` varchar | `email` varchar | `email` varchar | `email` varchar | via User FK | via User FK |
| password | `password` varchar | `password_hash` varchar | `password_hash` varchar | `password_hash` varchar | via User FK | via User FK |
| name | `firstName` + `lastName` | `name` varchar | `name` varchar | `name` varchar | `first_name` + `last_name` | `first_name` + `last_name` |
| role | `roles` M2M to UserRole | `role` varchar | `role` varchar | `role` varchar | `role` enum | -- |
| email_verified | -- | `email_verified` bool | `email_verified` bool | `email_verified` bool | `email_verified` bool | `email_verified` bool |
| verification_token | -- | `email_verification_token` | `email_verification_token` | `email_verification_token` | `email_verification_token` | `email_verification_token` |
| password_reset_token | -- | `reset_password_token` | `reset_password_token` | `password_reset_token` | via User | via User |
| company_id | -- | FK to SC company | FK to CV company | FK to Comply company | FK to Customer company | FK to Supplier company |
| created_at | `createdAt` | `created_at` | `created_at` | `created_at` | `created_at` | `created_at` |
| updated_at | `updatedAt` | `updated_at` | `updated_at` | -- | `updated_at` | `updated_at` |
| status | `status` varchar | -- | -- | -- | `account_status` enum | `account_status` enum |
| last_login | `lastLoginAt` | -- | -- | -- | -- | -- |
| oauth | `oauthProvider` + `oauthId` | -- | -- | -- | -- | -- |

### App-Specific Columns (belong in extension tables)

| Column | Entity | Purpose |
|--------|--------|---------|
| `hide_tooltips` | StockControlUser | UI preference |
| `email_notifications_enabled` | StockControlUser | Notification prefs |
| `push_notifications_enabled` | StockControlUser | Notification prefs |
| `linked_staff_id` | StockControlUser | FK to StaffMember |
| `match_alert_threshold` | CvAssistantUser | CV matching threshold |
| `digest_enabled` | CvAssistantUser | Digest notification |
| `push_enabled` | CvAssistantUser | Push notification |
| `terms_accepted_at` | ComplySaUser, CustomerProfile, SupplierProfile | Legal consent |
| `terms_version` | ComplySaUser | Terms version tracking |
| `job_title` | CustomerProfile, SupplierProfile | Professional details |
| `direct_phone`, `mobile_phone` | CustomerProfile, SupplierProfile | Contact details |
| `suspension_*` | CustomerProfile, SupplierProfile | Account suspension |
| `document_storage_accepted_at` | CustomerProfile, SupplierProfile | Data consent |
| `security_policy_accepted_at` | CustomerProfile, SupplierProfile | Security consent |

---

## 5. Per-App Company Entities — Column Comparison

### Shared Concepts

| Concept | Platform Company | StockControlCompany | CustomerCompany | SupplierCompany | CvAssistantCompany | ComplySaCompany | RubberCompany |
|---------|-----------------|--------------------|-----------------|-----------------|--------------------|-----------------|---------------|
| name | `name` | `name` | `legal_name` | `legal_name` | `name` | `name` | `name` |
| reg_number | `registrationNumber` | `registration_number` | `registration_number` | `registration_number` | -- | `registration_number` | `registration_number` |
| vat_number | `vatNumber` | `vat_number` | `vat_number` | `vat_number` | -- | `vat_number` | `vat_number` |
| phone | `phone` | `phone` | `primary_phone` | `primary_phone` | -- | `phone` | `phone` |
| email | `email` | `email` | `general_email` | `general_email` | `email_from_address` | -- | -- |
| address | structured cols | structured cols | structured cols | structured cols | -- | `business_address` text | `address` jsonb |

### App-Specific Company Columns

| Domain | Entity | Columns |
|--------|--------|---------|
| Branding | StockControlCompany, Platform | `branding_type`, `primary_color`, `accent_color`, `logo_url`, `hero_image_url`, `branding_authorized` |
| SMTP/Email | StockControlCompany, Platform | `smtp_host/port/user/pass_encrypted`, `smtp_from_name/email`, `notification_emails` |
| Feature flags | StockControlCompany, Platform | `qc_enabled`, `messaging_enabled`, `staff_leave_enabled`, `workflow_enabled` |
| Loss factors | StockControlCompany, Platform | `piping_loss_factor_pct`, `flat_plate_loss_factor_pct`, `structural_steel_loss_factor_pct` |
| Sage integration | StockControlCompany | `sage_username`, `sage_pass_encrypted`, `sage_company_id`, `sage_company_name`, `sage_connected_at` |
| Sage integration | RubberCompany | `sage_contact_id`, `sage_contact_type` |
| BEE compliance | CustomerCompany, SupplierCompany | `bee_level`, `bee_certificate_expiry`, `bee_verification_agency`, `is_exempt_micro_enterprise` |
| Compliance | ComplySaCompany | `industry`, `sector_code`, `employee_count`, `annual_turnover`, `vat_registered`, `imports_exports`, `handles_personal_data`, `has_payroll`, `financial_year_end_month`, `entity_type`, `compliance_areas`, encrypted PII fields, `subscription_tier/status`, `profile_complete` |
| Rubber | RubberCompany | `firebase_uid`, `company_type`, `code`, `pricing_tier_id`, `available_products`, `is_compound_owner`, `discount_percent`, `email_config` |
| Trade | CustomerCompany | `trading_name`, `industry`, `company_size`, `currency_code`, `country` |
| Trade | SupplierCompany | `trading_name`, `industry_type`, `company_size`, `currency_code`, `country`, `operational_regions`, `primary_contact_*` |

---

## 6. FK Dependencies Pointing INTO Per-App Tables (Blast Radius)

### StockControlCompany — **60+ downstream entities**

The entire Stock Control module references `stock_control_companies`. Key entities: `stock_control_users`, `stock_control_invitations`, `job_cards`, `stock_items`, `stock_allocations`, `delivery_notes`, `requisitions`, `customer_purchase_orders`, plus all QC entities, workflow configs, staff members, departments, locations, and stock management (`sm_*`) entities.

**This is the highest-blast-radius table in the system.**

### CustomerProfile — 8 downstream entities

`customer_device_bindings`, `customer_sessions`, `customer_login_attempts`, `customer_onboarding`, `customer_blocked_suppliers`, `customer_preferred_suppliers`, `customer_documents`, `customer_feedback`

### SupplierProfile — 9 downstream entities

`supplier_capabilities`, `supplier_device_bindings`, `supplier_sessions`, `supplier_login_attempts`, `supplier_documents`, `supplier_onboarding`, `customer_blocked_suppliers`, `customer_preferred_suppliers`, `boq_supplier_access`

### CustomerCompany — 3 downstream entities

`customer_blocked_suppliers`, `customer_preferred_suppliers`, `supplier_invitations`

### SupplierCompany — 0 direct FK references found (supplier entities reference `SupplierProfile` instead)

### RubberCompany — 6 downstream entities

`rubber_au_cocs`, `rubber_delivery_notes`, `rubber_purchase_requisitions`, `rubber_supplier_cocs`, plus platform `companies` and `contacts` legacy pointer columns

### ComplySaCompany — 8 downstream entities

`comply_sa_users`, `comply_sa_compliance_statuses`, `comply_sa_documents`, `comply_sa_subscriptions`, `comply_sa_api_keys`, `comply_sa_notifications`, `comply_sa_audit_logs`, `comply_sa_sage_connections`

### CvAssistantCompany — 3 downstream entities

`cv_assistant_users`, `cv_assistant_job_postings` (likely), `cv_assistant_push_subscriptions`

### StockControlUser — 2+ downstream entities

`stock_control_invitations`, `user_location_assignments`

### CvAssistantUser — 1 downstream entity

`cv_assistant_push_subscriptions`

### ComplySaUser — 1 downstream entity

`comply_sa_audit_logs` (via `performed_by_user_id`)

---

## 7. Shared Auth Infrastructure Already Built

Located in `annix-backend/src/shared/auth/`:

| Service | Used By | Not Used By |
|---------|---------|-------------|
| `TokenService` (JWT) | admin, annix-rep, customer, supplier | auth, stock-control, cv-assistant, comply-sa |
| `PasswordService` (bcrypt) | admin, annix-rep, customer, supplier | auth, stock-control, cv-assistant, comply-sa |
| `SessionService` (generic) | customer, supplier | admin (own impl), annix-rep (own impl) |
| `RateLimitingService` | customer, supplier | all others |
| `DeviceBindingService` | customer, supplier | all others |
| `AuthConfigService` | admin, customer, supplier | all others |

**4 services call `bcrypt.hash`/`JwtService.sign` directly** instead of using the shared primitives: `auth.service.ts`, `stock-control/auth.service.ts`, `cv-assistant/auth.service.ts`, `comply-sa/auth.service.ts`.

---

## 8. Summary of Findings

### What's already done
- Unified `companies` table exists with 5 rows (4 SC + 1 rubber compound owner)
- Bidirectional legacy pointers work (SC ↔ unified, rubber ↔ unified)
- Module subscription system works (`company_module_subscriptions`)
- Shared `user` table exists with 17 rows, used by Admin, Annix Rep, Customer, Supplier auth
- Shared auth primitives exist (`TokenService`, `PasswordService`, `SessionService`, etc.)

### What stopped
- No unified-company rows for Customer, Supplier, CV Assistant, or Comply SA companies
- 6 of 7 rubber companies (non-compound-owners) have no unified row
- `unified_company_id` column on per-app tables is not in TypeORM entity definitions
- No service code reads from the unified `companies` table for actual business logic (only guards and branding)
- StockControlUser, CvAssistantUser, and ComplySaUser are fully independent of the shared `user` table

### Email collision resolution needed
- 12 emails collide between `user` and `stock_control_users` (all 11 SC users + 1 comply-sa user)
- Password hashes likely differ (shared `user` uses `password` + `salt`, SC uses `password_hash` without separate salt)
- Resolution strategy needed before Phase C

### Blast radius ranking (highest to lowest risk)
1. **StockControlCompany** — 60+ downstream entities, highest risk
2. **CustomerProfile** — 8 downstream, but already on shared User
3. **SupplierProfile** — 9 downstream, already on shared User
4. **ComplySaCompany** — 8 downstream, isolated module
5. **RubberCompany** — 6 downstream, partially unified already
6. **CvAssistantCompany** — 3 downstream, zero data, lowest risk
7. **SupplierCompany** — 0 direct FK references, zero data

### Recommended Phase B design inputs
1. **Extension tables over monolithic User** — CustomerProfile/SupplierProfile already model this correctly
2. **StockControlUser is the hardest migration** — 11 users, all collide with shared User, and SC has its own password hashing
3. **CvAssistant and SupplierCompany are zero-data** — migrate these first as templates
4. **ComplySaCompany has the most app-specific columns** (15+) — extension table is mandatory
5. **RubberCompany has unique concerns** — `firebase_uid`, `is_compound_owner`, pricing tiers, available products — must remain as an extension
