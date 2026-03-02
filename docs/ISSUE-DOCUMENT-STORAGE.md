## Overview

Documents across the Annix apps are stored inconsistently - some areas use S3, some use local filesystem storage that will be **lost on application redeployment**. This issue tracks the work needed to:

1. Ensure all documents survive redeployments (S3 storage)
2. Organize documents into app-specific S3 areas/prefixes
3. Use consistent infrastructure patterns (following secure documents as the reference)

## Current State Analysis

### Storage Infrastructure
The codebase has a pluggable storage abstraction (`IStorageService`) with two backends:
- `S3StorageService` - Proper S3 storage (annix-backend/src/storage/s3-storage.service.ts)
- `LocalStorageService` - Local filesystem (annix-backend/src/storage/local-storage.service.ts)

**Current config**: Single bucket `annix-sync-files` with `STORAGE_TYPE` env var controlling which backend is used.

### Document Storage Areas

#### Using Storage Abstraction (Can Use S3)
| Area | Current Path | Service Location | Status |
|------|--------------|------------------|--------|
| Customer Documents | `customers/{customerId}/documents/` | customer-document.service.ts | S3 capable |
| Supplier Documents | `suppliers/{supplierId}/documents/` | supplier-document.service.ts | S3 capable |
| RFQ Documents | `rfq-documents/{rfqId}/` | rfq.controller.ts | S3 capable |
| Drawing Versions | `drawings/{drawingId}/{versionId}/` | drawings.controller.ts | S3 capable |
| Job Card Documents | `job-cards/{companyId}/{jobCardId}/` | job-card.service.ts | S3 capable |
| Rubber CoCs | `au-rubber/cocs/{companyId}/` | rubber-inbound-email.service.ts | **DONE** |
| Rubber Delivery Notes | `au-rubber/delivery-notes/{companyId}/` | rubber-inbound-email.service.ts | **DONE** |
| Rubber Graphs | `au-rubber/graphs/{companyId}/` | rubber-inbound-email.service.ts | **DONE** |
| Customer Delivery Notes | `au-rubber/customer-delivery-notes/{customerId}/` | rubber-inbound-email.service.ts | **DONE** |

#### Using Local Storage Only (CRITICAL - Will Be Lost)
| Area | Current Path | Service Location | Risk |
|------|--------------|------------------|------|
| ~~Meeting Recordings~~ | ~~`uploads/recordings/{meetingId}/`~~ | fieldflow/services/recording.service.ts | **DONE** - Now uses `fieldflow/recordings/{meetingId}/` via IStorageService |
| ~~CV Assistant CVs~~ | ~~`uploads/cv-assistant/`~~ | cv-assistant/services/email-monitor.service.ts | **DONE** - Now uses `cv-assistant/candidates/{companyId}/` via IStorageService |
| ~~Rubber Email Processing~~ | ~~`uploads/rubber-lining/`~~ | rubber-email-monitor.service.ts | **DONE** - Already used IStorageService, removed dead code |

#### Special Cases
| Area | Current Storage | Notes |
|------|-----------------|-------|
| Secure Documents | S3/Local hybrid | Has own encryption layer, reference implementation |
| Platform Recordings | S3 direct | Uses S3 directly, not through abstraction |

---

## Proposed S3 Organization

Following Nick's recommendation to use the secure documents infrastructure pattern but with separate areas:

### Option A: Single Bucket with Prefixes (Simpler)
```
annix-sync-files/
├── annix-app/
│   ├── customers/{customerId}/documents/
│   ├── suppliers/{supplierId}/documents/
│   ├── rfq-documents/{rfqId}/
│   ├── drawings/{drawingId}/{versionId}/
│   └── job-cards/{companyId}/{jobCardId}/
├── au-rubber/
│   ├── cocs/{companyId}/
│   ├── delivery-notes/{companyId}/
│   ├── graphs/{companyId}/
│   ├── customer-delivery-notes/{customerId}/
│   └── email-processing/
├── fieldflow/
│   ├── recordings/{meetingId}/
│   └── platform-recordings/{platform}/{userId}/
├── cv-assistant/
│   ├── candidates/{candidateId}/
│   └── email-attachments/
└── secure-documents/
    ├── customers/{customerId}/
    └── suppliers/{supplierId}/
```

### Option B: Separate Buckets per App (Better Isolation)
- `annix-sync-core` - Customer, supplier, RFQ, drawings, job cards
- `annix-sync-au-rubber` - All rubber lining documents
- `annix-sync-fieldflow` - Meeting recordings
- `annix-sync-cv-assistant` - CVs and candidate documents
- `annix-sync-secure` - Encrypted secure documents

---

## Implementation Checklist

### Phase 1: Critical - Fix Local-Only Storage (Data Loss Risk)

- [x] **FieldFlow Meeting Recordings** (COMPLETED)
  - [x] Refactor `recording.service.ts` to use `IStorageService` instead of direct `fs` operations
  - [x] Update chunked upload logic to work with S3 (assembles chunks locally then uploads to S3)
  - [x] Add migration script for existing local recordings to S3 (`scripts/migrate-fieldflow-recordings.ts`)
  - [x] Update `audioStream()` method to use presigned URLs for playback (redirects to S3)
  - [x] Unit tests added (`recording.service.spec.ts`)

- [x] **CV Assistant Documents** (COMPLETED)
  - [x] Refactor `email-monitor.service.ts` to use `IStorageService`
  - [x] Refactor `candidate.controller.ts` manual upload to use `IStorageService`
  - [x] Refactor `cv-extraction.service.ts` to download from S3 for PDF parsing
  - [x] Update candidate entity to store S3 paths instead of local paths (uses `cv-assistant/candidates/{companyId}/` prefix)
  - [x] Add migration script for existing CVs to S3 (`scripts/migrate-cv-assistant-docs.ts`)
  - [x] Unit tests added (`cv-extraction.service.spec.ts`)

- [x] **Rubber Email Processing** (COMPLETED)
  - [x] Review `rubber-email-monitor.service.ts` for permanent storage needs - Already used IStorageService
  - [x] Removed dead `uploadDir` code that created unused local directory
  - [x] Updated all S3 paths from `rubber-lining/` to `au-rubber/` prefix
  - [x] Created `scripts/migrate-rubber-paths.ts` for existing document migration

### Migration Commands

Run these on production to migrate existing data:

```bash
# Preview changes (dry run)
pnpm migrate:fieldflow-recordings:dry-run
pnpm migrate:cv-assistant-docs:dry-run
pnpm migrate:rubber-paths:dry-run

# Execute migrations
pnpm migrate:fieldflow-recordings
pnpm migrate:cv-assistant-docs
pnpm migrate:rubber-paths
```

### Phase 2: Organize S3 Structure

- [ ] **Define S3 Area Strategy**
  - [ ] Decide between Option A (prefixes) or Option B (separate buckets)
  - [ ] Document final S3 path structure
  - [ ] Update `AWS_S3_SETUP_GUIDE.md` with new structure

- [ ] **Update Storage Service**
  - [ ] Add app area/bucket configuration
  - [ ] Consider adding `StorageArea` enum for type safety
  - [ ] Update `upload()` method signature to accept area parameter
  - [ ] Add CORS configuration for all required domains

- [ ] **Update All Document Services**
  - [ ] Customer documents - add area prefix
  - [ ] Supplier documents - add area prefix
  - [ ] RFQ documents - add area prefix
  - [ ] Drawing documents - add area prefix
  - [ ] Job card documents - add area prefix
  - [x] Rubber lining documents - add area prefix (DONE: `au-rubber/`)
  - [ ] Secure documents - add area prefix

### Phase 3: Data Migration

- [ ] **Extend Migration Script**
  - [ ] Update `scripts/migrate-to-s3.ts` to handle all document types
  - [ ] Add support for new area-based paths
  - [ ] Add FieldFlow recordings migration
  - [ ] Add CV Assistant documents migration
  - [ ] Add dry-run support for all new document types
  - [ ] Add rollback capability

- [ ] **Database Updates**
  - [ ] Create migration to update existing `file_path` columns with new S3 paths
  - [ ] Ensure backward compatibility during transition
  - [ ] Add indexes if needed for path queries

### Phase 4: Testing and Deployment

- [ ] **Testing**
  - [ ] Unit tests for updated storage service
  - [ ] Integration tests for each document type upload/download
  - [ ] Test presigned URL generation and expiration
  - [ ] Test file access after redeployment
  - [ ] Load test for large file uploads (recordings can be large)

- [ ] **Deployment**
  - [ ] Create S3 buckets/configure prefixes in AWS
  - [ ] Set up IAM policies for new areas
  - [ ] Configure Fly.io secrets for S3 access
  - [ ] Deploy with `STORAGE_TYPE=s3`
  - [ ] Run migration scripts
  - [ ] Verify all document types accessible
  - [ ] Monitor for any 404s or access errors

### Phase 5: Cleanup

- [ ] **Remove Local Storage Fallback** (optional, after validation)
  - [ ] Remove local storage code paths
  - [ ] Remove `UPLOAD_DIR` configuration
  - [ ] Update documentation

- [ ] **Documentation**
  - [ ] Update CLAUDE.md with storage architecture
  - [ ] Document S3 bucket structure
  - [ ] Document backup/restore procedures
  - [ ] Add runbook for storage troubleshooting

---

## Files to Modify

### Critical Path (Phase 1)
- `annix-backend/src/fieldflow/services/recording.service.ts` - Complete refactor
- `annix-backend/src/cv-assistant/services/email-monitor.service.ts` - Use IStorageService
- `annix-backend/src/cv-assistant/controllers/candidate.controller.ts` - Use IStorageService

### Storage Infrastructure
- `annix-backend/src/storage/storage.interface.ts` - Add area parameter
- `annix-backend/src/storage/s3-storage.service.ts` - Add area/bucket support
- `annix-backend/src/storage/storage.module.ts` - Update configuration

### Document Services (all need area prefixes)
- `annix-backend/src/customer/customer-document.service.ts`
- `annix-backend/src/supplier/supplier-document.service.ts`
- `annix-backend/src/rfq/rfq.controller.ts`
- `annix-backend/src/drawings/drawings.controller.ts`
- `annix-backend/src/stock-control/job-card.service.ts`
- `annix-backend/src/rubber-lining/rubber-inbound-email.service.ts`
- `annix-backend/src/secure-documents/secure-documents.service.ts`
- `annix-backend/src/fieldflow/services/platform-recording.service.ts`

### Migration and Config
- `annix-backend/scripts/migrate-to-s3.ts` - Extend for all document types
- `annix-backend/docs/AWS_S3_SETUP_GUIDE.md` - Update with new structure
- `fly.toml` - May need env vars for bucket names

---

## Acceptance Criteria

1. All user-uploaded documents survive application redeployment
2. Each app area has its own logical S3 prefix/bucket
3. Existing documents are migrated without data loss
4. Presigned URLs work correctly for all document types
5. No local filesystem storage for persistent documents in production

---

## References

- Storage abstraction: `annix-backend/src/storage/`
- Secure documents (reference impl): `annix-backend/src/secure-documents/`
- AWS setup guide: `annix-backend/docs/AWS_S3_SETUP_GUIDE.md`
- Existing migration script: `annix-backend/scripts/migrate-to-s3.ts`
