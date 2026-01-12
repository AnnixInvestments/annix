# Data-Driven Architecture Migration Plan
## Annix Sync Project - Eliminating Code-Based Configuration

**Created:** 2026-01-12
**Status:** Implementation Plan
**Principle:** All configuration, reference data, and business logic must live in the database, not hardcoded in application code.

---

## Executive Summary

The Annix application currently has significant duplication between:
1. **Database entities** (backend)
2. **Hardcoded configuration files** (frontend)
3. **Hardcoded data tables** (backend data files)

This creates a maintenance nightmare where updates require changes in 2-3 places, risks data inconsistency, and violates the DRY principle.

**Goal:** Migrate to a fully data-driven architecture where:
- ✅ All configuration lives in database tables
- ✅ Frontend queries backend APIs for all data
- ✅ Backend services use database entities exclusively
- ✅ No hardcoded lookup tables in code
- ✅ Changes are made through database migrations or admin UI, not code changes

---

## Current State Analysis

### What's Already in Database ✅
- Pipe dimensions (pipe_dimensions table)
- Flange dimensions (flange_dimensions table)
- Bolt and nut masses (bolt_mass, nut_mass tables)
- Steel specifications (steel_specifications table)
- SABS 719 fitting dimensions (sabs719_fitting_dimensions table)
- SABS 62 fitting dimensions (sabs62_fitting_dimensions table)
- Bend center-to-face dimensions (bend_center_to_face table)
- Pipe end configurations (pipe_end_configurations table - INCOMPLETE)
- NB/NPS lookup (nb_nps_lookup table)
- Weld types (weld_types table)

### What's Hardcoded in Frontend ❌
1. **Weld thickness lookup tables** (~2000 lines)
   - `CARBON_STEEL_PIPES`
   - `STAINLESS_STEEL_PIPES`
   - `CARBON_STEEL_FITTINGS`
   - `FITTING_WALL_THICKNESS`

2. **Flange weight tables** (~600 lines)
   - `BLANK_FLANGE_WEIGHT`
   - `FLANGE_WEIGHT_BY_PRESSURE_CLASS`
   - `SANS_1123_PLATE_FLANGE_WEIGHT`
   - `SANS_1123_BLIND_FLANGE_WEIGHT`
   - `BNW_SET_WEIGHT_PER_HOLE`
   - `GASKET_WEIGHTS`

3. **Pipe schedule fallback tables** (~450 lines)
   - `FALLBACK_PIPE_SCHEDULES`
   - `SABS719_PIPE_SCHEDULES`
   - `SABS62_MEDIUM_SCHEDULES`
   - `SABS62_HEAVY_SCHEDULES`

4. **SABS 719 bend data** (~67 lines)
   - `SABS719_ELBOWS`
   - `SABS719_MEDIUM_RADIUS`
   - `SABS719_LONG_RADIUS`

5. **Pipe end configuration logic** (~279 lines)
   - 13 helper functions for weld counts, flange configs, bolt sets
   - Complex business logic that should be in backend

6. **Material limits validation** (~50 lines)
   - Temperature/pressure ranges per steel spec
   - Material suitability checking logic

7. **NB to OD lookup** (duplicate)
   - Exists in database but also hardcoded

### What's Hardcoded in Backend ❌
1. **Weld thickness data file** (44KB)
   - `/annix-backend/src/weld-thickness/weld-thickness.data.ts`
   - Should be in database tables

2. **Steel density constant** (hardcoded: 7850 kg/m³)
   - Should be in material_properties table

---

## Phase 1: Critical Data Migration (Priority: IMMEDIATE)

### 1.1 Expand Pipe End Configuration Entity

**Current State:**
```typescript
@Entity('pipe_end_configurations')
export class PipeEndConfiguration {
  config_code: string;        // e.g. "FOE_LF"
  config_name: string;         // e.g. "Flanged both ends"
  weld_count: number;          // Basic weld count
  description: string;
  weldType: WeldType;          // Relation
}
```

**Target State:**
```typescript
@Entity('pipe_end_configurations')
export class PipeEndConfiguration {
  // Existing fields
  config_code: string;
  config_name: string;
  description: string;

  // Item type applicability
  applies_to_pipe: boolean;
  applies_to_bend: boolean;
  applies_to_fitting: boolean;

  // Weld configuration
  weld_count: number;
  has_tack_welds: boolean;
  tack_weld_count_per_flange: number;
  tack_weld_length_mm: number;

  // Flange configuration
  has_fixed_flange_end1: boolean;
  has_fixed_flange_end2: boolean;
  has_loose_flange_end1: boolean;
  has_loose_flange_end2: boolean;

  // Stub configuration (for fittings)
  stub_flange_code: string;  // e.g. "2RF_1LF"

  // Relations
  @ManyToOne(() => WeldType)
  weldType: WeldType;
}
```

**Migration Required:**
```sql
-- Add columns to pipe_end_configurations
ALTER TABLE pipe_end_configurations
  ADD COLUMN applies_to_pipe BOOLEAN DEFAULT true,
  ADD COLUMN applies_to_bend BOOLEAN DEFAULT true,
  ADD COLUMN applies_to_fitting BOOLEAN DEFAULT true,
  ADD COLUMN has_tack_welds BOOLEAN DEFAULT false,
  ADD COLUMN tack_weld_count_per_flange INTEGER DEFAULT 0,
  ADD COLUMN tack_weld_length_mm DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN has_fixed_flange_end1 BOOLEAN DEFAULT false,
  ADD COLUMN has_fixed_flange_end2 BOOLEAN DEFAULT false,
  ADD COLUMN has_loose_flange_end1 BOOLEAN DEFAULT false,
  ADD COLUMN has_loose_flange_end2 BOOLEAN DEFAULT false,
  ADD COLUMN stub_flange_code VARCHAR(20);

-- Populate from frontend config data
UPDATE pipe_end_configurations SET
  applies_to_pipe = true,
  applies_to_bend = false,
  applies_to_fitting = false
WHERE config_code IN ('PE', 'FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF');

-- Add bend-specific configs
INSERT INTO pipe_end_configurations (config_code, config_name, weld_count, applies_to_pipe, applies_to_bend, applies_to_fitting, has_tack_welds, tack_weld_count_per_flange, tack_weld_length_mm, has_fixed_flange_end1, has_fixed_flange_end2, has_loose_flange_end1, has_loose_flange_end2)
VALUES
  ('PE', 'Plain Ended', 0, false, true, false, false, 0, 0, false, false, false, false),
  ('FOE', 'Flanged One End', 1, false, true, false, false, 0, 0, true, false, false, false),
  ('FOE_LF', 'Flanged One End (Loose)', 1, false, true, false, true, 8, 20, false, false, true, false),
  -- ... etc
```

**API Endpoints to Create:**
```
GET  /api/pipe-end-configurations
GET  /api/pipe-end-configurations/:code
GET  /api/pipe-end-configurations/:code/weld-count?itemType=bend
GET  /api/pipe-end-configurations/:code/flange-config
GET  /api/pipe-end-configurations/:code/bolt-sets?nb=200
```

**Service Methods to Implement:**
```typescript
// annix-backend/src/pipe-end-configuration/pipe-end-configuration.service.ts

async weldCountForConfiguration(
  configCode: string,
  itemType: 'pipe' | 'bend' | 'fitting',
  nb?: number
): Promise<number>;

async flangeConfiguration(
  configCode: string
): Promise<{
  end1Fixed: boolean;
  end2Fixed: boolean;
  end1Loose: boolean;
  end2Loose: boolean;
  tackWelds: number;
}>;

async boltSetsRequired(
  configCode: string,
  nb: number
): Promise<number>;
```

**Frontend Changes:**
```typescript
// REMOVE: annix-frontend/src/app/lib/config/rfq/pipeEndOptions.ts (279 lines)

// REPLACE WITH: API calls
import { usePipeEndConfigurations } from '@/app/hooks/api/usePipeEndConfigurations';

const { data: endConfigs } = usePipeEndConfigurations({ itemType: 'bend' });
const { data: weldCount } = useWeldCount({ configCode: 'FOE', itemType: 'bend' });
```

---

### 1.2 Migrate Weld Thickness Data to Database

**Current Problem:**
- 44KB data file in backend (`weld-thickness.data.ts`)
- 2000+ lines duplicated in frontend
- Updates require code changes

**New Database Tables:**

#### Table: `weld_thickness_pressure_classes`
```sql
CREATE TABLE weld_thickness_pressure_classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL UNIQUE,  -- e.g. "PN6", "PN10", "Class 150"
  pressure_bar DECIMAL(10,2) NOT NULL,
  temperature_celsius INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `weld_thickness_pipe_recommendations`
```sql
CREATE TABLE weld_thickness_pipe_recommendations (
  id SERIAL PRIMARY KEY,
  steel_type VARCHAR(50) NOT NULL,  -- 'CARBON_STEEL' or 'STAINLESS_STEEL'
  nominal_bore_mm INTEGER NOT NULL,
  pressure_class_id INTEGER REFERENCES weld_thickness_pressure_classes(id),
  recommended_wall_thickness_mm DECIMAL(10,2) NOT NULL,
  min_wall_thickness_mm DECIMAL(10,2),
  max_wall_thickness_mm DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(steel_type, nominal_bore_mm, pressure_class_id)
);
```

#### Table: `weld_thickness_fitting_recommendations`
```sql
CREATE TABLE weld_thickness_fitting_recommendations (
  id SERIAL PRIMARY KEY,
  fitting_type VARCHAR(50) NOT NULL,  -- '45E', '90E', 'BW_RED', 'TEE', 'PIPE'
  fitting_class VARCHAR(20) NOT NULL,  -- 'STD', 'XH', 'XXH'
  nominal_bore_mm INTEGER NOT NULL,
  recommended_wall_thickness_mm DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fitting_type, fitting_class, nominal_bore_mm)
);
```

**Migration Script:**
```typescript
// Parse weld-thickness.data.ts and insert into database
// One-time migration: 1768600000000-MigrateWeldThicknessToDatabase.ts

export class MigrateWeldThicknessToDatabase1768600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert pressure classes
    await queryRunner.query(`
      INSERT INTO weld_thickness_pressure_classes (class_name, pressure_bar, temperature_celsius)
      VALUES
        ('PN6', 6, 120),
        ('PN10', 10, 120),
        -- ... all pressure classes
    `);

    // Insert pipe recommendations (from CARBON_STEEL_PIPES data)
    // Insert fitting recommendations (from CARBON_STEEL_FITTINGS data)
  }
}
```

**Backend Service:**
```typescript
// annix-backend/src/weld-thickness/weld-thickness.service.ts

async recommendWeldThickness(
  steelType: 'CARBON_STEEL' | 'STAINLESS_STEEL',
  nominalBoreMm: number,
  pressureBar: number,
  temperatureCelsius: number,
  itemType: 'PIPE' | 'FITTING',
  fittingClass?: 'STD' | 'XH' | 'XXH'
): Promise<number>;
```

**API Endpoint:**
```
POST /api/weld-thickness/recommend
Body: {
  steelType: 'CARBON_STEEL',
  nominalBoreMm: 200,
  pressureBar: 16,
  temperatureCelsius: 150,
  itemType: 'PIPE'
}
Response: {
  recommendedWallThicknessMm: 6,
  pressureClass: 'PN16',
  minWallThickness: 5,
  maxWallThickness: 8
}
```

**Frontend Changes:**
```typescript
// REMOVE: annix-frontend/src/app/lib/utils/weldThicknessLookup.ts (2000+ lines)
// REMOVE: CARBON_STEEL_PIPES, STAINLESS_STEEL_PIPES, CARBON_STEEL_FITTINGS

// REPLACE WITH:
const { data: weldThickness } = useWeldThicknessRecommendation({
  steelType: 'CARBON_STEEL',
  nominalBoreMm: 200,
  pressureBar: 16,
  temperatureCelsius: 150,
  itemType: 'PIPE'
});
```

---

### 1.3 Consolidate Flange Weight Data

**Current State:**
- Flange data already in database (`flange_dimensions` table)
- BUT frontend has duplicate hardcoded tables
- Frontend performs calculations that should use backend

**Database Tables Already Exist:**
- `flange_dimensions` - Has flange weights
- `bolt_mass` - Bolt weights by size
- `nut_mass` - Nut weights by size

**Missing Tables to Create:**

#### Table: `gasket_weights`
```sql
CREATE TABLE gasket_weights (
  id SERIAL PRIMARY KEY,
  gasket_type VARCHAR(50) NOT NULL,  -- 'ASBESTOS', 'GRAPHITE', 'PTFE', etc.
  nominal_bore_mm INTEGER NOT NULL,
  weight_kg DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gasket_type, nominal_bore_mm)
);
```

**Backend Service to Create:**
```typescript
// annix-backend/src/flange/flange-weight.service.ts

async flangeWeight(
  nb: number,
  pressureClass: string,
  flangeType: 'BLANK' | 'PLATE' | 'BLIND'
): Promise<number>;

async boltSetWeight(
  nb: number,
  pressureClass: string
): Promise<{ boltHoles: number; boltSize: string; weightPerSet: number }>;

async gasketWeight(
  nb: number,
  gasketType: string
): Promise<number>;
```

**API Endpoints:**
```
GET /api/flange-weights?nb=200&pressureClass=PN16&flangeType=BLANK
GET /api/bolt-weights?nb=200&pressureClass=PN16
GET /api/gasket-weights?nb=200&gasketType=GRAPHITE
```

**Frontend Changes:**
```typescript
// REMOVE: annix-frontend/src/app/lib/config/rfq/flangeWeights.ts (~600 lines)

// REPLACE WITH: API hooks
const { data: flangeWeight } = useFlangeWeight({ nb: 200, pressureClass: 'PN16', flangeType: 'BLANK' });
```

---

## Phase 2: Business Logic Migration (Priority: HIGH)

### 2.1 Material Limits & Validation Service

**New Database Table:**
```sql
CREATE TABLE material_limits (
  id SERIAL PRIMARY KEY,
  steel_specification_id INTEGER REFERENCES steel_specifications(id),
  min_temperature_celsius INTEGER NOT NULL,
  max_temperature_celsius INTEGER NOT NULL,
  min_pressure_bar DECIMAL(10,2) NOT NULL,
  max_pressure_bar DECIMAL(10,2) NOT NULL,
  recommended_for_sour_service BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend Service:**
```typescript
// annix-backend/src/material-validation/material-validation.service.ts

async checkMaterialSuitability(
  steelSpecId: number,
  temperatureCelsius: number,
  pressureBar: number
): Promise<{
  suitable: boolean;
  warnings: string[];
  alternativeSpecs?: number[];
}>;
```

**API Endpoint:**
```
POST /api/material-validation/check
Body: {
  steelSpecId: 8,
  temperatureCelsius: 200,
  pressureBar: 50
}
Response: {
  suitable: true,
  warnings: ['Temperature approaching upper limit'],
  alternativeSpecs: []
}
```

---

### 2.2 Calculation Services Consolidation

**New Service Structure:**

#### `WeightCalculationService`
```typescript
async calculatePipeWeight(
  od: number,
  wallThickness: number,
  length: number,
  steelSpecId: number
): Promise<number>;

async calculateFittingWeight(
  fittingType: string,
  nb: number,
  schedule: string,
  steelSpecId: number
): Promise<number>;
```

#### `WeldCalculationService`
```typescript
async calculateWeldMeterage(
  itemType: 'pipe' | 'bend' | 'fitting',
  endConfig: string,
  nb: number,
  od: number,
  additionalParams: any
): Promise<{
  buttWelds: number;
  mitreWelds: number;
  flangeWelds: number;
  tackWelds: number;
  totalLinearMeters: number;
}>;
```

#### `GeometryService`
```typescript
calculateCircumference(outerDiameter: number): number;
calculateSurfaceArea(outerDiameter: number, length: number): number;
calculateVolume(outerDiameter: number, wallThickness: number, length: number): number;
```

**API Endpoints:**
```
POST /api/calculations/weight
POST /api/calculations/weld-meterage
POST /api/calculations/geometry
```

---

## Phase 3: Reference Data Cleanup (Priority: MEDIUM)

### 3.1 Remove Frontend Fallback Tables

**Files to Delete:**
- `annix-frontend/src/app/lib/config/rfq/pipeSchedules.ts` (450 lines)
  - `FALLBACK_PIPE_SCHEDULES` → Use backend API
  - `SABS719_PIPE_SCHEDULES` → Already in database
  - `SABS62_MEDIUM_SCHEDULES` → Already in database

- `annix-frontend/src/app/lib/config/rfq/sabs719BendData.ts` (67 lines)
  - `SABS719_ELBOWS`, `SABS719_MEDIUM_RADIUS`, `SABS719_LONG_RADIUS`
  - Already in database: `sabs719_fitting_dimensions`

- `annix-frontend/src/app/lib/config/rfq/flangeWeights.ts`
  - `NB_TO_OD_LOOKUP` → Use `nb_nps_lookup` table

**Replace With:**
```typescript
// API hooks for all reference data
usePipeSchedules({ nb, steelSpecId });
useSabs719BendDimensions({ bendRadiusType, nb, segments });
useNbToOd({ nb });
```

---

### 3.2 Expand Steel Specification Entity

**Current State:**
```typescript
@Entity('steel_specifications')
export class SteelSpecification {
  id: number;
  steelSpecName: string;
  // Relations only
}
```

**Target State:**
```typescript
@Entity('steel_specifications')
export class SteelSpecification {
  id: number;
  steelSpecName: string;

  // Material properties
  density_kg_per_m3: number;  // No more magic number 7850!
  thermal_expansion_coefficient: number;
  youngs_modulus_gpa: number;

  // Operational limits
  min_nb_mm: number;
  max_nb_mm: number;

  // Temperature/pressure handled in material_limits table

  // Relations
  @OneToMany(() => MaterialLimit)
  materialLimits: MaterialLimit[];
}
```

---

### 3.3 Remove Backend Data Files

**Files to Migrate Then Delete:**
```
annix-backend/src/weld-thickness/weld-thickness.data.ts  (44KB)
  → Migrate to weld_thickness_* tables
  → Delete file
  → Update service to use TypeORM queries
```

---

## Phase 4: Type Safety & Code Generation (Priority: MEDIUM)

### 4.1 OpenAPI/Swagger Documentation

**Setup:**
```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Annix API')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

**Generate Frontend Types:**
```bash
npm install --save-dev swagger-typescript-api
npx swagger-typescript-api -p http://localhost:4000/api-docs -o ./src/api/generated -n api.ts
```

---

### 4.2 Shared Type Package (Optional)

**Alternative Approach:**
```
packages/
  types/
    src/
      rfq.types.ts
      pipe.types.ts
      calculation.types.ts
    package.json  → "@annix/types"

annix-frontend/
  package.json   → depends on "@annix/types"

annix-backend/
  package.json   → depends on "@annix/types"
```

---

## Implementation Timeline

### Sprint 1-2 (Weeks 1-2): Critical Data
- [ ] Expand `pipe_end_configurations` entity
- [ ] Create `PipeEndConfigurationService` with all calculation methods
- [ ] Build API endpoints for pipe end configs
- [ ] Migrate weld thickness to database tables
- [ ] Create `WeldThicknessService`
- [ ] Remove frontend weld thickness lookups
- [ ] **Estimated Lines Removed:** 2300+

### Sprint 3-4 (Weeks 3-4): Flange Data & Material Limits
- [ ] Create `gasket_weights` table
- [ ] Build `FlangeWeightService`
- [ ] Remove frontend flange weight tables (~600 lines)
- [ ] Create `material_limits` table
- [ ] Build `MaterialValidationService`
- [ ] Remove frontend material limits (~50 lines)
- [ ] **Estimated Lines Removed:** 650+

### Sprint 5-6 (Weeks 5-6): Calculation Services
- [ ] Create `WeightCalculationService`
- [ ] Create `WeldCalculationService`
- [ ] Create `GeometryService`
- [ ] Consolidate scattered calculation logic
- [ ] Build calculation API endpoints
- [ ] Add steel spec properties (density, etc.)
- [ ] **Estimated Lines Removed:** 500+

### Sprint 7-8 (Weeks 7-8): Reference Data Cleanup
- [ ] Remove frontend fallback tables (~450 lines)
- [ ] Remove frontend SABS 719 tables (~67 lines)
- [ ] Remove backend weld-thickness.data.ts (44KB)
- [ ] Update all services to use database queries
- [ ] **Estimated Lines Removed:** 550+

### Sprint 9-10 (Weeks 9-10): Type Safety & Polish
- [ ] Setup OpenAPI/Swagger
- [ ] Generate frontend types
- [ ] Consider shared type package
- [ ] Comprehensive testing
- [ ] Documentation updates

---

## Success Metrics

### Code Reduction
- **Frontend:** Remove ~3,500 lines of hardcoded config
- **Backend:** Remove ~1,500 lines of data files
- **Total:** ~5,000 lines eliminated

### Maintainability
- ✅ Single source of truth for all data
- ✅ Changes via database migrations only
- ✅ No code deployments for data updates
- ✅ Admin UI can update reference data

### Data Integrity
- ✅ No data drift between frontend/backend
- ✅ Database constraints enforce validity
- ✅ Version control for all reference data
- ✅ Audit trail for data changes

### Performance
- ✅ Frontend bundle size reduced
- ✅ API responses cached
- ✅ Database queries optimized with indexes

---

## Risk Mitigation

### Risk: API Performance Impact
**Mitigation:**
- Implement Redis caching for reference data
- Use HTTP caching headers (ETags, Cache-Control)
- Batch API requests where possible
- Use react-query for client-side caching

### Risk: Data Migration Errors
**Mitigation:**
- Write comprehensive migration tests
- Validate migrated data against original
- Keep rollback migrations ready
- Migrate one table at a time

### Risk: Breaking Changes
**Mitigation:**
- Implement API versioning
- Maintain backward compatibility during transition
- Feature flags for gradual rollout
- Comprehensive integration tests

---

## Admin Interface (Future)

**Ultimate Goal:** Reference data managed through admin UI

```
/admin/reference-data
  /pipe-end-configurations    → CRUD interface
  /weld-thickness             → CRUD interface
  /flange-weights             → CRUD interface
  /material-limits            → CRUD interface
  /steel-specifications       → CRUD interface
```

**Benefits:**
- No code changes for data updates
- Business users can maintain data
- Immediate deployment of changes
- Full audit trail

---

## Conclusion

This migration eliminates ~5,000 lines of duplicate configuration code and establishes a truly data-driven architecture. All reference data lives in the database, business logic resides in backend services, and the frontend becomes a thin presentation layer.

**Core Principle Achieved:** Configuration in database, not code.

---

## Appendix A: File Deletion Checklist

Once migration complete, DELETE these files:

### Frontend Files to Remove
- [ ] `annix-frontend/src/app/lib/config/rfq/pipeEndOptions.ts` (279 lines)
- [ ] `annix-frontend/src/app/lib/utils/weldThicknessLookup.ts` (2000+ lines)
- [ ] `annix-frontend/src/app/lib/config/rfq/flangeWeights.ts` (600 lines)
- [ ] `annix-frontend/src/app/lib/config/rfq/pipeSchedules.ts` (450 lines)
- [ ] `annix-frontend/src/app/lib/config/rfq/sabs719BendData.ts` (67 lines)
- [ ] `annix-frontend/src/app/lib/config/rfq/materialLimits.ts` (50 lines)

### Backend Files to Remove
- [ ] `annix-backend/src/weld-thickness/weld-thickness.data.ts` (44KB)

**Total Removal: ~3,500 frontend + 1,500 backend = 5,000 lines**

---

## Appendix B: Database Schema Changes Summary

### New Tables
1. `weld_thickness_pressure_classes`
2. `weld_thickness_pipe_recommendations`
3. `weld_thickness_fitting_recommendations`
4. `gasket_weights`
5. `material_limits`

### Expanded Tables
1. `pipe_end_configurations` - Add 11 new columns
2. `steel_specifications` - Add material properties

### Migrations Required
- ~15 new migration files
- ~20 seeding scripts (one-time data migration)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Approved By:** _Pending_
**Implementation Start:** _TBD_
