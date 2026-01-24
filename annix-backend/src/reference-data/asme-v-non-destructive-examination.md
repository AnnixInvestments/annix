# ASME Section V - Nondestructive Examination Reference

> Source: ASME Boiler and Pressure Vessel Code, Section V
> This document contains key reference data extracted for use by the Annix quoting application, Nix document processor, and future Quality Module.

## 1. Scope

ASME Section V provides requirements and methods for nondestructive examination (NDE) of materials and components. It is referenced by other ASME Code sections (I, III, VIII, etc.) and construction codes like B31.1 and B31.3.

## 2. NDE Methods Overview

### 2.1 Primary Examination Methods

| Article | Method | Abbreviation | Primary Use |
|---------|--------|--------------|-------------|
| 2 | Radiographic Examination | RT | Volumetric weld examination |
| 4 | Ultrasonic Examination | UT | Volumetric weld/material examination |
| 5 | Ultrasonic Examination of Materials | UT | Plate, pipe, forgings |
| 6 | Liquid Penetrant Examination | PT | Surface defects |
| 7 | Magnetic Particle Examination | MT | Surface/near-surface defects |
| 8 | Eddy Current Examination | ET | Tubing, surface defects |
| 9 | Visual Examination | VT | Surface condition |
| 10 | Leak Testing | LT | Pressure boundary integrity |
| 12 | Acoustic Emission Examination | AE | In-service monitoring |
| 13 | Continuous Acoustic Emission | AE | Real-time monitoring |

### 2.2 Method Selection by Defect Type

| Defect Type | RT | UT | PT | MT | ET | VT |
|-------------|----|----|----|----|----|----|
| Crack (surface) | Good | Fair | Excellent | Excellent | Good | Fair |
| Crack (subsurface) | Good | Excellent | N/A | Fair | Fair | N/A |
| Porosity | Excellent | Good | N/A | N/A | N/A | Fair |
| Slag inclusion | Excellent | Good | N/A | N/A | N/A | N/A |
| Lack of fusion | Good | Excellent | N/A | N/A | N/A | N/A |
| Incomplete penetration | Good | Excellent | N/A | N/A | N/A | Fair |
| Undercut | Fair | Fair | Good | Good | N/A | Excellent |
| Lamination (plate/pipe) | Fair | Excellent | N/A | N/A | Good | N/A |
| Seams (bar/pipe) | Fair | Good | Good | Good | Excellent | Fair |

## 3. Radiographic Examination (Article 2)

### 3.1 Radiographic Techniques for Pipe Welds

| Technique | Source Location | Application |
|-----------|-----------------|-------------|
| Single Wall Single Image (SWSI) | Inside pipe | Large diameter pipe |
| Double Wall Single Image (DWSI) | Outside pipe | Medium diameter pipe |
| Double Wall Double Image (DWDI) | Outside pipe | Small diameter pipe (< 3.5" OD) |

### 3.2 Exposure Requirements by Pipe Diameter

| Configuration | Number of Exposures | Angular Coverage |
|---------------|---------------------|------------------|
| SWSI panoramic | 1 | 360 deg |
| SWSI sequential | Minimum 3 | 120 deg each |
| DWSI | Minimum 2 | 90 deg apart |
| DWDI | Minimum 2 | 90 deg or 120 deg apart |

### 3.3 IQI (Image Quality Indicator) Requirements

**IQI Placement:**
- Source side placement preferred
- Film side placement with marking when source side not possible
- For circumferential welds: minimum 3 IQIs spaced 120 deg apart

**Wire IQI Selection (ASTM E747):**
| Material Thickness (mm) | Wire Set | Essential Wire |
|------------------------|----------|----------------|
| Up to 6 | Set A | 4T |
| 6 to 12 | Set A | 2T |
| 12 to 20 | Set B | 2T |
| 20 to 38 | Set B | 1T |
| 38 to 50 | Set C | 1T |
| Over 50 | Set D | 1T |

### 3.4 Geometric Unsharpness

```
Ug = Fd/D
```

Where:
- Ug = geometric unsharpness (max 0.51mm for t ≤ 50mm)
- F = source size
- d = object-to-film distance
- D = source-to-object distance

## 4. Ultrasonic Examination (Article 4)

### 4.1 Search Unit Angles

| Nominal Angle | Actual Range | Primary Application |
|---------------|--------------|---------------------|
| 0 deg | Straight beam | Lamination detection, thickness |
| 45 deg | 40-50 deg | General weld examination |
| 60 deg | 55-65 deg | Weld root examination |
| 70 deg | 65-75 deg | Near-surface defects |

### 4.2 Calibration Block Requirements

**Basic Calibration Block (T-434.2):**
- Same material specification as test piece
- Same heat treatment condition
- Thickness within ±25% of test piece

**Pipe Calibration Block (T-434.3):**
- Same nominal diameter range
- Same nominal wall thickness
- Notches on ID and OD surfaces

### 4.3 Distance Amplitude Correction (DAC)

DAC curve requirements:
- Minimum 3 points
- Side-drilled holes (SDH) typically 1/8" (3mm) diameter
- 20%, 50%, and 80% of material thickness locations

### 4.4 Scanning Coverage

| Weld Type | Scanning Direction | Coverage |
|-----------|-------------------|----------|
| Butt weld | Both sides of weld | Full weld + HAZ |
| T-joint | Branch side | Full penetration |
| Corner joint | Both members | Full weld |
| Fillet weld | Accessible side | Weld throat |
| Flange weld | From flange face | Weld + base metal |

### 4.5 Recording Levels

| Indication Level | Action |
|------------------|--------|
| Below 20% DAC | No recording required |
| 20% to 50% DAC | Record if linear |
| Above 50% DAC | Record all |
| Above 100% DAC | Evaluate per acceptance criteria |

## 5. Liquid Penetrant Examination (Article 6)

### 5.1 Penetrant Types

| Type | Method | Application |
|------|--------|-------------|
| Type I | Fluorescent | High sensitivity |
| Type II | Visible dye | General use |
| Type III | Dual mode | Versatile |

### 5.2 Penetrant Methods

| Method | Removal | Sensitivity |
|--------|---------|-------------|
| A | Water washable | Low-Medium |
| B | Post-emulsifiable lipophilic | High |
| C | Solvent removable | Medium-High |
| D | Post-emulsifiable hydrophilic | Very High |

### 5.3 Process Parameters

| Parameter | Minimum | Maximum |
|-----------|---------|---------|
| Surface temperature | 40°F (4°C) | 125°F (52°C) |
| Penetrant dwell time | 5 minutes | Per procedure |
| Developer dwell time | 10 minutes | 60 minutes |
| Emulsification time | Per qualification | Per procedure |

### 5.4 Surface Preparation

- Remove all contaminants (oil, grease, paint, scale, rust)
- Surface roughness: Ra ≤ 125 microinches (3.2 μm) typical
- Grinding, machining, or wire brushing as required
- Drying time after cleaning: minimum 5 minutes

## 6. Magnetic Particle Examination (Article 7)

### 6.1 Magnetization Methods

| Method | Application | Field Direction |
|--------|-------------|-----------------|
| Yoke | Local areas | Between poles |
| Prods | Local areas | Between prods |
| Coil | Circular parts | Longitudinal |
| Central conductor | Tubular parts | Circular |
| Direct current | Through part | Circular |

### 6.2 Field Strength Requirements

| Method | Minimum Tangential Field |
|--------|-------------------------|
| AC yoke | 30-60 A/cm at poles |
| DC yoke | 40 A/cm minimum |
| Prods | 100-125 A per inch of spacing |

### 6.3 Particle Types

| Type | Visibility | Application |
|------|------------|-------------|
| Dry | Visible light | Rough surfaces |
| Wet fluorescent | UV-A light | Smooth surfaces |
| Wet visible | Visible light | General use |

### 6.4 Coverage Requirements

- Magnetize in two directions approximately 90 deg apart
- Minimum 10% overlap between adjacent areas
- Field indicator (pie gauge) to verify direction

## 7. Eddy Current Examination (Article 8)

### 7.1 Reference Standards

**Reference Tube Dimensions:**
- Same nominal OD as test piece
- Same nominal wall thickness
- Same material specification

**Standard Notches:**
- OD notch: 10% of wall, longitudinal
- ID notch: 10% of wall, longitudinal
- Through-wall hole: 1mm (0.039") diameter typical

### 7.2 Calibration

| Parameter | Requirement |
|-----------|-------------|
| Phase separation | Minimum 60 deg between 100% and 20% |
| Operating frequency | Per procedure |
| Fill factor | > 75% for bobbin coils |
| Lift-off | < 10% of signal response |

### 7.3 Scanning Parameters

| Parameter | Typical Value |
|-----------|---------------|
| Probe speed | 12-36 in/sec (300-900 mm/sec) |
| Data sampling | Minimum 30 samples per inch |
| Rotation (rotating probe) | 300-1200 RPM |

## 8. Visual Examination (Article 9)

### 8.1 Direct Visual Requirements

| Parameter | Requirement |
|-----------|-------------|
| Distance | Within 24 in. (600 mm) |
| Angle | Not less than 30 deg to surface |
| Illumination | Minimum 50 fc (500 lux) |

### 8.2 Remote Visual Requirements

| Parameter | Requirement |
|-----------|-------------|
| Resolution | Equivalent to direct at 24 in. |
| Illumination | As required for resolution |
| Documentation | Record method and equipment |

### 8.3 Surface Condition

- Clean and free from contaminants
- Adequate lighting
- Accessible viewing angle

## 9. Acoustic Emission Examination (Articles 12/13)

### 9.1 Sensor Placement Guidelines

**Cylindrical Vessels:**
- Sensors at 90 deg apart circumferentially
- 6-12 in. (150-300 mm) from weld
- Cover knuckle regions with additional sensors

**Spherical/Dished Heads:**
- Sensors up to 180 deg apart
- Critical regions: knuckle areas
- Minimum 2 sensors per region

### 9.2 System Calibration

| Parameter | Requirement |
|-----------|-------------|
| Threshold | 40-50 dB above noise |
| Source location accuracy | ±2 in. (50 mm) typical |
| Frequency range | 100-300 kHz typical |

## 10. Acceptance Criteria Summary

### 10.1 Weld Examination (Typical)

| Indication Type | RT Limit | UT Limit |
|-----------------|----------|----------|
| Crack | Not acceptable | Not acceptable |
| Incomplete fusion | Not acceptable | Not acceptable |
| Incomplete penetration | Per code | Not acceptable |
| Slag (isolated) | Length ≤ 2/3t | Per DAC level |
| Porosity | Per charts | Per DAC level |
| Undercut | 1/32" (0.8mm) max | N/A |

### 10.2 Surface Examination (Typical)

| Indication Type | PT/MT Limit |
|-----------------|-------------|
| Linear indication | Length ≤ 1/16" (1.5mm) |
| Rounded indication | ≤ 3/16" (5mm) diameter |
| Relevant indication | > 1/16" (1.5mm) major dimension |
| Crack | Not acceptable |

## 11. Documentation Requirements

### 11.1 Examination Records

| Item | Required Information |
|------|---------------------|
| Component ID | Unique identification |
| Examination area | Location, extent |
| Procedure | Reference number, revision |
| Equipment | Serial numbers, calibration |
| Technique | Parameters used |
| Results | Indications found, disposition |
| Personnel | Name, certification level |
| Date | Examination date |

### 11.2 Certification Levels

| Level | Capability |
|-------|------------|
| Level I | Perform examination per written instruction |
| Level II | Set up, calibrate, interpret, evaluate |
| Level III | Develop procedures, interpret codes, train |

## 12. Referenced Standards

### 12.1 ASTM Standards in ASME V

| Standard | Title |
|----------|-------|
| E94 | Radiographic Examination |
| E165 | Liquid Penetrant Examination |
| E213 | Ultrasonic Examination of Metal Pipe and Tubing |
| E273 | Ultrasonic Examination of Longitudinal Welded Pipe and Tubing |
| E709 | Magnetic Particle Examination |
| E747 | Wire Image Quality Indicators |
| E1316 | Terminology for NDE |

### 12.2 Application by Product Form

| Product Form | Primary Methods | Reference Section |
|--------------|-----------------|-------------------|
| Plate | UT, RT | T-542.6 |
| Pipe/Tube | UT, RT, ET | T-542.8, Article 8 |
| Forgings | UT, MT | T-542.7 |
| Castings | RT, PT, MT | Article 2, 6, 7 |
| Welds | RT, UT, PT, MT | All articles |
| Bolting | UT, MT, PT | T-542.9 |

---

*This reference document is maintained as part of the Annix application codebase for use by the quoting application and future Quality Module.*
*Last updated: 2026-01-24*
