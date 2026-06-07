# Shared Module Registry

**Last updated:** 2026-05-25

This is the canonical index of shared modules across the Annix monorepo. Every Claude session MUST consult this file before writing new constants, components, services, or utilities (see `CLAUDE.md` §"Discovery-first protocol").

**If you add, move, or delete a shared module, update this file in the same commit.** The pre-push hook (`scripts/check-inter-app-duplication.sh`) will reject commits that add code to canonical locations without a corresponding registry update.

---

## Reference data — `packages/product-data/`

Shared workspace package (pnpm workspace). Both `annix-backend` and `annix-frontend` import via `@annix/product-data/<domain>`.

| Domain | Path | Exports |
|---|---|---|
| Pipe specs | `pipe/` | `NPS_TO_NB_MM`, `NB_MM_TO_NPS`, schedules, `PIPE_END_OPTIONS`, `BEND_END_OPTIONS`, `FITTING_END_OPTIONS`, `REDUCER_END_OPTIONS`, `SABS719_BEND_TYPES`, `SABS719_REDUCER_COMBINATIONS`, `AR_STEEL_GRADES`, `FITTING_CLASS_WALL_THICKNESS`, `PIPE_TOLERANCES`, `toleranceForPipe`, `calculateTolerances`, `MATERIAL_GROUP_MAPPINGS`, `ptRatingMaterialGroup`, `asmeGroupNumber`, `PT_RATINGS`, `interpolatePTRating`, `selectRequiredClass`, `temperatureRange`, `API_5L_GRADES`, `calculateCarbonEquivalent`, `STEEL_MATERIALS`, `validatePSL2Compliance`, `validateNACECompliance`, `WORKING_PRESSURE_BAR`, `WORKING_TEMPERATURE_CELSIUS`, `TEMPERATURE_CATEGORIES`, `STANDARD_PIPE_LENGTHS_M`, `DEFAULT_NOMINAL_BORES`, `ANSI_PRESSURE_CLASSES`, `SABS_1123_PRESSURE_CLASSES`, `BS_4504_PRESSURE_CLASSES`, `FLANGE_OD`, `TACK_WELD_CONFIG`, `CLOSURE_LENGTH_CONFIG`, `RETAINING_RING_CONFIG`, `FILLET_WELD_CONFIG`, `BUTT_WELD_CONFIG`, `PRESSURE_CALCULATION_CONSTANTS`, `SURFACE_AREA_CONSTANTS`, `CALCULATION_DEFAULTS`, `tackWeldWeight`, `closureLengthLimits`, `closureWeight`, `SABS62_NB_OPTIONS`, `SABS62_BEND_RADIUS`, `SABS62_PIPE_DATA`, `SABS62_CF_DATA`, `SABS62_COMMON_ANGLES`, `SABS62BendType`, `sabs62CF`, `sabs62CFInterpolated`, `sabs62BendRadius`, `calculateSabs62BendRadius`, `sabs62AvailableAngles`, `isSabs62CombinationAvailable`, `sabs62Multiplier`, `sabs62BendTypes`, `getSabs62PipeData` |
| Steel | `steel/` | `STEEL_DENSITY_KG_M3`, `STEEL_DENSITY_KG_MM3`, `STEEL_DENSITY_KG_CM3`, `NACE_MAX_HARDNESS_HRC` |
| Rubber | `rubber/` | rubber products, lining recommendations, dimensions, coding types, calloff status, order status |
| Paint | `paint/` | paint products, system recommendations, standards validation |
| Ceramic | `ceramic/` | ceramic products, lining recommendations |
| Pumps | `pumps/` | API 610 classification, calculations, selection guide, pump specifications, types, pricing, comparison, spare parts |
| Valves / Instruments | `valves-instruments/` | valve specs, instrument specs, types, selection, calculations, pricing |
| HDPE | `hdpe/` | grades, SDR ratings, dimensions, temperature derating, welding, welding standards, standards, fittings, pricing, `sans1123BackingFlange`, `sans1123StubAssemblyDescription` (PN → SANS 1123 backing-flange table for HDPE stub-end assemblies). PE100 SDR 11 butt-fusion fitting geometry split per concept: `elbow-dimensions` exports `moulededHdpeElbowDimensions`; `tee-dimensions` exports `equalTeeDimensions`, `reducingTeeDimensions`, `hdpeTeeDimensions`; `reducer-dimensions` exports `hdpeReducerLength` + `hdpeReducerSource`; `lateral-dimensions` exports `lateralDimensions` (DN 63-160 catalogued moulded, DN 200/250/315 catalogued fabricated, DN 180/225/280/355-630 estimated); `end-cap-dimensions` exports `hdpeEndCapLength` + `hdpeEndCapSource` (DN 50-800 catalogued). Shared types in `fitting-dimension-types`: `ElbowDims`, `TeeDims`, `LateralDims`, `DimensionSource` (`"catalogue" | "estimated"`), `DimensionProvenance`. Catalogue sources registry in `fitting-dimension-sources`: `HDPE_FITTING_DIMENSION_SOURCES`, `CatalogueSource`, `catalogueSource(id)` — every dimension entry carries a `sourceId` linking to a manufacturer (Sunplast/HdpePolyfittings, Strongbridge, Chuangrong, DEF Pipe, Flo-Tek, Sinvac) so BOQ tooltips and audits can show which catalogue a value came from. Used by the BOQ row builder as a fallback when entry.specs hasn't captured the dims explicitly. |
| PVC | `pvc/` | uPVC / mPVC / PVC-O / cPVC materials, pressure classes (Class 6/9/12/16/20/25/34/40), wall-thickness tables, joining methods (solvent / RRJ / threaded / flanged / compression). **Typed per-concept API (issue #288 Phase 1):** `grades.ts` exports `PvcGradeCode = "PVC-U" \| "PVC-M" \| "PVC-O"`, `PVC_GRADES` (MRS / designStress / density / lifespan / colour), `pvcGradeByCode`, `pvcGradesByApplication`, `pvcSafetyFactor` (= 2.0). `classes.ts` exports `PvcPressureClass = 6\|9\|12\|16\|20\|25\|34\|40`, `PVC_PRESSURE_CLASSES`, `validPvcPressureClassesForGrade`, `isPvcClassValidForGrade`, `recommendedPvcClassForPressure`. `dimensions.ts` exports `pipeDimensions(dn, grade, class) → {odMm, wallMm, idMm, massPerMetreKg}`, `pvcAvailableSizes`, `pvcOutsideDiameter`, `PVC_CATALOGUE_DNS`. `joining-methods.ts` exports `PvcJoiningMethod`, `PVC_JOINING_METHODS` (size range + class range + grade compatibility + cost factor per method), `suitablePvcJoiningMethods`, `defaultPvcJoiningMethod`. Per-concept fitting dimensions split: `elbow-dimensions.ts` (11.25° / 22.5° / 45° / 90° elbows, DN 20–160 + estimated extras), `tee-dimensions.ts` (equal + reducing tees), `reducer-dimensions.ts` (concentric reducers, DN 25–160), `end-cap-dimensions.ts` (blind / socket caps), `coupling-dimensions.ts` (slip / RRJ / repair families, DN 20–630). Each row carries a `sourceId` linking to a manufacturer catalogue (Flo-Tek, Marley, Macneil, Sizabantu, Agrico, DPI) via `sources.ts` → `PVC_CATALOGUE_SOURCES` + `pvcCatalogueSource(id)`. `temperature-derating.ts` exports `pvcDeratingFactor(type, °C)` + `pvcDeratedWorkingPressure()` (uPVC/mPVC up to 45 °C, PVC-O up to 45 °C, cPVC up to 95 °C). `pricing.ts` exports `PVC_STANDARD_PIPE_LENGTHS` (6.0 m for DN 20–250, 5.8 m for DN 315–630), `standardPvcPipeLengthForDn()`, `calculatePvcJointCount()`, `DEFAULT_PVC_PRESSURE_CLASS = 16`. **Legal:** Annix does NOT hold SANS 966 / 1601 / 1808 reproduction rights — all data sourced from manufacturer catalogues per row (see `legal_sans_pvc_reproduction_rights.md`). Tracked in issue #288. |
| RFQ shared types | `rfq/` | straight pipe, bend, tank-chute, flange, pipe dimension, weld, material, boq, coating, pt-rating, pump |
| Teacher Assistant | `teacher-assistant/` | `SUBJECTS`, `AGE_BUCKETS`, `DURATIONS`, `OUTPUT_TYPES`, `DIFFICULTY_LEVELS`, `DIFFERENTIATION_OPTIONS`, `RUBRIC_LEVELS`, `ASSIGNMENT_SECTIONS`, `subjectTemplates`, `templateForSubject`, `BANNED_PHRASES`, `containsBannedPhrase`, `Assignment`, `AssignmentInput`, `AssignmentTask`, `AssignmentTaskAiCritique`, `RubricCriterion`, `TeacherNotes`, `PartialExemplar`, `WorkbookPage`, `validateAssignment`, `isTooFluffy`, `findNearDuplicateTaskPairs`, `similarityRatio`, `aiSafeSignalsHit`, `AI_SAFE_SIGNAL_KEYWORDS`, `MIN_TASKS`, `MIN_RUBRIC_CRITERIA`, `MIN_EVIDENCE_CHECKLIST`, `MIN_TASK_INSTRUCTION_CHARS`, `TASK_SIMILARITY_THRESHOLD`, `SYSTEM_PROMPT`, `buildUserPrompt`, `buildRetryPrompt`, `buildSectionRegeneratePrompt`. Single source of truth for the AI assignment generator's enums, schema, validation, and prompt construction. Used by both `annix-backend/src/teacher-assistant/` and `annix-frontend/src/app/teacher-assistant/`. |
| Orbit education (FuturePath) | `orbit-education/` (`@annix/product-data/orbit-education`) | Canonical reference layer for FuturePath admissions scoring (#308). `curricula.ts`: `ORBIT_EDUCATION_CURRICULA` / `OrbitEducationCurriculum`, `ORBIT_EDUCATION_CURRICULUM_META`, `isOrbitEducationCurriculum` (the annix-orbit-education backend re-exports the curriculum enum from here — do NOT redefine). `nsc.ts`: DBE/Umalusi 7-level scale `NSC_ACHIEVEMENT_LEVELS`, `nscLevelForPercent`, `nscBandForLevel` (raw-% ↔ level both directions). `ucas-tariff.ts`: `A_LEVEL_TARIFF`, `IB_HL_TARIFF`, `IB_SL_TARIFF`, `BTEC_SINGLE_TARIFF`, `sumALevelTariff` (A-Level HIGH confidence; IB/BTEC MEDIUM — verify). `capabilities.ts`: `ORBIT_EDUCATION_CAPABILITIES` semantic taxonomy, `SUBJECT_ROLES`, `NormalisedSubject`, `NSC_SUBJECT_CAPABILITY` + `nscCapabilityForSubject` (subjects map to capabilities so NSC/A-Level/IB Maths satisfy the same rule). `career-clusters.ts`: `ORBIT_EDUCATION_CAREER_CLUSTERS` + meta. **All numeric scales are publicly-published + sourced in file headers; re-verify per admissions cycle. No license-restricted data (no QS/THE).** (ref #308) |
| Marketing site content | `marketing/` (`@annix/product-data/marketing`) | Typed content model + seed defaults for the annix.co.za ecosystem website (#338). Types: `MarketingSiteContent`, `MarketingHero` (+ `MarketingHighlight`), `MarketingEcosystem`, `MarketingProduct` (has `appKey`, `portalCode`, `imageUrl`, `comingSoon`), `MarketingIndustries`/`MarketingIndustry` (industry tiles with `imageUrl`), `MarketingPartners`/`MarketingPartner` (CMS-managed partner logos), `MarketingGlobalPresence`/`MarketingPresenceItem`, `MarketingCtaBand`, `MarketingFooter` (+ `MarketingFooterColumn`, `MarketingSocialLink`), `MarketingProductPage`/`MarketingProductFeature`/`MarketingProductRoi`, `MarketingLabs`, `MarketingAbout`, `MarketingSiteStatus`, `MarketingCta`. `defaultMarketingContent()` returns the seed tree (ecosystem cards reference real `appKey` + `portalCode`). Single source of truth for the structured marketing content rendered by the site and edited by the admin CMS. |
| Portal hosts | `portals/` | `PORTAL_HOSTS`, `PortalCode`, `PortalHost`, `portalForHost`, `portalForCode`, `canonicalHostFor`, `corsOriginsFor`, `normaliseHost`, `isAliasHost`, `DEFAULT_DEV_PORT`. Single source of truth for production + dev hostnames per portal — drives middleware host routing, backend CORS, WebAuthn RP ID resolution, and email/PDF link generation. **Adding a new portal? Add it here first; everything else derives from this.** Also exports Annix Rep industry taxonomy: `INDUSTRIES`, `Industry`, `SubIndustry`, `ProductCategory`, `IndustryValue`, `industryByValue`, `subIndustryByValue`, `productCategoryByValue`, `searchTermsForSelection`, `allIndustryLabels`, `subIndustryLabelsForIndustry`, `productCategoryLabelsForSubIndustry`, `productCategoryLabelsForSubIndustries`. |

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
| Date/time (Luxon) | `lib/datetime.ts` | ANY date operation. **Never** use `new Date()`, `Date.now()`, `Date.parse()`, or import `luxon` directly. Exports `now`, `nowISO`, `nowMillis`, `fromISO`, `fromJSDate`, `formatDateZA`, `formatDateLongZA`, `monthEndPeriodOptions` (month-end stock-take/period dropdown options — label + last-day-of-month ISO date). |
| Sage rate limiter | `lib/sage-rate-limiter.ts` | EVERY Sage API call (100/min + 2500/day per company). Never call Sage endpoints via raw `fetch`. |
| Excel sheet/tab selection (backend) | `lib/xlsx-sheet-select.ts` | Pick the right worksheet from a multi-tab workbook by month ("May 2026 Month-End" → tab "May"), with explicit-sheet override + single-sheet fallback. Exports `selectSheetForMonth`, `monthTokenFromLabel`. Use for any month-tab stock-take/import parsing. |
| PDF builder | `lib/pdf-builder.ts` | Base PDF generation primitives. |
| PDF templates | `lib/pdf-templates/` | `render-header`, `render-footer`, `render-table`, `render-metadata-block`, `render-signature-block`. All PDF generators compose these. |
| Document classification | `lib/document-classification/` | Inbound document type detection (invoice, PO, delivery note, CoC, etc.). |
| Steel constants | `lib/steel-constants.ts` | Re-exports from `@annix/product-data/steel` + `steelDensity` helper. |
| Pipe constants | `lib/pipe-constants.ts` | Re-exports from `@annix/product-data/pipe`. |
| S3 storage helpers | `lib/app-storage-helper.ts` | `documentPath` (canonical S3 prefix builder), `bufferToMulterFile` (buffer→Multer shim), `uploadDocument` (build path + create Multer file + upload in one call). Use instead of manual S3 path strings + inline Multer object construction. |
| Document text extraction | `lib/document-extraction.ts` | `extractTextFromPdf`, `extractTextFromExcel`, `extractTextFromWord`, `extractTextByMime` (auto-routes by MIME/extension), `isExcelFile`, `isWordFile`. Use instead of inline pdf-parse/xlsx/mammoth calls. |
| JSON from AI | `lib/json-from-ai.ts` | `parseJsonFromAi<T>(content)`, `stripAiCodeFences`, `JsonFromAiError`. Strips markdown code fences (```json … ```) and parses AI responses. Use for any AI provider response that returns JSON. (Several existing callers — `stock-management/services/photo-identification.service.ts`, `paint-classification.service.ts`, `location-classification.service.ts`, `datasheet-extraction.service.ts`, `annix-sentinel/regulatory/regulatory.service.ts` — duplicate this logic and are candidates for migration.) |
| HTML → plain text | `lib/html-text.ts` | `stripHtmlToText(html)` — strips tags, decodes common HTML entities (`&amp;`, `&nbsp;`, `&mdash;`, etc.), preserves paragraph/list breaks as line breaks, collapses whitespace. Use for ingested data that may contain HTML markup (e.g. job descriptions from Remotive/Adzuna/Jooble) where downstream display is plain text. |
| Entity helpers | `lib/entity-helpers.ts` | `findOneOrFail`, base entity utilities. |
| Base CRUD service | `lib/base-crud.service.ts` | Generic `BaseCrudService<Entity, CreateDto, UpdateDto>`. Pure-CRUD reference-data services should `extends BaseCrudService<...>` to inherit `create / findAll / findOne / update / remove` + `checkUnique`/`checkUniqueExceptId` helpers. |
| Persistence layer | `lib/persistence/` | PostgreSQL to MongoDB migration layer (issue #298). `database-driver.ts`: `DatabaseDriver` enum + `activeDatabaseDriver()`/`isMongoDriver()`. `crud-repository.ts`: generic `CrudRepository<Entity>` abstraction. `typeorm-crud-repository.ts`: `TypeOrmCrudRepository<Entity>` (the Postgres implementation, used once for every module). `repository-provider.ts`: `repositoryProvider(token, postgres, mongo?)` wiring helper that binds a repository per `DATABASE_DRIVER`. `mongo-connection.module.ts`: the Atlas connection, loaded only under `DATABASE_DRIVER=mongo`. `transaction-runner.ts`: `TransactionRunner` abstract — inject it and call `run(ctx => ...)` for atomic multi-write work; `transaction.module.ts` (`@Global`) binds the Postgres or Mongo runner per driver. `transaction-context.ts`: the opaque `TransactionContext` passed to the callback. Repositories obtained from `repositoryProvider` expose `withTransaction(ctx)` (concrete on both base classes) returning a `CrudRepository` bound to the running transaction; a token class declares `abstract withTransaction(ctx): CrudRepository<Entity>` to opt in. `empty-collection-cleanup.ts`: `cleanupEmptyCollections(connection, { apply })` drops empty (0-document) collections that carry no secondary index, keeping the Atlas M0 cluster under its 500-collection cap; shared by the release-time pre-migration sweep (`fly.toml`), the standalone `scripts/drop-empty-collections.ts`, and the cron below. `mongo-maintenance.service.ts` / `mongo-maintenance.module.ts`: `MongoMaintenanceService` runs that sweep nightly (`maintenance:drop-empty-collections`, `0 3 * * *`), loaded only under `DATABASE_DRIVER=mongo`. |
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
| Inbound email routing | `inbound-email/` | `EmailAppAdapter` + classification — routes inbound emails to the correct app module. On approval, `InboundEmailProvisioningService` auto-creates one disabled mailbox config **per subscribed inbox-app** (a dedicated mailbox per app so apps never ingest each other's documents): first app `<slug>-app@<domain>`, additional apps numbered `<slug>-2-app`, `<slug>-3-app`, … It emails all credentials to `INBOUND_PROVISION_NOTIFY_EMAIL`; admin reviews/enables at `/admin/portal/inbound-emails` (`AdminInboundEmailController`). Processed mail is auto-deleted from owned-domain inboxes (`INBOUND_AUTO_DELETE_DOMAINS`). Env: `INBOUND_PROVISION_HOST/PORT/TLS/DOMAIN/NOTIFY_EMAIL`. |
| Sage One SA | `sage-export/sage-api.service.ts` | Sage One SA REST client (rate-limited). |
| Sage adapter registry | `sage-export/sage-adapter-registry.service.ts` | Unified registry for Sage invoice export adapters. Apps self-register via `OnModuleInit`. Unified controller at `GET /sage-export/:moduleCode/:adapterKey/preview\|csv`. |
| Sage Cloud | `annix-sentinel/sentinel-integrations/sage/sage.service.ts` | Sage Cloud OAuth client (rate-limited). |
| Company profile (Annix SoT) | `admin/admin-company-profile.service.ts` | ANY Annix legal/contact info. Never hardcode legal name, reg number, emails, addresses. |
| Reference data API | `reference-data/` | Public `GET /public/reference/pipe-specs`, `POST /public/reference/b16-rating`, `/public/reference/currencies`. |
| RBAC | `rbac/rbac.service.ts` | Permissions, role names, portal user access. `STOCK_CONTROL_ROLE_NAMES` is exported from here. |
| Website pages CMS | `rubber-lining/website-pages.service.ts` | CRUD for AU Industries website pages. Public routes via `public-au-industries.controller.ts`. Admin routes via `website-pages.controller.ts`. |
| Marketing site CMS (draft→publish) | `marketing/` | Singleton draft/published snapshot store for the annix.co.za ecosystem website (#338). `MarketingSiteContentService`: `draftContent()`, `publishedContent()`, `status()`, `saveDraft()`, `publish(by)`, `discardDraft()` — content is the typed `MarketingSiteContent` tree from `@annix/product-data/marketing` (lazily seeded from `defaultMarketingContent()`). The whole site is **authored and previewed inside the admin portal** (`/admin/portal/marketing` editor + `/preview` full tabbed render); the public launcher hub at `/` is deliberately untouched. Admin CRUD + image upload via `admin-marketing.controller.ts` (`AdminAuthGuard`); `GET /public/marketing/content` (cached 60s) is the published read endpoint for whenever a public render target is wired up. Public-facing rendering uses the shared view components in `annix-frontend/src/app/lib/marketing/components/views/`. **Reuse this draft/publish mechanism for any other site that needs edit-then-publish (e.g. the unbuilt AU Industries go-live, #313).** |
| Platform Company | `platform/company.service.ts` | Unified company entity with module subscriptions. Replaces `StockControlCompany` and `RubberCompany`. |
| Platform Contact | `platform/contact.service.ts` | Unified supplier/customer contacts. Replaces `StockControlSupplier` and `RubberCompany` (type=SUPPLIER/CUSTOMER). CRUD + search + fuzzy matching. |
| Platform Delivery Notes | `platform/delivery-note.service.ts` | Unified delivery note model with `source_module` discriminator. Supports GENERAL, COMPOUND, ROLL types. |
| Platform Invoices | `platform/invoice.service.ts` | Unified invoice model for both supplier and customer invoices. Supports SC clarification workflow and AR simple flow. |
| Platform Certificates | `platform/certificate.service.ts` | Unified certificate/CoC model. Categories: COA, COC, COMPOUNDER, CALENDARER, CALENDER_ROLL, CALIBRATION. |
| RFQ calculation service | `rfq/services/rfq-calculation.service.ts` | Weld, weight, and pricing calculations extracted from rfq.service.ts (ref #198). |
| Nix extraction profile registry | `nix/profiles/nix-extraction-profile-registry.service.ts` | Apps register their own document-extraction profile with a `profileKey` (e.g. `rfq-piping`, `asca-quote-documents`). Each handler implements `IExtractionProfileHandler` (`profileKey`, `label`, `sourceModule`, `postExtract`, optional role-aware `systemPrompt({ role, siblings })`) and registers itself via `OnModuleInit`. Uses the same self-registering pattern as `SageAdapterRegistry`. The Nix service routes `processDocument` through the registered handler — passing the document role and any sibling extractions in the same source tuple so the prompt can branch per-role and reference prior drawings when extracting specs. (ref #251, #253) |
| Nix source-document storage | `nix/nix.service.ts` (`persistToObjectStorage`, `extractionDocumentUrl`) | Every uploaded source PDF/Excel/Word is mirrored to S3 under `{StorageArea}/extractions/{extractionId}/{role}/{filename}` via `IStorageService.upload`. The S3 key + area + size + MIME live on `nix_extractions` (`storage_path`, `storage_area`, `storage_size_bytes`, `storage_mime_type`). `GET /nix/extraction/:id/document-url` returns a 10-minute presigned URL gated to owner / admin. Frontend hook: `useNixExtractionDocumentUrl`. Persistence is best-effort — failures are logged but do not block extraction since the temp file is the in-flight ground truth. (ref #253 task E) |
| Nix extraction sessions | `nix/services/nix-extraction-session.service.ts` (extends `BaseCrudService`) + `nix_extraction_sessions` entity | Groups multiple uploads (drawings + specs) into one quote-pack lifecycle: `draft → reviewing → promoted/archived`. The orchestrator pulls sibling extractions by `session_id` (preferred) or by `(source_module, source_id)` tuple (fallback) and passes them to `IExtractionProfileHandler.systemPrompt({ role, siblings })` so spec uploads get the prior drawings' items as Gemini context. Endpoints: `POST /nix/sessions`, `GET /nix/sessions/:id`, `POST /nix/sessions/:id/status`. Frontend hooks: `useNixExtractionSession`, `useCreateNixExtractionSession`, `useSetNixExtractionSessionStatus`. (ref #253 task B) |
| Annix Orbit sitemap-crawl job ingestion | `annix-orbit/services/crawl/sitemap-crawl-ingestion.service.ts` + `crawl/sitemap-crawl-profiles.ts` | ONE parameterised engine for ingesting jobs from open SA job boards (robots `Allow: /`, no bot wall) via their sitemaps. Add a board by registering a `SitemapCrawlProfile` (sitemap roots incl. index recursion, job-URL match, stable-id extraction, optional prompt hints) — never a new service. Boards with **no sitemap** set `discoveryUrls` (HTML listing/search pages); the engine scrapes anchor hrefs via `extractJobLinks()`, resolves them against `origin`, and keeps those matching `jobUrlPattern`. Engine handles UTF-16 sitemap decode, robots.txt compliance, polite crawl delay + per-run page cap, dedup pre-filter, Gemini (`AiChatService`) extraction → `IngestedJobResult` with `<h1>/<title>` fallback, and `ExtractionMetricService` timing (category `orbit-job-crawl`). Routed through `JobIngestionService.fetchJobsFromProvider` → `upsertJobs` so crawl jobs inherit dedup/geocode/embed/match/vet. Profiles: Executive Placements, Job Placements, JobMail (sitemap); CareerJunction (HTML listing-page discovery — no sitemap). (ref #305) |
| Rubber reference data API | `rubber-lining/rubber-reference-data.controller.ts` | Public reference data endpoints for rubber products, extracted from rubber-lining.controller.ts (ref #198). |
| Pipe/steel work data | `pipe-steel-work/pipe-steel-work-data.ts` | Static pipe/steel bracket and spacing data extracted from pipe-steel-work.service.ts (ref #198). |
| Bracket compatibility | `pipe-steel-work/bracket-compatibility.service.ts` | Bracket type validation and compatibility checks (ref #198). |
| Support spacing | `pipe-steel-work/support-spacing.service.ts` | Pipe support spacing calculations per standard (ref #198). |
| Platform base entities | `platform/entities/base-portal-profile.ts` | Extend this for any portal-profile-shaped entity (customer, supplier). |
| TanStack-compatible query helpers | `shared/validators/` | Shared NestJS validators (e.g. `rfq-compliance.validator.ts`). |
| Module licensing / feature gating | `licensing/` | Generic per-company tier + feature gating for ANY app. A module registers a `ModuleLicensingDefinition` (features, tiers, tier→feature map) with `FeatureRegistry`; gate endpoints with `@RequireFeature(moduleKey, featureKey)` + `FeatureLicenseGuard`; resolve access via `LicensingService` (`isFeatureEnabled`, `snapshot`, `setTier`, `setFeatureOverride`). Generalises the Stock-Management `sm_company_module_license` pattern onto the shared `module_license` table. Use instead of inventing a new per-app subscription/tier model. (ref #306) |

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

Existing shared components include: `DataTable`, `TableComponents`, `ConfirmModal`, `FormModal` (reusable form-based modal shell with portal, backdrop, header, scrollable body, and footer), `AdminActionModal` (approve/suspend/reject modal for admin entity actions), `ImportModal`, `MonthYearPicker`, `DateInput` (`components/ui/DateInput.tsx` — **the repo-wide standard for every date field**: a native date input with the browser calendar-picker icon + branded styling; value in/out is a `yyyy-MM-dd` string and unparseable input coerces to empty via `@/app/lib/datetime`. Use it instead of a bare `<input type="date">` or a free-text date box; migrate existing date inputs to it on touch), `FileDropzone`, `SurfaceAreaDisplay`, `WeldSummaryCard`, `CalloffInput`, `SageExportModal`, `PortalToolbar`, `PdfPreviewModal` (+ `usePdfPreview` hook — mandatory for all generated PDF documents), `BrandedErrorScreen` and `AppUpdateNotice` (mandatory for all `error.tsx` and `<ErrorBoundary>` fallbacks — friendly user-facing copy + support code, never raw `error.message` / `error.stack`; technical details gated behind `NODE_ENV !== "production"` only), `AmixLogo` (global Annix orbital-AN brand mark + wordmark), `AnnixSentinelLogo` (Annix Sentinel brand lockup — inline-SVG orbital monogram + ANNIX SENTINEL wordmark in Exo 2, `variant` light/dark/auto; brand artwork lives in `public/branding/annix-sentinel-*.svg`), `AppAdminHub` (`components/admin/AppAdminHub.tsx` — shared per-app admin landing hub: branded gradient header with the app's `logoIcon` via `useBranding(appKey)` + a responsive card grid; takes `{ appKey, title, subtitle, cards: AppHubCard[] }`. Used by the Annix Orbit, Insights, Annix Rep and Annix Sentinel admin hubs under `app/admin/portal/`. Build new per-app admin hubs on this — do not re-implement the header+grid), `LazyVisible` (`components/LazyVisible.tsx` — defers mounting heavy children until they scroll near the viewport via `IntersectionObserver`, reserving space with a `placeholderMinHeight` placeholder; once mounted it stays mounted, so focus/typing in editable forms is never interrupted. Use to keep long lists of heavy rows fast on first render — e.g. the RFQ item editor wraps each `ItemWrapper` in it. Props: `placeholderMinHeight` (default 400), `rootMargin` (default `"800px"`), `className`), `PhotoCapture` (`components/PhotoCapture.tsx` — phone-camera capture: live `getUserMedia` stream + `<input capture="environment">` fallback + client compression via `lib/image/photoCompression`; brand-aware accent (`--brand-navbar` CSS var, teal fallback). Props `onCapture(file, previewUrl?)`, `currentPhotoUrl?`, `enableCamera?`, `compressOnCapture?`. Used by Stock Control + Annix Orbit seeker credential photos; the old `stock-control/components/PhotoCapture.tsx` is now a re-export shim), `HelpHint` (`components/ui/HelpHint.tsx` — a small `?` affordance for inline contextual help: shows a wrapping popover on **hover and on click/tap** so it works on touch, closes on outside-click/Escape. Props `{ label, text }`. Use it next to any label/line that benefits from a plain-English explanation, e.g. the Annix Orbit tier-plan cards. Prefer this over the hover-only `components/Tooltip.tsx` when the copy is more than a few words or needs to work on mobile).

#### Extraction / long-operation progress popup (`components/ExtractionProgressModal*`)

**The ONE shared progress popup for every app.** Do NOT build a per-app progress modal — edit this one and all apps update automatically.

| Module | Export(s) | Use for |
|---|---|---|
| `components/ExtractionProgressModal.tsx` | `ExtractionProgressProvider` (wired once in `Providers.tsx`), `useExtractionProgress()` → `{ showExtraction, hideExtraction, updateExtraction }`, `withExtractionProgress(ctx, opts, fn)` helper, types `ExtractionBrand` / `ShowExtractionOptions` / `ExtractionBatchContext` | The provider + hook every app calls to drive the popup. Pass `{ brand, label, estimatedDurationMs, itemCount?, backgroundSafe?, batch?, brandingOverride? }`. |
| `components/ExtractionProgressModalView.tsx` | default `ExtractionProgressModalView` (lazy-loaded) | The single popup UI: branded navbar/bar/logo per `brand`, `Xs elapsed · ~Ys left`, **minimize button (`–`) → draggable corner pill (`▢` to restore)** — always available on every brand; `overran` subtext; optional batch bar. The `×` / "Close — keeps running" button is gated on `backgroundSafe: true` (opt-in per call-site — set it only when the work genuinely continues server-side after close). minimize/drag added 2026-06-06 (commit `42196bcc0`). |
| `lib/hooks/useAdaptiveExtractionProgress.tsx` | `useAdaptiveExtractionProgress()` → `{ runBulk(opts) }` | Per-item bulk orchestration: seeds the estimate from the learned rolling average (`metricsApi.extractionStats`) and recalibrates after each item. Use for any bulk extract/re-extract loop. |

#### Notifications & dialogs — toast vs popup (MANDATORY)

The shared building blocks for telling the user something. **Pick by importance, not by habit:**

| Need | Use | Import |
|---|---|---|
| Lightweight transient feedback — "Saved", "Copied", "Row removed" | `useToast().showToast(msg, type)` | `@/app/components/Toast` |
| **A result the user must actually see** — outcome summaries, counts/breakdowns ("12 added, 2 failed"), the result of an irreversible action, or any **error** | `useAlert().alert({ title, message, variant })` → acknowledge-only branded popup | `@/app/lib/hooks/useAlert` |
| Yes/no decision before acting | `useConfirm().confirm({ ... })` → `Promise<boolean>` | `@/app/lib/hooks/useConfirm` |

- `useAlert` (`lib/hooks/useAlert.tsx`) returns `{ alert, AlertDialog }` — `alert(opts)` returns `Promise<void>`, resolves on acknowledge. Render `{AlertDialog}` once near the page root. `variant`: `success | error | info | warning`. It wraps the shared `ConfirmModal` with `hideCancel` — one shared popup, edit `useAlert`/`ConfirmModal` once and every alert across all apps updates.
- `ConfirmModal` (`components/modals/ConfirmModal.tsx`) — branded, portal-to-body, `z-[9999]`, blurred backdrop, Escape-handled. Variants: `danger | warning | info | default | success | error`. **Do not write a parallel alert/confirm modal — extend this.**
- **The rule:** errors and structured/important outcomes are **popups** (`useAlert`), never transient toasts that can be missed; trivial confirmations stay toasts. (Codifies `feedback_branded_popups_for_outcomes`.)

#### Document upload + AI extraction (`components/uploads/`)

| Component | Use for |
|---|---|
| `DocumentDropzone` | Generic multi-file dropzone with size/duplicate-name/limit validation. Imports from `@/app/components/uploads`. **Use this for any drop-files UI** — RFQ wizard, ASCA quote, supplier CoC upload, etc. Pre-2026-05 this was named `RfqDocumentUpload` and lived under `components/rfq/uploads/`; renamed and moved as part of issue #251. |
| `DocumentBucket` | One labelled, tonal (blue/purple/indigo/teal) container around a `DocumentDropzone` with confirm/edit lifecycle, optional processing spinner, and a callback for the empty-confirm case. Use when you have a header + drop + confirm flow that should look consistent across apps. |
| `DocumentsForExtractionPanel` | Renders a stack of `DocumentBucket`s from a `buckets` config array. Use for the "drawings + specifications separately" pattern (or any N-bucket extraction flow). Each bucket = `{ id, title, subtitle, tone, documents, onAddDocument, onRemoveDocument, isConfirmed, onConfirm, onUnconfirm, ... }`. The panel itself owns no state — host app owns and passes per-bucket state. |

#### Branding — per-app + master inheritance (`app/lib/branding/`, backend `branding/`)

Single source of truth for every app's theme (colours, gradients, logos, watermark, loading animation, tagline, hero words, typography). **Never hardcode brand assets/colours** — resolve at runtime.

| Export | Use for |
|---|---|
| `useBranding(brandCode)` | Public resolved branding for an app shell (`@/app/lib/query/hooks`). Returns the **effective** branding after inheritance is applied server-side. |
| `resolveBrandAssetUrl(slot, branding, variant?)` / `brandingCssVars(branding)` / `brandHasAsset(slot, branding, variant?)` / `brandingFallback` | Resolve asset URLs + CSS vars. Each slot has a **light + dark** variant (`variant` defaults to `light`; dark falls back to light when unset). Slots: `logoIcon`, `logoLockup`, `wordmark`, `favicon`, `watermark`, `textCrop`, `subMark`, `flashLine`, `heroImage`. `brandingCssVars` also emits `--brand-navbar` (+ `-hover`/`-active`/`-50`/`-100`/`-200`/`-400` tints derived from the navbar colour via `color-mix`), `--brand-accent` (+ `-light`/`-dark`), `--brand-grad-from/-via/-to`, and `--brand-font-display/-headings/-body`. App surfaces consume these as `bg-[var(--brand-navbar,#fallback)]` etc. so the admin branding page drives every colour. |
| `googleFontsHref(branding)` / `BRAND_FONT_OPTIONS` | Build the Google Fonts stylesheet href for the brand's three font families; `BrandingProvider` loads it automatically. |
| `BrandingEditor` (`lib/branding/components/`) | The shared per-brand editor. Used by `app/admin/portal/branding/[brand]/page.tsx`. Renders per-field **Inherit ⟷ Override** toggles for non-master brands; the master brand (`annix-investments`) shows no toggles. |
| `MASTER_BRAND_CODE` (`annix-investments`), `INHERITABLE_SCALAR_FIELDS`, `BrandingAdminView` | Inheritance model. The master brand holds the umbrella Annix identity; per-app brands inherit any scalar field listed in their `inheritedFields` (now incl. `heroWords`, `fontDisplay`, `fontHeadings`, `fontBody`), and inherit an asset slot/variant whenever they have no own upload (falls back master → bundled default). |

**Brand Center** = `app/admin/portal/branding/page.tsx` (linked from Global Apps → Admin Tools): features the master brand + links to every app's editor.

**Resolution (server-side, in `AppBrandingService`):** `platform defaults → master (annix-investments) → per-app override`. A field overrides only when NOT in the brand's `inheritedFields`. Public + admin endpoints return the merged effective branding, so app shells need no inheritance logic. Mongo collection `app_branding`, keyed `_id = brandCode`.

#### RFQ 3D preview hooks (`components/rfq/previews/hooks/`)

Shared scene setup and camera state for all 6 Three.js/R3F 3D preview components (ref #197):

| Export | Use for |
|---|---|
| `SceneShell` | Standard Canvas children wrapper: ambient + key + fill + rim lights, environment, contact shadows, orbit controls. Replaces ~20 LOC of inline boilerplate per Canvas instance. |
| `CameraTracker` | Debounced camera position/target persistence via `useFrame`. Replaces ~120 LOC of inline CameraTracker per preview. |

#### RFQ 3D bend geometries (`components/rfq/3d/geometries/bend/`)

Geometry sub-components extracted from `CSGBend3DPreview` (ref #197 Phase B1):

| Component | Use for |
|---|---|
| `SimpleLine` | Tube-based line primitive used by all extracted geometries (re-exported as `Line`). |
| `BendDimensions` | T1 / T2 dimension lines + C/F leader + arc-degrees label. Renders for all non-sweep-tee, non-S-bend bends. |
| `DuckfootSteelwork` | Base plate, ribs, blue/yellow gussets, mm tick markers, weld lines. Renders outside the bend rotation group, only when `bendItemType === "DUCKFOOT_BEND"`. |
| `SBendGeometry` | Two 90° bends butt-welded with R/2R triangle dimension lines. Renders when `bendItemType === "S_BEND"`. |
| `SweepTeeGeometry` | **Currently orphaned** — extraction caused saddle-weld and dimension-line positioning issues; sweep tee geometry remains inline in `CSGBend3DPreview` until root cause is found. |

#### RFQ form shared types & utilities (`components/rfq/forms/shared.tsx`)

Canonical types and small render utilities consumed across BendForm, FittingForm, StraightPipeForm and the form `sections/*` widgets. Always import from here rather than re-declaring inline:

| Export | Use for |
|---|---|
| `SteelSpecItem` / `FlangeStandardItem` / `PressureClassItem` / `FlangeTypeItem` | Aliases over `MasterData[...][number]` — use as the typed-row across form components. |
| `ScheduleItem` | `{ id, scheduleDesignation, wallThicknessMm, scheduleNumber? }` — canonical row shape for schedule/wall-thickness selectors. Optional `scheduleNumber` covers both the BendForm (no number) and FittingForm/section (with number) variants. |
| `useGroupedSteelOptions` | Memoised grouped-options builder for steel spec selects. |
| `SurfaceAreaDisplay` / `WeldSummaryCard` | Render-leaf display widgets for fitting/bend forms. |

#### RFQ form hooks (`components/rfq/forms/hooks/`)

Shared hooks extracted from BendForm, FittingForm, and StraightPipeForm (ref #196):

| Hook | Use for |
|---|---|
| `usePressureClassSelector` | Pressure class resolution, validation, bar-rating extraction, margin calculation. Wraps `recommendedPressureClassId`, `availablePressureClasses`, `validatePressureClass`. |
| `useMaterialSelector` | Steel spec grouped options, effective spec resolution, from-global/override detection. Wraps `useGroupedSteelOptions`. |
| `useWeldCalculations` | Weld thickness resolution (fitting class → round to 1.5mm), flange weld volume, flange weight lookup. Wraps `roundToWeldIncrement`, `calculateFlangeWeldVolume`, `flangeWeightOr`. |
| `useFlangeResolution` | Flange standard/pressure class/type resolution with global spec fallback, recommended type code, override detection. Wraps `resolveFlangeConfig`, `recommendedFlangeTypeCode`. |
| `useEndConfigurationSelector` | Routes product type to correct END_OPTIONS constant, resolves weld/flange counts. |

#### RFQ form section components (`components/rfq/forms/sections/`)

| Component | Use for |
|---|---|
| `FlangeDropdownTriplet` | Flange standard + pressure class + flange type dropdown triplet with SABS/BS/generic rendering, override detection, pressure class validation. Replaces ~200 lines of inline JSX per form. |
| `PslCvnNaceSection` | API 5L PSL level dropdown, CVN test fields, traceability (heat/MTC/lot), NACE/sour service compliance with validation. Replaces ~280 lines per form. |
| `PressureClassField` | Standalone pressure class dropdown with SABS 1123/BS 4504/generic rendering, status badges, bar-rating matching. |
| `MaterialSpecificationSection` | Steel spec grouped select with from-global/override/unsuitable indicators. |
| `WeldSummarySection` | Weld count/length summary card with breakdown lines and volume info. |
| `EndConfigurationSelector` | End configuration dropdown with dynamic options per product type. |

Shared feedback capture support lives alongside the widget in `components/feedbackCapture.ts` and is responsible for lightweight client-side action, console-error, failed-network-call, and clicked-element capture that feeds the feedback reliability pipeline.

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
| Photo compression | `lib/image/photoCompression.ts` | `compressPhoto(file, options?)` (≤1MB / 1920px via `browser-image-compression`) + `fileToDataUrl(file)`. Used by the shared `PhotoCapture` component; Stock Control's `photoSync` re-exports these for its offline queue. |
| HTTP API client | `lib/api/` | All API calls. Per-subject methods live in `lib/api/<subject>-api/`. The `createApiClient` factory (auth-aware fetch wrapper) and `createEndpoint<TArgs, TResponse>(client, method, config)` factory (per-endpoint declaration with path builder, query, JSON or FormData body, response transform) live in `lib/api/createApiClient.ts`. New per-endpoint definitions should use `createEndpoint` rather than hand-rolled class methods. |
| Auth / token storage | `lib/auth/PortalTokenStore` | Shared across all portals — customer, supplier, stock-control, AU, CV. |
| SA validators | `lib/validators/` | ID numbers, VAT numbers, phone numbers, email, company registration numbers. |
| Config | `lib/config/rfq/` | RFQ config — **thin re-export shims over `@annix/product-data/pipe`**. Do not add new local data here. |
| RFQ item description | `lib/utils/rfq/itemDescriptionGenerator.ts` | Pure function `itemDescription(entry, globalSpecs, masterData)` that generates human-readable descriptions for all RFQ item types (pipe, bend, fitting, valve, instrument, pump, tank/chute, fastener). |
| RFQ item summary calcs | `lib/utils/rfq/itemSummaryCalculations.ts` | `weldThicknessForEntry(entry, globalSpecs, masterData)` and `perUnitSurfaceAreas(entry, globalSpecs, masterData, nbToOdMap)` for BOQ summary table. Uses shared `FITTING_CLASS_WALL_THICKNESS` from `@annix/product-data/pipe`. |
| Query hooks | `lib/query/hooks/<subject>/use<Subject>.ts` | ALL page-level data fetching must use these. Subjects: `admin`, `annix-rep`, `au-industries`, `au-rubber`, `boq`, `annix-sentinel`, `customer`, `annix-orbit`, `drawing`, `nix`, `rfq`, `supplier`, `reference`. Annix Orbit interview scheduling lives in `annix-orbit/useOrbitInterviewBooking.ts` (slot CRUD, send-invite mutation, seeker bookings/invites/calendar-advisory). AU Industries marketing site uses `au-industries/useAuIndustriesContent.ts` (home/nav/page queries, page-update mutation) and `au-industries/useAuIndustriesEnquiry.ts` (contact + quote form submission). |
| Query keys | `lib/query/keys/<subject>Keys.ts` | Query key factories with shape `{ all, list, detail }`. |
| corpId (static branding) | `lib/config/corpId.ts` | Colors, fonts, logos. **Never legal data** — use the company profile hook for that. |
| RFQ registration restrictions | `lib/utils/rfq/registrationRestrictions.ts` | Unregistered customer restriction checks and popup helpers. Extracted from SpecificationsStep (ref #198). |
| RFQ submission helpers | `components/rfq/utils/rfqSubmissionHelpers.ts` | RFQ submit/resubmit flow helpers extracted from StraightPipeRfqOrchestrator (ref #198). |
| Project details fallback data | `components/rfq/steps/projectDetailsFallbackData.ts` | Mine selection fallback data extracted from ProjectDetailsStep (ref #198). |
| Company profile hook | `lib/query/hooks/useAnnixCompanyProfile` | Annix legal/contact info. Never hardcode. |
| Feature flags | `lib/query/hooks/useFeatureFlags` | Feature flag queries. |
| Nix module barrel | `lib/nix/` (re-exported via `lib/nix/index.ts`) | All Nix-related frontend code. Includes `nixApi` client, all extraction types (`NixExtractedItem`, `NixSupplierBundle`, `NixDuplicateGroup`, `NixProcessResponse`), Nix UI components (`NixAiPopup`, `NixAssistant`, `NixChatPanel`, `NixClarificationPopup`, `NixProcessingPopup`, `NixFloatingAvatar`, `ParsedItemsConfirmation`), and the `.eml` parser (`parseEmail`, `isEmlFile`, `EmailMetadata`, `EmailAttachment`). Any frontend code that touches the Nix flow imports from `@/app/lib/nix`. |
| Annix Orbit seeker job card | `lib/annix-orbit/components/SeekerJobCard.tsx` | Card component for the seeker Browse Jobs feed. Renders title, company, location, source-attribution badge ("via Adzuna" / "via Jooble" / "via Remotive"), match-score bar with reasoning, matched/missing skills chips, dismiss + apply actions. Imported from the seeker `jobs/page.tsx` thin shell. (ref #268) |
| Annix Orbit seeker job filters | `lib/annix-orbit/components/SeekerJobFilters.tsx` | Province / city / category / source / min-salary filter row for the seeker Browse Jobs feed. Province → city dropdown is dependent (city options come from `lib/annix-orbit/sa-locations.SA_LOCATION_HIERARCHY`). Category and source dropdowns disable when the active match list yields fewer than 2 distinct values. (ref #268) |
| Annix Orbit SA location hierarchy (frontend) | `lib/annix-orbit/sa-locations.ts` | Thin re-export of `@annix/product-data/sa-market` for the existing frontend import path. Backend re-exports from the same package via `annix-backend/src/annix-orbit/config/sa-market.config.ts`. (ref #268, #279) |
| Annix Orbit job-board provider labels (frontend) | `lib/annix-orbit/provider-labels.ts` | Friendly display names for external job-board source keys (`adzuna` → "Adzuna", `executiveplacements` → "Executive Placements", etc.). `providerLabel(key)` returns the plain name (or the raw key as fallback); `providerBadgeLabel(key)` returns the "via X" attribution form. Used by `SeekerJobCard` (badge) and `SeekerJobFilters` (source dropdown) — do NOT redefine a local provider map in either. (ref #328) |
| Annix Orbit admin (education catalog + EE targets) | `lib/api/educationCatalogAdminApi.ts`, `lib/query/hooks/admin/useEducationCatalog.ts`, `lib/query/hooks/admin/useAdminOrbitEeTargets.ts` | **Orbit-admin-specific (NOT cross-app)** — in canonical `lib/api` + `hooks/admin` locations but scoped to the Orbit admin hub (`app/admin/portal/orbit/*`). `educationCatalogAdminApi` = institutions/faculties/programmes/scholarships CRUD against `/admin/annix-orbit/education`; `useEducationCatalog` wraps it; `useAdminOrbitEeTargets` wraps `/admin/annix-orbit/ee-sectoral-targets`. The Seekers browser uses `adminApiClient.orbitSeekers` + `useAdminOrbitSeekers` (in `useAdminOrbitJobMarket.ts`). Don't reuse cross-app — these are FuturePath/Orbit admin only. |
| Annix Orbit EE disclosure (shared) | `annix/orbit/config/ee-options.ts`, `annix/orbit/components/EeDisclosureFields.tsx` / `EeDisclosureManager.tsx` / `EeRegistrationStep.tsx` | Shared Employment Equity disclosure UI. `ee-options.ts` = the population/gender/disability/nationality option arrays + `EeDisclosureFormState` + `eeFormStateFromAttributes`/`eePurposesFromState` (single source — do NOT redefine the option arrays in pages or the public token form). `EeDisclosureFields` = controlled fieldset block (`value`/`onChange`). `EeDisclosureManager` = the full edit page (load/save/withdraw via `/me/ee-attributes`), mounted by the seeker + student `ee-attributes/page.tsx` thin shells (reached from the account-menu "EE disclosure" link, not a nav tab). `EeRegistrationStep` = the optional/skippable Step 2 of seeker + student registration; captured once and stored on `AnnixOrbitProfile.eeDisclosure` (backend embedded field, `consentSource=registration`), then auto-applied to each candidacy on sync so HR never re-emails a disclosed seeker. |
| Per-app access / plans admin | `lib/access/accessApps.ts` (`ACCESS_APPS` registry: moduleKey → name → subjectType), `components/access/PromoCodeManager.tsx`, `components/access/AppTierEditor.tsx`; pages `app/admin/portal/access/[app]/page.tsx` + `access/page.tsx`; backend `licensing/config/default-app-licensing.ts` + `default-app-licensing.registrar.ts` | Cross-app admin surface for per-app subscription tiers + promo codes. Each app's tiers come from its `ModuleLicensingDefinition` (au-rubber + annix-orbit have bespoke ones; stock-control/rfq-platform/annix-sentinel/annix-rep/insights get placeholder Free/Pro/Enterprise tiers from `DEFAULT_APP_LICENSING`, registered via one registrar in `LicensingModule`). `PromoCodeManager`/`AppTierEditor` are reusable, `moduleKey`-scoped, and reused by the promo-codes page. Orbit-seeker tiers (individual subject) link to the existing seeker-tiers page; seeker free-trial grants go through `POST /admin/annix-orbit/seekers/invite-trial` (`Candidate.trialTier`/`trialEndsAt`). Company-app trial invites use the shared `TierInvite` backend (`licensing/tier-invite.service.ts` + `tier-invite-admin.controller.ts`, `POST /admin/access/tier-invites` records + sends `EmailService.sendTierInviteEmail`; `grantForCompany` applies via `LicensingService.setTier`+`setValidity` — full grant-on-accept pending billing) with frontend `tierInviteAdminApi` / `useTierInvites` / `components/access/InviteToTierForm.tsx`. Reachable from the admin nav "Access & Plans". |
| Annix Pulse Voice Filter module | `lib/voice-agent/voiceAgentApi.ts`, `lib/query/hooks/annix-rep/useVoiceAgent.ts` + `useVoiceProfile.ts`, backend `annix-backend/src/annix-rep/voice-filter/` | **Pulse-specific (NOT cross-app)** — Voice Filter is a module of Annix Pulse. `voiceAgentApi` is the bridge client to the local desktop agent (`voice-filter/`), with a configurable base URL (`NEXT_PUBLIC_VOICE_AGENT_URL` → `localStorage.voiceAgentUrl` → `http://localhost:47823`) and the Pulse bearer forwarded as `Authorization`. `useVoiceAgent*` hooks cover agent health/devices/filter/enrollment/meeting; `useVoiceProfile` wraps the backend `annix-rep/voice-filter` slice (per-user enrollment status only — no AWS secrets). The desktop agent validates the Pulse bearer against `GET /annix-rep/auth/profile`. Pages live under `app/annix-rep/voice-filter/`. |
| SA market reference data | `packages/product-data/sa-market/index.ts` (`@annix/product-data/sa-market`) | Canonical home for SA province/city hierarchy (`SA_LOCATION_HIERARCHY`, `SA_PROVINCES`, `citiesForProvince()`), Adzuna category list (`SA_ADZUNA_CATEGORIES`), salary bands + cost-of-living (`SA_SALARY_RANGES`), B-BBEE level scale (`BEE_LEVELS`), SAQA / trade / professional / IT certification taxonomy (`SA_SKILLS_TAXONOMY`), official SA languages (`SA_CV_LANGUAGES`). Both backend (`annix-orbit/config/sa-market.config.ts`) and frontend (`lib/annix-orbit/sa-locations.ts`) re-export from here — do NOT add new copies. (ref #279) |
| SA trade-profile types | `packages/product-data/sa-market/trades.ts` (re-exported from `sa-market/index`) | Canonical home for the trade taxonomy: `TRADE_KEYS` / `TradeKey` (boilermaker, coded_welder, rubber_liner, pipe_fitter, diesel_mechanic, rigger, electrician), `COMMODITIES` / `Commodity` (gold, coal, platinum, iron_ore, manganese, chrome, copper, diamond, uranium, nickel), `AVAILABILITY_VALUES` / `Availability`, `ShutdownEntry`, `SharedTradeFields`, `TradeProfile`, plus per-trade profile shapes (`BoilermakerProfile`, `CodedWelderProfile`, `RubberLinerProfile`, `PipeFitterProfile`, `DieselMechanicProfile`, `RiggerProfile`, `ElectricianProfile`) and `emptyTradeProfile()` helper. Consumed by `Candidate.tradeProfile`, `TradeProfileService`, the matching engine, and the seeker `seeker/profile/trade` editor. (ref #281) |
| Job-category taxonomy + match tiers | `packages/product-data/sa-market/job-categories.ts` (re-exported from `sa-market/index`) | Canonical home for the Annix Orbit job-matching taxonomy: `JOB_CATEGORY_KEYS` / `JobCategoryKey` + `JOB_CATEGORIES` (key/label/keywords/providerAliases), `isJobCategoryKey()`, `jobCategoryLabel()`, the pure rule-based matchers `matchJobCategoryRuleBased()` (single, provider-tag + title) and `matchAllJobCategoriesRuleBased()` (multi, keyword-only for CV text), the match-tier scale `MATCH_TIERS` / `MatchTier` / `DEFAULT_MATCH_TIER` / `isMatchTier()`, and category clusters `JOB_CATEGORY_CLUSTERS` + `expandWithAdjacentCategories()`. Consumed by backend `JobCategorizationService` (rule + Gemini-fallback categorization of jobs/candidates) and `CandidateJobMatchingService` (tiered category narrowing). Do NOT add a parallel job-category list. |
| Email/attachment parser | `lib/nix/emlAttachmentExtractor.ts` (re-exported from `lib/nix`) | `parseEmail(file)` returns `{ metadata, attachments }` from a dropped `.eml`: `metadata` includes from/to/cc/bcc, signature emails + phones, subject, date, body; `attachments[]` is the full attachment list with each `kind = "boq" \| "tender" \| "image" \| "other"` decided by content-type and filename. App-agnostic — used today by RFQ's customer-create wizard, but Stock Control / AU Rubber / etc. should reuse for their own document-drop flows. |
| Nix architectural rule | — | **Anything app-agnostic that touches the Nix flow** (parsers, client, types, common UI) belongs in `lib/nix/`. **App-specific mappings** (RFQ's `BUNDLE_KEY_TO_PRODUCT`, `detectProjectTypeFromEmail`, `applyEmailMetadataToCustomerFields`, `LocationRequiredModal`; ASCA's quote-pack form auto-fill; etc.) stay in their app folder and import the agnostic pieces. Don't pre-extract orchestration hooks until a second consumer actually needs them. |

### Hooks and query keys in detail

Pages MUST import hooks from `@/app/lib/query/hooks` — never from individual hook files, never via direct `fetch` + `useState` + `useEffect`. The ESLint config enforces this via `no-restricted-imports` on `page.tsx` files.

When creating a new hook:
1. Add query key factory to `keys/<subject>Keys.ts`
2. Export from `keys/index.ts`
3. Create hook in `hooks/<subject>/use<Subject>.ts`
4. Export from `hooks/index.ts`
5. Update this registry if the subject is new

---

## Repo-level scripts (`scripts/`)

Cross-app build / quality / tooling scripts that run from the repo root, typically invoked by git hooks or `pnpm` aliases. Not application code; do not import from these in `annix-backend` / `annix-frontend`.

| Script | Purpose | Invoked by |
|---|---|---|
| `scripts/check-legal-risks.sh` | Pre-push gate against committing real `.co.za` / `.com` emails, reserved standards-body data, etc. (#149) | `.githooks/pre-push` |
| `scripts/check-inter-app-duplication.sh` | Pre-push gate against duplicated app constants. Enforces the discovery-first protocol. | `.githooks/pre-push` |
| `scripts/howto-pre-commit-prompt.ts` | **Blocking** pre-commit prompt when staged files match any guide's `relatedPaths`. Offers `edit` / `bump` / `skip` / `draft`. `skip` requires a one-line reason recorded in `.git/HOWTO_SKIP_REASONS`, which `commit-msg` appends as a `Howto-Skip:` trailer. Auto-discovers guides under `annix-frontend/src/app/*/how-to/guides/*.md`. Reads `/dev/tty` (blocks on no-TTY); honours `HOWTO_HOOK=skip` and `--no-verify` (#250). | `.githooks/pre-commit` |
| `scripts/draft-howto-update.ts` | One-shot Gemini / Claude API call that drafts a minimal-edit patch to a guide given the staged diff(s). 30s `AbortController` timeout. Skips silently if neither `GEMINI_API_KEY` nor `ANTHROPIC_API_KEY` is set (#250). | `howto-pre-commit-prompt.ts` |

**When to add a new script here:** a quality gate, validator, or tooling script that runs across the whole repo (not bound to a single app). For app-specific scripts, prefer the app's own `scripts/` directory.

---

## Repo-level dev tooling (`tools/`)

Developer-machine tooling that ships outside the deployed apps — e.g. editor extensions, local utilities, CLI helpers.

| Tool | Purpose |
|---|---|
| `tools/vscode-howto-watcher/` | VS Code extension. Status-bar item appears when the active editor path matches any how-to guide's `relatedPaths`; click opens the guide(s) (#250). Self-contained — own `package.json` + `tsconfig.json`. Not auto-installed; engineers `pnpm build` then `Developer: Install Extension from Location`. |

**When to add a new tool here:** local-only dev ergonomics that don't fit `scripts/` (more than a single file, has its own build step, or wraps a third-party tooling surface like a VS Code extension).

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
