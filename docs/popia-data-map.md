# POPIA Data-Map — PII Fields, Encryption, Retention & Erasure

> Scope: Annix monorepo backend. Produced for #402 (security-4 / security-10). Lists
> personal-information (PII) fields per app, whether each is **encrypted at rest**, and the
> **retention / erasure** path. Re-verify on schema changes; this is a living document.

## How encryption at rest works

- Field-level encryption is `encryptField` / `decryptField` in `annix-backend/src/lib/field-encryption.ts`
  (AES-256-GCM, random 12-byte IV, 16-byte auth tag, base64, `enc:v1:` prefix). Key: `FIELD_ENCRYPTION_KEY`
  (64 hex chars).
- Per security-4, the boot guard (`production-security.config.ts`) refuses to start in production without a
  valid key, and `encryptField` fails closed rather than silently writing plaintext.
- **Today the only fields routed through `encryptField` are national ID numbers** — exactly two sinks:
  `annix-orbit/services/individual-profile.service.ts` (Orbit profile `identityVerification.idNumber`) and
  `annix-sentinel/sentinel-auth/auth.service.ts` (Sentinel `comply_sa_company_details.idNumber`).
  All other PII below is currently **plaintext at rest** and is tracked as remediation backlog.

## Log masking

- `maskEmail` (`annix-backend/src/lib/pii-log.ts`) is used to mask emails in logs/audit detail
  (`auth.service.ts`, `annix-orbit-message.service.ts`, `seeker-job-feed.service.ts`). Logs must never
  contain raw passwords, tokens, or full emails.

---

## Core / shared

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `user` (`user/schemas/user.schema.ts`) | email, firstName, lastName, whatsappPhone, whatsappVerifiedPhone | email / name / phone | No | Unverified accounts purged after 1y (`deleteUnverifiedCreatedBefore`); deleted-account retention 1y (sentinel `data-retention.service.ts`) |
| `companies` (`platform/schemas/company.schema.ts`) | contactPerson, contact.email/phone, address.*, registrationNumber, vatNumber | name / email / phone / address / company-id | No | Company deletion only |
| `contacts` (`platform/schemas/contact.schema.ts`) | name, email, phone, contactPerson, addressText, registration/vat | name / email / phone / address | No | Contact deletion only |

## Stock Control

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `stock_control_companies` | contact.email/phone | email / phone | No | Company deletion only |
| `stock_control_supplier` | contactPerson, phone, email, address, vat/registration | name / email / phone / address | No | Supplier deletion only |
| `supplier_invoices` | supplierName | name | No | Invoice deletion only |
| `customer_profiles` (`customer/schemas/customer-profile.schema.ts`) | firstName, lastName, directPhone, mobilePhone | name / phone | No | Profile deletion only |

## RFQ

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `rfq_drafts` / RFQ (`rfq/schemas/rfq-draft.schema.ts`, `rfq/entities/rfq.entity.ts`) | customerName, customerEmail, customerPhone, formData(JSON contacts) | name / email / phone / mixed | No | Draft / RFQ deletion only |

## AU Rubber

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `rubber_company` | phone, contactPerson, auCocRecipientEmail, vat/registration | name / email / phone / company-id | No | Company deletion only |
| `rubber_company_directors` ⚠️ | name, title, email | name / email | No | Director deletion only — full leadership contact set in plaintext |

## Annix Rep

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `annix_rep_prospects` ⚠️ | contactName, contactEmail, contactPhone, contactTitle, address.* | name / email / phone / address | No | Prospect deletion only |

## Annix Sentinel

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `comply_sa_company_details` (`annix-sentinel/companies/schemas/annix-sentinel-company-details.schema.ts`) | idNumber | national-ID | **Yes** (`encryptField`, written in `sentinel-auth/auth.service.ts`) | Per sentinel data-retention windows |
| `comply_sa_company_details` | passportNumber, sarsTaxReference, dateOfBirth, businessAddress | national-ID / tax-id / DOB / address | No | Per sentinel data-retention windows |

## Annix Orbit (most sensitive — CV-level PII)

| Collection (file) | Field | Category | Encrypted | Retention / erasure |
|---|---|---|---|---|
| `cv_assistant_profiles` 🔴 | identityVerification.idNumber | national-ID | **Yes** (`encryptField`) | ID doc image purged after 30d (`purgeRetainedIdentityDocuments`, daily 3am); erased via right-to-erasure |
| `cv_assistant_profiles` 🔴 | identityVerification.surname/givenNames/dateOfBirth, documentFilePath, extractedCvData, rawCvText, photoFilePath, eeDisclosure | name / DOB / biometric-image / mixed / employment-equity | No | Purged with the ID doc / candidate erasure |
| `cv_assistant_candidates` 🔴 | email, name, cvFilePath, rawCvText, extractedData(JSON), locationLat/Lon | email / name / location / mixed | No | `eraseCandidateData` on right-to-erasure or 12-month inactivity (`purgeInactiveCandidates`, daily 2am) |
| `cv_assistant_candidate_references` 🔴 | name, email, relationship | name / email | No | `removeMany` on candidate erasure |
| `orbit_talent_candidates` | fullName, email, phone, city, province | name / email / phone / address | No | Candidate deletion only |
| `cv_assistant_companies` | emailFromAddress | email | No | Company deletion only |

## Retention / erasure jobs (existing)

| Schedule | Job | Action |
|---|---|---|
| Monthly `0 3 1 * *` | sentinel `data-retention.service.ts` | Purge unverified users >1y; tax 5y / company 7y / deleted-account 1y windows |
| Daily 2am | `PopiaService.purgeInactiveCandidates` | Erase candidates inactive 12+ months (CV files, references, doc) |
| Daily 3am | `PopiaService.purgeRetainedIdentityDocuments` | Delete identity-doc images after 30 days (keep extracted fields + hash) |
| On demand | `DELETE …/:id/erasure` (candidate controller) → `PopiaService.rightToErasure` | Cascade-delete candidate, CV file, references, audit trail |

## Auth audit trail

- Auth events (login success/failure, refresh, invite-accept, password reset) are emitted PII-safely
  (via `maskEmail`) into the shared `AuditModule` (`audit/audit.module.ts`) — see #402 security-9.

## Gaps / remediation backlog (not closed by this map)

1. **Encrypt high-risk plaintext PII at rest** — Orbit candidate CV text/extracted data + references, AU Rubber
   director emails, Annix Rep prospect contacts, Stock Control supplier contacts. Route through `encryptField`
   at the schema/repository layer.
2. **Define explicit retention windows** for non-Orbit apps (Stock Control invoices, RFQ drafts, Rep prospects);
   only Orbit + sentinel have documented windows today.
3. **Consent basis for candidate references** — reference name/email is extracted from the CV without the
   reference's individual consent; batch-deleted on candidate erasure only.
