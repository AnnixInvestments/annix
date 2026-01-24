# ASME B31.3 Process Piping Code Reference

> Source: ASME B31.3 2008 Edition
> This document contains key reference data extracted for use by the Annix quoting application and Nix document processor.

## 1. Scope

ASME B31.3 covers piping for process plants, including:
- Chemical, petroleum, pharmaceutical, textile, paper, semiconductor, and cryogenic plants
- Related processing plants and terminals
- Piping systems with internal gauge pressure exceeding 15 psi (103 kPa)

## 2. Pipe Wall Thickness Calculations

### 2.1 Straight Pipe Under Internal Pressure (Section 304.1.2)

The pressure design thickness for straight pipe shall not be less than:

```
t = PD / (2(SEW + PY))
```

Where:
- t = pressure design thickness (mm)
- P = internal design gauge pressure (MPa)
- D = outside diameter of pipe (mm)
- S = allowable stress value from Table A-1 (MPa)
- E = quality factor from Table A-1A or A-1B
- W = weld joint strength reduction factor (Table 302.3.5)
- Y = coefficient from Table 304.1.1 (varies with material and temperature)

### 2.2 Minimum Wall Thickness

```
T(min) = t + c
```

Where:
- T(min) = minimum required wall thickness
- t = pressure design thickness
- c = sum of mechanical allowances (thread depth, corrosion, erosion)

## 3. Pipe Bends (Section 304.2)

### 3.1 Nomenclature (Section 304.2.1)

| Term | Definition |
|------|------------|
| R1 | Bend radius (centerline radius of pipe bend) |
| r2 | Mean radius of pipe using nominal wall T |
| Intrados | Inside bend radius |
| Extrados | Outside bend radius |
| θ | Bend angle |

### 3.2 Bend Thickness Requirements

After bending, the minimum thickness at any point shall be:

**At intrados (inside):**
```
t(i) = t × (R1 - r2) / (R1 - 0.5 × r2)
```

**At extrados (outside):**
```
t(o) = t × (R1 + r2) / (R1 + 0.5 × r2)
```

**At sidewall (bend centerline radius):**
```
t(s) = t
```

### 3.3 Bend Flattening Limits (Section 332.2.1)

Bend flattening shall not exceed:

| Condition | Maximum Flattening |
|-----------|-------------------|
| General Service | 8% of outside diameter |
| Severe Cyclic Service | 5% of outside diameter |

Flattening percentage = (D(max) - D(min)) / D(nominal) × 100%

### 3.4 Hot Bending Requirements (Section 332.4.1)

Post-bend heat treatment requirements based on material group and bend severity.

### 3.5 Cold Bending Requirements (Section 332.4.2)

Post-bend heat treatment may be required based on:
- Material susceptibility to work hardening
- Cold expansion exceeding 1.5%
- Service conditions (cyclic, corrosive)

## 4. Miter Bends (Section 304.2.3)

### 4.1 Miter Angle Limits

| Miter Type | Angle Limit (θ) | Calculation Method |
|------------|-----------------|-------------------|
| Single miter | ≤ 22.5° | Equation (4a) |
| Single miter | > 22.5° | Requires special analysis |
| Multiple miters | ≤ 22.5° per cut | Equation (4a) |

### 4.2 Single Miter Bend Calculation

For single miter with angle θ ≤ 22.5°:
```
Pm = P × c₁
```

Where:
- Pm = pressure rating of miter
- P = pressure rating of straight pipe
- c₁ = correction factor based on R1/r2 ratio

### 4.3 Design Constraints

- Maximum miter angle for severe cyclic conditions: θ ≤ 22.5°
- Total direction change > 45° not permitted for severe cyclic service
- Angular offset ≤ 3° does not require consideration as a miter bend

## 5. Branch Connections (Section 304.3)

### 5.1 Reinforcement Requirements

Branch connections require reinforcement unless the wall thickness is sufficiently in excess of minimum requirements.

**Required reinforcement area:**
```
A(req) = t × d₁ × (2 - sin β)
```

Where:
- t = pressure design thickness of run pipe
- d₁ = effective length removed from pipe at branch
- β = angle between branch and run

### 5.2 Available Reinforcement Areas

**From run pipe excess:**
```
A₁ = (T(h) - t) × d₁ × (2 - sin β)
```

**From branch pipe excess:**
```
A₂ = 2 × (T(b) - t(b)) × h × (1/sin β)
```

Where:
- T(h) = nominal run pipe thickness
- T(b) = nominal branch pipe thickness
- t(b) = pressure design thickness of branch
- h = reinforcement zone height

### 5.3 Branch Size Limits

| Run Pipe D/T Ratio | Branch Diameter Limit |
|--------------------|----------------------|
| D(h)/T(h) < 100 | No special limit |
| D(h)/T(h) ≥ 100 | Special considerations required |

## 6. Flanges (Section 308)

### 6.1 Flange Types and Applications

| Flange Type | Application | Weld Requirement |
|-------------|-------------|------------------|
| Slip-on | General service | Double-welded (inside + outside) |
| Welding-neck | High integrity | Full penetration groove weld |
| Socket-welding | Small bore (≤ NPS 2) | Fillet weld with expansion gap |
| Lap joint | Easy alignment | Welded to stub end |
| Threaded | Low pressure | No welding required |

### 6.2 Slip-on Flange Welding (Section 328.5.2B)

Double-welded slip-on flanges require:
- Inside fillet weld
- Outside fillet weld
- Minimum weld throat = lesser of t(n) or T(f)

Where:
- t(n) = nozzle/pipe neck thickness
- T(f) = flange thickness

### 6.3 Flange Alignment Tolerances (Section 335)

| Parameter | Tolerance |
|-----------|-----------|
| Flange face alignment | 1.5 mm/m (1/16 in./ft) max across diameter |
| Bolt hole alignment | Straddle centerlines |
| Flange seating surface | Must be free from defects |

### 6.4 Flange Standards Referenced

- ASME B16.1: Cast Iron Pipe Flanges
- ASME B16.5: Pipe Flanges and Flanged Fittings (NPS 1/2 - 24)
- ASME B16.47: Large Diameter Steel Flanges (NPS 26 - 60)
- ASME B16.21: Nonmetallic Flat Gaskets

## 7. Welding Requirements

### 7.1 Weld Joint Types (Section 328.4)

| Joint Type | Application |
|------------|-------------|
| Butt weld | Pipe-to-pipe, pipe-to-fitting |
| Socket weld | Small bore connections |
| Fillet weld | Branch attachments, supports |
| Seal weld | Threaded connections requiring leak-tightness |

### 7.2 Branch Connection Welds

Branch pipe to run pipe welds:
- Minimum fillet leg = 0.7 × t(b)
- Full penetration groove weld for severe cyclic conditions
- Contoured to match run pipe curvature

### 7.3 Socket Weld Gap

Socket welds require approximately 1.5 mm (1/16 in.) gap between pipe end and socket bottom to allow for weld shrinkage.

## 8. Expansion Joints (Section 304.7)

### 8.1 Bellows Expansion Joints

Design requirements:
- Qualified design per EJMA standards
- Pressure testing per Section 345
- Maximum test pressure: 150% of design pressure

### 8.2 Expansion Joint Types

| Type | Application |
|------|-------------|
| Single bellows | Axial movement |
| Double bellows | Combined movements |
| Hinged | Angular movement only |
| Gimbal | Multi-plane angular movement |

## 9. Stress Analysis (Section 319)

### 9.1 Stress Intensification Factors (SIF)

| Component | In-Plane SIF (i(i)) | Out-of-Plane SIF (i(o)) |
|-----------|---------------------|------------------------|
| Straight pipe | 1.0 | 1.0 |
| Welding elbow | varies with R/r | varies with R/r |
| Miter bend | varies with θ | varies with θ |
| Welded tee | varies with D/T | varies with D/T |
| Reinforced branch | varies with geometry | varies with geometry |

### 9.2 Flexibility Factor (k)

Used in thermal expansion analysis:
- Straight pipe: k = 1.0
- Bends/elbows: k varies with R/r ratio
- Greater flexibility = lower thermal stresses

## 10. Material Specifications

### 10.1 Pipe Specifications for Process Piping

| Specification | Description | Service |
|---------------|-------------|---------|
| ASTM A53 | Welded/Seamless Carbon Steel | General |
| ASTM A106 | Seamless Carbon Steel | High Temperature |
| ASTM A312 | Stainless Steel Pipe | Corrosive |
| ASTM A333 | Low Temperature Service | Cryogenic |
| ASTM A335 | Alloy Steel | High Temperature |
| API 5L | Line Pipe | Pipeline |

### 10.2 Quality Factors (E)

| Pipe Type | Quality Factor (E) |
|-----------|-------------------|
| Seamless | 1.00 |
| ERW | 0.85 or 1.00* |
| EFW | 0.85 or 1.00* |
| Furnace butt welded | 0.60 |

*Higher value if radiographically examined per specification

## 11. NDE Requirements (Section 341)

### 11.1 Examination Methods

| Method | Application |
|--------|-------------|
| Visual (VT) | All welds |
| Radiographic (RT) | Butt welds, severe cyclic |
| Magnetic Particle (MT) | Surface defects, ferromagnetic |
| Liquid Penetrant (PT) | Surface defects, all materials |
| Ultrasonic (UT) | Volumetric, alternative to RT |

### 11.2 Extent of Examination

| Service Category | Minimum Examination |
|------------------|---------------------|
| Category D (benign) | Visual only |
| Normal Fluid Service | Per Table 341.3.2 |
| Category M (toxic) | 100% RT or UT |
| Severe Cyclic | 100% RT or UT |
| High Pressure | 100% RT or UT |

## 12. Fabrication Tolerances

### 12.1 Alignment Tolerances

| Parameter | Tolerance |
|-----------|-----------|
| Pipe end alignment | 1.5 mm (1/16 in.) max |
| Angular misalignment | 3° max (not considered miter) |
| Flange face alignment | 1.5 mm/m (1/16 in./ft) |

### 12.2 Dimensional Tolerances

| Parameter | Tolerance |
|-----------|-----------|
| Length (cut-to-fit) | ±3 mm (±1/8 in.) |
| Branch location | ±3 mm (±1/8 in.) |
| Flange rotation | ±2 bolt holes |

---

*This reference document is maintained as part of the Annix application codebase.*
*Last updated: 2026-01-24*
