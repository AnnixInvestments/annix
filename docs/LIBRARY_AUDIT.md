# Library Audit & Architecture Recommendations

This document outlines opportunities to replace custom implementations with well-maintained libraries, improving code maintainability, reducing bundle size, and enhancing user experience.

## Current Stack

### Frontend (annix-frontend)
- **Framework**: Next.js 15.5 with React 19
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Forms**: react-hook-form + Zod validation
- **3D Rendering**: @react-three/fiber + @react-three/drei
- **API Client**: Custom fetch wrappers with openapi-fetch
- **Date Handling**: Luxon (installed, migration pending)

### Backend (annix-backend)
- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **PDF Parsing**: pdf-parse + tesseract.js (OCR)
- **Excel Parsing**: xlsx

---

## Recommended Library Additions

### High Priority

#### TanStack Table (Data Tables)
**Current state**: Manual HTML tables with inline filtering, sorting, and pagination logic in `boq/page.tsx`, `rfqs/page.tsx`, and admin portal pages.

**Recommendation**: [TanStack Table v8](https://tanstack.com/table/latest) - headless table library

**Benefits**:
- Built-in sorting, filtering, pagination
- Headless (works with existing Tailwind styling)
- Better performance with large datasets
- Reduces ~200 lines per table to ~50 lines

**Files to migrate**:
- `annix-frontend/src/app/boq/page.tsx`
- `annix-frontend/src/app/rfq/list/page.tsx`
- `annix-frontend/src/app/admin/portal/customers/page.tsx`
- `annix-frontend/src/app/admin/portal/suppliers/page.tsx`

---

#### TanStack Query (API State Management)
**Current state**: Manual `useState` for loading/error/data in every component that fetches data. Approximately 100+ instances of this pattern:
```typescript
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [data, setData] = useState(null)

useEffect(() => {
  fetchData().then(setData).catch(setError).finally(() => setLoading(false))
}, [])
```

**Recommendation**: [TanStack Query](https://tanstack.com/query/latest) (React Query)

**Benefits**:
- Automatic caching and request deduplication
- Stale-while-revalidate pattern
- Background refetching
- Built-in loading/error states
- Eliminates 90% of manual state management

**Migration approach**: Gradual - can coexist with current fetch patterns. Start with read-heavy pages.

---

### Medium Priority

#### Radix UI (Accessible Components)
**Current state**: 27+ custom modal implementations using basic div overlays. Manual dropdown/select implementations.

**Recommendation**: [Radix UI](https://www.radix-ui.com/) primitives

**Components to adopt**:
- `Dialog` - Replace custom modals (AddMineModal, SessionExpiredModal, 3D preview modals)
- `Select` - Replace custom dropdowns
- `Popover` - Tooltips and popovers
- `AlertDialog` - Confirmation dialogs

**Benefits**:
- Full accessibility (ARIA, keyboard navigation, focus management)
- Unstyled - works with existing Tailwind
- Consistent behavior across all modals

---

#### XState (Workflow State Machines)
**Current state**: Complex multi-step RFQ form orchestration in `StraightPipeRfqOrchestrator.tsx` (2,292 lines) with manual state management.

**Recommendation**: [XState](https://xstate.js.org/) for form wizard state

**Benefits**:
- Visual state machine definition
- Impossible to reach invalid states
- Better debugging with XState devtools
- Clear transition guards (e.g., can't proceed to BOQ step without items)

**Target workflow**:
```
projectDetails → specifications → items → boq → review → submitted
```

---

#### Zustand (Form State Management)
**Current state**: `ItemUploadStep.tsx` has 70+ useState calls (6,888 lines total). Form state not shared across wizard steps.

**Recommendation**: [Zustand](https://github.com/pmndrs/zustand) for RFQ wizard state

**Benefits**:
- Lightweight (~1KB)
- Simple API
- Form state persists across step navigation
- DevTools support

---

### Low Priority (Quick Wins)

#### react-dropzone (File Uploads)
**Current state**: Custom drag-and-drop in `RfqDocumentUpload.tsx` (~100 lines)

**Recommendation**: [react-dropzone](https://react-dropzone.js.org/)

**Benefits**:
- Better accessibility
- Mobile support
- Simpler API
- ~50% code reduction

---

#### Luxon (Date Handling)
**Status**: Installed, migration pending

**Current state**: Native `Date` with `toLocaleDateString`

**Recommendation**: [Luxon](https://moment.github.io/luxon/) for all date operations

**Benefits**:
- Immutable DateTime objects
- Superior timezone handling
- Chainable API
- Created by Moment.js maintainer

**Usage example**:
```typescript
import { DateTime } from 'luxon'

// Formatting
DateTime.fromISO(dateString).toFormat('dd MMM yyyy')

// Relative time
DateTime.fromISO(dateString).toRelative() // "2 days ago"

// Timezone conversion
DateTime.now().setZone('Africa/Johannesburg')
```

---

## No Changes Needed

| Area | Current Implementation | Notes |
|------|----------------------|-------|
| **Forms** | react-hook-form + Zod | Well-implemented |
| **Excel parsing** | xlsx | Industry standard, appropriate |
| **Authentication** | Custom Context API | Well-designed with token refresh |
| **Styling** | Tailwind CSS v4 | Properly configured with brand theme |

---

## 3D Visualization Improvements

**Current state**: Three large files with duplicated geometry code:
- `Pipe3DPreview.tsx` (716 lines)
- `Tee3DPreview.tsx` (1,274 lines)
- `Bend3DPreview.tsx` (2,036 lines)

**Issues**:
- Flange rendering duplicated across all files
- Manual geometry calculations for pipe intersections
- Hardcoded SABS flange dimensions repeated

**Recommendations**:

1. **Extract shared components**:
   - `<SabsFlange size={size} class={pressureClass} />` - reusable flange geometry
   - `<BoltPattern count={12} pcd={200} />` - bolt hole circles
   - `<DimensionLine from={[0,0,0]} to={[100,0,0]} label="200mm" />` - measurement annotations

2. **Consider [@react-three/csg](https://github.com/pmndrs/react-three-csg)** for boolean operations on tee branch intersections instead of manual positioning

3. **Precompute standard geometries**: SABS flanges are standardized - could be loaded as GLTFs rather than computed at runtime

---

## Migration Priority Order

### Phase 1: Quick Wins (1-2 hours total)
1. Luxon date migration
2. react-dropzone for file uploads

### Phase 2: High Impact (1-2 days)
1. TanStack Table for list pages
2. Radix UI Dialog for modals (start with 3-5)

### Phase 3: Architecture (3-5 days)
1. TanStack Query for API state
2. Zustand for RFQ wizard state
3. XState for workflow orchestration

### Phase 4: 3D Refactoring (2-3 days)
1. Extract shared geometry components
2. Consolidate flange rendering
3. Add CSG for complex intersections

---

## Bundle Size Considerations

| Library | Gzipped Size | Notes |
|---------|--------------|-------|
| TanStack Table | ~15KB | Headless, tree-shakeable |
| TanStack Query | ~13KB | Essential for data-heavy apps |
| Radix UI (Dialog only) | ~5KB | Import only what you use |
| XState | ~15KB | Optional, for complex workflows |
| Zustand | ~1KB | Minimal footprint |
| Luxon | ~20KB | Comprehensive date library |
| react-dropzone | ~8KB | Simple utility |

Total potential addition: ~77KB gzipped (acceptable for app of this complexity)

---

## Licensing

All recommended libraries are open source under the **MIT License**, which permits commercial use, modification, and distribution with no restrictions.

| Library | License | Repository |
|---------|---------|------------|
| TanStack Table | MIT | [github.com/TanStack/table](https://github.com/TanStack/table) |
| TanStack Query | MIT | [github.com/TanStack/query](https://github.com/TanStack/query) |
| Radix UI | MIT | [github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| XState | MIT | [github.com/statelyai/xstate](https://github.com/statelyai/xstate) |
| Zustand | MIT | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |
| Luxon | MIT | [github.com/moment/luxon](https://github.com/moment/luxon) |
| react-dropzone | MIT | [github.com/react-dropzone/react-dropzone](https://github.com/react-dropzone/react-dropzone) |
| @react-three/csg | MIT | [github.com/pmndrs/react-three-csg](https://github.com/pmndrs/react-three-csg) |

---

## References

- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [XState Documentation](https://xstate.js.org/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Luxon Documentation](https://moment.github.io/luxon/)
- [react-dropzone Documentation](https://react-dropzone.js.org/)
- [@react-three/csg Documentation](https://github.com/pmndrs/react-three-csg)
