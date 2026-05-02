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
