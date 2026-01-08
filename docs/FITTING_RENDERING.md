# 3D Fitting Rendering & Data Notes

This document captures the recent discussion around how the RFQ 3D previews are composed, where the dimensional data originates, and some potential improvements for the configuration workflow.

## Rendering Stack

- **Three.js** provides the low-level WebGL primitives.
- **@react-three/fiber** wraps Three.js so we can build scenes declaratively inside React components (`Pipe3DPreview.tsx`, `Bend3DPreview.tsx`, `Tee3DPreview.tsx`).
- **@react-three/drei** supplies helpers such as `OrbitControls`, `Text`, `Environment`, and `ContactShadows`.

Each preview component builds the geometry procedurally from the spec inputs (pipe lengths, flange types, closure lengths, etc.) and renders it inside a `<Canvas>` from `@react-three/fiber`.

## Dimensional Data Sources

All fitting dimensions (e.g., SABS 719 tee heights, flange tables, wall thicknesses) are **extracted from the Tender Template spreadsheets** and then checked into the repository as TypeScript objects. Examples:

- `annix-frontend/src/app/lib/utils/sabs719TeeData.ts` – SABS 719 tee heights, gusset sizes, OD tables.
- `annix-frontend/src/app/lib/utils/sabs62CfData.ts` – SABS 62 bend data (radii, allowable angles, etc.).
- `annix-frontend/src/app/lib/utils/pipeScheduleData.ts` & related files – schedule, pressure, and wall-thickness tables.

Those files are the canonical source for the 3D previews and the related calculations, so any change requires a code edit and redeploy.

## Why Some Loose-Flange Tees Show a Gap

When a run or branch flange is set to `flangeType = 'loose'`, the renderer intentionally inserts the loose-flange closure spool (`closureLengthMm`, default 150 mm) and floats the flange 100 mm away to visualise the weld stub plus loose/flange assembly. See `Tee3DPreview.tsx:529-704` for the run logic and `:773-842` for the branch. If the flange should appear fully welded, switch that end to `fixed` or reduce the closure length in the props.

## Limitations of the Current Approach

1. **Data updates require deployments** – SABS tables are hardcoded in TS, so adding a size means touching code.
2. **Provenance/version tracking is manual** – there is no automated link to the spreadsheet revision or spec number.
3. **Backend/front-end duplication risk** – if we ever need the same data on the backend, we have to copy-paste or sync manually.

## Potential Improvements

1. **Structured data files** – keep the extracted tables as JSON/CSV under `annix-frontend/src/assets/standards/` and import them into the components. Editors can update the data without touching TypeScript logic, while still shipping static bundles.
2. **Shared standards package** – move the JSON + types into a `standards-data` workspace package (or a git submodule). Both backend and frontend would import from the same artifact, guaranteeing parity.
3. **Admin-editable source of truth** – store the tables in the backend database (e.g., `sabs_tees`, `sabs_bends`) with a CRUD/import UI. Frontend fetches via API so updates no longer require builds. Ideal if customers need custom catalogs.
4. **Automated Excel → data pipeline** – keep a script (e.g., `scripts/generate-standards.ts`) that reads the Tender Template XLSX tabs and emits the JSON/TS files. Running `pnpm generate:standards` refreshes the data, ensuring accuracy and a repeatable provenance trail.

Any of these paths would reduce the effort required to add new sizes or specs, while keeping the rendering code focused solely on geometry.

## Open Questions / Next Steps

- Decide whether the current hardcoded approach is sufficient for the short term or if a data-driven workflow (options above) should be prioritised.
- If we keep loose-flange visualisation, consider adding a UI hint so users know the separation is intentional rather than a modeling glitch.
- Catalogue other fittings that may need similar camera auto-fit work (pipes, bends) now that tees have it.
