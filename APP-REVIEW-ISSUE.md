# Comprehensive App Review - Code Quality & Architecture Improvements

This issue documents findings from a systematic review of the entire codebase. Items are organized by priority and category.

---

## CRITICAL - Security Issues

### Authentication & Authorization
- [x] **Disabled security checks in dev mode** - Password verification, email verification, device binding checks all commented out
  - `annix-backend/src/admin/admin-auth.service.ts:55-69`
  - `annix-backend/src/customer/customer-auth.service.ts:385-484`
  - `annix-backend/src/supplier/supplier-auth.service.ts:669-760`
  - **Action**: ✅ Created environment-based feature flags (DISABLE_PASSWORD_VERIFICATION, DISABLE_EMAIL_VERIFICATION, DISABLE_ACCOUNT_STATUS_CHECK, DISABLE_IP_MISMATCH_CHECK, DISABLE_DEVICE_FINGERPRINT)

- [x] **Unauthenticated admin endpoints** in Nix controller
  - `annix-backend/src/nix/nix.controller.ts:82-233` - 8+ endpoints labeled "admin" without guards
  - `POST /nix/admin/seed-rule`, `GET /nix/admin/learning-rules` etc.
  - **Action**: ✅ Added AdminAuthGuard, RolesGuard, @Roles('admin'), and @ApiBearerAuth() to both endpoints

- [x] **Sensitive data exposure** - No ownership verification
  - `GET /nix/user/:userId/extractions` - Any user can enumerate extractions by guessing IDs
  - `GET /nix/extraction/:id/clarifications` - No caller ownership check
  - `POST /customer/auth/verify-device` - Accepts customerId without authentication
  - **Action**: ✅ Created AnyUserAuthGuard for multi-user-type auth, added ownership checks to nix endpoints, secured verify-device with CustomerAuthGuard

---

## HIGH - Code Duplication (2000+ lines)

### Authentication Services (90% duplicate code)
- [ ] **Extract shared auth logic** into base service
  - `admin-auth.service.ts` (273 lines)
  - `customer-auth.service.ts` (1000 lines)
  - `supplier-auth.service.ts` (1050 lines)
  - Identical: registration, logout, session verification, token refresh, constants

### Registration Pages (40% duplicate code)
- [ ] **Create shared RegistrationFormBase component**
  - `annix-frontend/src/app/customer/register/page.tsx` (1298 lines)
  - `annix-frontend/src/app/supplier/register/page.tsx` (1318 lines)
  - Duplicate: COMPANY_SIZE_OPTIONS, INDUSTRY_OPTIONS, validatePassword(), drag/drop handlers

---

## HIGH - Oversized Components/Services

### Frontend (Components >2000 lines)
- [ ] **Split SpecificationsStep.tsx** (5,614 lines) into:
  - CoatingSpecification
  - MaterialSuitability
  - ComplianceChecks

- [ ] **Refactor StraightPipeRfqOrchestrator.tsx** (4,177 lines)
  - Has 34 useState declarations
  - Extract into custom hook `useRfqFormState()` or context

- [ ] **Split CSGBend3DPreview.tsx** (3,994 lines)
  - Separate Three.js scene management into custom hook

- [ ] **Refactor BendForm.tsx** (3,448 lines)
  - Extract FormLayout + BendCalculations

### Backend (Services >1000 lines)
- [ ] **Split RfqService** (1,730 lines) into:
  - RfqCalculationService
  - RfqDocumentService
  - RfqDraftService
  - RfqNotificationService

---

## HIGH - Database Schema Issues

### Missing Indexes on Foreign Keys (15+ columns)
- [x] Add indexes to:
  - `rfq.created_by_user_id`
  - `boq.created_by_user_id`, `boq.drawing_id`, `boq.rfq_id`
  - `drawing.rfq_id`, `drawing.uploaded_by_user_id`
  - `rfq_item.rfq_id`
  - `customer_profile.user_id`, `customer_profile.company_id`
  - `supplier_profile.user_id`, `supplier_profile.company_id`
  - `message.conversation_id`, `message.sender_id`
  - `nix_extraction.user_id`, `nix_extraction.rfq_id`
  - **Action**: ✅ Created migration `1780000000000-AddMissingForeignKeyIndexes.ts`

### Type Mismatches (nullable vs union types)
- [x] Fix nullable field types:
  - `supplier-company.entity.ts:88` - `beeLevel: number` should be `number | null`
  - `supplier-company.entity.ts:91` - `beeCertificateExpiry: Date` should be `Date | null`
  - `supplier-onboarding.entity.ts:48-52` - `submittedAt`, `reviewedAt` type mismatches
  - **Action**: ✅ Fixed all nullable field types to use `| null`

### Missing Audit Fields
- [x] Add `updatedAt` to:
  - `user.entity.ts`
  - `user-role.entity.ts`
  - `customer-device-binding.entity.ts`
  - `supplier-device-binding.entity.ts`
  - `message.entity.ts`
  - `broadcast.entity.ts`
  - **Action**: ✅ Added createdAt/updatedAt fields and created migration `1780000100000-AddMissingAuditFields.ts`

---

## MEDIUM - Code Quality

### Date/Time Violations (10 files)
Replace `new Date()` and `Date.now()` with Luxon datetime module:
- [x] `DocumentReviewModal.tsx:342` ✅
- [x] `DocumentExpiryPopup.tsx` ✅
- [x] `ConversationThread.tsx` ✅
- [x] `BracketsAndPlatesSection.tsx:79` ✅
- [x] `BracketForm.tsx` ✅
- [x] `CompensationPlateForm.tsx` ✅
- [x] `SmartNotesDropdown.tsx` ✅
- [x] `StraightPipeRfqOrchestrator.tsx:1627` ✅
- [x] `customer/register/page.tsx` ✅
- [x] `lib/utils/memoization.ts` ✅

### Function Naming Violations (20+ functions)
Remove "get" prefix per CLAUDE.md:
- [x] `pipeCalculations.ts` - `getTemperatureDerating()` to `temperatureDerating()` ✅
- [x] `boqConsolidation.ts` - `getFlangeSpec()` to `flangeSpec()` ✅
- [x] `sabs62CfData.ts` - `getSabs62CF()` to `sabs62CF()` (also renamed related functions) ✅
- [x] `coastlineCalculation.ts` - `getMarineInfluence()` to `marineInfluence()` ✅

### Type Safety Issues (8+ files with `as any`)
- [ ] Create proper types for Three.js controls in:
  - `CSGBend3DPreview.tsx:1263,1298`
  - `Pipe3DPreview.tsx:1018,1071,1098`
- [ ] Fix form type assertions in:
  - `BendForm.tsx:3000`
  - `StraightPipeForm.tsx:1179,1898`
  - `FittingForm.tsx:1404`

### API Client DRY Violation
- [ ] Extract token retrieval helper in `client.ts` - Pattern repeats 9+ times at lines 1677, 1696, 1715, 1734, etc.

### Inconsistent API Response Formats
- [ ] Create unified response wrapper interface
  - `admin-auth.controller.ts` returns `{ message }` vs `{ success, message }`
  - `boq.controller.ts` returns raw entities vs wrapped responses

---

## MEDIUM - Input Validation

### Missing ParseIntPipe
- [x] `user.controller.ts:59,66,74` - ✅ Added ParseIntPipe
- [x] `angle-range.controller.ts:46,59,70` - ✅ Added ParseIntPipe
- [x] `pipe-dimension.controller.ts:29,147-152` - ✅ Already has ParseIntPipe on ID params

### Unsafe JSON Parsing
- [x] Add try-catch to JSON.parse calls:
  - `customer-auth.controller.ts:88-91` ✅
  - `supplier-auth.controller.ts:112-114` ✅
  - `nix.controller.ts:129` ✅

### Missing Validators on DTOs
- [x] Add MinLength to `login-user.dto.ts` password field ✅ (also added to customer and supplier login DTOs)
- [ ] Add phone number validation `@IsPhoneNumber('ZA')` (deferred - may break existing data formats)
- [ ] Add date validation `@IsDateString()`, `@IsFuture()` (deferred - needs case-by-case review)

---

## LOW - Code Cleanup

### Console Logging (15+ instances)
Replace `console.*` with logger:
- [ ] `nix/upload/route.ts` (6 console.log, 2 console.error)
- [ ] `DocumentReviewModal.tsx` (3 console.error)
- [ ] `admin/portal/customers/page.tsx`
- [ ] `rfq.service.ts:362-363`

### Duplicate Enum Definitions
- [ ] Consolidate `SessionInvalidationReason` enums:
  - `customer-session.entity.ts:12-19`
  - `supplier-session.entity.ts:12-19`

### Inconsistent Enum Case
- [ ] Standardize enum value casing (most use lowercase, some use UPPERCASE)

### Inconsistent Repository Naming
- [ ] Standardize on `userRepository` OR `userRepo` convention

---

## Summary by Impact

| Priority | Category | Count | Effort |
|----------|----------|-------|--------|
| Critical | Security (Disabled Checks) | 3 services | High |
| Critical | Unauthenticated Endpoints | 8+ endpoints | Medium |
| High | Code Duplication | 2000+ lines | High |
| High | Oversized Components | 5 files | High |
| High | Missing DB Indexes | 15+ columns | Low |
| Medium | Date/Time Violations | 10 files | Medium |
| Medium | Type Safety | 8 files | Medium |
| Medium | Input Validation | 10+ endpoints | Medium |
| Low | Console Logging | 15+ instances | Low |
| Low | Naming Conventions | 20+ functions | Low |

---

## Recommended Approach

1. **Week 1**: Fix critical security issues (re-enable auth checks, add guards)
2. **Week 2**: Add missing database indexes and fix type mismatches
3. **Week 3**: Extract shared authentication service
4. **Week 4**: Split oversized components (SpecificationsStep first)
5. **Ongoing**: Address medium/low priority items during regular development

---

*Generated by systematic code review on 2026-02-05*
