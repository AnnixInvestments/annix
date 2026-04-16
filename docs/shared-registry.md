# Shared Module Registry

**Last updated:** 2026-04-16

This is the canonical index of shared modules across the Annix monorepo. Every Claude session MUST consult this file before writing new constants, components, services, or utilities (see `CLAUDE.md` §"Discovery-first protocol").

**If you add, move, or delete a shared module, update this file in the same commit.** The pre-push hook (`scripts/check-inter-app-duplication.sh`) will reject commits that add code to canonical locations without a corresponding registry update.

---

## Reference data — `packages/product-data/`

Shared workspace package (pnpm workspace). Both `annix-backend` and `annix-frontend` import via `@annix/product-data/<domain>`.

| Domain | Path | Exports |
|---|---|---|
| Pipe specs | `pipe/` | `NPS_TO_NB_MM`, `NB_MM_TO_NPS`, schedules, `PIPE_END_OPTIONS`, `BEND_END_OPTIONS`, `FITTING_END_OPTIONS`, `REDUCER_END_OPTIONS`, `SABS719_BEND_TYPES`, `SABS719_REDUCER_COMBINATIONS`, `AR_STEEL_GRADES`, `FITTING_CLASS_WALL_THICKNESS`, `PIPE_TOLERANCES`, `toleranceForPipe`, `calculateTolerances`, `MATERIAL_GROUP_MAPPINGS`, `ptRatingMaterialGroup`, `asmeGroupNumber`, `PT_RATINGS`, `interpolatePTRating`, `selectRequiredClass`, `temperatureRange`, `API_5L_GRADES`, `calculateCarbonEquivalent`, `STEEL_MATERIALS`, `validatePSL2Compliance`, `validateNACECompliance`, `WORKING_PRESSURE_BAR`, `WORKING_TEMPERATURE_CELSIUS`, `TEMPERATURE_CATEGORIES`, `STANDARD_PIPE_LENGTHS_M`, `DEFAULT_NOMINAL_BORES`, `ANSI_PRESSURE_CLASSES`, `SABS_1123_PRESSURE_CLASSES`, `BS_4504_PRESSURE_CLASSES`, `FLANGE_OD`, `TACK_WELD_CONFIG`, `CLOSURE_LENGTH_CONFIG`, `RETAINING_RING_CONFIG`, `FILLET_WELD_CONFIG`, `BUTT_WELD_CONFIG`, `PRESSURE_CALCULATION_CONSTANTS`, `SURFACE_AREA_CONSTANTS`, `CALCULATION_DEFAULTS`, `tackWeldWeight`, `closureLengthLimits`, `closureWeight` |
| Steel | `steel/` | `STEEL_DENSITY_KG_M3`, `STEEL_DENSITY_KG_MM3`, `STEEL_DENSITY_KG_CM3`, `NACE_MAX_HARDNESS_HRC` |
| Rubber | `rubber/` | rubber products, lining recommendations, dimensions, coding types, calloff status, order status |
| Paint | `paint/` | paint products, system recommendations, standards validation |
| Ceramic | `ceramic/` | ceramic products, lining recommendations |
| Pumps | `pumps/` | API 610 classification, calculations, selection guide, pump specifications, types, pricing, comparison, spare parts |
| Valves / Instruments | `valves-instruments/` | valve specs, instrument specs, types, selection, calculations, pricing |
| HDPE | `hdpe/` | grades, SDR ratings, dimensions, temperature derating, welding, welding standards, standards, fittings, pricing |
| PVC | `pvc/` | PVC-specific data |
| RFQ shared types | `rfq/` | straight pipe, bend, tank-chute, flange, pipe dimension, weld, material, boq, coating, pt-rating, pump |

**When to put new data here:** anything that is factual, static, cross-app, and not user-owned (standards data, product catalogues, engineering constants, enumerations). Tests live alongside source (`*.spec.ts`).

## Shared integration packages — `packages/`

| Package | Path | Use for |
|---|---|---|
| Feedback SDK | `packages/feedback-sdk/` | Framework-neutral feedback submission + status contract. Hosts provide auth/context; React and browser adapters build on top of this package. |
| Feedback web embed | `packages/feedback-web/` | Plain browser JavaScript floating feedback widget for non-React or framework-agnostic web embeds. |

---

## Backend shared modules — `annix-backend/src/`

### Shared utilities (`src/lib/`)

| Concept | Path | Use for |
|---|---|---|
| Date/time (Luxon) | `lib/datetime.ts` | ANY date operation. **Never** use `new Date()`, `Date.now()`, `Date.parse()`, or import `luxon` directly. Exports `now`, `nowISO`, `nowMillis`, `fromISO`, `fromJSDate`, `formatDateZA`, `formatDateLongZA`. |
| Sage rate limiter | `lib/sage-rate-limiter.ts` | EVERY Sage API call (100/min + 2500/day per company). Never call Sage endpoints via raw `fetch`. |
| PDF builder | `lib/pdf-builder.ts` | Base PDF generation primitives. |
| PDF templates | `lib/pdf-templates/` | `render-header`, `render-footer`, `render-table`, `render-metadata-block`, `render-signature-block`. All PDF generators compose these. |
| Document classification | `lib/document-classification/` | Inbound document type detection (invoice, PO, delivery note, CoC, etc.). |
| Steel constants | `lib/steel-constants.ts` | Re-exports from `@annix/product-data/steel` + `steelDensity` helper. |
| Pipe constants | `lib/pipe-constants.ts` | Re-exports from `@annix/product-data/pipe`. |
| S3 storage helpers | `lib/app-storage-helper.ts` | `documentPath` (canonical S3 prefix builder), `bufferToMulterFile` (buffer→Multer shim), `uploadDocument` (build path + create Multer file + upload in one call). Use instead of manual S3 path strings + inline Multer object construction. |
| Document text extraction | `lib/document-extraction.ts` | `extractTextFromPdf`, `extractTextFromExcel`, `extractTextFromWord`, `extractTextByMime` (auto-routes by MIME/extension), `isExcelFile`, `isWordFile`. Use instead of inline pdf-parse/xlsx/mammoth calls. |
| Entity helpers | `lib/entity-helpers.ts` | `findOneOrFail`, base entity utilities. |
| Base CRUD service | `lib/base-crud.service.ts` | Generic `BaseCrudService<Entity, CreateDto, UpdateDto>`. Pure-CRUD reference-data services should `extends BaseCrudService<...>` to inherit `create / findAll / findOne / update / remove` + `checkUnique`/`checkUniqueExceptId` helpers. |
| Pagination DTO | `lib/dto/pagination-query.dto.ts` | Shared `PaginationQueryDto`, `PaginatedResult<T>`, `buildPaginatedResult` helper. Use in any service that returns paginated lists. |
| Validation decorator factories | `lib/dto/validation-decorators.ts` | `RequiredString`/`OptionalString`, `RequiredEmail`/`OptionalEmail`, `RequiredPhone`/`OptionalPhone` (ZA-aware), `RequiredInt`/`OptionalInt`, `RequiredNumber`/`OptionalNumber`, `RequiredBoolean`/`OptionalBoolean`, `RequiredIn`/`OptionalIn`, `RequiredDateString`/`OptionalDateString`, `RequiredStringArray`/`OptionalStringArray`. Replace 3-4 line `@IsX @IsY @MaxLength()` triplets with one decorator. Per-context constraints stay in the field declaration (e.g. `@OptionalString({ maxLength: 500 })`), but the decorator stack is centralized. |
| Company size enum | `lib/dto/common-company.dto.ts` | `CompanySize` enum + `COMPANY_SIZE_VALUES` const for `OptionalIn(COMPANY_SIZE_VALUES)`. The original Common*Dto classes were removed in commit (this commit) — they couldn't accommodate the per-context field-name and constraint variations across customer/supplier/admin DTOs (see issue #191 Q3). |

### Shared services (standalone NestJS modules)

| Concept | Path | Use for |
|---|---|---|
| Storage (S3 + local) | `storage/` | ANY file upload/download. Inject `IStorageService` via `STORAGE_SERVICE` token. Never instantiate AWS SDK directly. See `storage/storage.interface.ts`. |
| Email (with templates) | `email/email.service.ts` + `email/templates/` | ANY outbound email. Never instantiate nodemailer directly. |
| AI chat (Gemini-first) | `ai-chat/ai-chat.service.ts` | ANY AI/LLM call. Never instantiate Anthropic/Gemini SDKs directly. Use `chat`, `streamChat`, `chatWithImage`. |
| Notifications dispatcher | `notifications/` | Multi-channel dispatch (email, in-app, SMS). |
| Inbound email routing | `inbound-email/` | `EmailAppAdapter` + classification — routes inbound emails to the correct app module. |
| Sage One SA | `sage-export/sage-api.service.ts` | Sage One SA REST client (rate-limited). |
| Sage Cloud | `comply-sa/comply-integrations/sage/sage.service.ts` | Sage Cloud OAuth client (rate-limited). |
| Company profile (Annix SoT) | `admin/admin-company-profile.service.ts` | ANY Annix legal/contact info. Never hardcode legal name, reg number, emails, addresses. |
| Reference data API | `reference-data/` | Public `GET /public/reference/pipe-specs`, `POST /public/reference/b16-rating`, `/public/reference/currencies`. |
| RBAC | `rbac/rbac.service.ts` | Permissions, role names, portal user access. `STOCK_CONTROL_ROLE_NAMES` is exported from here. |
| Website pages CMS | `rubber-lining/website-pages.service.ts` | CRUD for AU Industries website pages. Public routes via `public-au-industries.controller.ts`. Admin routes via `website-pages.controller.ts`. |
| Platform base entities | `platform/entities/base-portal-profile.ts` | Extend this for any portal-profile-shaped entity (customer, supplier). |
| TanStack-compatible query helpers | `shared/validators/` | Shared NestJS validators (e.g. `rfq-compliance.validator.ts`). |

**When to put new backend code here:** any service or utility that is consumed by more than one app module, or that represents a concept any future app might need.

### Stock Management module (`src/stock-management/`)

Host-app-agnostic inventory management module. Currently consumed by Stock Control and AU Rubber. All tables use the `sm_` prefix.

| Concept | Path | Use for |
|---|---|---|
| Module entry | `stock-management/stock-management.module.ts` | NestJS module registration. Imports: AuthModule, FeatureFlagsModule, StorageModule, NotificationsModule, NixModule. |
| Entities (products) | `stock-management/entities/issuable-product.entity.ts` + children | Base `sm_issuable_product` + child tables: `sm_consumable_product`, `sm_paint_product`, `sm_rubber_roll`, `sm_rubber_offcut_stock`, `sm_solution_product` |
| Entities (issuance) | `stock-management/entities/issuance-session.entity.ts` + children | Base `sm_issuance_session` + `sm_issuance_row` + per-type child rows + `sm_issuance_item_coat_tracking` (per-line-item per-coat-type issued quantities) |
| Entities (returns) | `stock-management/entities/return-session.entity.ts` + children | Base `sm_return_session` + `sm_rubber_offcut_return` + `sm_paint_return` + `sm_consumable_return` |
| Entities (stock take) | `stock-management/entities/stock-take.entity.ts` + children | `sm_stock_take` + `sm_stock_take_line` + `sm_stock_take_adjustment` + `sm_stock_take_variance_category` |
| Entities (FIFO) | `stock-management/entities/stock-purchase-batch.entity.ts` | `sm_stock_purchase_batch` + `sm_stock_movement_batch_consumption` |
| Entities (hold) | `stock-management/entities/stock-hold-item.entity.ts` | `sm_stock_hold_item` — quarantine queue |
| Entities (compounds) | `stock-management/entities/rubber-compound.entity.ts` | `sm_rubber_compound` + `sm_product_datasheet` |
| Entities (license) | `stock-management/entities/company-module-license.entity.ts` | `sm_company_module_license` — tier-based per-company gating |
| Services | `stock-management/services/*.ts` | IssuanceService, ReturnsService, StockTakeService, StockHoldService, FifoBatchService, RubberCompoundService, PhotoIdentificationService, LocationClassificationService, etc. |
| Controllers | `stock-management/controllers/*.ts` | All under `/api/stock-management/` prefix. 14 controllers. |
| Feature guard | `stock-management/guards/stock-management-feature.guard.ts` | `@StockManagementFeature("FEATURE_KEY")` decorator per-endpoint |
| Config | `stock-management/config/stock-management-features.constants.ts` | Tier definitions (basic/standard/premium/enterprise) + feature keys |

---

## Frontend shared modules — `annix-frontend/src/app/`

### Shared components (`app/components/`)

The canonical frontend components directory. **App-specific components live in `app/<app>/components/` only if they're truly unique to that app** — if there's any chance another app might use it, put it here.

Existing shared components include: `DataTable`, `TableComponents`, `ConfirmModal`, `FormModal` (reusable form-based modal shell with portal, backdrop, header, scrollable body, and footer), `AdminActionModal` (approve/suspend/reject modal for admin entity actions), `ImportModal`, `MonthYearPicker`, `FileDropzone`, `SurfaceAreaDisplay`, `WeldSummaryCard`, `CalloffInput`, `SageExportModal`, `PortalToolbar`, `PdfPreviewModal` (+ `usePdfPreview` hook — mandatory for all generated PDF documents).

### Stock Management frontend module (`app/modules/stock-management/`)

Host-app-agnostic React module. Consumed by Stock Control (via `app/stock-control/portal/preview/stock-management/`) and AU Rubber (via `app/au-rubber/portal/stock-management/`).

| Concept | Path | Use for |
|---|---|---|
| Provider | `modules/stock-management/provider/StockManagementProvider.tsx` | Context provider — host app wraps its layout with this and passes `StockManagementHostConfig` (apiBaseUrl, authHeaders, currentUser, theme, labels) |
| API client | `modules/stock-management/api/stockManagementApi.ts` | `StockManagementApiClient` class — all API calls to `/api/stock-management/*` |
| Pages | `modules/stock-management/pages/` | `IssueStockPage`, `ReturnsPage`, `StockTakePage`, `ModuleLicensePage` + 6 admin pages |
| Components | `modules/stock-management/components/` | `StaffPicker`, `JobCardOrCpoPicker`, `ComboBox`, `PhotoExtractButton`, `PaintProRataSplitEditor`, `RubberRollSubEditor` |
| Hooks | `modules/stock-management/hooks/` | `useIssuanceQueries`, `useAdminQueries`, `useLicenseQueries`, `useStockTakeQueries`, `useFifoValuation` |
| Types | `modules/stock-management/types/` | `config`, `license`, `products`, `issuance`, `admin`, `stockTake` |
| Theme | `modules/stock-management/theme/` | Default tokens + `StockManagementThemeTokens` type |
| i18n | `modules/stock-management/i18n/` | Default English labels + override mechanism |

### Frontend utilities (`app/lib/`)

| Concept | Path | Use for |
|---|---|---|
| Date/time (Luxon) | `lib/datetime` | ANY date operation. Never use `new Date()` or import `luxon` directly. |
| HTTP API client | `lib/api/` | All API calls. Per-subject methods live in `lib/api/<subject>-api/`. |
| Auth / token storage | `lib/auth/PortalTokenStore` | Shared across all portals — customer, supplier, stock-control, AU, CV. |
| SA validators | `lib/validators/` | ID numbers, VAT numbers, phone numbers, email, company registration numbers. |
| Config | `lib/config/rfq/` | RFQ config — **thin re-export shims over `@annix/product-data/pipe`**. Do not add new local data here. |
| Query hooks | `lib/query/hooks/<subject>/use<Subject>.ts` | ALL page-level data fetching must use these. Subjects: `admin`, `au-rubber`, `boq`, `customer`, `drawing`, `rfq`, `supplier`, `reference`. |
| Query keys | `lib/query/keys/<subject>Keys.ts` | Query key factories with shape `{ all, list, detail }`. |
| corpId (static branding) | `lib/config/corpId.ts` | Colors, fonts, logos. **Never legal data** — use the company profile hook for that. |
| Company profile hook | `lib/query/hooks/useAnnixCompanyProfile` | Annix legal/contact info. Never hardcode. |
| Feature flags | `lib/query/hooks/useFeatureFlags` | Feature flag queries. |

### Hooks and query keys in detail

Pages MUST import hooks from `@/app/lib/query/hooks` — never from individual hook files, never via direct `fetch` + `useState` + `useEffect`. The ESLint config enforces this via `no-restricted-imports` on `page.tsx` files.

When creating a new hook:
1. Add query key factory to `keys/<subject>Keys.ts`
2. Export from `keys/index.ts`
3. Create hook in `hooks/<subject>/use<Subject>.ts`
4. Export from `hooks/index.ts`
5. Update this registry if the subject is new

---

## Red-flag locations — NOT canonical homes

Do NOT put shared code in any of these locations. If you see shared code here, it's a bug to fix.

- `annix-frontend/src/app/<app>/config/` — app-specific config only (navItems, version constants, feature toggles). Anything else should move to `packages/product-data/` or `annix-frontend/src/app/lib/`.
- `annix-frontend/src/app/<app>/components/` — components genuinely unique to that app. If you're tempted to copy one to another app, move it to `annix-frontend/src/app/components/` instead.
- `annix-frontend/src/app/<app>/lib/` — does not exist, should not exist. Shared frontend code lives in `annix-frontend/src/app/lib/`.
- `annix-backend/src/<app-module>/lib/` — does not exist, should not exist. Shared backend code lives in `annix-backend/src/lib/` or its own standalone module.
- `annix-backend/src/<app-module>/constants.ts` — app-local constants are fine, but if the constant might be relevant to any other module, move it to `packages/product-data/` or `annix-backend/src/lib/`.

---

## How to discover shared modules (manual)

If this registry ever gets out of date, here are the searches the Explore subagent should run:

```
# Reference data
find packages/product-data -name '*.ts' -not -name '*.spec.ts'

# Backend shared
find annix-backend/src/lib -name '*.ts' -not -name '*.spec.ts'
# Plus any standalone concept modules:
ls annix-backend/src/ -d */  # look for storage, email, ai-chat, notifications, rbac, reference-data, etc.

# Frontend shared
find annix-frontend/src/app/components -name '*.tsx' -not -name '*.spec.tsx'
find annix-frontend/src/app/lib -name '*.ts' -not -name '*.spec.ts'
```

Or simply run the `/discover-shared` skill.

---

## How to update this registry

When you add/move/delete shared code:

1. Add/update the row in the relevant section above
2. Update the `Last updated` date at the top
3. Commit this file together with the code change

The pre-push hook will warn if you add files to canonical locations without updating this registry. It's a warning, not an error — you can override by commit message if the addition is genuinely trivial (e.g. a typo fix to an existing file).
