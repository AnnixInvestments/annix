# Comprehensive Flange Dimension Audit Report

**Date:** 2026-01-22
**Scope:** SABS 1123, BS4504, ASME B16.5, BS10
**Issue:** Cross-referenced flange data against 10+ authoritative sources

---

## Executive Summary

Critical errors found in **SABS 1123** flange data for 500NB sizes. The data appears to be systematically shifted by one pressure class for T1000 and higher. Similar patterns may exist in **BS4504** data. ASME B16.5 and BS10 data requires verification but appears structurally sound.

---

## SABS 1123 / SANS 1123 - CRITICAL ERRORS FOUND

### 500NB /3 (Slip-On) Flange Discrepancies

**Source of Correct Data:**
- [EICAC DN500 Flange Dimensions](https://eicac.co.uk/flange-dimensions-for-dn500/)
- [Vishal Steel SABS 1123](https://www.vishalsteel.com/sabs-1123-flange.html)
- [High Pressure Pipe Fittings SABS 1123](https://www.highpressurepipefittings.com/1123-sabs-sans-flanges.html)
- [RoyMech BS4504/EN1092](https://roymech.org/Useful_Tables/Flanges/BS4504_16_Dimensions.html)

| Class | Field | Current DB Value | CORRECT Value | Error Type |
|-------|-------|------------------|---------------|------------|
| **T600** | OD (D) | 645 | 645 | OK |
| **T600** | PCD | 600 | 600 | OK |
| **T600** | Holes | 20 | 20 | OK |
| **T600** | Hole Dia (d1) | **26** | **22** | WRONG - Off by 1 class |
| **T600** | Bolt | **M24** | **M20** | WRONG - Off by 1 class |
| **T1000** | OD (D) | **715** | **670** | WRONG - This is T1600 data |
| **T1000** | PCD | **650** | **620** | WRONG - This is T1600 data |
| **T1000** | Holes | 20 | 20 | OK |
| **T1000** | Hole Dia (d1) | **33** | **26** | WRONG - This is T1600 data |
| **T1000** | Bolt | **M30** | **M24** | WRONG - This is T1600 data |
| **T1600** | OD (D) | **755** | **715** | WRONG - This is T2500 data |
| **T1600** | PCD | **685** | **650** | WRONG |
| **T1600** | Holes | 20 | 20 | OK |
| **T1600** | Hole Dia (d1) | **39** | **33** | WRONG - This is T2500 data |
| **T1600** | Bolt | **M36** | **M30** | WRONG - This is T2500 data |
| **T2500** | OD (D) | **840** | **730** | WRONG - Severely incorrect |
| **T2500** | PCD | **755** | **660** | WRONG - Severely incorrect |
| **T2500** | Holes | 20 | 20 | OK |
| **T2500** | Hole Dia (d1) | **52** | **36** | WRONG |
| **T2500** | Bolt | **M48** | **M33** | WRONG |
| **T4000** | All | MISSING | 755/670/20/42/M39 | MISSING CLASS |

### Pattern Analysis

The SABS 1123 data for 500NB shows a systematic error where:
1. **T600** has correct OD/PCD but wrong bolt info (using T1000 bolt specs)
2. **T1000** data is actually T1600 data
3. **T1600** data is actually T2500 data (approximately)
4. **T2500** data is severely incorrect
5. **T4000** class is completely missing

### Correct SABS 1123 500NB /3 (Slip-On) Values

| Class | OD (D) | PCD | Holes | Hole Dia | Bolt | Thickness |
|-------|--------|-----|-------|----------|------|-----------|
| T600 (PN6) | 645 | 600 | 20 | 22 | M20 | 22 |
| T1000 (PN10) | 670 | 620 | 20 | 26 | M24 | 34 |
| T1600 (PN16) | 715 | 650 | 20 | 33 | M30 | 46 |
| T2500 (PN25) | 730 | 660 | 20 | 36 | M33 | 70 |
| T4000 (PN40) | 755 | 670 | 20 | 42 | M39 | - |

### Affected Migration File

**File:** `annix-backend/src/migrations/1770100000000-AddComprehensiveSabs1123FlangeData.ts`
**Lines:** 530-549 (500NB section)

### Other NB Sizes to Verify

Based on the pattern found in 500NB, ALL NB sizes should be verified, particularly:
- 400NB
- 450NB
- 600NB (if present)

The error pattern suggests the entire dataset may have been entered from a misaligned source table.

---

## BS4504 / EN 1092-1 - VERIFICATION REQUIRED

### 500NB Discrepancy Analysis

**Current Database Values (from migration):**

| Class | OD (D) | PCD | Holes | Hole Dia | Bolt |
|-------|--------|-----|-------|----------|------|
| PN10 | 715 | 650 | 20 | 33 | M30 |
| PN16 | 755 | 685 | 20 | 39 | M36 |

**Authoritative Reference Values:**

From [RoyMech BS4504 PN16](https://roymech.org/Useful_Tables/Flanges/BS4504_16_Dimensions.html):
- DN500 PN16: OD 715, PCD 650, Holes 20, Hole Dia 33, Bolt M30

From [Van Walraven DN500 PN16](https://www.vanwalraven.com/):
- Blind flange DN 500 PN16 715x36 20 holes

**Findings:**
- The current PN10 values (715/650/33/M30) match what PN16 SHOULD be
- The current PN16 values (755/685/39/M36) appear to be PN25 data
- **Conclusion:** BS4504 data is also shifted by one pressure class

### Affected Migration File

**File:** `annix-backend/src/migrations/1770200000000-AddComprehensiveBs4504FlangeData.ts`
**Lines:** 454-477 (500NB and 600NB sections)

---

## ASME B16.5 - VERIFICATION RECOMMENDED

### 500NB (20" NPS) Current Database Values

| Class | OD (D) | PCD | Holes | Hole Dia | Bolt |
|-------|--------|-----|-------|----------|------|
| 150 | 699 | 635 | 20 | 32 | 1-1/8" |
| 300 | 775 | 699 | 24 | 38 | 1-3/8" |
| 600 | 813 | 724 | 24 | 48 | 1-3/4" |
| 900 | 857 | 762 | 20 | 56 | 2" |

**Cross-Reference Values:**

From [Engineering Toolbox ASME B16.5](https://www.engineeringtoolbox.com/flanges-bolts-dimensions-d_464.html):
- 20" Class 150: OD 27.5" (699mm), PCD 25" (635mm), 20 bolts, 1-1/8" bolts - **MATCHES**
- 20" Class 300: OD ~30.5" (775mm), PCD ~27" (686mm), 24 bolts - **CLOSE**

From [Global Supply Line DN500](https://globalsupplyline.com.au/size-dn500/):
- Class 150: OD 27.5" (699mm), PCD 25" (635mm) - **MATCHES**

**Conclusion:** ASME B16.5 data appears generally correct but should be verified against official ASME tables for exactness.

### Affected Migration File

**File:** `annix-backend/src/migrations/1770300000000-AddComprehensiveAsmeB165FlangeData.ts`

---

## BS10 - VERIFICATION RECOMMENDED

### Structure Review

BS10 migration includes Tables D, E, F, H, J, K with proper pressure category assignments:
- T/D, T/E: Low Pressure
- T/F, T/H: Medium Pressure
- T/J, T/K: High Pressure

### 500NB Table Data (from migration)

| Table | OD (D) | PCD | Holes | Hole Dia | Bolt |
|-------|--------|-----|-------|----------|------|
| T/D | 705 | 641 | 20 | 26 | M24 |
| T/E | 705 | 641 | 20 | 30 | M27 |
| T/F | 749 | 673 | 20 | 33 | M30 |
| T/H | 787 | 705 | 20 | 36 | M33 |
| T/J | 876 | 781 | 24 | 39 | M36 |
| T/K | 965 | 857 | 24 | 45 | M36 |

**Verification Status:** Not fully verified against official BS10 standard. PDF sources were not readable programmatically.

### Affected Migration File

**File:** `annix-backend/src/migrations/1770400000000-AddComprehensiveBs10FlangeData.ts`

---

## Recommendations

### Immediate Actions Required

1. **SABS 1123 - HIGH PRIORITY**
   - Correct ALL 500NB data (T600 through T4000)
   - Add missing T4000 class data
   - Audit ALL other NB sizes for similar shift patterns
   - Cross-reference with MPS Technical Manual

2. **BS4504 - HIGH PRIORITY**
   - Verify all 500NB data against EN 1092-1 standard
   - Check if PN10/PN16/PN25/PN40 data is shifted

3. **ASME B16.5 - MEDIUM PRIORITY**
   - Verify against official ASME B16.5-2020 standard
   - Check imperial to metric conversion accuracy

4. **BS10 - MEDIUM PRIORITY**
   - Obtain official BS10:1962 standard document
   - Verify all table data (D, E, F, H, J, K)

### Corrective Migration Required

A new migration should be created to:
1. UPDATE incorrect SABS 1123 flange_dimensions records
2. INSERT missing T4000 class data for SABS 1123
3. UPDATE incorrect BS4504 flange_dimensions records

---

## Source References

1. EICAC DN500 Flange Dimensions - https://eicac.co.uk/flange-dimensions-for-dn500/
2. RoyMech BS4504 PN16 - https://roymech.org/Useful_Tables/Flanges/BS4504_16_Dimensions.html
3. Vishal Steel SABS 1123 - https://www.vishalsteel.com/sabs-1123-flange.html
4. High Pressure Pipe Fittings SABS 1123 - https://www.highpressurepipefittings.com/1123-sabs-sans-flanges.html
5. Engineering Toolbox ASME B16.5 - https://www.engineeringtoolbox.com/flanges-bolts-dimensions-d_464.html
6. Global Supply Line DN500 - https://globalsupplyline.com.au/size-dn500/
7. Fasteners Online SABS 1123 - https://www.fastenersonline.co.in/sans-sabs-1123-flanges-standards-dimensions.html
8. Regal Sales Corp SABS 1123 - https://www.regalsalescorp.com/sabs-sans-1123-flanges-standards.html
9. Marcel Forged SABS 1123 - https://marcelforged.com/flange-dimensions-standards/sans-sabs-1123-flanges/

---

## Appendix: Migration File Locations

| Standard | Migration File | Line Range |
|----------|---------------|------------|
| SABS 1123 | `1770100000000-AddComprehensiveSabs1123FlangeData.ts` | 141-703 |
| BS4504 | `1770200000000-AddComprehensiveBs4504FlangeData.ts` | 80-543 |
| ASME B16.5 | `1770300000000-AddComprehensiveAsmeB165FlangeData.ts` | 77-472 |
| BS10 | `1770400000000-AddComprehensiveBs10FlangeData.ts` | 69-199 |
