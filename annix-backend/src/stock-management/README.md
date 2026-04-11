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

### Backend

- **Entities**: every entity owned by the module lives under `entities/`. The base classes are `IssuableProduct` (Phase 1) and `IssuanceRow` (Phase 4). Child entity classes follow Shape 3 polymorphic CTI.
- **Services**: stateless services under `services/`, exposed via DI. No service touches a host-app entity directly — anything cross-module goes through a `PlatformBridge` interface.
- **Controllers**: REST endpoints under `/api/stock-management/...`. Every endpoint is gated by `StockManagementAuthGuard` (delegates to host) plus `StockManagementFeatureGuard` (feature flag + license tier check).
- **Migrations**: live in the central `annix-backend/src/migrations/` folder (per project convention) with timestamps `1818000000000` and onwards. File names start with `CreateStockManagement…` so they are recognisable as belonging to this module.
- **Permissions**: declared in `permissions/stock-management-permissions.ts`. Host apps wire these into their RBAC system.

### Frontend

The frontend half of the module lives at `annix-frontend/src/app/modules/stock-management/`. See the README there for details. Pages exported from `pages/*` can be mounted under any host-app route — Stock Control becomes a thin wrapper that re-exports the module pages.

## Host-app integration (backend)

Add `StockManagementModule` to the host app's NestJS module imports. The module is currently registered via `HeavyFeaturesModule` for the Stock Control app — add it next to `StockControlModule` there:

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

## Adding a new feature

1. Decide which tier the feature belongs to (`basic` / `standard` / `premium` / `enterprise`).
2. Add a feature key to `config/stock-management-features.constants.ts` and assign it to the appropriate tier.
3. Add the corresponding global feature flag entry in `annix-backend/src/feature-flags/feature-flags.constants.ts` with prefix `STOCK_MGMT_`.
4. Decorate any new controller methods with `@StockManagementFeature("FEATURE_KEY")`.
5. The frontend reads the feature via `useStockManagementConfig().features.FEATURE_KEY`.

No code change is needed in any host app to enable a new feature — the host just gets it for free once it's in the module.

## Future host apps

Today: Stock Control consumes this module.

Coming next (Phase 13): AU Rubber consumes this module as a second host POC, with its own theme tokens and a `premium` tier that excludes paint-specific features. This proves the module is genuinely portable.
