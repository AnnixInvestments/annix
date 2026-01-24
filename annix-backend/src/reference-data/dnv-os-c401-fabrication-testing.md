# DNV-OS-C401 Fabrication and Testing of Offshore Structures

> Source: DNV-OS-C401, October 2014
> This document contains key reference data extracted for use by the Annix structural steel module.

## 1. Overview

DNV-OS-C401 provides requirements for fabrication and testing of offshore steel structures including:
- Welding procedures and welder qualification
- Fabrication and tolerances
- Non-destructive testing (NDT)
- Tightness and structural tests
- Corrosion protection systems

## 2. Welding Procedures

### 2.1 Essential Variables for C-Mn and Low Alloy Steel

Changes requiring new qualification:

| Category | Essential Variable Change |
|----------|---------------------------|
| Process | Any change of welding process |
| Technique | Change from weaving to stringer bead or vice versa |
| Pass | Change from multi-pass to one-pass welding |
| Current | Change from AC to DC or vice versa, or polarity change |
| Transfer | Change from spray/globular arc to short arc/pulse, or vice versa |
| Interpass | Any increase above maximum recorded for WPQT |
| Heat Input | Change beyond ±25% (±10% for >5 kJ/mm or fy ≥420 MPa) |
| Preheat | Any decrease in preheating temperature |
| PWHT | Change of parameters (except holding time adjusted for thickness) |

### 2.2 Qualified Thickness Range (Butt Welds)

| Test Piece Thickness (t) | Qualification Range |
|--------------------------|---------------------|
| t ≤ 3 mm | 0.7t to 1.3t |
| 3 < t ≤ 12 mm | 3 mm to 1.3t |
| 12 < t ≤ 100 mm | 0.5t to 1.1t |
| t > 100 mm | 0.5t to 1.1t (max 2t) |

### 2.3 Qualified Diameter Range (Pipes)

| Test Piece Diameter (D) | Qualification Range |
|-------------------------|---------------------|
| D ≤ 25 mm | 0.5D to 2D |
| D > 25 mm | ≥ 0.5D (and plates) |

Note: Pipes with D > 500 mm are equivalent to plates

### 2.4 Qualified Fillet Weld Throat Thickness

| Throat Thickness (a) | Qualification Range |
|----------------------|---------------------|
| a < 10 mm | 0.7a to 2a |
| a ≥ 10 mm | ≥ 5 mm |

### 2.5 Welding Position Qualification (Steel)

| Test Weld | Test Position | Qualified Butt Positions | Qualified Fillet Positions |
|-----------|---------------|--------------------------|----------------------------|
| Butt plates | 2G + 3G | All | All |
| Butt plates | 1G | 1G | 1F |
| Butt plates | 2G | 1G, 2G, 4G | 1F, 2F, 4F |
| Butt plates | 3G | 3G | 3F |
| Butt plates | 4G | 1G, 4G | 1F, 4F |
| Butt pipes | 2G + 5G = 6G | All | All |
| Butt pipes | 1G | 1G | 1F |
| Butt pipes | 2G | 1G, 2G, 4G | 1F, 2F, 4F |
| Butt pipes | 5G | All | All |

Note: Vertical downwards position shall be qualified separately

## 3. Fabrication Tolerances

### 3.1 Alignment and Straightness Tolerances

| Detail | Tolerance Formula | Notes |
|--------|-------------------|-------|
| Bars and frames | δ = 0.0015 × l | l = unsupported length |
| Pillars, vertical columns | δ = 0.001 × l | Max inclination |
| Stiffener webs to plate | δ = 0.0015 × l | l = unsupported length |
| Stiffener flanges to web | δ = 0.0015 × l | l = unsupported flange length |
| Parallel stiffener misalignment | δ = 0.02 × s | s = stiffener spacing |
| Plate out-of-plane | δ = 0.005 × s | s = panel width |
| Cylindrical shell radius | δ = 0.005 × r | ra - r deviation at ring stiffener |
| Cylindrical shell stiffeners | δ = 0.0015 × l | l = unsupported length |
| Cylindrical shell flanges | δ = 0.0015 × l | l = unsupported flange length |
| Longitudinal stiffener misalignment | δ = 0.02 × s | s = stiffener spacing |

### 3.2 Local Out-of-Roundness (Cylindrical Shells)

```
δ = 0.01g / (1 + g/r)
```

Where:
- g = length of template or rod
- r = nominal radius of shell

Template length = smallest of: s, 1.15√(l×r×t), π×r/2

### 3.3 Butt Joint Alignment Tolerances

| Plate Thickness | Maximum Misalignment |
|-----------------|---------------------|
| t ≤ 10 mm | 0.15t but max 3 mm |
| 10 < t ≤ 20 mm | 3 mm |
| t > 20 mm | 0.15t but max 6 mm |

### 3.4 Butt Joint Tapering

| Condition | Taper Ratio |
|-----------|-------------|
| Thickness difference > 4 mm | 1:3 minimum |
| Fatigue-prone joints | 1:4 minimum |

## 4. Cold Deformation Limits

| Deformation Level | Requirement |
|-------------------|-------------|
| < 5% | Allowed without qualification |
| 5% to 12% | Requires qualification (impact testing of strained and strain-aged material) |
| > 12% | Requires special agreement, heat treatment, full qualification including weldability testing |

### 4.1 Deformation Calculation Formulas

Single curvature (plates to cylinders):
```
e = (t / 2Rc) × 100%
```

Single curvature (pipes to bends):
```
e = (D / 2Rc) × 100%
```

Double curvature (plates to spheres):
```
e = (t × (1 + ν) / 2Rc) × 100%
```

Where:
- t = material thickness
- D = outside diameter
- Rc = forming radius
- ν = Poisson's ratio (0.5 for plastic condition)

## 5. Post Weld Heat Treatment (PWHT)

### 5.1 General Requirements

| Parameter | Requirement |
|-----------|-------------|
| Soaking temperature | 550°C to 620°C |
| Holding time | Minimum 2 minutes per mm thickness |
| Temperature difference (surfaces) | ≤ 30°C during soaking |
| Temperature difference (symmetry) | ≤ 30°C above 300°C |
| Furnace temperature distribution | ± 15°C |

### 5.2 Quenched and Tempered Steels

Maximum PWHT temperature = Tempering temperature - 30°C

## 6. Non-Destructive Testing (NDT)

### 6.1 NDT Extent by Inspection Category

| Category | Type | Visual | MT/PT | RT | UT |
|----------|------|--------|-------|-----|-----|
| Special (I) | Butt weld | 100% | 100% | 100% | 100% |
| Special (I) | T-joints, full pen | 100% | 100% | - | - |
| Special (I) | T-joints, partial/fillet | 100% | 100% | - | - |
| Primary (II) | Butt weld | 100% | 20% | 10% | 20% |
| Primary (II) | T-joints, full pen | 100% | 20% | - | - |
| Primary (II) | T-joints, partial/fillet | 100% | 20% | - | - |
| Secondary (III) | Butt weld | 100% | Spot | Spot | Spot |
| Secondary (III) | T-joints, full pen | 100% | Spot | - | Spot |
| Secondary (III) | T-joints, partial/fillet | 100% | Spot | - | - |

Notes:
- Spot = approximately 2% to 5%
- PT required for non-ferromagnetic materials
- UT minimum thickness 10 mm (8 mm with special qualification)

### 6.2 NDT Timing

| Steel Grade | Thickness | Delay After Welding |
|-------------|-----------|---------------------|
| ≥ NV 420 | ≥ 40 mm | 48 hours |
| ≤ NV 420 | < 40 mm | May be reduced by agreement |
| ≤ NV 36 | < 40 mm | May be reduced by agreement |

### 6.3 Acceptance Criteria Standards

| Structural Category | Steel | Aluminium |
|--------------------|-------|-----------|
| Special | ISO 5817 Level B | ISO 10042 Level B |
| Primary | ISO 5817 Level C | ISO 10042 Level C |
| Secondary | ISO 5817 Level C | ISO 10042 Level C |

### 6.4 UT Calibration Reference Blocks

| Material Thickness | Block Thickness | Hole Diameter | Hole Position |
|--------------------|-----------------|---------------|---------------|
| 10 < t ≤ 50 mm | 40 mm or t | Ø3 ± 0.2 mm | t/2 and t/4 |
| 50 < t ≤ 100 mm | 75 mm or t | Ø3 ± 0.2 mm | t/2 and t/4 |
| 100 < t ≤ 150 mm | 125 mm or t | Ø6 ± 0.2 mm | t/2 and t/4 |
| 150 < t ≤ 200 mm | 175 mm or t | Ø6 ± 0.2 mm | t/2 and t/4 |
| 200 < t ≤ 250 mm | 225 mm or t | Ø6 ± 0.2 mm | t/2 and t/4 |
| t > 250 mm | 275 mm or t | Ø6 ± 0.2 mm | t/2 and t/4 |

### 6.5 MT Field Strength Requirements

| Equipment | Requirement |
|-----------|-------------|
| Prods | 2.4 to 4.0 kA/m field strength |
| AC yokes | 4.5 kg minimum lifting force at max pole spacing |

## 7. Tightness and Structural Testing

### 7.1 Air Test

| Parameter | Requirement |
|-----------|-------------|
| Maximum pressure | 0.2 bar |
| Inspection pressure | 0.15 bar minimum |

### 7.2 Hydraulic Test

| Parameter | Requirement |
|-----------|-------------|
| Minimum pressure at top | 25 kN/m² |
| Holding time | At least 20 minutes |

### 7.3 Hose Test

| Parameter | Requirement |
|-----------|-------------|
| Pressure | At least 200 kN/m² |
| Maximum distance | 1.5 m |
| Minimum nozzle diameter | 12.0 mm |

## 8. Surface Preparation and Coating

### 8.1 Surface Preparation Requirements

| Parameter | Requirement |
|-----------|-------------|
| Cleanliness standard | ISO 8501-1 Sa 2½ |
| Imperfection grade | ISO 8501-3 P3 |
| Roughness | 50 - 85 μm per ISO 8503 |
| Maximum salt contamination | 50 mg/m² NaCl equivalent |
| Dust quantity/size | Rating 2 per ISO 8502-3 |

### 8.2 Coating Application Conditions

| Parameter | Requirement |
|-----------|-------------|
| Steel temperature | 3°C above dew point |
| Relative humidity | < 85% |

## 9. Welding Consumable Requirements

### 9.1 Hydrogen Limits

| Steel Type | Maximum Hydrogen (HDM) |
|------------|------------------------|
| High strength steel | ≤ 10 ml/100g (H10) |
| Extra high strength steel | ≤ 5 ml/100g (H5) |

## 10. Bolt Requirements

### 10.1 Property Class Limits

| Environment | Maximum Property Class |
|-------------|------------------------|
| Atmospheric | ISO 898 Class 10.9 |
| Submerged in seawater | ISO 898 Class 8.8 |
| H₂S service (NACE) | Lower than Class 8.8 |

### 10.2 Major Structural Bolts

- Specified minimum yield stress > 490 N/mm²: Alloy steel required
- Alloy requirement: (%Cr + %Mo + %Ni) ≥ 0.50
- Condition: Quenched and tempered

## 11. Repair Requirements

### 11.1 Repair Limits

| Condition | Requirement |
|-----------|-------------|
| Repair depth > ¼ thickness | Separate repair WPQT required |
| Repair attempts in same area | Maximum 2 times |
| Minimum repair length | 50 mm |
| Defect removal extension | 50 mm beyond defect on each side |

### 11.2 Heavy Section Repair (≥ 50 mm)

| Parameter | Requirement |
|-----------|-------------|
| Preheat increase | +50°C above production WPS |
| Minimum preheat | 100°C |

### 11.3 Grinding Repair Limits

- Maximum thickness reduction: 7% of nominal (but not > 3 mm)
- Minimum remaining: 93% of nominal thickness

## 12. CTOD Requirements

### 12.1 Fracture Mechanics Testing

| Parameter | Requirement |
|-----------|-------------|
| Minimum specimens per location | 3 (weld deposit + HAZ) |
| Acceptance criterion | δ ≥ 0.15 mm |
| Test temperature | ≤ service temperature |
| Heat input | Maximum used in fabrication |

### 12.2 Characteristic CTOD Value

| Number of Valid Tests | Characteristic Value |
|-----------------------|---------------------|
| 3 to 5 | Lowest result |
| 6 to 10 | Second lowest result |
| 11 to 15 | Third lowest result |

---

*This reference document is maintained as part of the Annix application codebase for use by the structural steel module.*
*Last updated: 2026-01-24*
