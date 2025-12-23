# Hidden Content Registry

This document tracks UI components and sections that have been hidden but not deleted,
allowing for potential future use or reactivation.

## How to Find Hidden Content

All hidden content is marked with:
1. A comment starting with `{/* HIDDEN: ... */}` before the element
2. The `className="hidden"` CSS class on the container element

To search for all hidden content: `grep -n "HIDDEN:" *.tsx`

---

## Hidden Content List

### 1. Soil Type (WRB Classification) Field
- **File:** `MultiStepStraightPipeRfqForm.tsx`
- **Location:** Environmental Intelligence > Soil Conditions section
- **Line:** ~1508-1525
- **Reason:** Hidden per user request
- **Date Hidden:** 2024-12-23
- **Notes:** May be used in future. The field accepts WRB soil classification values.

### 2. Corrosion Severity Classification Section
- **File:** `MultiStepStraightPipeRfqForm.tsx`
- **Location:** Environmental Intelligence section
- **Line:** ~1932-1997
- **Reason:** Hidden per user request
- **Date Hidden:** 2024-12-23
- **Notes:** May be used in this area or another area in future. Contains:
  - Soil Corrosivity (AMPP SP0169) dropdown
  - ISO 12944 Corrosivity Category dropdown
  - Overall Environment Severity dropdown

### 3. Coating System Recommendations (ISO 21809)
- **File:** `MultiStepStraightPipeRfqForm.tsx`
- **Location:** Environmental Intelligence section
- **Line:** ~1999-2096
- **Reason:** Will be shown on a different page
- **Date Hidden:** Pre-existing (before 2024-12-23)
- **Notes:** Contains coating-related fields:
  - Suitable External Coating Families dropdown
  - Minimum Coating Thickness dropdown
  - Surface Preparation Standard dropdown
  - Cathodic Protection Compatibility dropdown
  - Additional Protection Requirements checkboxes (Concrete Coating, Rock Shield, Holiday Detection, Field Joint Coating)

---

## Reactivating Hidden Content

To reactivate any hidden content:
1. Remove the `hidden` class from the container div
2. Update or remove the `HIDDEN:` comment
3. Update validation functions if the fields were removed from validation
4. Remove the entry from this document

## Validation Considerations

When hiding fields that were part of validation:
- Update `hasRequiredEnvironmentalData()` to remove hidden fields
- Update `hasRequiredLocationData()` if location fields are hidden
- Check confirmation button logic still works correctly
