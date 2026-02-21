# Surface Protection E2E Test Plan

This document outlines the end-to-end test scenarios for the Surface Protection module. Tests should be implemented when an E2E testing framework (Playwright/Cypress) is added to the project.

## Test Environment Setup

```typescript
// Recommended: Playwright with fixtures
// Test data should be isolated per test run
// API mocking for external services
```

## Test Scenarios

### 1. External Coating Specification Flow

#### 1.1 Basic External Coating Selection
```
GIVEN user is on the RFQ form with Surface Protection section
WHEN user selects "External Coating" tab
AND user selects Installation Type "Above Ground"
AND user selects ISO 12944 Category "C4"
AND user selects UV Exposure "High"
AND user selects Service Life "Long"
THEN the system should display recommended coating systems
AND the coating system should include a UV-resistant topcoat
AND the DFT range should meet ISO 12944-5 minimum requirements
```

#### 1.2 Buried Pipeline Coating Selection
```
GIVEN user is on External Coating section
WHEN user selects Installation Type "Buried"
AND user enables Cathodic Protection
AND user selects Soil Resistivity "Low"
THEN the system should recommend CP-compatible coatings (FBE, 3LPE)
AND engineering notes should mention CP compatibility
AND coating system should not include polyurethane topcoat
```

#### 1.3 Offshore/Marine Coating Selection
```
GIVEN user is on External Coating section
WHEN user selects Installation Type "Submerged"
AND user selects Marine Influence "Offshore"
THEN the system should recommend NORSOK-compliant systems
AND surface prep should be Sa 2.5 or higher
AND coating thickness should meet offshore specifications
```

### 2. Internal Lining Specification Flow

#### 2.1 Abrasive Slurry Lining Selection
```
GIVEN user is on Internal Lining section
WHEN user selects Material Hardness "High"
AND user selects Silica Content "High"
AND user selects Flow Velocity "High"
AND user selects Equipment Type "Pipe"
THEN the system should classify damage as "Severe Abrasion"
AND recommend ceramic or basalt lining
AND include SANS 1198/1201 references
```

#### 2.2 Impact Zone Lining Selection
```
GIVEN user is on Internal Lining section
WHEN user selects Impact Angle "High"
AND user enables Impact Zones
AND user selects Equipment Type "Chute"
THEN the system should classify damage as "Severe Impact"
AND recommend rubber-backed ceramic composite
AND include impact absorption engineering notes
```

#### 2.3 Corrosive Media Lining Selection
```
GIVEN user is on Internal Lining section
WHEN user selects pH Range "Acidic"
AND user selects Chloride Level "High"
AND user selects Equipment Type "Tank"
THEN the system should classify damage as "High Corrosion"
AND recommend chemical-resistant rubber or epoxy
AND include chemical compatibility notes
```

### 3. ISO 12944 System Generation

#### 3.1 Durability-Based System Selection
```
GIVEN user has selected ISO 12944 category C4
AND user selects Service Life "Extended" (VH durability)
WHEN the system fetches coating systems
THEN API should return systems meeting C4/VH requirements
AND minimum DFT should be 320μm or higher
AND system should include zinc-rich primer for C4+
```

#### 3.2 Surface Preparation Validation
```
GIVEN user has selected a coating system
WHEN user views surface prep requirements
THEN the system should display ISO 8501 grade
AND show SSPC/NACE equivalents
AND indicate surface profile requirements
```

### 4. Quantity Takeoff and BOQ

#### 4.1 Area Calculation Integration
```
GIVEN user has entered pipe dimensions
AND user has specified coating for internal and external surfaces
WHEN user views Quantity Takeoff
THEN internal surface area should be calculated correctly
AND external surface area should include bend allowances
AND paint quantity should be based on spreading rate and DFT
```

#### 4.2 BOQ Generation
```
GIVEN user has completed SP specifications
WHEN user submits BOQ
THEN Surface Protection section should appear in consolidated BOQ
AND line items should be grouped by coating/lining type
AND quantities should include waste allowance
```

### 5. Document Generation

#### 5.1 Coating Schedule PDF
```
GIVEN user has completed coating specification
WHEN user generates coating schedule PDF
THEN PDF should include system summary table
AND include surface prep requirements
AND include DFT requirements per coat
AND include cure times and overcoat windows
```

#### 5.2 Inspection Checklist
```
GIVEN user has completed coating specification
WHEN user generates inspection checklist
THEN checklist should include hold points
AND include pass/fail columns
AND include reference standards
```

#### 5.3 ITP Generation
```
GIVEN user has completed coating specification
WHEN user generates ITP
THEN ITP should include all inspection stages
AND indicate H/W/R points (Hold/Witness/Review)
AND include document references
```

### 6. Standards Compliance Validation

#### 6.1 ISO 12944 Compliance Check
```
GIVEN user has selected coating system
WHEN system validates against ISO 12944
THEN all 9 parts should be checked
AND any non-compliance should be flagged
AND recommendations should be provided
```

#### 6.2 Cathodic Protection Compatibility
```
GIVEN user has specified buried pipeline with CP
WHEN system validates coating selection
THEN incompatible coatings should be flagged
AND disbondment risk should be indicated
AND test standards should be referenced
```

#### 6.3 VOC Compliance
```
GIVEN user has specified region for installation
WHEN system validates product VOC content
THEN regional VOC limits should be applied
AND exceedances should be flagged
AND low-VOC alternatives should be suggested
```

### 7. Error Handling

#### 7.1 Incomplete Profile Warning
```
GIVEN user has not completed all required fields
WHEN user attempts to generate recommendations
THEN system should indicate missing fields
AND provide guidance on required inputs
```

#### 7.2 API Error Recovery
```
GIVEN API returns error for system lookup
WHEN user is viewing recommendations
THEN error message should be displayed
AND fallback recommendations should be shown if available
AND retry option should be provided
```

### 8. Cross-Browser Testing

Test all scenarios on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### 9. Responsive Design Testing

Test all scenarios on:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

## Test Data Requirements

### Mock Data Sets
1. Standard atmospheric exposure (C3, Medium durability)
2. Severe marine exposure (C5, High durability)
3. Buried pipeline with CP (Soil, Extended life)
4. High-temperature service (>200°C)
5. Chemical immersion service

### API Mocking
- Mock `/api/coating/systems` endpoint
- Mock `/api/coating/products` endpoint
- Mock BOQ submission endpoint

## Success Criteria

- All test scenarios pass
- No console errors during test execution
- Page load times < 3 seconds
- Form interactions responsive < 100ms
- PDF generation completes < 5 seconds
