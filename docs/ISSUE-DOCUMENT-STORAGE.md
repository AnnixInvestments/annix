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
pnpm migrate:annix-app-paths:dry-run

# Execute migrations
pnpm migrate:fieldflow-recordings
pnpm migrate:cv-assistant-docs
pnpm migrate:rubber-paths
pnpm migrate:annix-app-paths
```

### Phase 2: Organize S3 Structure (COMPLETED)

- [x] **Define S3 Area Strategy**
  - [x] Decided on Option A (prefixes) - single bucket with area prefixes
  - [x] Document final S3 path structure (see below)
  - [x] Update `AWS_S3_SETUP_GUIDE.md` with new structure

- [x] **Update Storage Service**
  - [x] Added `StorageArea` enum for type safety (`storage.interface.ts`)
  - Note: Upload method signature unchanged - services pass full path with prefix

- [x] **Update All Document Services**
  - [x] Customer documents - `annix-app/customers/{customerId}/documents/`
  - [x] Supplier documents - `annix-app/suppliers/{supplierId}/documents/`
  - [x] RFQ documents - `annix-app/rfq-documents/{rfqId}/`
  - [x] Drawing documents - `annix-app/drawings/{year}/{month}/`
  - [x] Job card documents - already uses `stock-control/` prefix
  - [x] Rubber lining documents - `au-rubber/` prefix
  - [x] Secure documents - already uses `secure-documents/` prefix
  - [x] FieldFlow recordings - `fieldflow/recordings/{meetingId}/`
  - [x] CV Assistant - `cv-assistant/candidates/{companyId}/`

- [x] **Migration Script for Existing Paths**
  - [x] Created `scripts/migrate-annix-app-paths.ts`

#### Final S3 Path Structure
```
annix-sync-files/
├── annix-app/
│   ├── customers/{customerId}/documents/
│   ├── suppliers/{supplierId}/documents/
│   ├── rfq-documents/{rfqId}/
│   └── drawings/{year}/{month}/
├── au-rubber/
│   ├── cocs/{companyId}/
│   ├── delivery-notes/{companyId}/
│   ├── graphs/{companyId}/
│   └── customer-delivery-notes/{customerId}/
├── fieldflow/
│   └── recordings/{meetingId}/
├── cv-assistant/
│   └── candidates/{companyId}/
├── stock-control/
│   ├── allocations/
│   ├── branding/{companyId}/
│   ├── deliveries/
│   ├── inventory/
│   ├── invoices/
│   ├── job-card-amendments/
│   ├── job-card-drawings/
│   ├── job-cards/{companyId}/{jobCardId}/
│   ├── signatures/{companyId}/
│   └── staff/
└── secure-documents/
    └── {uuid}.enc
```

### Phase 3: Data Migration (COMPLETED)

- [x] **Extend Migration Script**
  - [x] Update `scripts/migrate-to-s3.ts` to handle all document types (16 document types across all areas)
  - [x] Add support for new area-based paths (annix-app/, fieldflow/, cv-assistant/, au-rubber/, stock-control/, secure-documents/)
  - [x] Add FieldFlow recordings migration (`scripts/migrate-fieldflow-recordings.ts`)
  - [x] Add CV Assistant documents migration (`scripts/migrate-cv-assistant-docs.ts`)
  - [x] Add dry-run support for all new document types (`--dry-run` flag)
  - [x] Add rollback capability (`--rollback` flag to download from S3 to local)
  - [x] Add type filtering (`--type=X` flag to process specific document types)

- [x] **Database Updates**
  - [x] Migration scripts update `file_path` columns with new S3 paths during migration
  - [x] Backward compatibility ensured (migration skips already-migrated paths)
  - [x] Added indexes for path queries (`migrations/1799920000000-AddFilePathIndexes.ts`)

### Phase 4: Testing and Deployment (COMPLETED)

- [x] **Testing**
  - [x] Unit tests for S3StorageService (`storage/s3-storage.service.spec.ts` - 25 tests)
  - [x] Unit tests for LocalStorageService (`storage/local-storage.service.spec.ts` - 18 tests)
  - [x] Integration tests for document upload/download (`storage/storage.integration.spec.ts` - 20 tests)
  - [x] Test presigned URL generation and expiration (covered in unit tests)
  - [x] Test MIME type handling for all document types
  - [x] Test large file handling (10MB+ recordings)

- [x] **Deployment Scripts and Documentation**
  - [x] Created deployment script (`scripts/deploy-s3-storage.sh`)
  - [x] Script handles: S3 bucket setup, IAM policies, Fly.io secrets, migrations, verification
  - [x] Existing AWS_S3_SETUP_GUIDE.md covers manual setup steps

#### Deployment Commands

```bash
# Full deployment (guided)
./scripts/deploy-s3-storage.sh full

# Or step-by-step:
./scripts/deploy-s3-storage.sh setup-bucket    # Create S3 bucket
./scripts/deploy-s3-storage.sh setup-iam       # Create IAM user/policy
./scripts/deploy-s3-storage.sh configure-fly   # Set Fly.io secrets
./scripts/deploy-s3-storage.sh migrate         # Run data migrations
./scripts/deploy-s3-storage.sh verify          # Verify deployment
```

#### Manual Deployment Steps

1. **Create S3 bucket** (see `docs/AWS_S3_SETUP_GUIDE.md`)
2. **Set Fly.io secrets**:
   ```bash
   fly secrets set \
     STORAGE_TYPE=s3 \
     AWS_REGION=af-south-1 \
     AWS_S3_BUCKET=annix-sync-files-production \
     AWS_ACCESS_KEY_ID=your_key \
     AWS_SECRET_ACCESS_KEY=your_secret \
     -a annix-backend
   ```
3. **Deploy**: `fly deploy -a annix-backend`
4. **Run migrations** (from production shell or locally with prod DB):
   ```bash
   pnpm migrate:s3:dry-run   # Preview
   pnpm migrate:s3           # Execute
   ```
5. **Verify**: Check S3 bucket for expected prefixes and test file access

### Phase 5: Cleanup (COMPLETED)

- [x] **Deprecate Local Storage for Production**
  - [x] Changed default `STORAGE_TYPE` from `local` to `s3`
  - [x] Added deprecation warning when using local storage
  - [x] Updated `main.ts` to only serve static files when `STORAGE_TYPE=local`
  - [x] Updated `.env.example` with S3 as default
  - [x] LocalStorageService kept for development use only

- [x] **Documentation**
  - [x] Updated `CLAUDE.md` with storage architecture section
  - [x] S3 bucket structure documented in AWS_S3_SETUP_GUIDE.md
  - [x] Created comprehensive `docs/STORAGE_RUNBOOK.md` with:
    - Backup procedures (full, partial, scheduled)
    - Restore procedures (versioning, from backup, local)
    - Troubleshooting guide (access denied, 404, CORS, uploads)
    - Monitoring and alerting recommendations
    - Emergency procedures

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
