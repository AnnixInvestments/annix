# Surface Protection Recommendation Engine

This document describes the recommendation logic used in the Surface Protection module for engineering review.

## Overview

The recommendation engine uses a rule-based approach to suggest appropriate coatings and linings based on:
- Environmental conditions
- Damage mechanisms
- Operating parameters
- Standards compliance requirements

## 1. External Coating Recommendations

### 1.1 Classification Flow

```
Input: ExternalEnvironmentProfile
  ├── Installation (type, UV exposure, mechanical risk)
  ├── Atmosphere (ISO 12944 category, marine influence, pollution)
  ├── Soil (type, resistivity, moisture)
  └── Operating (temperature, CP, service life)
       │
       ▼
classifyExternalDamageMechanisms()
       │
       ▼
Output: ExternalDamageMechanisms
  ├── atmosphericCorrosion: Low|Moderate|High|Severe
  ├── soilCorrosion: Low|Moderate|High|Severe
  ├── mechanicalDamage: Low|Moderate|High
  └── dominantMechanism: Atmospheric|Soil/Buried|Marine|Mechanical|Mixed
```

### 1.2 Atmospheric Corrosion Classification

| ISO 12944 Category | Base Severity | Marine Modifier | Industrial Modifier |
|-------------------|---------------|-----------------|---------------------|
| C1 | Low | - | - |
| C2 | Low | - | - |
| C3 | Moderate | +1 if Coastal | +1 if Moderate |
| C4 | High | +1 if Coastal | +1 if Moderate |
| C5 | Severe | +1 if Offshore | +1 if Heavy |
| CX | Severe | +1 if Offshore | +1 if Heavy |

### 1.3 Soil Corrosion Classification

| Soil Resistivity | Moisture Level | Classification |
|------------------|----------------|----------------|
| VeryLow (<500Ω·cm) | Saturated | Severe |
| VeryLow | Wet | High |
| Low (500-1000Ω·cm) | Saturated | High |
| Low | Wet | Moderate |
| Medium | Any | Moderate |
| High (>5000Ω·cm) | Any | Low |

### 1.4 Dominant Mechanism Selection

Priority order:
1. Marine (if submerged + offshore influence)
2. Soil/Buried (if buried installation)
3. Mechanical (if high mechanical risk)
4. Atmospheric (default for above-ground)
5. Mixed (if multiple moderate-severity mechanisms)

### 1.5 Coating System Selection

Based on dominant mechanism:

**Atmospheric (Above Ground)**
```
IF iso12944Category IN (C4, C5, CX):
  Recommend: Zinc-rich epoxy + Epoxy MIO + Polyurethane topcoat
  Reference: NORSOK M-501 System 1
ELSE IF iso12944Category IN (C2, C3):
  Recommend: Epoxy primer + Epoxy intermediate + Polyurethane topcoat
  Reference: ISO 12944-5 Table 4
ELSE:
  Recommend: Alkyd primer + Alkyd topcoat
  Reference: ISO 12944-5 Table 2
```

**Buried/Soil**
```
IF cathodicProtection = true:
  Recommend: FBE (200-300μm) or 3LPE system
  Reference: ISO 21809-1/2
ELSE:
  Recommend: Coal tar epoxy or Glass flake epoxy
  Reference: AS/NZS 2312.1
```

**Marine/Submerged**
```
IF splashZone:
  Recommend: Glass flake epoxy (500-1000μm)
  Reference: NORSOK M-501 System 7
ELSE IF immersed:
  Recommend: High-build epoxy (300-450μm)
  Reference: NORSOK M-501 System 3
```

## 2. Internal Lining Recommendations

### 2.1 Classification Flow

```
Input: MaterialTransferProfile
  ├── Material (hardness, particle size/shape, silica content)
  ├── Chemistry (pH, chlorides, temperature)
  ├── Flow (velocity, solids%, impact angle)
  └── Equipment (type, impact zones, pressure)
       │
       ▼
classifyDamageMechanisms()
       │
       ▼
Output: DamageMechanisms
  ├── abrasion: Low|Moderate|Severe
  ├── impact: Low|Moderate|Severe
  ├── corrosion: Low|Moderate|High
  └── dominantMechanism: Impact Abrasion|Sliding Abrasion|Corrosion|Mixed
```

### 2.2 Abrasion Severity Classification

| Material Hardness | Silica Content | Flow Velocity | Classification |
|-------------------|----------------|---------------|----------------|
| High | High | High | Severe |
| High | High | Medium | Severe |
| High | - | High | Severe |
| Medium | - | High | Moderate |
| - | - | Medium | Moderate |
| - | Angular shape | - | Moderate |
| Low | Low | Low | Low |

### 2.3 Impact Severity Classification

| Impact Angle | Impact Zones | Particle Size | Classification |
|--------------|--------------|---------------|----------------|
| High | Yes | Any | Severe |
| High | No | VeryCoarse | Severe |
| Mixed | - | Coarse/VeryCoarse | Moderate |
| Mixed | Yes | - | Moderate |
| Low | - | Fine/Medium | Low |

### 2.4 Corrosion Severity Classification

| pH Range | Chlorides | Temperature | Classification |
|----------|-----------|-------------|----------------|
| Acidic | Any | Any | High |
| Any | High | Any | High |
| Neutral | Moderate | High | Moderate |
| Neutral | Moderate | Ambient | Moderate |
| Neutral | Low | Ambient | Low |

### 2.5 Lining Selection Matrix

| Dominant Mechanism | Primary Recommendation | Alternative |
|--------------------|----------------------|-------------|
| Impact Abrasion | Rubber-Ceramic Composite (15-30mm) | Thick rubber (25mm+) |
| Sliding Abrasion | High-alumina ceramic (92-99%) | Basalt tiles |
| Corrosion | Chemical-resistant rubber | Epoxy-phenolic |
| Mixed | Rubber-backed ceramic | Natural rubber |

### 2.6 Equipment-Specific Adjustments

**Pipes**
- Consider minimum bend radius for rubber
- Ceramic tile installation method depends on ID
- Abrasion wear pattern follows flow direction

**Tanks**
- Chemical compatibility is priority
- Consider liquid level variations
- Floor requires impact-resistant tiles

**Chutes/Hoppers**
- Impact zones at material entry points
- Sliding wear on sloped surfaces
- Consider replaceable wear plates

## 3. ISO 12944 Compliance Validation

### 3.1 Part-by-Part Validation

| Part | Validation Logic |
|------|------------------|
| Part 1 | Scope applicability check |
| Part 2 | Environment classification verification |
| Part 3 | Design scoring (edge treatment, access, drainage) |
| Part 4 | Surface condition assessment |
| Part 5 | System DFT vs. minimum requirements |
| Part 6 | Test result validation |
| Part 7 | Application conditions check |
| Part 8 | Specification adequacy |
| Part 9 | Maintenance strategy assessment |

### 3.2 DFT Requirements by Category/Durability

| Category | L (2-5yr) | M (5-15yr) | H (15-25yr) | VH (>25yr) |
|----------|-----------|------------|-------------|------------|
| C1 | 80μm | 80μm | 120μm | 160μm |
| C2 | 80μm | 120μm | 160μm | 200μm |
| C3 | 120μm | 160μm | 200μm | 280μm |
| C4 | 160μm | 200μm | 240μm | 320μm |
| C5 | 200μm | 280μm | 320μm | 400μm |
| CX | 280μm | 320μm | 400μm | 500μm |

### 3.3 Immersion Service Additions

Add 100μm to base DFT for:
- Im1 (Freshwater)
- Im2 (Seawater)
- Im3 (Soil)
- Im4 (Chemical)

## 4. ISO 8501 Surface Preparation

### 4.1 Grade Recommendations by Category

| ISO 12944 Category | Minimum Prep Grade | Preferred |
|--------------------|-------------------|-----------|
| C1 | St 2 | St 3 |
| C2 | St 3 | Sa 1 |
| C3 | Sa 2 | Sa 2.5 |
| C4 | Sa 2.5 | Sa 2.5 |
| C5 | Sa 2.5 | Sa 3 |
| CX | Sa 3 | Sa 3 |

### 4.2 Zinc Coating Requirements

Zinc-rich primers (organic or inorganic) require:
- Minimum Sa 2.5 surface preparation
- Surface profile 40-85μm
- Cleanliness: no oil, grease, or contaminants

## 5. Cathodic Protection Compatibility

### 5.1 Compatible Coatings

| Coating Type | Compatibility | Disbondment Risk | Notes |
|--------------|---------------|------------------|-------|
| FBE | Excellent | Low | Industry standard for pipelines |
| 3LPE | Excellent | Low | PE provides barrier, FBE adhesion |
| Epoxy Glass Flake | Good | Low | Preferred for immersion |
| Zinc Silicate | Excellent | Low | Galvanic protection |
| Coal Tar Epoxy | Good | Low | Traditional choice |
| High-Build Epoxy | Good | Medium | Ensure adequate DFT |
| Polyurethane | Poor | High | Not recommended |
| Alkyd | Poor | High | Not suitable |

### 5.2 Test Standards

- ASTM G8: Cathodic disbondment test
- ASTM G95: Cathodic disbondment of pipeline coatings
- ISO 15711: Cathodic protection of buried pipelines
- NACE TM0115: Disbondment of coating on pipe

## 6. Temperature Considerations

### 6.1 High Temperature Coating Selection

| Temperature Range | Coating Type | Notes |
|-------------------|--------------|-------|
| <120°C | Standard systems | Normal selection |
| 120-200°C | Modified epoxy | Check manufacturer limits |
| 200-400°C | Silicone-based | Inorganic binders |
| 400-600°C | High-temp silicone | Limited color options |
| >600°C | Ceramic/refractory | Specialist application |

### 6.2 Cure Time Adjustments

Cure time multiplier = 2^((23 - T) / 10)

Where T = ambient temperature in °C

Example:
- At 23°C: multiplier = 1.0
- At 13°C: multiplier = 2.0
- At 33°C: multiplier = 0.5

## 7. NORSOK M-501 Systems

| System | Application | Primer | Intermediate | Topcoat | Total DFT |
|--------|-------------|--------|--------------|---------|-----------|
| 1 | Atmospheric offshore | ZRE 50-80μm | Epoxy 150-200μm | PU 50-80μm | 280-360μm |
| 2 | Atmospheric (zinc silicate) | ZS 60-80μm | Epoxy 150-200μm | PU 50-80μm | 280-360μm |
| 3A/3B | Submerged/ballast | Epoxy 300-450μm | - | - | 300-450μm |
| 4 | Internal dry | Epoxy 100-150μm | - | - | 100-150μm |
| 5 | High temp | HT Silicone 50-75μm | - | - | 50-75μm |
| 7 | Splash zone | GF Epoxy 500-1000μm | - | - | 500-1000μm |

## 8. Quality Assurance Checkpoints

### 8.1 Pre-Application
- Surface cleanliness (ISO 8502)
- Surface profile (ISO 8503)
- Ambient conditions (temp, RH, dew point)
- Material batch verification

### 8.2 During Application
- WFT measurements
- Application rate
- Environmental conditions log
- Overcoat window monitoring

### 8.3 Post-Application
- DFT measurements (ISO 19840)
- Adhesion testing (ISO 4624)
- Holiday detection (if required)
- Visual inspection
