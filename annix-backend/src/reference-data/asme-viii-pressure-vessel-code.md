# ASME Section VIII - Pressure Vessel Code Reference

> Source: ASME Boiler and Pressure Vessel Code, Section VIII, Division 1
> This document contains key reference data extracted for use by the Annix quoting application, Nix document processor, and future Tank/Vessel Module.

## 1. Scope

ASME Section VIII, Division 1 provides requirements for the design, fabrication, inspection, testing, and certification of pressure vessels operating at either internal or external pressures exceeding 15 psig (103 kPa).

## 2. Vessel Categories and Joint Classifications

### 2.1 Weld Joint Categories

| Category | Location | Description |
|----------|----------|-------------|
| A | Longitudinal | Longitudinal joints in shells, heads, nozzles |
| B | Circumferential | Circumferential joints in shells, heads |
| C | Flange-to-shell | Joints connecting flanges to shells/heads |
| D | Nozzle-to-shell | Joints attaching nozzles to shells/heads |

### 2.2 Joint Types

| Type | Description | Category A | Category B | Category C | Category D |
|------|-------------|------------|------------|------------|------------|
| 1 | Double-welded butt, full RT | 1.00 | 1.00 | 1.00 | 1.00 |
| 2 | Single-welded butt with backing | 0.90 | 0.90 | 0.90 | 0.90 |
| 3 | Single-welded butt no backing | N/A | 0.80 | N/A | N/A |
| 4 | Double full fillet lap | N/A | 0.55 | N/A | N/A |
| 5 | Single full fillet lap | N/A | 0.50 | N/A | N/A |
| 6 | Single-welded butt no backing | N/A | 0.60 | N/A | N/A |

### 2.3 Joint Efficiency Factors (E)

Based on degree of radiographic examination:

| Examination Level | Type 1 | Type 2 | Notes |
|-------------------|--------|--------|-------|
| Full RT (100%) | 1.00 | 0.90 | All Category A and B joints |
| Spot RT | 0.85 | 0.80 | Random RT per UW-52 |
| No RT | 0.70 | 0.65 | Visual only |

## 3. Shell and Head Design

### 3.1 Cylindrical Shell Under Internal Pressure (UG-27)

**Required thickness:**
```
t = PR / (SE - 0.6P)
```

**Maximum allowable working pressure:**
```
P = SEt / (R + 0.6t)
```

Where:
- t = minimum required thickness (mm)
- P = internal design pressure (MPa)
- R = inside radius (mm)
- S = maximum allowable stress (MPa)
- E = joint efficiency factor

### 3.2 Spherical Shell Under Internal Pressure (UG-27)

**Required thickness:**
```
t = PR / (2SE - 0.2P)
```

### 3.3 Head Types and Design

| Head Type | Application | Thickness Formula Factor |
|-----------|-------------|-------------------------|
| Hemispherical | High pressure | 0.5 (lowest thickness) |
| Ellipsoidal 2:1 | Standard | 1.0 |
| Torispherical | Low pressure | 1.77 (ASME F&D) |
| Flat | Low pressure, small diameter | Per UG-34 |
| Conical | Transition sections | Per UG-32 |

### 3.4 Ellipsoidal Head (2:1) Formula (UG-32)

```
t = PD / (2SE - 0.2P)
```

### 3.5 Torispherical Head (ASME F&D) Formula (UG-32)

```
t = 0.885PL / (SE - 0.1P)
```

Where:
- L = inside crown radius (typically = D for ASME F&D)
- D = inside diameter

## 4. Nozzle Design (UG-36 to UG-43)

### 4.1 Nozzle Neck Minimum Thickness

| Size | Minimum Thickness |
|------|-------------------|
| ≤ NPS 2 | Schedule 80 |
| > NPS 2 | Schedule 40 or design thickness |

### 4.2 Reinforcement Requirements

Area replacement method - removed area must be replaced:

```
A = d × tr × F
```

Where:
- A = required reinforcement area
- d = finished diameter of opening
- tr = required thickness of shell
- F = correction factor for plane of examination

### 4.3 Reinforcement Zone Limits

| Direction | Limit |
|-----------|-------|
| Parallel to shell | d or (R × t)^0.5 + t + tn |
| Normal to shell | 2.5t or 2.5tn (smaller) |

### 4.4 Nozzle Attachment Welds

| Nozzle Type | Weld Configuration |
|-------------|-------------------|
| Set-in | Full penetration + fillet |
| Set-on | Full penetration or fillet |
| Set-through | Full penetration required |

## 5. Flange Design (Appendix 2)

### 5.1 Flange Types

| Type | Description | Design Method |
|------|-------------|---------------|
| Integral | One-piece with shell/nozzle | Appendix 2 |
| Loose | Lapped or threaded | Appendix 2 |
| Optional | Can use integral formulas | Owner's option |
| Reverse | Bolt inside, gasket outside | Special rules |

### 5.2 Flange Design Bolt Loads

**Gasket seating (ambient):**
```
Wm2 = π × b × G × y
```

**Operating condition:**
```
Wm1 = H + Hp = 0.785G²P + 2b × π × G × m × P
```

Where:
- b = effective gasket width
- G = gasket reaction diameter
- y = gasket seating stress
- m = gasket factor
- P = design pressure
- H = hydrostatic end force
- Hp = gasket compression force

### 5.3 Gasket Factors

| Gasket Type | m | y (psi) |
|-------------|---|---------|
| Rubber with fabric | 1.25 | 400 |
| Rubber without fabric | 0.50 | 0 |
| Compressed asbestos | 2.00 | 1,600 |
| Spiral wound (metal) | 2.50 | 10,000 |
| Spiral wound (PTFE) | 2.00 | 3,700 |
| Soft aluminum | 2.75 | 4,000 |
| Soft copper/brass | 3.00 | 4,500 |
| Ring joint (steel) | 5.50 | 18,000 |
| Ring joint (SS) | 6.00 | 21,800 |

### 5.4 Flange Stress Calculations

**Longitudinal hub stress:**
```
SH = f × M / (Lg₁²B)
```

**Radial flange stress:**
```
SR = (1.33te + 1)M / (Lt²B)
```

**Tangential flange stress:**
```
ST = (YM / t²B) - ZSR
```

### 5.5 Allowable Flange Stresses

| Stress Type | Limit |
|-------------|-------|
| SH (hub) | 1.5 × Sf |
| SR (radial) | Sf |
| ST (tangential) | Sf |
| (SH + SR)/2 | Sf |
| (SH + ST)/2 | Sf |

## 6. Appendix Y - Advanced Flange Design

### 6.1 Flange Assembly Classes

| Class | Description |
|-------|-------------|
| 1 | Identical flange pairs |
| 2 | Nonidentical pairs with reducing flange |
| 3 | Reducer or flat head as one flange |

### 6.2 Flange Categories

| Category | Description |
|----------|-------------|
| 1 | Integral flange with hub |
| 2 | Loose type with hub |
| 3 | Loose type without hub |

## 7. External Pressure Design (UG-28)

### 7.1 Cylindrical Shells

Design uses charts from ASME II-D:
1. Calculate L/D and D/t ratios
2. Enter chart for Factor A
3. Calculate Factor B from material chart
4. Maximum allowable external pressure:
```
Pa = 4B / (3(D/t))
```

### 7.2 Stiffening Rings

Required when L/D exceeds allowable:
- Moment of inertia requirement
- Spacing requirements
- Attachment weld requirements

## 8. Welding Requirements (Part UW)

### 8.1 Weld Size Requirements

| Joint Type | Minimum Leg Size |
|------------|------------------|
| Nozzle attachment fillet | 0.7tmin |
| Reinforcement pad fillet | 0.5tpad or 0.25 in. |
| Backing strip seal | 0.25 in. |

### 8.2 Weld Joint Preparation

| Thickness | Preparation |
|-----------|-------------|
| ≤ 3/16" | Square edge OK |
| > 3/16" to 3/4" | Single V (60-70°) |
| > 3/4" | Double V or U-groove |

### 8.3 Welding Procedure Qualification

Required per ASME IX:
- Base metal P-Number
- Filler metal F-Number
- Position
- Thickness range
- PWHT requirements

## 9. Heat Treatment (UW-40, UCS-56)

### 9.1 PWHT Requirements - Carbon Steel

| Nominal Thickness | PWHT Required |
|-------------------|---------------|
| ≤ 1-1/4" (32mm) | Not required |
| > 1-1/4" (32mm) | Required |

### 9.2 PWHT Parameters

| Material | Temperature Range | Holding Time |
|----------|-------------------|--------------|
| Carbon steel (P-1) | 1100-1200°F (593-649°C) | 1 hr/in., 15 min minimum |
| Low alloy (P-3) | 1100-1200°F (593-649°C) | 1 hr/in. |
| Cr-Mo (P-4/5) | 1250-1300°F (677-704°C) | 1 hr/in. |

## 10. Pressure Testing (UG-99, UG-100)

### 10.1 Hydrostatic Test

**Test pressure:**
```
PT = 1.3 × MAWP × (ST/S)
```

Where:
- PT = test pressure
- MAWP = maximum allowable working pressure
- ST = allowable stress at test temperature
- S = allowable stress at design temperature

Minimum: 1.3 × MAWP when ST = S

### 10.2 Pneumatic Test

**Test pressure:**
```
PT = 1.1 × MAWP × (ST/S)
```

Additional requirements:
- Pressure increase in stages
- 25% initial, hold
- Increase in 10% increments
- Special examination requirements

### 10.3 Test Duration

| Test Type | Minimum Hold Time |
|-----------|-------------------|
| Hydrostatic | Time for examination |
| Pneumatic | 10 minutes minimum |

## 11. Material Specifications

### 11.1 Plate Materials (UCS-6)

| Specification | Grade | Application |
|---------------|-------|-------------|
| SA-516 | 55, 60, 65, 70 | Standard carbon steel |
| SA-285 | A, B, C | Low/medium strength |
| SA-240 | 304, 316, etc. | Stainless steel |
| SA-387 | 11, 22 | Cr-Mo alloy |

### 11.2 Pipe Materials (UG-8)

| Specification | Description |
|---------------|-------------|
| SA-106 | Seamless carbon steel |
| SA-312 | Seamless and welded stainless |
| SA-333 | Low temperature service |
| SA-335 | High temperature alloy |

### 11.3 Forgings (UG-8)

| Specification | Description |
|---------------|-------------|
| SA-105 | Carbon steel flanges/fittings |
| SA-182 | Alloy steel flanges/fittings |
| SA-350 | Low temperature carbon steel |
| SA-266 | Carbon steel vessels/parts |

## 12. Expansion Joints (Appendix 26)

### 12.1 Bellows Types

| Type | Movement Capability |
|------|---------------------|
| Single ply | Axial, limited lateral |
| Multi-ply | Higher pressure, axial |
| Toroidal | Large deflection |
| Universal | Axial + lateral + angular |

### 12.2 Movement Limits

| Movement Type | Typical Limit |
|---------------|---------------|
| Axial compression | Per convolution depth |
| Axial extension | 75% of compression |
| Lateral | Per bellows design |
| Angular | Degrees per convolution |

## 13. Half-Pipe Jackets (Appendix EE)

### 13.1 Design Formula

**Maximum pressure:**
```
P' = SEt / (r + 0.6t)
```

Where:
- r = inside radius of half-pipe
- t = wall thickness
- S = allowable stress
- E = joint efficiency

### 13.2 Standard Sizes

| NPS | Inside Radius | Application |
|-----|---------------|-------------|
| 2 | 1.0 in. | Small vessels |
| 3 | 1.5 in. | Medium vessels |
| 4 | 2.0 in. | Large vessels |

### 13.3 Attachment Welds

- Continuous fillet welds both sides
- Minimum leg = 0.7 × jacket thickness
- Full encirclement required

## 14. Conical Sections and Reducers (UG-32, UG-33)

### 14.1 Cone Angle Limits

| Half-Apex Angle | Requirements |
|-----------------|--------------|
| ≤ 30° | Standard cone rules |
| > 30° | Reinforcement at knuckle |

### 14.2 Knuckle Requirements

- Required when α > 30°
- Minimum knuckle radius = 6% of D
- Or reinforcement per Appendix 1-5

### 14.3 Cone Thickness Formula

```
t = PD / (2cos(α)(SE - 0.6P))
```

Where:
- α = half-apex angle
- D = inside diameter at point

## 15. Inspection and Documentation

### 15.1 Required Inspections

| Item | Requirement |
|------|-------------|
| Material | Mill test reports |
| Welding | Procedure and welder qualification |
| NDE | Per UW-11, UW-51, UW-52 |
| Dimensions | Shell roundness, thickness |
| Hydro test | Witnessed by AI |

### 15.2 Nameplate Data

Required information:
- Manufacturer's name and serial number
- MAWP and temperature
- Minimum design metal temperature (MDMT)
- Year built
- Code stamp (U, UM, UV, etc.)

### 15.3 Manufacturer's Data Report

Required documentation:
- Form U-1 (Division 1)
- Design calculations
- Material certifications
- NDE reports
- Test reports

---

*This reference document is maintained as part of the Annix application codebase for use by the quoting application and future Tank/Vessel Module.*
*Last updated: 2026-01-24*
