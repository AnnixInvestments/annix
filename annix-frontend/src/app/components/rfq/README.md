# Multi-Step Straight Pipe RFQ Refactor

This directory now organises the 18K-line RFQ experience into cohesive building blocks so each concern can be owned, tested, and evolved independently.

## Renaming

- `MultiStepStraightPipeRfqForm.tsx` ➜ `StraightPipeRfqOrchestrator.tsx`
- All customer/portal entry points, docs, and scripts were updated to use the new orchestrator name.

## Goals

1. Enforce single-responsibility by extracting each step into its own client component.
2. Centralise lookup/config data (`lib/config/rfq/**`) so schedule and flange logic have a single source of truth.
3. Keep orchestration logic in one place while allowing steps to stay self-contained for testing and future Storybook work.

## Structure

- `StraightPipeRfqOrchestrator.tsx` remains the orchestrator. It wires global hooks, API integration, validation, and state transitions between steps.
- `steps/ProjectDetailsStep.tsx` handles customer/project meta data, environmental auto-fill, map interactions, and supporting documents.
- `steps/SpecificationsStep.tsx` contains the lining/coating assistants, material suitability logic, and pressure-class helpers.
- `steps/ItemUploadStep.tsx` owns the (very large) BOM entry UX, calculations, and fallback schedule handling.
- `steps/ReviewSubmitStep.tsx` renders consolidated summaries, weld/weight totals, and submission CTA handling.
- `steps/BOQStep.tsx` builds the downloadable BOQ view and Excel export pipeline.
- `lib/config/rfq/pipeSchedules.ts` centralises fallback ASTM/SABS schedule data plus `getScheduleListForSpec`.
- `components/rfq/utils/flangeMaterialGroup.ts` exposes the flange material mapping shared by specs + item upload.

## Key Behaviours

1. **Step Isolation**
   - Each step file is a client component with its own hooks/imports. This prevents React hook leakage between unrelated concerns and keeps bundle splitting intact.
   - Shared helper interfaces and recommendation functions live with the step that uses them.

2. **Lookup + Config Extraction**
   - All fallback schedule data (ASTM + SABS719) now sits in `pipeSchedules.ts` and is imported via `@/app/lib/config/rfq`.
   - Flange material group logic is part of `components/rfq/utils`, so the specifications step and the main form reuse one implementation.

3. **Main Form Simplification**
   - `StraightPipeRfqOrchestrator` imports the steps and passes typed props instead of embedding the JSX.
   - Shared handlers like `updateRfqField`, document queues, and schedule caches still live in the main form so props remain thin.

4. **Build/Lint Safety**
   - `npm run build` succeeded after the refactor, ensuring the type system recognises the new module graph.

## Working With The Steps

| Step | Responsibilities | Key Props |
| --- | --- | --- |
| `ProjectDetailsStep` | Mines lookup, EI auto-fill, docs | `rfqData`, `onUpdate`, `pendingDocuments` |
| `SpecificationsStep` | Material suitability, coating + lining assistants, auto-fill badges | `globalSpecs`, `masterData`, `requiredProducts` |
| `ItemUploadStep` | BOM CRUD, fallback maths, tee/bend calculators | `entries`, calculation callbacks, schedule caches |
| `ReviewSubmitStep` | Aggregated metrics, confirmation copy | `entries`, `rfqData`, navigation callbacks |
| `BOQStep` | Submission-ready BOQ, Excel export | `rfqData`, `entries`, `masterData`, `onSubmit` |

When adding new shared logic, prefer:
- `lib/config/rfq` for tabular data / lookups.
- `components/rfq/utils` for light-weight helpers consumed by multiple steps.

## Testing Notes

- Run `npm run build` (from `annix-frontend`) after touching any step. The type checker spans all files now that steps are isolated.
- For UI-driven validation, the split allows mounting each step independently in Storybook or your preferred harness without needing the whole multi-step container.
