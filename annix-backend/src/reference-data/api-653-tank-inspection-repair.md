# API 653 Tank Inspection, Repair, Alteration, and Reconstruction

> Source: API Standard 653, Third Edition, December 2001 (Addendum 1, September 2003)
> This document contains key reference data extracted for use by the Annix tanks module.

## 1. Scope

API 653 covers carbon and low alloy steel tanks built to API Standard 650 and its predecessor API 12C. It provides minimum requirements for maintaining the integrity of welded or riveted, nonrefrigerated, atmospheric pressure, aboveground storage tanks after they have been placed in service.

### 1.1 Atmospheric Pressure Definition
Tanks designed to withstand internal pressure up to but not exceeding 2.5 lbf/in² gauge.

### 1.2 Critical Zone Definition
The portion of tank bottom or annular plate within 3 inches of the inside edge of the shell, measured radially inward.

## 2. Definitions

| Term | Definition |
|------|------------|
| Alteration | Work involving cutting, burning, welding, or heating that changes physical dimensions/configuration |
| Repair | Work necessary to maintain or restore a tank to safe operation condition |
| Reconstruction | Work necessary to reassemble a tank that has been dismantled and relocated |
| Hot Tap | Procedure for installing a nozzle in a tank shell that is in service |
| Corrosion Rate | Total metal loss divided by the period of time over which loss occurred |

## 3. Inspection Requirements

### 3.1 Routine In-Service Inspections
- Performed by owner/operator personnel
- Maximum interval: 1 month
- Visual inspection of tank exterior surfaces

### 3.2 External Inspection
- Performed by authorized inspector
- Maximum interval: 5 years OR RCA/4N years, whichever is less
  - RCA = difference between measured and minimum required thickness (mils)
  - N = shell corrosion rate (mils per year)

### 3.3 Internal Inspection Intervals

| Condition | Maximum Interval |
|-----------|------------------|
| Corrosion rates known | Based on MRT calculation, max 20 years |
| Corrosion rates unknown | 10 years |
| Risk-Based Inspection (RBI) | As determined by RBI assessment |

### 3.4 Ultrasonic Thickness Inspection

| Condition | Maximum Interval |
|-----------|------------------|
| Corrosion rate unknown | 5 years |
| Corrosion rate known | RCA/2N years or 15 years, whichever is less |

## 4. Minimum Thickness Calculations

### 4.1 Shell Thickness Formula (Welded Tanks)

For determining minimum acceptable thickness for an entire shell course:
```
t_min = 2.6(H-1)DG / SE
```

For locally thinned areas or specific locations:
```
t_min = 2.6HDG / SE
```

Where:
- t_min = minimum acceptable thickness (inches), not less than 0.1 in.
- D = nominal tank diameter (ft)
- H = height from bottom of shell course to maximum liquid level (ft)
- G = highest specific gravity of contents
- S = maximum allowable stress (lbf/in²)
- E = joint efficiency

### 4.2 Allowable Stress Calculation

| Course | Stress Based on Yield (Y) | Stress Based on Tensile (T) |
|--------|---------------------------|------------------------------|
| Bottom and 2nd course | 0.80Y | 0.429T |
| All other courses | 0.88Y | 0.472T |

Use the smaller of the two calculated values.

For unknown materials: Y = 30,000 lbf/in², T = 55,000 lbf/in²

### 4.3 Critical Length (L) for Averaging Thickness
```
L = 3.7 × √(D × t₂)  (maximum 40 in.)
```
Where t₂ = least thickness in corroded area, exclusive of pits

### 4.4 Acceptance Criteria
- t₁ (average thickness over length L) ≥ t_min
- t₂ (minimum point thickness) ≥ 60% of t_min

## 5. Joint Efficiencies

### 5.1 Welded Joints (Table 4-2)

| Standard | Edition | Joint Type | Efficiency (E) |
|----------|---------|------------|----------------|
| API 650 | 7th & Later | Butt (Basic) | 1.00 |
| API 650 | 7th & Later | Butt (Appendix A - Spot RT) | 0.85 |
| API 650 | 7th & Later | Butt (Appendix A - No RT) | 0.70 |
| API 650 | 1st-6th | Butt | 0.85 |
| API 12C | 14th & 15th | Butt | 1.00 |
| API 12C | 14th & 15th | Lap (Full double) | 0.75 |
| API 12C | 3rd-13th | Butt | 0.85 |
| API 12C | 3rd-13th | Lap (Full fillet) | 0.70 |
| API 12C | 1st & 2nd | Butt | 0.70 |
| API 12C | 1st & 2nd | Lap (Single) | 0.35 |

### 5.2 Riveted Joints (Table 4-3)

| Joint Type | Number of Rivet Rows | Efficiency (E) |
|------------|----------------------|----------------|
| Lap | 1 | 0.45 |
| Lap | 2 | 0.60 |
| Lap | 3 | 0.70 |
| Lap | 4 | 0.75 |
| Butt (double strap) | 2 | 0.75 |
| Butt (double strap) | 3 | 0.85 |
| Butt (double strap) | 4 | 0.90 |
| Butt (double strap) | 5 | 0.91 |
| Butt (double strap) | 6 | 0.92 |

## 6. Material Allowable Stresses (Table 4-1)

### 6.1 ASTM Specifications

| Material | Yield (lbf/in²) | Tensile (lbf/in²) | Product Stress Lower (lbf/in²) | Product Stress Upper (lbf/in²) |
|----------|-----------------|-------------------|--------------------------------|--------------------------------|
| A 283-C | 30,000 | 55,000 | 23,600 | 26,000 |
| A 285-C | 30,000 | 55,000 | 23,600 | 26,000 |
| A 36 | 36,000 | 58,000 | 24,900 | 27,400 |
| A 516-55 | 30,000 | 55,000 | 23,600 | 26,000 |
| A 516-60 | 32,000 | 60,000 | 25,600 | 28,200 |
| A 516-65 | 35,000 | 65,000 | 27,900 | 30,700 |
| A 516-70 | 38,000 | 70,000 | 30,000 | 33,000 |
| A 537-Class 1 | 50,000 | 70,000 | 30,000 | 33,000 |
| A 537-Class 2 | 60,000 | 80,000 | 34,300 | 37,800 |
| Unknown | 30,000 | 55,000 | 23,600 | 26,000 |

## 7. Bottom Plate Requirements

### 7.1 Minimum Bottom Plate Thickness (Table 6-1)

| Tank Bottom/Foundation Design | Min Thickness at Next Inspection |
|-------------------------------|----------------------------------|
| No leak detection/containment | 0.10 in. |
| With leak detection/containment | 0.05 in. |
| Applied reinforced lining (>0.05 in.) per API RP 652 | 0.05 in. |

### 7.2 Minimum Remaining Thickness (MRT) Calculation
```
MRT = min(RT_bc, RT_ip) - O_i(StP_r + UP_r)
```

Where:
- RT_bc = minimum remaining thickness from bottom-side corrosion after repairs
- RT_ip = minimum remaining thickness from internal corrosion after repairs
- O_i = in-service interval (years to next inspection)
- StP_r = maximum rate of topside corrosion (0 for coated areas)
- UP_r = maximum rate of bottom-side corrosion (0 for cathodically protected areas)

### 7.3 Critical Zone Thickness
Unless stress analysis is performed:
- Minimum = smaller of 50% original thickness or 50% of t_min of lower shell course
- Never less than 0.1 in.

## 8. Annular Plate Requirements (Table 4-4)

For tanks with product specific gravity < 1.0:

| First Shell Course Thickness (in.) | Stress < 24,300 | Stress < 27,000 | Stress < 29,700 | Stress < 32,400 |
|------------------------------------|-----------------|-----------------|-----------------|-----------------|
| t ≤ 0.75 | 0.17 | 0.20 | 0.23 | 0.30 |
| 0.75 < t ≤ 1.00 | 0.17 | 0.22 | 0.31 | 0.38 |
| 1.00 < t ≤ 1.25 | 0.17 | 0.26 | 0.38 | 0.48 |
| 1.25 < t ≤ 1.50 | 0.22 | 0.34 | 0.47 | 0.59 |
| t > 1.50 | 0.27 | 0.40 | 0.53 | 0.68 |

Stress formula: 12.34 × D × (H-1) / t

## 9. Hot Tap Requirements

### 9.1 Connection Sizes and Shell Thickness (Table 9-1)

| Connection Size (NPS) | Minimum Shell Thickness (in.) |
|-----------------------|-------------------------------|
| ≤ 14 | 3/16 |
| ≤ 18 | 1/4 |

### 9.2 Hot Tap Restrictions
- Minimum liquid height above hot tap: 3 ft
- Not permitted on roof or in vapor space
- Not permitted on laminated or severely pitted shell plate
- Low hydrogen electrodes required
- For unknown toughness shells > 1/2 in.: max 4 in. NPS nozzle, stress < 7,000 lbf/in²

### 9.3 Minimum Spacing
Toe-to-toe spacing = √(R × T)
- R = tank shell radius (in.)
- T = shell plate thickness (in.)

## 10. Repair Plate Requirements

### 10.1 Minimum Dimensions for Shell Replacement Plates
- Minimum dimension: 12 in. or 12 × thickness, whichever is greater
- Shape: circular, oblong, square with rounded corners, or rectangular with rounded corners

### 10.2 Weld Spacing Requirements

| Dimension | t ≤ 0.5 in. | t > 0.5 in. |
|-----------|-------------|-------------|
| R (from bottom weld) | 6 in. | ≥ 6 in. or 6t |
| B (from vertical weld) | 6 in. | ≥ 10 in. or 8t |
| H (from horizontal weld) | 3 in. | ≥ 10 in. or 8t |
| V (between vertical welds) | 6 in. | ≥ 10 in. or 8t |
| A (minimum plate dimension) | 12 in. | ≥ 12 in. or 12t |
| C (from annular ring weld) | ≥ 3 in. or 5t | ≥ 3 in. or 5t |

### 10.3 Lap-Welded Patch Plates
- Maximum shell course thickness: 1/2 in.
- Repair plate thickness: 3/16 in. to 1/2 in.
- Minimum corner radius: 2 in.
- Maximum dimensions: 48 in. vertical × 72 in. horizontal
- Minimum overlap: 6 in. beyond shell seams

## 11. Welded-on Patch Plates for Bottoms

### 11.1 General Requirements
- Minimum dimension: 12 in. if overlapping seam or existing patch
- Minimum dimension: 6 in. if not overlapping seam and no existing patch
- Must extend beyond corroded area by at least 2 in.

### 11.2 Critical Zone Requirements
- Maximum thickness: 1/4 in.
- Tombstone shaped when within 6 in. of shell
- Two-pass minimum welds
- Maximum dimension along shell: 24 in.

## 12. Brittle Fracture Considerations

### 12.1 Safe Operating Conditions
- Shell thickness ≤ 0.5 in.: minimal risk
- Shell temperature ≥ 60°F: minimal risk
- Membrane stress < 7 ksi: minimal risk

### 12.2 Exemption Curve (Figure 5-2)
For tanks of unknown toughness, shell metal temperature vs. thickness:
- 0.5 in. thickness: exempt at any temperature
- 1.0 in. thickness: require ≥ 30°F
- 1.5 in. thickness: require ≥ 50°F
- 2.0 in. thickness: require ≥ 65°F

## 13. NDE Requirements Summary

### 13.1 Shell Penetrations
- UT for laminations before adding reinforcing plate or hot tap
- MT or PT for nozzle-to-shell and reinforcing plate welds
- Consider additional examination for unknown toughness > 1/2 in.

### 13.2 Shell Plate Welds
- New welds to existing plate: RT required
- Back-gouged root pass and final pass: MT or PT (plates > 1 in.)
- Full radiography required for weld joints

### 13.3 Shell-to-Bottom Weld
- Vacuum box test OR
- 15 psig air pressure test between inside/outside welds
- MT or PT under patch plates

### 13.4 Bottom Plates
- Visual examination
- Vacuum box or tracer gas test for repairs
- MT or PT for critical zone patch plates (root and final pass)

## 14. Hydrostatic Testing Requirements

### 14.1 Required For
- Reconstructed tanks
- Major repairs or alterations (unless exempted)
- Engineering evaluation indicates need

### 14.2 Major Repairs/Alterations Requiring Hydrotest
- Shell penetration > 12 in. NPS beneath design liquid level
- Bottom penetration within 12 in. of shell
- Shell plate replacement where longest dimension > 12 in.
- Removal/replacement of > 12 in. of vertical weld or radial annular weld
- New bottom installation
- Shell-to-bottom weld replacement
- Shell jacking

### 14.3 Exemption Requirements
- Engineer review and written approval
- Owner/operator written authorization
- Material testing per 12.3.2.2.1
- Full radiography of shell welds

## 15. Dimensional Tolerances

### 15.1 Plumbness
- Maximum out-of-plumb: 1/100 of total height or 5 in., whichever is less

### 15.2 Roundness (Radii Tolerances)

| Tank Diameter | Tolerance at 1 ft above bottom | Tolerance higher |
|---------------|-------------------------------|------------------|
| < 40 ft | ± 1/2 in. | ± 1-1/2 in. |
| 40 to < 150 ft | ± 1 in. | ± 3 in. |
| 150 to < 250 ft | ± 1-1/2 in. | ± 4-1/2 in. |
| ≥ 250 ft | ± 2 in. | ± 6 in. |

### 15.3 Peaking and Banding
- Peaking: max 1/2 in. with 36 in. horizontal sweep board
- Banding: max 1 in. with 36 in. vertical sweep board

### 15.4 Foundation Tolerances
With concrete ringwall:
- ± 1/8 in. in any 30 ft of circumference
- ± 1/4 in. in total circumference

Without concrete ringwall:
- ± 1/8 in. in any 10 ft of circumference
- ± 1/2 in. in total circumference

## 16. Weld Reinforcement Limits (Table 10-1)

| Plate Thickness | Vertical Joints | Horizontal Joints |
|-----------------|-----------------|-------------------|
| ≤ 1/2 in. | 3/32 in. | 1/8 in. |
| > 1/2 to 1 in. | 1/8 in. | 3/16 in. |
| > 1 in. | 3/16 in. | 1/4 in. |

---

*This reference document is maintained as part of the Annix application codebase for use by the tanks module.*
*Last updated: 2026-01-24*
