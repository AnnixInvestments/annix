# ADR 001: Stock Management Module Architecture

**Status:** Accepted
**Date:** 2026-04-12
**Issue:** #192

## Context

The stock-related functionality was split across three tab pages (Issue Stock, Rubber Issuing, CPO Batch Approvals), two backend API layers (`stockControlApi` + `auRubberApi`), and two entity models (`StockItem` + `RubberRollIssuance`). There was no stock take, no FIFO valuation, no return workflow, no product datasheet system, and no way to sell the functionality as a reusable module to other Annix apps.

## Decision

Build a standalone, sellable `stock-management` module with:

### Data model: Shape 3 polymorphic CTI

All product types (consumable, paint, rubber roll, solution, rubber offcut) share a base `sm_issuable_product` table for common fields (sku, name, quantity, unit, cost) with per-type child tables for type-specific fields. Issuance rows follow the same pattern (`sm_issuance_row` base + per-type child rows). Return sessions use a `return_kind` discriminator column with per-type child tables (`sm_rubber_offcut_return`, `sm_paint_return`, `sm_consumable_return`).

**Why CTI over STI or separate tables?** CTI gives us a single repository for querying across all product types while keeping per-type columns in separate tables. STI would mean one massive table with nullable columns for every product type. Separate tables would mean N different services with duplicated CRUD logic. CTI is the best balance of query simplicity and schema cleanliness.

### Module architecture: host-app-agnostic

The module exposes a `StockManagementProvider` React context on the frontend and a `StockManagementModule` NestJS module on the backend. Host apps (Stock Control, AU Rubber) wire the provider into their layout and mount the module pages as thin wrapper routes. The provider receives `StockManagementHostConfig` with apiBaseUrl, authHeaders, currentUser, and optional theme/label overrides.

**Why host-agnostic?** The module needs to work identically under Stock Control's teal branding and AU Rubber's yellow branding. Future apps (Comply SA, FieldFlow) may also need inventory management. Coupling to a single host's auth, routing, or styling would block this.

### Feature gating: tier-based licensing

Each company gets a `sm_company_module_license` row with a tier (basic / standard / premium / enterprise). Features are grouped by tier in a static feature matrix. Every backend endpoint is guarded by `@StockManagementFeature("FEATURE_KEY")` and every frontend page checks `useStockManagementFeature("KEY")`. Per-feature overrides allow flipping individual features without changing the tier.

**Why tiers?** Flat feature flags would mean 14+ toggles per company with no logical grouping. Tiers map to pricing plans and make it obvious which features come at which price point.

### Table prefix: sm_

All stock-management tables use the `sm_` prefix to distinguish them from legacy `stock_*` tables during the migration period. Post-cutover, the prefix remains for clarity.

### Migration strategy: preview-then-cutover (Option A)

1. Build the full module alongside the legacy code (phases 0-11)
2. Nav cutover: change hrefs to point at module pages, hide old entries (phase 12)
3. Old pages remain accessible via direct URL for a rollback window (1 week)
4. Legacy code deletion and hard data migrations deferred to post-cutover confirmation

## Consequences

- Two parallel sets of tables exist during the migration period, increasing database size
- The legacy code stays compilable and deployable for the rollback window, adding ~2k LOC of dead code
- Cross-app imports from the stock-management module to stock-control's `StockControlAuthGuard` are architecturally correct (the guard is host-specific auth, not app logic) but create a compile-time coupling that would need refactoring if stock-management moves to its own package
- The preview URL scheme (`/stock-control/portal/preview/stock-management/...`) is permanent until the preview folder is deleted post-cutover
- FIFO valuation is computed at query time, not cached, so large product catalogues may need a materialized view in future
