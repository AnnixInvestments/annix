# DNV-OS-C101 Design of Offshore Steel Structures (LRFD Method)

> Source: DNV-OS-C101, April 2011
> This document contains key reference data extracted for use by the Annix structural steel module.

## 1. Overview

DNV-OS-C101 provides requirements for design of offshore steel structures using the Load and Resistance Factor Design (LRFD) method. The standard covers:
- Design principles and methods
- Loads and load effects
- Structural categorisation and material selection
- Ultimate limit states (ULS)
- Fatigue limit states (FLS)
- Accidental limit states (ALS)
- Serviceability limit states (SLS)

## 2. Limit States

### 2.1 Limit State Definitions

| Limit State | Abbreviation | Description |
|-------------|--------------|-------------|
| Ultimate | ULS | Ultimate resistance for carrying loads (yield, buckling) |
| Fatigue | FLS | Possibility of failure due to cyclic loading |
| Accidental | ALS | Damage due to accidental event or operational failure |
| Serviceability | SLS | Criteria applicable to normal use or durability |

### 2.2 ULS Examples
- Loss of structural resistance (excessive yielding and buckling)
- Brittle fracture failure
- Loss of static equilibrium (overturning, capsizing)
- Transformation into a mechanism (collapse)

## 3. Load Factors for ULS

### 3.1 Load Factor Combinations

| Combination | G (Permanent) | Q (Variable) | E (Environmental) | D (Deformation) |
|-------------|---------------|--------------|-------------------|-----------------|
| a) | 1.3 | 1.3 | 0.7 | 1.0 |
| b) | 1.0 | 1.0 | 1.3 | 1.0 |

Notes:
- When G and Q are well defined (e.g. hydrostatic pressure), γf = 1.2 may be used in combination a)
- If γf = 1.0 on G and Q in combination a) gives higher design load effect, use 1.0
- For unmanned structures during extreme conditions, γf for E may be reduced to 1.15 in combination b)

### 3.2 Load Factors for Other Limit States

| Limit State | Load Factor γf |
|-------------|----------------|
| FLS | 1.0 (all load categories) |
| SLS | 1.0 (all load categories) |
| ALS | 1.0 |

## 4. Characteristic Load Basis

### 4.1 Operating Design Conditions

| Load Category | ULS | FLS | ALS (Intact) | ALS (Damaged) | SLS |
|---------------|-----|-----|--------------|---------------|-----|
| Permanent (G) | Expected value | Expected value | Expected value | Expected value | Expected value |
| Variable (Q) | Specified value | Specified value | Specified value | Specified value | Specified value |
| Environmental (E) | 10⁻² annual probability (100-year) | Expected load history | N/A | ≥1-year return | Specified value |
| Accidental (A) | - | - | Specified value | - | - |
| Deformation (D) | Expected extreme | Expected extreme | Expected extreme | Expected extreme | Expected extreme |

### 4.2 Environmental Load Combinations for ULS (10⁻² annual probability)

| Wind | Waves | Current | Ice | Sea Level |
|------|-------|---------|-----|-----------|
| 10⁻² | 10⁻² | 10⁻¹ | - | 10⁻² |
| 10⁻¹ | 10⁻¹ | 10⁻² | - | 10⁻² |
| 10⁻¹ | 10⁻¹ | 10⁻¹ | 10⁻² | Mean water level |

## 5. Material Factors

### 5.1 General Material Factors

| Application | Material Factor γM |
|-------------|-------------------|
| Plated structures | 1.15 |
| Tubular structures | 1.15 |
| Eurocode 3 Class 1, 2, 3 cross sections | 1.15 |
| Eurocode 3 Class 4 cross sections | 1.15 |
| Eurocode 3 buckling resistance | 1.15 |

### 5.2 Shell Buckling Material Factors

| Structure Type | λ ≤ 0.5 | 0.5 < λ < 1.0 | λ ≥ 1.0 |
|----------------|---------|---------------|---------|
| Girders, beams, stiffeners on shells | 1.15 | 1.15 | 1.15 |
| Shells of single curvature | 1.15 | 0.85 + 0.60λ | 1.45 |

Where λ = reduced slenderness = √(fy/fE)

### 5.3 Slip Resistant Bolt Connection Factors

| Hole Type | Material Factor γMs |
|-----------|---------------------|
| Standard clearances | 1.25 |
| Oversized holes | 1.4 |
| Long slotted holes | 1.4 |
| Load factor 1.0 design | 1.1 |

## 6. Structural Categories

### 6.1 Category Definitions

| Category | Principle |
|----------|-----------|
| Special | Parts where failure has substantial consequences AND stress conditions may increase brittle fracture probability |
| Primary | Parts where failure will have substantial consequences |
| Secondary | Parts where failure will be without significant consequence |

### 6.2 Inspection Categories

| Inspection Category | Structural Category |
|--------------------|---------------------|
| I | Special |
| II | Primary |
| III | Secondary |

## 7. Steel Grade Selection

### 7.1 Material Strength Groups

| Designation | Strength Group | Minimum Yield fy (N/mm²) |
|-------------|----------------|--------------------------|
| NV | Normal Strength (NS) | 235 |
| NV-27 | High Strength (HS) | 265 |
| NV-32 | High Strength (HS) | 315 |
| NV-36 | High Strength (HS) | 355 |
| NV-40 | High Strength (HS) | 390 |
| NV-420 | Extra High Strength (EHS) | 420 |
| NV-460 | Extra High Strength (EHS) | 460 |
| NV-500 | Extra High Strength (EHS) | 500 |
| NV-550 | Extra High Strength (EHS) | 550 |
| NV-620 | Extra High Strength (EHS) | 620 |
| NV-690 | Extra High Strength (EHS) | 690 |

### 7.2 Steel Grade Test Temperatures

| Strength Group | Grade | Test Temperature (°C) |
|----------------|-------|----------------------|
| NS | A | Not tested |
| NS | B/BW | 0 |
| NS | D/DW | -20 |
| NS | E/EW | -40 |
| HS | A/AW | 0 |
| HS | D/DW | -20 |
| HS | E/EW | -40 |
| HS | F | -60 |
| EHS | A | 0 |
| EHS | D/DW | -20 |
| EHS | E/EW | -40 |
| EHS | F | -60 |

Note: W suffix indicates improved weldability grades

### 7.3 Thickness Limitations by Service Temperature (Primary Category)

| Grade | ≥10°C | 0°C | -10°C | -20°C | -25°C | -30°C |
|-------|-------|-----|-------|-------|-------|-------|
| A | 30 | 20 | 10 | N.A. | N.A. | N.A. |
| B/BW | 40 | 30 | 25 | 20 | 15 | 10 |
| D/DW | 70 | 60 | 50 | 40 | 35 | 30 |
| E/EW | 150 | 150 | 100 | 80 | 70 | 60 |
| AH/AHW | 30 | 25 | 20 | 15 | 12.5 | 10 |
| DH/DHW | 60 | 50 | 40 | 30 | 25 | 20 |
| EH/EHW | 120 | 100 | 80 | 60 | 50 | 40 |
| FH | 150 | 150 | 150 | 150 | * | * |

All values in mm. N.A. = not applicable. * = special consideration required.

## 8. Service Temperature Requirements

### 8.1 Floating Units
- Above lowest waterline: Service temperature ≤ design temperature
- Below lowest waterline: Service temperature ≥ 0°C

### 8.2 Bottom Fixed Units
- Above LAT (Lowest Astronomical Tide): Service temperature ≤ design temperature
- Below LAT: Service temperature ≥ 0°C

## 9. Variable Functional Loads on Deck

### 9.1 Deck Area Loads

| Area Type | Local Design p (kN/m²) | Point Load P (kN) | Primary Factor | Global Factor |
|-----------|------------------------|-------------------|----------------|---------------|
| Storage areas | q | 1.5q | 1.0 | 1.0 |
| Lay down areas | q | 1.5q | f | f |
| Lifeboat platforms | 9.0 | 9.0 | 1.0 | May be ignored |
| Area between equipment | 5.0 | 5.0 | f | May be ignored |
| Walkways, staircases, crew spaces | 4.0 | 4.0 | f | May be ignored |
| Walkways for inspection only | 3.0 | 3.0 | f | May be ignored |
| Areas not exposed to other loads | 2.5 | 2.5 | 1.0 | - |

Where: f = min{1.0; (0.5 + 3/√A)}, A = loaded area in m²
Note: Lay down areas minimum 15 kN/m²

## 10. Tank Design Pressures

### 10.1 Internal Design Pressure Formula
```
pd = ρ × g₀ × hop × (γf,G,Q + (av/g₀) × γf,E) (kN/m²)
```

Where:
- ρ = density of liquid (t/m³), minimum 1.025 for seawater
- g₀ = 9.81 m/s²
- hop = vertical distance from load point to maximum filling height (m)
- av = maximum vertical acceleration (m/s²)
- γf,G,Q = load factor for permanent and functional loads
- γf,E = load factor for environmental loads

### 10.2 With Air Pipe Filling
```
pd = (ρ × g₀ × hop + pdyn) × γf,G,Q (kN/m²)
```
Where pdyn = pressure due to flow through pipes (minimum 25 kN/m²)

## 11. Plating and Stiffener Design

### 11.1 Minimum Thickness
```
t = 14.3 × t₀ / √fyd (mm)
```
Where:
- t₀ = 7 mm for primary structural elements
- t₀ = 5 mm for secondary structural elements
- fyd = fy/γM (design yield strength)

### 11.2 Plate Thickness for Lateral Pressure
```
t = 15.8 × ka × s × √(pd / (σpd1 × kpp)) (mm)
```

Where:
- ka = correction factor for aspect ratio = (1.1 - 0.25×s/l)², max 1.0, min 0.72
- s = stiffener spacing (m)
- pd = design pressure (kN/m²)
- σpd1 = design bending stress = min{1.3(fyd - σjd), fyd}
- kpp = fixation parameter (1.0 clamped, 0.5 simply supported)

### 11.3 Stiffener Section Modulus
```
Zs = (l² × s × pd) / (km × σpd2 × kps) × 10⁶ (mm³), minimum 15 × 10³ mm³
```

Where:
- l = stiffener span (m)
- km = bending moment factor
- σpd2 = fyd - σjd
- kps = fixation parameter (1.0 if one end clamped, 0.9 if both simply supported)

## 12. Bending Moment Factors (km)

| Support Condition | Position 1 (Support) | Position 2 (Field) | Position 3 (Support) |
|-------------------|---------------------|--------------------|--------------------|
| Simply supported both ends | 8 | - | 8 |
| Fixed both ends | 12 | 24 | 12 |
| Fixed one end, simply supported other | 14.2 | 8 | - |
| Continuous | 10 | - | 10 |

## 13. Slip Resistant Bolt Connections

### 13.1 Design Slip Resistance
```
Rd = (ks × n × μ × Fpd) / γMs
```

Where:
- ks = hole clearance factor (1.0 standard, 0.85 oversized, 0.70 long slotted)
- n = number of friction interfaces
- μ = friction coefficient
- Fpd = design preloading force = 0.7 × fub × As

### 13.2 Friction Coefficients

| Surface Category | μ | Surface Treatment |
|------------------|---|-------------------|
| A | 0.5 | Shot/grit blasted, spray metallised with Al or Zn |
| B | 0.4 | Shot/grit blasted, alkali-zinc silicate paint (50-80μm) |
| C | 0.3 | Wire brushed or flame cleaned |
| D | 0.2 | Not treated |

### 13.3 Bolt Hole Clearances (Standard)

| Bolt Diameter (mm) | Clearance (mm) |
|-------------------|----------------|
| 12, 14 | 1 |
| 16 to 24 | 2 |
| 27 and larger | 3 |

### 13.4 Bolt Hole Clearances (Oversized)

| Bolt Diameter (mm) | Clearance (mm) |
|-------------------|----------------|
| 12 | 3 |
| 14 to 22 | 4 |
| 24 | 6 |
| 27 | 8 |

## 14. Tubular Member D/t Ratio Limit

Local buckling need not be considered when:
```
D/t ≤ 0.5 × E/fy
```

Where:
- D = diameter
- t = thickness
- E = modulus of elasticity
- fy = specified minimum yield stress

## 15. Fatigue Design

### 15.1 General Requirements
- S-N curves based on 97.6% probability of survival (mean minus 2 standard deviations)
- Design fatigue life based on specified service life (default 20 years)
- Fatigue failure defined as crack through thickness
- Reference: DNV-RP-C203

### 15.2 Design Fatigue Factors (DFF)

| Access for Inspection | Structural Category |
|----------------------|---------------------|
| | Special | Primary | Secondary |
| Below splash zone, no access | 10 | 3 | 2 |
| Accessible for inspection | 3 | 2 | 1 |
| Above splash zone | 2 | 1 | 1 |

## 16. Referenced Standards

| Standard | Description |
|----------|-------------|
| DNV-OS-B101 | Metallic Materials |
| DNV-OS-C401 | Fabrication and Testing of Offshore Structures |
| DNV-RP-C201 | Buckling Strength of Plated Structures |
| DNV-RP-C202 | Buckling Strength of Shells |
| DNV-RP-C203 | Fatigue Design of Offshore Steel Structures |
| DNV-RP-C205 | Environmental Conditions and Environmental Loads |
| Classification Note 30.1 | Buckling Strength Analysis of Bars and Frames |
| Classification Note 30.6 | Structural Reliability Analysis |
| Classification Note 30.7 | Fatigue Assessment of Ship Structures |

---

*This reference document is maintained as part of the Annix application codebase for use by the structural steel module.*
*Last updated: 2026-01-24*
