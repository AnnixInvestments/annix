# RFQ / Pipe Fabrication Domain Reference

This is reference material for working on the RFQ / piping side of the codebase. Consult when touching pricing, weld calculations, or steel-standards fields.

## Domain
This is a piping/fabrication quoting system for industrial suppliers. Key concepts:
- **RFQ (Request for Quote)**: Customer requests containing pipe specifications
- **BOQ (Bill of Quantities)**: Consolidated view of RFQ items for supplier pricing
- **Item Types**: Straight pipes, bends (segmented/smooth), fittings (tees, laterals, reducers)

## Weld Calculations
Weld linear meterage is calculated per item type:
- **Flange welds**: 2 welds per flanged connection (inside + outside) × circumference
- **Butt welds**: Where tangents connect to bends (numberOfTangents × circumference)
- **Mitre welds**: For segmented bends (numberOfSegments - 1) × circumference
- **Tee welds**: Where stubs/branches connect to main pipe (stub circumference)
- **Tack welds**: 8 × 20mm per loose flange

## Pricing Calculations
Fabricated item pricing uses:
- Steel weight × price per kg
- Flange weight × price per kg (by weight, not count)
- Weld linear meters × price per meter
- Labour & extras percentage (typically 3.5%)

## Key Config Files
- `annix-frontend/src/app/lib/config/rfq/pipeEndOptions.ts` - End configurations and weld counts
- `annix-frontend/src/app/lib/config/rfq/flangeWeights.ts` - NB to OD lookup, flange weights by NB
- `annix-frontend/src/app/lib/config/rfq/b16PressureTemperature.ts` - B16.5 P-T ratings and interpolation
- `annix-frontend/src/app/lib/config/rfq/complianceValidation.ts` - PSL2/NACE compliance validation
- `annix-frontend/src/app/lib/config/rfq/pipeTolerances.ts` - ASME B36.10M/B36.19M tolerances

## Steel Pipe Standards Fields

### API 5L PSL Levels
| Field | PSL1 | PSL2 |
|-------|------|------|
| `pslLevel` | "PSL1" | "PSL2" |
| `cvnTestTemperatureC` | Optional | Required |
| `cvnAverageJoules` | Optional | Required (≥27J typical) |
| `cvnMinimumJoules` | Optional | Required (≥20J typical) |
| `ndtCoveragePct` | Optional | Required (100%) |

**PSL2 vs PSL1 Key Differences:**
- PSL2 requires mandatory CVN (Charpy V-notch) impact testing
- PSL2 requires 100% NDT coverage (vs 10% for PSL1)
- PSL2 has tighter chemistry limits (lower sulfur/phosphorus)
- PSL2 requires full traceability

### NACE MR0175/ISO 15156 (Sour Service)
| Field | Description | Limit |
|-------|-------------|-------|
| `naceCompliant` | Boolean flag | true/false |
| `h2sZone` | H2S severity zone | 1 (severe), 2 (moderate), 3 (mild) |
| `maxHardnessHrc` | Max hardness | ≤22 HRC for carbon/low-alloy steel |
| `sscTested` | SSC testing performed | Required for Zone 1 |
| `carbonEquivalent` | CE value | ≤0.43 for weldability |

### Pipe Length Types
| `lengthType` | Label | Range |
|--------------|-------|-------|
| "SRL" | Single Random Length | 4.88m - 6.71m |
| "DRL" | Double Random Length | 10.67m - 12.8m |
| "Custom" | Custom Length | 0 - 24m |

## ASME B16.5 P-T Ratings

### Material Groups
- **Group 1.x**: Carbon and low-alloy steels (A105, A350 LF2, etc.)
- **Group 2.x**: Austenitic stainless steels (304, 316, 321, 347)
- **Group 3.x**: Chrome-moly steels and duplex (P11, P22, P91, 2205)

### Pressure Classes
Standard classes: 150, 300, 400, 600, 900, 1500, 2500

### P-T Rating Interpolation Rules
1. **Exact temperature match**: Use tabulated value directly
2. **Between table values**: Linear interpolation between adjacent points
   ```
   P = P_lower + (P_upper - P_lower) × (T - T_lower) / (T_upper - T_lower)
   ```
3. **Below minimum temperature**: Use rating at minimum table temperature
4. **Above maximum temperature**: Rating = 0 (no rating available)

### Class Selection Logic
`selectRequiredClass(pressureBar, temperatureC, materialGroup)` returns:
- Minimum pressure class that satisfies the P-T requirement
- Margin percentage above design pressure
- All alternatives with their ratings

## Testing/Certification Fields
| Field | Entity | Type | Description |
|-------|--------|------|-------------|
| `hydrotestPressureMultiplier` | All RFQs | decimal(3,2) | e.g., 1.50 for 1.5× design |
| `hydrotestHoldMin` | All RFQs | int | Hold time in minutes |
| `ndtMethods` | All RFQs | JSON string[] | ["RT", "UT", "MT", "PT", "VT"] |
| `lengthType` | Straight pipe only | varchar(10) | "SRL", "DRL", "Custom" |

## PVC Pipe Standards & Fittings (SA)

PVC pressure pipework in South Africa is governed by the SANS 966
family. Annix references the standards by name only — all embedded
dimension tables come from manufacturer catalogues (Flo-Tek, Marley,
Macneil, Sizabantu, Agrico, DPI). See `legal_sans_pvc_reproduction_rights.md`
for the legal posture; tracked in issue #288.

### Standards covered
- **SANS 966-1** — uPVC pressure pipe (Class 6 / 9 / 12 / 16 / 20 bar)
- **SANS 966-2** — mPVC modified PVC (Class 6–25 bar, lighter than uPVC for same class)
- **SANS 966-3** — PVC-O molecularly-oriented PVC (Class 12 / 16 / 20 / 25 bar)
- **SANS 1601** — injection-moulded solvent-weld fittings, DN ≤ 160
- **SANS 1808** — RRJ rubber-ring sockets
- **SANS 1123** — shared with HDPE; loose backing-flange tables

### Material grades

| Grade | Hoop stress (MPa) | Density (kg/m³) | Max temp (°C) | Notes |
|---|---|---|---|---|
| uPVC | 12.5 | 1400 | 60 | Cold water + drainage workhorse |
| mPVC | 18 | 1400 | 45 | Toughened alloy; thinner wall for same class |
| PVC-O | 25 | 1400 | 45 | Highest strength/weight; high-pressure mains + mining |
| cPVC | 13.5 | 1550 | 95 | Hot water + industrial chemical lines |

### Pressure class system
- Class number = working bar at 20 °C, safety factor 2.0.
- OD is **constant** across all classes for a given DN — wall
  thickness changes with class.
- No SDR convention for PVC (unlike HDPE) — wall is keyed on
  (DN, class, grade) directly from catalogue tables.

### Standard sizes & lengths
- DN range: 20 → 630 mm (mPVC up to 630; uPVC commonly to 500;
  PVC-O narrower 90–630).
- Effective length: **6.0 m** for DN 20–250, **5.8 m** for DN 315–500.
- Ends: integrated bell + spigot for RRJ; plain-cut for solvent-weld.
- No coils — PVC is rigid, straight lengths only.

### Joining methods

| Method | Typical DN | When used |
|---|---|---|
| Solvent cement | 20–160 (occasionally 200) | Standard with SANS 1601 fittings |
| Rubber ring joint (RRJ) | 50–630 | Default for buried mains DN ≥ 110 |
| Flanged | 50–500 | At pumps, valves, chambers — PVC stub + SANS 1123 backing ring |
| Threaded (BSP) | ≤ 50 | Adapters only, not pipe-to-pipe |
| Compression (Plasson / Philmac) | 50–160 | Transition fittings |

### Fittings dimensions

Injection-moulded fittings to SANS 1601 (DN 20–160) are tabulated
in `packages/product-data/pvc/`:
- `elbow-dimensions.ts` — 11.25° / 22.5° / 45° / 90° centre-to-face
- `tee-dimensions.ts` — equal + reducing tees (run + branch C/F)
- `reducer-dimensions.ts` — concentric reducer overall length
- `end-cap-dimensions.ts` — blind / socket caps
- `coupling-dimensions.ts` — slip / RRJ / repair family lengths

Larger fittings (DN ≥ 200) are site-fabricated from cut pipe
sections; dimensions are job-specific and quoted as fabricated
items (no canonical tables).

### Temperature derating

Working pressure must be multiplied by a derating factor when
service temperature is above 20 °C. Curves in `pvc/temperature-derating.ts`:
- uPVC / mPVC: linear drop, max service 45 °C (above → use cPVC, PVC-O, or step out of PVC).
- PVC-O: similar to uPVC, slightly tighter curve.
- cPVC: shallow curve, sustains pressure up to 95 °C.

API: `pvcDeratingFactor(grade, °C)` and `pvcDeratedWorkingPressure(grade, classBar, °C)`.

### BOQ section layout (supplier portal)

When a PVC RFQ is submitted, the consolidation produces these
sections (mirrors HDPE):
- `pvc_pipes` — straight pressure pipes consolidated by DN + class + grade
- `pvc_fittings` — moulded fittings (elbows, tees, reducers, caps)
- `pvc_stubs` — stub-flange adapters paired with backing rings
- `pvc_couplings` — slip / RRJ / repair coupling families priced separately

Bare PVC isn't coated or lined, so Int/Ext m² columns are
suppressed in the BOQ tables (same convention as HDPE).
