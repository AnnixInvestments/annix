# Welding Processes Reference

> Source: Welding Technology and Design Textbook
> This document contains key reference data extracted for use by the Annix quoting application, Nix document processor, and WPS Module.

## 1. Welding Process Classification

### 1.1 Process Categories

| Category | Processes | Primary Application |
|----------|-----------|---------------------|
| Fusion Welding | SMAW, GTAW, GMAW, SAW, ESW | General fabrication |
| Solid State | Friction, Explosive, Ultrasonic | Dissimilar metals |
| Resistance | Spot, Seam, Projection, Flash Butt | Sheet metal, production |
| High Energy Density | Electron Beam, Laser, Plasma | Precision, aerospace |

### 1.2 AWS Process Designations

| AWS Code | Process Name | Common Name |
|----------|--------------|-------------|
| SMAW | Shielded Metal Arc Welding | Stick, MMA |
| GTAW | Gas Tungsten Arc Welding | TIG |
| GMAW | Gas Metal Arc Welding | MIG, MAG |
| FCAW | Flux Cored Arc Welding | - |
| SAW | Submerged Arc Welding | - |
| ESW | Electro-Slag Welding | - |
| PAW | Plasma Arc Welding | - |
| OFW | Oxy-Fuel Welding | Gas Welding |
| RW | Resistance Welding | Spot, Seam |
| EBW | Electron Beam Welding | - |
| LBW | Laser Beam Welding | - |

## 2. Gas Welding (OFW)

### 2.1 Fuel Gas Temperature Ranges

| Fuel Gas | Max Temperature (C) | Neutral Flame (C) |
|----------|---------------------|-------------------|
| Acetylene | 3300 | 3200 |
| Methyl Acetylene Propadiene (MAPP) | 2900 | 2600 |
| Propylene | 2860 | 2500 |
| Propane | 2780 | 2450 |
| Methane | 2740 | 2350 |
| Hydrogen | 2870 | 2390 |

### 2.2 Flame Types

| Flame Type | Gas Ratio (C2H2:O2) | Application |
|------------|---------------------|-------------|
| Reducing (Carburising) | > 1:1 | High carbon steel, hardfacing |
| Neutral | 1:1 | General steel welding |
| Oxidising | < 1:1 | Copper alloys, zinc alloys, cast iron |

### 2.3 Filler Rod Selection

| Plate Thickness | Filler Rod Diameter Formula |
|-----------------|----------------------------|
| Butt weld up to 5mm | D = T/2 |
| Vee weld up to 7mm | D = T/2 + 0.8mm |

Where: T = plate thickness (mm), D = filler rod diameter (mm)

### 2.4 Gas Welding Thickness Limits

| Joint Type | Max Single Pass Thickness |
|------------|---------------------------|
| Full penetration | ~10mm |
| Thin sheet (no filler) | < 3mm |

## 3. Shielded Metal Arc Welding (SMAW/MMA)

### 3.1 Electrode Size and Current Ranges

| Electrode Diameter (mm) | Current Range (A) | Application |
|-------------------------|-------------------|-------------|
| 1.6 - 2.0 | 25 - 40 | Light work, thin material |
| 2.5 | 50 - 90 | General light work |
| 3.2 | 80 - 130 | General purpose |
| 4.0 | 120 - 180 | Medium work |
| 5.0 | 180 - 270 | Heavy work |
| 6.3 | 240 - 320 | Maximum heat, heavy sections |

### 3.2 Power Source Selection

| Process | Output Type | Current | Polarity |
|---------|-------------|---------|----------|
| SMAW, TIG | Variable voltage | AC or DC | DCEN or DCEP |
| SAW | Variable voltage | AC | - |
| FCAW | Constant voltage | DC | DCEN or DCEP |
| GMAW | Constant voltage | DC | DCEP |

### 3.3 Polarity Effects

| Polarity | Designation | Penetration | Deposition Rate | Application |
|----------|-------------|-------------|-----------------|-------------|
| DCEN (Straight) | Electrode Negative | Deep | Higher | Carbon steel, thick sections |
| DCEP (Reverse) | Electrode Positive | Shallow | Lower | Non-ferrous, low hydrogen electrodes |
| AC | Alternating | Medium | Medium | Aluminium, general purpose |

### 3.4 Electrode Standards

| Standard | Description |
|----------|-------------|
| AWS A5.1 | Carbon steel covered electrodes |
| AWS A5.5 | Low alloy steel covered electrodes |
| AWS A5.4 | Stainless steel covered electrodes |
| IS 815 | Covered electrodes for structural steel |
| IS 1395 | Low/medium alloy steel covered electrodes |

## 4. Gas Metal Arc Welding (GMAW/MIG/MAG)

### 4.1 Metal Transfer Modes

| Transfer Mode | Current Density | Voltage | Application |
|---------------|-----------------|---------|-------------|
| Short Circuit (Dip) | Low (60-180A) | 16-22V | Thin sheets, all positions |
| Globular | Medium | 22-28V | Flat position, limited use |
| Spray | High (>350A) | 24-32V | Thick sections, flat/horizontal |
| Pulsed | Variable | Variable | All positions, precise control |

### 4.2 Shielding Gases for GMAW

| Shielding Gas | Application |
|---------------|-------------|
| Argon (100%) | Most metals except steel |
| Helium (100%) | Aluminium, copper alloys (higher heat) |
| Ar + He (50%) | Aluminium, copper alloys |
| Ar + 25% N2 | Copper and alloys |
| Ar + 1-2% O2 | Alloy steels, stainless steels |
| Ar + 3-5% O2 | Carbon steels (deoxidised electrodes) |
| Ar + 25% CO2 | Various steels, short circuiting arc |
| Ar + 5% O2 + 15% CO2 | Various steels |
| CO2 (100%) | Carbon/low alloy steel (deoxidised electrodes) |

### 4.3 Wire Specifications

| Standard | Application |
|----------|-------------|
| AWS A5.18 | Carbon steel solid wire |
| AWS A5.20 | Carbon steel flux cored wire |
| AWS A5.10 | Aluminium alloy filler wire |
| AWS A5.7 | Copper and copper alloy filler wire |
| IS 5897 | Aluminium alloy filler wire |
| IS 5898 | Copper alloy filler wire |

## 5. Gas Tungsten Arc Welding (GTAW/TIG)

### 5.1 Tungsten Electrode Types

| Type | Alloying | Current Type | Application |
|------|----------|--------------|-------------|
| Pure Tungsten | None | AC | Aluminium, magnesium |
| Thoriated (1-2% ThO2) | Thorium | DC | Steel, high current capacity |
| Zirconiated (0.3-0.5% ZrO2) | Zirconium | AC | Aluminium, magnesium, contamination resistant |
| Ceriated (2% CeO2) | Cerium | AC/DC | General purpose |
| Lanthanated (1-2% La2O3) | Lanthanum | AC/DC | General purpose |

### 5.2 TIG Operating Parameters

| Shielding Gas | Arc Voltage (V) | Current Range (A) |
|---------------|-----------------|-------------------|
| Argon | 10-15 | 50-350 |
| Helium | 15-25 | 50-350 |

### 5.3 TIG Process Characteristics

| Parameter | Value |
|-----------|-------|
| Arc travel speed | ~10 cm/min |
| Deposition rate | ~1 kg/hr |
| Suitable thickness | Up to 7mm |
| Arc temperature | Up to 20,000 K |

### 5.4 TIG Shielding Gas Selection

| Base Metal | Shielding Gas |
|------------|---------------|
| Carbon steel | Argon, Ar + 2% O2 |
| Stainless steel | Argon, Ar + 5% H2 |
| Aluminium | Argon, Ar + He |
| Copper | Argon, Ar + He |
| Titanium, Zirconium | Pure Argon (back purge required) |
| Nickel alloys | Argon, Ar + 5% H2 |

## 6. Submerged Arc Welding (SAW)

### 6.1 Process Characteristics

| Parameter | Typical Value |
|-----------|---------------|
| Current range | 200-2000 A |
| Voltage range | 25-35 V |
| Travel speed | 30-150 cm/min |
| Deposition rate | 5-45 kg/hr |
| Penetration | Deep |

### 6.2 Wire Specifications

| Standard | Application |
|----------|-------------|
| AWS A5.17 | Carbon steel wire and flux |
| AWS A5.23 | Low alloy steel wire and flux |

## 7. Resistance Welding

### 7.1 Heat Generation Formula

```
H = I² × R × t
```

Where:
- H = Heat generated (Joules)
- I = Current (Amperes)
- R = Interface resistance (Ohms)
- t = Time (seconds)

### 7.2 Spot Welding Parameters

| Parameter | Value/Formula |
|-----------|---------------|
| Electrode diameter | de = 0.1 + 2t (mm) |
| Pressure range | 3-8.5 MPa |
| Current density | Up to 775 A/mm² |

### 7.3 Material Thickness Limits (Spot Welding)

| Material | Max Thickness |
|----------|---------------|
| Mild steel | 10mm |
| Aluminium | 6mm |
| Copper | 1.5mm |

### 7.4 Flash Butt Welding Pressures

| Material | Cold Pressure (MPa) | Preheated Pressure (MPa) |
|----------|---------------------|--------------------------|
| Low alloy/mild steel | 70 | 35 |
| Medium carbon steel | 110 | 55 |
| Stainless steel | 177 | 88 |
| Tool steel | 177 | 88 |

## 8. Electro-Slag Welding (ESW)

### 8.1 Process Parameters

| Parameter | Typical Value |
|-----------|---------------|
| Current | 750-1000 A |
| Duty cycle | 100% |
| Open circuit voltage | 60 V minimum |
| Wire feed rate | 20-150 mm/s |
| Wire diameter | 3-4 mm |
| Slag depth | ~40 mm |
| Dilution | 30-50% |

### 8.2 Thickness Capability

| Application | Max Thickness |
|-------------|---------------|
| Heavy sections | Up to 450mm |
| Pressure vessels | Up to 350mm |

## 9. Plasma Arc Welding (PAW)

### 9.1 Process Characteristics

| Parameter | Value |
|-----------|-------|
| Jet temperature | Up to 50,000 K |
| Min foil thickness | 0.01mm |
| Primary application | Electronics, instrumentation |

## 10. Heat Input Calculation

### 10.1 Heat Input Rate Formula

```
HIR = (V × A × 60) / S
```

Where:
- HIR = Heat Input Rate (J/mm)
- V = Arc Voltage (V)
- A = Current (A)
- S = Travel Speed (mm/min)

### 10.2 Typical Heat Input Ranges

| Process | Heat Input (kJ/mm) |
|---------|-------------------|
| GTAW | 0.5 - 2.5 |
| SMAW | 1.0 - 3.0 |
| GMAW | 0.5 - 2.0 |
| SAW | 2.0 - 10.0 |
| ESW | 20 - 100 |

## 11. Weld Joint Types

### 11.1 Basic Joint Types

| Joint Type | Description |
|------------|-------------|
| Butt | End-to-end connection |
| Tee | Perpendicular connection |
| Corner | Right angle connection |
| Lap | Overlapping connection |
| Edge | Parallel edge connection |

### 11.2 Groove Types

| Groove Type | Included Angle | Application |
|-------------|----------------|-------------|
| Square | 0° | Thin material, full penetration |
| Single V | 60-70° | General purpose |
| Double V | 60-70° | Thick sections |
| Single Bevel | 35-45° | T-joints |
| Single J | 15-25° | Thick sections, reduced filler |
| Single U | 10-20° | Thick sections, minimum distortion |

### 11.3 Edge Preparation by Thickness

| Thickness | Recommended Prep |
|-----------|------------------|
| Up to 4.8mm (3/16") | Square edge |
| 4.8mm to 19mm (3/16" to 3/4") | Single V (60-70°) |
| Over 19mm (3/4") | Double V or U-groove |

---

*This reference document is maintained as part of the Annix application codebase for use by the quoting application and WPS Module.*
*Last updated: 2026-01-24*
