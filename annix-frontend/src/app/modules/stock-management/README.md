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

A host app wraps its layout in `<StockManagementProvider>` once, then mounts module pages directly:

```tsx
// annix-frontend/src/app/stock-control/layout.tsx
import { StockManagementProvider } from "@/app/modules/stock-management";
import { stockControlTheme } from "./theme";

export default function StockControlLayout({ children }) {
  return (
    <StockManagementProvider
      config={{
        hostAppKey: "stock-control",
        apiBaseUrl: "/api/stock-management",
        theme: stockControlTheme,
        labels: {},
      }}
    >
      {children}
    </StockManagementProvider>
  );
}
```

```tsx
// annix-frontend/src/app/stock-control/portal/issue-stock/page.tsx
"use client";
import { IssueStockPage } from "@/app/modules/stock-management";
export default IssueStockPage;
```

That single re-export is the entire integration for one page. AU Rubber, FieldFlow, or any future host app can mount the same page under their own URL with their own theme.

## Feature gating

Every page checks the runtime feature map provided by `StockManagementProvider`. If a host app's company is on a tier that excludes a feature (e.g. `STOCK_TAKE` is enterprise-only and the host has `premium`), the page renders an upgrade prompt instead of the feature.

```tsx
import { useStockManagementConfig } from "@/app/modules/stock-management";

function MyPage() {
  const config = useStockManagementConfig();
  if (!config.features.STOCK_TAKE) {
    return <UpgradePrompt feature="Stock Take" requiredTier="enterprise" />;
  }
  return <ActualContent />;
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

## Labels (i18n)

Default labels live in `i18n/default-labels.ts`. Host apps can override individual strings if their domain uses different terminology — e.g. AU Rubber might prefer "Roll Issue" over "Issue Stock".

## API client

The module exports a single `stockManagementApi` client that all hooks use. The base URL comes from `StockManagementProvider.config.apiBaseUrl` so the same module can be wired against staging, production, or a local backend without code changes.
