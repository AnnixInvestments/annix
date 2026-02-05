# Rubber Portal Documentation

This document covers the rubber lining portal migrated from the Firebase Portal project, including usage guide, URL mapping, and entity analysis.

---

## Table of Contents

1. [URL Mapping](#url-mapping)
2. [Portal Pages](#portal-pages)
3. [Features](#features)
4. [Order Statuses](#order-statuses)
5. [Entity Architecture](#entity-architecture)
6. [Running Locally](#running-locally)

---

## URL Mapping

| Firebase URL | New Route | Local Access |
|--------------|-----------|--------------|
| `/prices` | `/pricing` | `http://localhost:3000/pricing` |
| `/products/compound` | `/admin/portal/rubber/codings` | `http://localhost:3000/admin/portal/rubber/codings` |

---

## Portal Pages

All rubber portal pages are under `/admin/portal/rubber`.

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/portal/rubber` | Overview with stats and recent orders |
| Orders | `/admin/portal/rubber/orders` | Order list with status tabs |
| Order Details | `/admin/portal/rubber/orders/[id]` | Order editing with calloff tracking |
| Companies | `/admin/portal/rubber/companies` | Customer company management |
| Products | `/admin/portal/rubber/products` | Product catalog management |
| Product Codings | `/admin/portal/rubber/codings` | Attribute codes (compounds, colours, etc.) |
| Pricing Tiers | `/admin/portal/rubber/pricing-tiers` | Company pricing multipliers |

---

## Features

### Calloff Tracking

The Order Details page includes calloff tracking for partial fulfillment:

- **quantity**: The quantity being called off
- **quantityRemaining**: Remaining quantity after this calloff
- **events**: Array of timestamped status updates

Use calloffs to track partial deliveries against order line items.

### Product Codings

Manage product attribute codes with tabs for each type:

| Type | Description |
|------|-------------|
| `COMPOUND` | Rubber compounds (e.g. NR, SBR, EPDM) |
| `COLOUR` | Product colours |
| `TYPE` | Rubber types |
| `HARDNESS` | Hardness values (IRHD) |
| `GRADE` | Product grades (A, B, C, D) |
| `CURING_METHOD` | Vulcanization methods |

### Pricing Tiers

Pricing multipliers for companies:
- 100% = standard pricing
- Below 100% = discount (e.g. 90% = 10% discount)
- Above 100% = markup (e.g. 110% = 10% markup)

---

## Order Statuses

| Value | Label | Description |
|-------|-------|-------------|
| -1 | New | Just created |
| 0 | Draft | Being edited |
| 1 | Cancelled | Order cancelled |
| 2 | Partially Submitted | Some items submitted |
| 3 | Submitted | Ready for manufacturing |
| 4 | Manufacturing | In production |
| 5 | Delivering | Out for delivery |
| 6 | Complete | Fulfilled |

---

## Entity Architecture

The rubber module contains two distinct entity sets serving different purposes.

### Engineering Reference Entities (Existing)

Technical reference data per SANS standards:

| Entity | Table | Purpose |
|--------|-------|---------|
| `RubberType` | `rubber_types` | SANS rubber type classifications (Types 1-5) |
| `RubberSpecification` | `rubber_specifications` | Mechanical properties per SANS 971 |
| `RubberApplicationRating` | `rubber_application_ratings` | Chemical resistance ratings |
| `RubberThicknessRecommendation` | `rubber_thickness_recommendations` | Thickness and ply guidelines |
| `RubberAdhesionRequirement` | `rubber_adhesion_requirements` | Adhesion requirements by method |
| `RubberChemicalCompatibility` | `rubber_chemical_compatibility` | ISO TR 7620 chemical data |

### Commercial/Portal Entities (New)

Business operations data from Firebase Portal:

| Entity | Table | Purpose |
|--------|-------|---------|
| `RubberProductCoding` | `rubber_product_coding` | Product attribute lookups |
| `RubberPricingTier` | `rubber_pricing_tier` | Customer pricing multipliers |
| `RubberCompany` | `rubber_company` | Portal customer companies |
| `RubberProduct` | `rubber_product` | Commercial product catalog |
| `RubberOrder` | `rubber_order` | Customer orders |
| `RubberOrderItem` | `rubber_order_item` | Order line items with calloffs |

### Entity Relationship Diagram

```
ENGINEERING (Reference)              COMMERCIAL (Portal)
───────────────────────              ───────────────────
RubberType
  │
  ├── RubberSpecification            RubberProductCoding
  │     (Grade, Hardness)              (TYPE, GRADE, HARDNESS,
  │                                     COLOUR, COMPOUND,
  ├── RubberApplicationRating          CURING_METHOD)
  │     (Chemical resistance)                │
  │                                          ▼
  ├── RubberAdhesionRequirement      RubberProduct ◄── RubberPricingTier
  │     (Vulcanization)                      │              │
  │                                          │              ▼
  ├── RubberThicknessRec...          RubberOrder ◄─── RubberCompany
  │     (Thickness guidelines)               │
  │                                          ▼
  └── RubberChemicalCompatibility    RubberOrderItem
        (ISO TR 7620)                  (with CallOffs)
```

### Why Two Sets?

| Domain | Purpose | Data Character |
|--------|---------|----------------|
| **Engineering** | What rubber *is* (SANS standards) | Technical, detailed, read-only |
| **Commercial** | What rubber you can *buy* | Transactional, business-focused |

The entities are **complementary, not duplicative**. No consolidation required.

### Concept Mapping

| Concept | Engineering Entity | Portal Entity | Overlap? |
|---------|-------------------|---------------|----------|
| Type | `RubberType` (detailed specs) | `ProductCoding TYPE` (label) | Different detail levels |
| Grade | `RubberSpecification.grade` | `ProductCoding GRADE` | Different purposes |
| Hardness | `RubberSpecification.hardnessClassIrhd` | `ProductCoding HARDNESS` | Different purposes |
| Curing | `RubberAdhesionRequirement` | `ProductCoding CURING_METHOD` | Different purposes |
| Colour | None | `ProductCoding COLOUR` | New only |
| Compound | None | `ProductCoding COMPOUND` | New only |

### Future Improvements (Optional)

1. **Auto-seed codings** from engineering reference data
2. **Link products to specs** for technical data display
3. **Link companies to CustomerProfile** for unified customer records

---

## Running Locally

1. Start the backend:
   ```bash
   cd annix-backend
   pnpm run start:dev
   ```

2. Start the frontend:
   ```bash
   cd annix-frontend
   pnpm run dev
   ```

3. Access the rubber portal at `http://localhost:3000/admin/portal/rubber`
