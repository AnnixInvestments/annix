# Stock Management Module

A standalone, host-app-agnostic stock management module that consolidates issuance, returns, stock take, FIFO valuation, rubber roll tracking, paint catalogue, datasheets, and category administration into a single sellable feature set.

## Goals

- **Host-app agnostic**: this module is consumed by Stock Control today and AU Rubber tomorrow. No host-app-specific code lives inside the module — host apps mount module pages via the frontend `StockManagementProvider` and the backend `StockManagementModule`.
- **Feature gating**: every module feature is controlled at runtime by a combination of:
  1. **Global feature flags** in the existing `feature-flags` module (one toggle per feature key, e.g. `STOCK_MGMT_FIFO_BATCHES`).
  2. **Per-company tier** stored on `sm_company_module_license`, which assigns each company a tier (`basic` / `standard` / `premium` / `enterprise`) and an optional override flag map.
- **Polymorphic Shape 3 schema**: products and issuance rows both use class-table inheritance — a base table plus child tables per row type. New row types are added via a new child table + discriminator value, no changes to consumers.
- **Table prefix `sm_`**: every table owned by this module begins with `sm_` so that ownership is obvious at the SQL level.

## Tier feature matrix

| Tier | Includes |
|------|----------|
| `basic` | Single-JC issuing, basic stock movements, recent issuances |
| `standard` | Basic + product categories + photo identification + CPO batch issuing |
| `premium` | Standard + rubber rolls + offcuts + wastage bins + paint catalogue + product datasheets + FIFO batch tracking |
| `enterprise` | Premium + stock take feature + stock hold queue + variance reporting + valuation exports |

The tier matrix is enforced by `StockManagementFeatureGuard` on every controller method. Frontend feature toggles come from the same source via `useStockManagementConfig`.

## Module surface

### Entities (30)

Every entity owned by the module lives under `entities/`. The base classes are `IssuableProduct` (Phase 1) and `IssuanceRow` (Phase 4). Child entity classes follow Shape 3 polymorphic CTI.

| Category | Entities |
|----------|----------|
| Products | `IssuableProduct` (base), `ConsumableProduct`, `PaintProduct`, `RubberRoll`, `RubberOffcutStock`, `SolutionProduct` |
| Issuance | `IssuanceSession`, `IssuanceRow` (base), `ConsumableIssuanceRow`, `PaintIssuanceRow`, `RubberRollIssuanceRow`, `SolutionIssuanceRow`, `IssuanceItemCoatTracking` |
| Returns | `ReturnSession`, `RubberOffcutReturn`, `PaintReturn`, `ConsumableReturn`, `RubberWastageBin`, `RubberWastageEntry` |
| FIFO | `StockPurchaseBatch`, `StockMovementBatchConsumption` |
| Stock take | `StockTake`, `StockTakeLine`, `StockTakeAdjustment`, `StockTakeVarianceCategory` |
| Stock hold | `StockHoldItem` |
| Reference | `ProductCategory`, `RubberCompound`, `ProductDatasheet`, `CompanyModuleLicense` |

### Services (20)

Stateless services under `services/`, exposed via DI. No service touches a host-app entity directly — anything cross-module goes through a `PlatformBridge` interface.

| Service | Responsibility |
|---------|---------------|
| `StockManagementLicenseService` | Per-company tier + feature flag resolution |
| `IssuanceService` | Create/undo/approve sessions, mixed-type item handling |
| `ReturnsService` | Rubber offcut, paint, and consumable return workflows |
| `StockTakeService` | Snapshot creation, counting, variance analysis, approval, posting |
| `StockTakeCronService` | Monthly snapshot cron (`0 0 1 * *`) |
| `StockTakeExportService` | PDF + CSV exports of stock take data |
| `FifoBatchService` | FIFO batch consumption tracking |
| `FifoBatchBootstrapService` | Legacy-to-FIFO bootstrap migration |
| `FifoValuationService` | Weighted-average and FIFO cost queries |
| `RubberCompoundService` | Compound catalog CRUD + default seeding |
| `ProductCategoryService` | Admin-managed product categories |
| `ProductDatasheetService` | S3 upload + AI extraction of datasheet fields |
| `DatasheetExtractionService` | Gemini PDF vision extraction pipeline |
| `StockHoldService` | Damaged/expired item flagging + disposition |
| `VarianceCategoryService` | Admin-managed variance categories + defaults |
| `StockManagementNotificationsService` | Missing-datasheet, hold, and variance notifications |
| `PhotoIdentificationService` | Gemini vision product identification from photos |
| `PaintClassificationService` | AI-assisted paint vs consumable classification |
| `LocationClassificationService` | AI-assisted product-to-location assignment |
| `SupplierInvoiceFifoBridgeService` | Supplier invoice line → FIFO batch creation |

### Controllers (14)

REST endpoints under `/api/stock-management/...`. Every endpoint is gated by `StockManagementAuthGuard` (delegates to host) plus `StockManagementFeatureGuard` (feature flag + license tier check).

| Controller | Base path | Key endpoints |
|------------|-----------|---------------|
| `IssuanceController` | `/issuance` | `POST /sessions`, `POST /sessions/:id/undo`, `GET /sessions/cpo-coat-status/:cpoId` |
| `ReturnsController` | `/returns` | `POST /rubber-offcut`, `POST /paint`, `POST /consumable` |
| `StockTakeController` | `/stock-takes` | `POST /`, `POST /:id/snapshot`, `POST /:id/approve`, `GET /variance-archive` |
| `IssuableProductController` | `/products` | `GET /`, `GET /:id`, `GET /:id/linked-parts` |
| `FifoBatchController` | `/fifo` | `GET /valuation/company`, `GET /batches/:productId` |
| `StockHoldController` | `/stock-hold` | `POST /flag`, `POST /:id/resolve` |
| `ProductCategoryController` | `/categories` | CRUD |
| `RubberCompoundController` | `/rubber-compounds` | CRUD + seed defaults |
| `ProductDatasheetController` | `/datasheets` | Upload + extraction status |
| `VarianceCategoryController` | `/variance-categories` | CRUD + seed defaults |
| `LocationMigrationController` | `/location-migration` | Classification + assignment |
| `PhotoIdentificationController` | `/issuance/identify-photo` | `POST` (multipart image) |
| `StockManagementLicenseController` | `/license` | `GET /self`, `PATCH /:companyId` |
| `DemoSeedController` | `/demo` | `POST /seed` (dev-only) |

### Migrations

Live in the central `annix-backend/src/migrations/` folder (per project convention) with timestamps `1818000000000` and onwards. File names start with `CreateStockManagement…` so they are recognisable as belonging to this module. All DDL is idempotent (`IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN duplicate_object ...`).

### Permissions (16)

Declared in `permissions/stock-management-permissions.ts`. Host apps wire these into their RBAC system.

| Key | Permission string |
|-----|-------------------|
| `ISSUANCE_CREATE` | `stockManagement.issuance.create` |
| `ISSUANCE_UNDO` | `stockManagement.issuance.undo` |
| `ISSUANCE_APPROVE` | `stockManagement.issuance.approve` |
| `RETURN_CREATE` | `stockManagement.return.create` |
| `RETURN_APPROVE` | `stockManagement.return.approve` |
| `STOCK_TAKE_COUNT` | `stockManagement.stockTake.count` |
| `STOCK_TAKE_APPROVE` | `stockManagement.stockTake.approve` |
| `STOCK_TAKE_APPROVE_HIGH_VALUE` | `stockManagement.stockTake.approve.highValue` |
| `STOCK_HOLD_FLAG` | `stockManagement.stockHold.flag` |
| `STOCK_HOLD_RESOLVE` | `stockManagement.stockHold.resolve` |
| `PRODUCT_CATEGORY_MANAGE` | `stockManagement.productCategory.manage` |
| `RUBBER_COMPOUND_MANAGE` | `stockManagement.rubberCompound.manage` |
| `PRODUCT_DATASHEET_UPLOAD` | `stockManagement.productDatasheet.upload` |
| `PRODUCT_DATASHEET_VERIFY` | `stockManagement.productDatasheet.verify` |
| `VARIANCE_CATEGORY_MANAGE` | `stockManagement.varianceCategory.manage` |
| `MODULE_LICENSE_MANAGE` | `stockManagement.moduleLicense.manage` |

Host apps register these permissions in their RBAC seed data and assign them to roles as needed (e.g. `storeman` gets `ISSUANCE_CREATE`, `admin` gets everything).

## Host-app integration (backend)

Add `StockManagementModule` to the host app's NestJS module imports. The module is currently registered via `HeavyFeaturesModule` for the Stock Control app:

```typescript
import { StockManagementModule } from "../stock-management/stock-management.module";

@Module({
  imports: [
    StockManagementModule,
    // ...
  ],
})
export class HeavyFeaturesModule {}
```

The module registers its own controllers, services, and entities with TypeORM automatically.

### Authentication

The module uses `StockManagementAuthGuard` which delegates to the host app's auth guard. Currently this is `StockControlAuthGuard` (JWT-based, expects `companyId` and `userId` on `request.user`). When adding a new host app:

1. Ensure the host's auth guard populates `request.user` with at least `{ companyId: number, userId: number }`
2. The `StockManagementFeatureGuard` reads `request.user.companyId` to look up the company's license tier

### Feature guard decorator

Every controller method that requires a specific feature must be decorated:

```typescript
@StockManagementFeature("STOCK_TAKE")
@Post("snapshot")
async createSnapshot(@Req() req: any) { ... }
```

The guard performs a two-stage check:
1. **Global flag check** — looks up `STOCK_MGMT_<FEATURE>` in the feature-flags table; rejects if disabled globally
2. **Per-company license check** — calls `licenseService.isFeatureEnabled(companyId, feature)`; rejects if not in company's tier

Routes without the `@StockManagementFeature` decorator skip the feature check (guard returns `true`).

## Database schema

### Table hierarchy

```
sm_company_module_license       -- per-company tier + feature overrides
sm_product_category             -- admin-managed categories (paint, rubber, consumable, etc.)
sm_issuable_product             -- base product table (CTI discriminator: product_type)
  sm_consumable_product         -- child: tools, tape, PPE, etc.
  sm_paint_product              -- child: paint-specific fields (pack size, component group)
  sm_rubber_roll                -- child: rubber roll fields (compound, dimensions, Shore)
  sm_rubber_offcut_stock        -- child: returned offcuts (parent roll ref, dimensions)
  sm_solution_product           -- child: solutions (density, concentration)
sm_rubber_compound              -- compound catalog (SBR, NR, NBR, EPDM, etc.)
sm_product_datasheet            -- polymorphic datasheets (S3 path + extracted fields)
sm_stock_purchase_batch         -- FIFO batch tracking (receivedAt, unitCost, remaining)
sm_issuance_session             -- session envelope (issuer, recipient, target, status)
sm_issuance_row                 -- base issuance row (CTI discriminator: row_type)
  sm_consumable_issuance_row    -- child
  sm_paint_issuance_row         -- child (pro-rata split, coat tracking)
  sm_rubber_roll_issuance_row   -- child (weight, dimensions)
  sm_solution_issuance_row      -- child (volume)
sm_issuance_item_coat_tracking  -- per-line-item per-coat qty tracking
sm_stock_movement_batch_consumption -- FIFO consumption join table
sm_return_session               -- return envelope (return_kind discriminator)
  sm_rubber_offcut_return       -- child: offcut return details
  sm_paint_return               -- child: paint return (litres, condition)
  sm_consumable_return          -- child: consumable return (qty, condition)
sm_rubber_wastage_bin           -- bins by colour for waste rubber
sm_rubber_wastage_entry         -- wastage log entries
sm_stock_take                   -- stock take header (period, status, snapshot date)
sm_stock_take_line              -- per-product count line (expected vs counted)
sm_stock_take_adjustment        -- posted adjustments after approval
sm_stock_take_variance_category -- admin-managed variance reasons
sm_stock_hold_item              -- flagged damaged/expired items + disposition
```

### Migration conventions

- All migrations use timestamps starting at `1818000000000`
- File names prefixed with `CreateStockManagement` or `AddStockManagement`
- All DDL is idempotent — safe to re-run
- Migrations depend only on tables within the `sm_` namespace (no cross-module FK constraints)

## Adding a new feature

1. Decide which tier the feature belongs to (`basic` / `standard` / `premium` / `enterprise`).
2. Add a feature key to `config/stock-management-features.constants.ts` and assign it to the appropriate tier.
3. Add the corresponding global feature flag entry in `annix-backend/src/feature-flags/feature-flags.constants.ts` with prefix `STOCK_MGMT_`.
4. Decorate any new controller methods with `@StockManagementFeature("FEATURE_KEY")`.
5. The frontend reads the feature via `useStockManagementConfig().features.FEATURE_KEY`.

No code change is needed in any host app to enable a new feature — the host just gets it for free once it's in the module.

## Testing

Every service has a companion `.spec.ts` file. Specs follow this pattern:

```typescript
const module = await Test.createTestingModule({
  providers: [
    ServiceUnderTest,
    { provide: getRepositoryToken(Entity), useValue: mockRepo },
    // ... other mock providers
  ],
}).compile();
```

All 16 service specs (74 test cases) pass. Run them with:

```bash
npx jest --testPathPattern="stock-management/services" --passWithNoTests
```

### Mock conventions

- Repository mocks use `{ find: jest.fn(), findOne: jest.fn(), save: jest.fn(), ... }`
- Cross-module services (e.g. `NotificationDispatcherService`, `AiChatService`) are mocked at the provider level
- The `StockControlAuthGuard` is mocked as a pass-through in all controller specs

## Issuance workflow

The Issue Stock page enforces a structured issuance process for CPO-linked sessions:

- **Product spec selector**: after choosing a CPO, the issuer must select one specific product (primer, final, intermediate, or rubber spec) before proceeding. Only one product can be issued per session to prevent issuing multiple coats simultaneously (each coat needs drying time).
- **Coat-level tracking**: per-line-item per-coat-type issued quantities are tracked in `sm_issuance_item_coat_tracking`. Coat rows display colour-coded status — green (not issued), amber (partially issued), red (fully issued). DFT specs (min/max microns) and generic type from the coating analysis are surfaced inline.
- **Remaining quantity awareness**: editable quantity inputs default to remaining units for the selected coat type. Fully issued items and JCs are automatically disabled.
- **Dynamic allocation summary**: the Selection Summary shows paint product, coat role, generic type, DFT range, and remaining litres — reflecting only selected line items, not full totals.
- **Batch auto-fill**: multi-part paint tins support a "Same batch for all" checkbox for quick batch number entry.
- **Kit-based paint issuing**: multi-part paints (Part A + Part B) enforce full kit quantities with a stepper UI. Single-pack paints retain free-form quantity entry.

## Performance considerations

- FIFO valuation is computed at query time, not cached. For companies with very large product catalogues (>5,000 items), a materialized view may be needed in future.
- Stock take snapshots run via a monthly cron job (`0 0 1 * *`), well within the Neon compute budget.
- Photo identification calls Gemini vision per request — expect ~2-3s latency per photo.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| TypeORM | Entity management + migrations |
| NestJS core | Module, DI, guards, interceptors |
| `StorageModule` | S3 file upload for datasheets |
| `NotificationsModule` | Dispatching email/push notifications |
| `FeatureFlagsModule` | Global feature flag lookups |
| `NixModule` | AI chat via `AiChatService` (Gemini) |
| `AuthModule` | `StockControlAuthGuard` (host-specific) |

## Host apps

| App | Status | Theme | Tier |
|-----|--------|-------|------|
| Stock Control | Active | Teal primary | Company-specific |
| AU Rubber | Wired (Phase 13) | Yellow primary `#ca8a04` | Pending company setup |
