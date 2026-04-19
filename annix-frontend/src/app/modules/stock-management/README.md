# Stock Management Module — Frontend

The frontend half of the standalone Stock Management module. Pages exported from `pages/*` are designed to be mounted by any host Annix app via a thin route wrapper.

## Architecture

```
modules/stock-management/
  README.md
  index.ts                    -- public exports (pages, hooks, types)
  manifest.ts                 -- nav entries + route registration helpers
  api/
    stockManagementApi.ts     -- API client for /api/stock-management/*
  hooks/                      -- query hooks (TanStack Query)
  pages/                      -- full pages a host app mounts
  components/                 -- shared components used by pages
  provider/
    StockManagementProvider.tsx -- context provider, host apps wrap their layout
    useStockManagementConfig.ts -- read-only hook for module config
  theme/
    theme-types.ts            -- typed theme tokens
    default-theme.ts          -- default theme; host apps may override
  i18n/
    default-labels.ts         -- default English labels; host apps may override
  types/                      -- shared types (config, license, products, sessions)
```

## Host-app integration

A host app wraps its layout in `<StockManagementProvider>` once, then mounts module pages directly.

### Step 1: Provider in the layout

```tsx
// annix-frontend/src/app/stock-control/portal/preview/stock-management/layout.tsx
import { StockManagementProvider } from "@/app/modules/stock-management";

export default function StockManagementLayout({ children }) {
  return (
    <StockManagementProvider
      config={{
        hostAppKey: "stock-control",
        apiBaseUrl: "/api/stock-management",
        authHeaders: () => getAuthHeaders(),
        currentUser: { staffId: 42, roles: ["storeman"], permissions: [...] },
        theme: { primaryColor: "#0d9488", primaryHoverColor: "#0f766e" },
        labels: {},
      }}
    >
      {children}
    </StockManagementProvider>
  );
}
```

### Step 2: Mount pages as thin wrappers

```tsx
// annix-frontend/src/app/stock-control/portal/preview/stock-management/issue-stock/page.tsx
"use client";
import { IssueStockPage } from "@/app/modules/stock-management";
export default IssueStockPage;
```

That single re-export is the entire integration for one page. AU Rubber, FieldFlow, or any future host app can mount the same page under their own URL with their own theme.

## StockManagementHostConfig

The config object passed to `StockManagementProvider`:

```typescript
interface StockManagementHostConfig {
  hostAppKey: StockManagementHostAppKey;  // "stock-control" | "au-rubber" | "fieldflow" | "annix-rep"
  apiBaseUrl: string;                      // e.g. "/api/stock-management"
  authHeaders?: () => Record<string, string>;  // Authorization headers for API calls
  currentUser?: StockManagementCurrentUser;    // { staffId, roles, permissions }
  theme?: StockManagementThemeOverrides;       // partial theme token overrides
  labels?: Partial<StockManagementLabels>;     // i18n label overrides
}
```

### StockManagementCurrentUser

```typescript
interface StockManagementCurrentUser {
  staffId: number | null;     // linked staff member ID (null for apps without staff concept)
  roles: string[];            // host-app roles (e.g. ["storeman", "manager"])
  permissions: string[];      // stock-management permission strings
}
```

### Resolved config

The provider resolves `StockManagementHostConfig` into `StockManagementResolvedConfig` by:

1. Fetching the company's `CompanyModuleLicense` from the API
2. Deriving `features: Record<string, boolean>` from the license tier + overrides
3. Merging `theme` over `DEFAULT_STOCK_MANAGEMENT_THEME`
4. Merging `labels` over `DEFAULT_STOCK_MANAGEMENT_LABELS`
5. Pre-fetching picker data (staff, job cards, CPOs) for the host app

Access the resolved config via `useStockManagementConfig()`.

## Feature gating

Every page checks the runtime feature map provided by `StockManagementProvider`. If a host app's company is on a tier that excludes a feature (e.g. `STOCK_TAKE` is enterprise-only and the host has `premium`), the page renders an upgrade prompt instead of the feature.

```tsx
import { useStockManagementFeature } from "@/app/modules/stock-management";

function MyPage() {
  const hasStockTake = useStockManagementFeature("STOCK_TAKE");
  if (!hasStockTake) {
    return <UpgradePrompt feature="Stock Take" requiredTier="enterprise" />;
  }
  return <ActualContent />;
}
```

### Permission checks

```tsx
import { useStockManagementHasPermission } from "@/app/modules/stock-management";

function ApproveButton() {
  const canApprove = useStockManagementHasPermission("stockManagement.issuance.approve");
  if (!canApprove) return null;
  return <button>Approve</button>;
}
```

## Theme tokens

The module ships with a neutral default theme. Host apps override individual tokens via the provider:

```tsx
<StockManagementProvider
  config={{
    theme: {
      primaryColor: "#7c2d12",   // Stock Control's brown
      accentColor: "#fbbf24",    // gold
      // ... rest fall through to default-theme.ts
    },
  }}
>
```

### Available tokens (20)

| Token | Type | Default |
|-------|------|---------|
| `primaryColor` | CSS colour | `#0d9488` (teal) |
| `primaryHoverColor` | CSS colour | `#0f766e` |
| `primaryTextColor` | CSS colour | `#ffffff` |
| `accentColor` | CSS colour | `#fbbf24` |
| `surfaceColor` | CSS colour | `#ffffff` |
| `surfaceMutedColor` | CSS colour | `#f9fafb` |
| `borderColor` | CSS colour | `#e5e7eb` |
| `textColor` | CSS colour | `#111827` |
| `textMutedColor` | CSS colour | `#6b7280` |
| `successColor` | CSS colour | `#10b981` |
| `warningColor` | CSS colour | `#f59e0b` |
| `errorColor` | CSS colour | `#ef4444` |
| `infoColor` | CSS colour | `#3b82f6` |
| `fontFamily` | CSS font-family | `inherit` |
| `borderRadius` | CSS border-radius | `0.375rem` |
| `shadowSm` | CSS box-shadow | `0 1px 2px ...` |
| `shadowMd` | CSS box-shadow | `0 4px 6px ...` |
| `shadowLg` | CSS box-shadow | `0 10px 15px ...` |

Host apps pass partial overrides; the provider deep-merges them over the defaults to produce a `Required<StockManagementThemeTokens>` — consumers never need null-checks on tokens.

## Labels (i18n)

Default labels live in `i18n/default-labels.ts`. Host apps can override individual strings if their domain uses different terminology — e.g. AU Rubber might prefer "Roll Issue" over "Issue Stock".

Access labels via `config.label("issueStockTitle", "Issue Stock")`.

## Pages

| Page | Path suffix | Tier | Description |
|------|-------------|------|-------------|
| `IssueStockPage` | `/issue-stock` | basic+ | Stepper-based issuance with CPO/JC targeting, coat tracking, kit-based paint issuing |
| `ReturnsPage` | `/returns` | premium+ | Outstanding returns dashboard, new return modals (rubber offcut, paint, consumable) |
| `StockTakePage` | `/stock-take` | enterprise | Full lifecycle: draft → snapshot → counting → submit → approve → post |
| `VarianceArchivePage` | `/variance-archive` | enterprise | Historical variance trends with configurable lookback |

## Components

| Component | Purpose |
|-----------|---------|
| `StaffPicker` | Searchable dropdown with photo thumbnails, QR badge scan |
| `JobCardOrCpoPicker` | Tabbed picker for job cards and CPOs with search + QR scan |
| `PaintProRataSplitEditor` | m²-based pro-rata split across JCs for CPO paint issuance |
| `RubberRollSubEditor` | Weight + dimensions editor for rubber roll issuance |
| `ComboBox` | Typeable + dropdown filter picker (generic) |
| `PhotoExtractButton` | AI photo identification with auto-fill callback |
| `FifoValuationCard` | Drop-in dashboard widget showing company-level FIFO valuation |

## Hooks

| Hook | Source | Purpose |
|------|--------|---------|
| `useIssuableProducts` | `hooks/useIssuanceQueries.ts` | Search products by name/SKU |
| `useCreateIssuanceSession` | `hooks/useIssuanceQueries.ts` | Mutation: create issuance session |
| `useFifoCompanyValuation` | `hooks/useFifoQueries.ts` | Company-level FIFO valuation query |
| `useCompanyLicense` | `hooks/useLicenseQueries.ts` | Current company's license + refetch |

## API client

The module exports a single `StockManagementApiClient` class that all hooks use. The base URL comes from `StockManagementProvider.config.apiBaseUrl` so the same module can be wired against staging, production, or a local backend without code changes.

The client is instantiated once per provider mount (stored in a ref to avoid re-render loops) and keyed on `[config.apiBaseUrl, config.authHeaders]`.

## SWC safety

All member accesses and bracket accesses in JSX are hoisted to local `const` variables before use, per the project's SWC-safe patterns. This is enforced by the pre-commit hook. New code in this module must follow the same pattern — see CLAUDE.md for details.

## Testing

Frontend components and hooks can be tested with React Testing Library. The `StockManagementProvider` must be wrapped around any component under test with a mock config:

```tsx
const mockConfig: StockManagementHostConfig = {
  hostAppKey: "stock-control",
  apiBaseUrl: "/api/stock-management",
  authHeaders: () => ({ Authorization: "Bearer test" }),
  currentUser: { staffId: 1, roles: ["admin"], permissions: [] },
};

render(
  <StockManagementProvider config={mockConfig}>
    <ComponentUnderTest />
  </StockManagementProvider>
);
```
