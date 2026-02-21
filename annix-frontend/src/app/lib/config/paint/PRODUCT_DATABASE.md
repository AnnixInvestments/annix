# Surface Protection Product Database

This document describes the data sources, structure, and update process for the Surface Protection product database.

## 1. Database Structure

### 1.1 Paint Products (`paintProducts.ts`)

Location: `annix-frontend/src/app/lib/config/paint/paintProducts.ts`

```typescript
interface PaintProduct {
  id: string;                    // Unique identifier
  name: string;                  // Product name
  supplier: PaintSupplier;       // Manufacturer
  genericType: GenericType;      // Coating chemistry
  productRole: ProductRole;      // primer|intermediate|topcoat|multi-purpose

  // Performance characteristics
  corrosivityRating: CorrosivityCategory[];  // Suitable categories
  heatResistance: {
    continuousC: number;         // Max continuous temp
    peakC: number;               // Max short-term temp
  };

  // Application properties
  dft: {
    minUm: number;
    typicalUm: number;
    maxUm: number;
  };
  volumeSolidsPercent: number;
  spreadingRateM2PerL?: number;

  // Cure properties
  curingAt23C: {
    touchDryHours: number;
    overcoatMinHours: number;
    fullCureDays: number;
  };
  overcoatIntervals: OvercoatInterval[];
  applicationTemp: {
    minAirC: number;
    maxAirC: number;
    minSurfaceC: number;
  };

  // Compatibility
  compatiblePreviousCoats: GenericType[];
  compatibleSubsequentCoats: GenericType[];

  // Certifications
  approvals: string[];
  surfaceTolerant: boolean;
}
```

### 1.2 Rubber Products (`rubberProducts.ts`)

Location: `annix-frontend/src/app/lib/config/rubber/rubberProducts.ts`

```typescript
interface RubberProduct {
  id: string;
  name: string;
  supplier: RubberSupplier;
  rubberType: RubberType;        // NR|SBR|NBR|EPDM|Butyl|CR|Viton

  // Physical properties
  hardnessIRHD: number;
  tensileStrengthMPa: number;
  elongationPercent: number;
  abrasionLossMm3: number;       // DIN abrasion

  // Service limits
  temperatureRange: {
    minC: number;
    maxC: number;
  };

  // Thickness options
  availableThicknessesMm: number[];

  // Standards compliance
  sansCompliance?: {
    type: 1 | 2 | 3;
    grade?: string;
  };
}
```

### 1.3 Ceramic Products (`ceramicProducts.ts`)

Location: `annix-frontend/src/app/lib/config/ceramic/ceramicProducts.ts`

```typescript
interface CeramicProduct {
  id: string;
  name: string;
  supplier: CeramicSupplier;
  ceramicType: CeramicType;      // Alumina|ZTA|Basalt|SiC|Chrome

  // Material properties
  aluminaContentPercent?: number;
  hardnessHV: number;
  densityKgM3: number;

  // Thermal properties
  maxServiceTempC: number;
  thermalShockResistance: 'Low' | 'Medium' | 'High';

  // Available forms
  availableForms: ('tile' | 'pipe' | 'cylinder' | 'cone')[];
  standardSizesMm: { length: number; width: number; thickness: number }[];
}
```

## 2. Data Sources

### 2.1 Paint Products

| Supplier | Data Source | Update Frequency |
|----------|-------------|------------------|
| Jotun | Technical Data Sheets (jotun.com) | Quarterly |
| Sigma (PPG) | SigmaCoatings.com TDS | Quarterly |
| Hempel | Hempel.com product library | Quarterly |
| International (AkzoNobel) | international-pc.com | Quarterly |
| Carboline | carboline.com | Quarterly |
| Sherwin-Williams | sherwin-williams.com/protective | Quarterly |
| StonCor | stonhard.com | Quarterly |

### 2.2 Rubber Products

| Supplier | Data Source | Update Frequency |
|----------|-------------|------------------|
| Truco | truco.co.za product sheets | Bi-annually |
| Linatex | weirminerals.com | Bi-annually |
| Warman | weirminerals.com | Bi-annually |

### 2.3 Ceramic Products

| Supplier | Data Source | Update Frequency |
|----------|-------------|------------------|
| CeramTec | ceramtec.com technical specs | Annually |
| Kingcera | kingcera.com product data | Annually |
| Bitossi | bitossiceramiche.com | Annually |

## 3. Update Process

### 3.1 Quarterly Updates (Paint)

1. **Data Collection**
   - Download latest TDS from supplier websites
   - Note any discontinued products
   - Identify new product additions

2. **Data Entry**
   - Update existing product properties
   - Add new products with complete data
   - Mark discontinued products (don't delete)

3. **Validation**
   - Run unit tests to verify data integrity
   - Check all required fields populated
   - Verify compatibility matrices

4. **Review**
   - Engineering review of changes
   - Cross-reference with supplier confirmations

### 3.2 Version Control

- All changes committed with descriptive messages
- Reference TDS revision numbers in commits
- Tag releases with date: `paint-db-YYYY-MM-DD`

### 3.3 Change Log Format

```markdown
## [YYYY-MM-DD]

### Added
- Product X from Supplier Y (TDS Rev A)

### Changed
- Product Z: Updated cure times per TDS Rev B
- Product W: Adjusted DFT range

### Deprecated
- Product V: Discontinued by manufacturer
```

## 4. Product Categories

### 4.1 Generic Types (Paint)

| Type | Description | Typical Use |
|------|-------------|-------------|
| zinc-silicate | Inorganic zinc primer | Offshore, severe atmospheric |
| zinc-rich-epoxy | Organic zinc primer | General industrial |
| epoxy | General purpose epoxy | Universal |
| epoxy-mio | Micaceous iron oxide epoxy | Intermediate coat |
| epoxy-mastic | Surface-tolerant epoxy | Maintenance |
| epoxy-phenolic | Chemical resistant epoxy | Tanks, immersion |
| epoxy-glass-flake | Barrier epoxy | Splash zone, immersion |
| coal-tar-epoxy | Tar-modified epoxy | Buried, immersion |
| polyurethane | Aliphatic PU | UV-resistant topcoat |
| polysiloxane | Silicone-modified | Low maintenance topcoat |
| polyurea | Fast-cure elastomer | Quick return to service |
| high-temp-silicone | Silicone-based | >200°C applications |
| intumescent | Fire protection | Steel fire rating |
| fbe | Fusion bonded epoxy | Pipeline |
| 3lpe | Three-layer PE | Pipeline |

### 4.2 Rubber Types

| Type | Full Name | Key Properties |
|------|-----------|----------------|
| NR | Natural Rubber | Impact, abrasion |
| SBR | Styrene Butadiene | General purpose |
| NBR | Nitrile | Oil resistance |
| EPDM | Ethylene Propylene | Heat, water |
| Butyl | Isobutylene Isoprene | Gas impermeability |
| CR | Chloroprene (Neoprene) | Weathering, oil |
| Viton/FKM | Fluoroelastomer | Chemical, heat |

### 4.3 Ceramic Types

| Type | Al2O3 Content | Hardness (HV) | Max Temp |
|------|---------------|---------------|----------|
| 92% Alumina | 92% | 1300-1400 | 1400°C |
| 95% Alumina | 95% | 1400-1500 | 1500°C |
| 99% Alumina | 99% | 1600-1800 | 1700°C |
| ZTA | 80-85% (+ZrO2) | 1500-1600 | 1500°C |
| Basalt | Natural | 800-900 | 300°C |
| SiC | - | 2500+ | 1400°C |

## 5. Data Quality Standards

### 5.1 Required Fields

All products must have:
- Unique ID (format: `{supplier}-{type}-{sequence}`)
- Complete name matching TDS
- Supplier attribution
- At least one corrosivity rating (paint)
- Temperature limits
- DFT or thickness data

### 5.2 Validation Rules

```typescript
// Paint products
assert(dft.minUm > 0);
assert(dft.maxUm >= dft.typicalUm);
assert(dft.typicalUm >= dft.minUm);
assert(volumeSolidsPercent >= 20 && volumeSolidsPercent <= 100);
assert(heatResistance.peakC >= heatResistance.continuousC);

// Rubber products
assert(hardnessIRHD >= 30 && hardnessIRHD <= 95);
assert(elongationPercent >= 100);
assert(temperatureRange.maxC > temperatureRange.minC);

// Ceramic products
assert(hardnessHV >= 500);
assert(densityKgM3 >= 2500);
```

### 5.3 Compatibility Matrix Maintenance

When adding new generic types:
1. Update `GenericType` union
2. Add to `typeOrder` in sorting functions
3. Define compatibility with existing types
4. Update all product `compatiblePreviousCoats` and `compatibleSubsequentCoats`

## 6. API Integration

### 6.1 Backend Sync

Products are primarily stored in frontend for performance. Backend maintains:
- Pricing data (per supplier, per product)
- Stock availability
- Lead time information

### 6.2 Product Lookup

```typescript
// By ID
const product = paintProducts.find(p => p.id === 'jotun-zre-001');

// By criteria
const primers = paintProducts.filter(p =>
  p.productRole === 'primer' &&
  p.corrosivityRating.includes('C5')
);

// Temperature filtered
const highTemp = productsForTemperature(300);
```

## 7. Contact Information

### 7.1 Data Steward

Technical queries regarding product data should be directed to the engineering team.

### 7.2 Supplier Contacts

Maintain supplier contact list for:
- TDS requests
- Product discontinuation notices
- New product notifications
- Technical clarifications

## 8. Future Enhancements

### 8.1 Planned Additions

- VOC content per regional regulations
- Carbon footprint data
- BIM/Revit material properties
- Cost indices by region

### 8.2 Integration Plans

- Real-time stock availability from ERP
- Automated TDS parsing for updates
- Supplier API integration where available
