# Frontend Conventions — Worked Examples

Companion to the rules in `CLAUDE.md`. CLAUDE.md states the mandates; this file holds the verbose code examples so the root instructions stay lean. The rules in CLAUDE.md are authoritative — this is reference detail.

## SWC-Safe Patterns

**This is the #1 production crash pattern in this codebase.** SWC (webpack and Turbopack) miscompiles bracket/member access on the left of `??` / `||` (and inside JSX) into undeclared `_obj_key` / `_obj_prop` temps, crashing the page with `ReferenceError: _<something> is not defined`. The error happens even with `||`, and even without any `?.`. Swapping `??` → `||` does NOT help — hoisting is the only reliable fix.

```tsx
// ❌ all of these crash:
<input value={readings[num] ?? ""} />        // _readings_num is not defined
<input value={readings[num] || ""} />         // also crashes — || is not a fix
{items.map(i => <div>{config[i.key] || "default"}</div>)}
const v = obj?.prop ?? fallback;              // _obj_prop
const v = arr[i].field ?? fallback;

// ✅ hoist to a local const first, then reference the plain identifier:
{READING_ROWS.map((num) => {
  const value = readings[num] || "";
  return <input value={value} />;
})}
```

`??` / `||` are only safe on plain identifiers (local variables or destructured consts). Anything with a `.`, `?.`, or `[...]` on the left must be hoisted first.

**No destructuring defaults in function parameters** — SWC miscompiles `({ prop = value }) =>` into broken `_ref` references. Destructure from `props` in the body instead.

```tsx
// ✅
function Foo(props: FooProps) { const size = props.size || "md"; }
// ❌
function Foo({ size = "md" }: FooProps) {}
```

## Component size budget

Step / form components should stay below **~50 KB / ~1,200 lines**. A single
React component spanning thousands of lines (hundreds of nested helpers and
inline sub-renderers) is the dominant frontend build cost: SWC parses it
linearly and the closure structure blocks tree-shaking and chunk splitting
(issue #267 — the RFQ wizard monoliths once ran 100–400 KB each).

If a component is approaching the budget, **extract its sub-renderers and
helpers into sibling modules**, don't keep growing the file:

- Inline `return (…)` sub-renderers → `…/<Feature>/components/<Name>.tsx`, each
  a `memo()`'d component with an explicit props interface.
- Pure helpers → `…/<Feature>/helpers.ts`; shared types → `…/types.ts`.
- Pass parent state via props (don't lift it); for a stateful block, thread the
  computed values down (pass-as-props) so the parent keeps owning the state/
  effects. Worked example: `components/rfq/steps/specifications/` (the
  SpecificationsStep extraction took it 7,682 → ~1,455 lines).

A **non-blocking** pre-push warning (`scripts/check-large-frontend-files.sh`)
flags any file over **200 KB** in `annix-frontend/src/` so an oversized
component is noticed in review. It never fails the push — extraction is a
judgement call, not a gate.

## Long-Running Operations

### Bulk operations — `useAdaptiveExtractionProgress`

Orchestrates a per-item loop, drives the centred branded `ExtractionProgressModal`, fetches the persisted average duration up-front, and adaptively recalibrates after each item. Works across all apps (any `ExtractionBrand`).

```tsx
const { runBulk } = useAdaptiveExtractionProgress();
const result = await runBulk({
  brand: "au-rubber",
  metricCategory: "rubber-coc-extract",
  metricOperation: "COMPOUNDER",
  items: candidateIds,
  itemId: (id) => id,
  itemLabel: (id, i, t) => `Re-extracting CoC ${i + 1} of ${t}…`,
  perItemDelayMs: 500,
  run: async (id) => { /* throw on failure */ },
});
```

The `run` callback should throw on failure; the hook collects throws into `result.failed`. Limit per-failure toasts to 3.

### Backend — record duration with `ExtractionMetricService.time()`

This is what makes the frontend's adaptive progress sharper over time.

```ts
return this.extractionMetricService.time(
  "rubber-coc-extract",  // category — must match frontend hook
  cocType,                // operation — sub-classification
  async () => doTheWork(),
  pdfBuffer?.length,      // optional payloadSizeBytes
);
```

Stats endpoint: `GET /metrics/extraction-stats?category=...&operation=...` returns `{ averageMs, sampleSize }` over a 50-row rolling window with 10% top/bottom trim.

## Confirmations — `useConfirm`

`confirm(options)` returns `Promise<boolean>` — a drop-in replacement for `window.confirm()`. Render `{ConfirmDialog}` once near the page root.

```tsx
const { confirm, ConfirmDialog } = useConfirm();
const confirmed = await confirm({
  title: "Delete this CoC?",
  message: "This cannot be undone.",
  confirmLabel: "Delete",
  variant: "danger",  // "danger" | "warning" | "info" | "default"
});
```

## Stock Control How-To Guide Format

Place guides in `annix-frontend/src/app/stock-control/how-to/guides/` with kebab-case filenames. The `relatedPaths` array connects the guide to the code for freshness checking — get it right.

```markdown
---
title: Feature Name
slug: feature-slug
category: Quality | Inventory | Workflow | etc.
roles: [roles that can access this feature]
order: N
tags: [searchable, keywords]
lastUpdated: YYYY-MM-DD
summary: One-line description.
readingMinutes: N
relatedPaths: [paths this guide covers]
---

## What is / How it works
## Step-by-step instructions
## Rules or constraints
## Tips (optional)
```
