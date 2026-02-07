# Pump Module User Guide

## Overview

The Pump Module provides comprehensive functionality for managing industrial pumps, spare parts, and pump-related orders. It supports the full lifecycle from product catalog management to order processing.

## API Endpoints

### Pump Products

Base URL: `/pump-products`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a new pump product |
| GET | `/` | List all products with filtering and pagination |
| GET | `/manufacturers` | List all unique manufacturers |
| GET | `/category/:category` | Get products by category |
| GET | `/manufacturer/:manufacturer` | Get products by manufacturer |
| GET | `/sku/:sku` | Find product by SKU |
| GET | `/:id` | Get product by ID |
| PATCH | `/:id` | Update a product |
| PATCH | `/:id/stock` | Update stock quantity |
| DELETE | `/:id` | Delete a product |

#### Query Parameters for Listing

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| search | string | Search in title, SKU, manufacturer |
| category | enum | Filter by category (CENTRIFUGAL, POSITIVE_DISPLACEMENT, SPECIALTY) |
| manufacturer | string | Filter by manufacturer name |
| status | enum | Filter by status (ACTIVE, DISCONTINUED, OUT_OF_STOCK) |
| minFlowRate | number | Minimum flow rate in m³/h |
| maxFlowRate | number | Maximum flow rate in m³/h |
| minHead | number | Minimum head in meters |
| maxHead | number | Maximum head in meters |

### Pump Orders

Base URL: `/pump-orders`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a new order |
| GET | `/` | List all orders with filtering and pagination |
| GET | `/summary` | Get order summary statistics |
| GET | `/by-number/:orderNumber` | Find order by order number |
| GET | `/:id` | Get order by ID |
| PATCH | `/:id` | Update an order |
| PATCH | `/:id/status` | Update order status |
| DELETE | `/:id` | Delete an order |

#### Order Status Workflow

```
DRAFT → SUBMITTED → CONFIRMED → IN_PROGRESS → COMPLETED
                  ↘ CANCELLED
```

| Status | Description |
|--------|-------------|
| DRAFT | Order being prepared, can be modified |
| SUBMITTED | Order submitted for review |
| CONFIRMED | Order confirmed by supplier |
| IN_PROGRESS | Order being processed/manufactured |
| COMPLETED | Order fulfilled and delivered |
| CANCELLED | Order cancelled |

## Data Models

### PumpProduct

```typescript
{
  id: number;
  sku: string;                    // Unique product SKU
  title: string;                  // Product title
  description?: string;           // Detailed description
  pumpType: string;               // e.g., 'end_suction', 'multistage'
  category: PumpProductCategory;  // CENTRIFUGAL, POSITIVE_DISPLACEMENT, SPECIALTY
  status: PumpProductStatus;      // ACTIVE, DISCONTINUED, OUT_OF_STOCK
  manufacturer: string;           // Manufacturer name
  modelNumber?: string;           // Model number
  flowRateMin?: number;           // Min flow rate (m³/h)
  flowRateMax?: number;           // Max flow rate (m³/h)
  headMin?: number;               // Min head (meters)
  headMax?: number;               // Max head (meters)
  motorPowerKw?: number;          // Motor power (kW)
  listPrice?: number;             // List price (ZAR)
  stockQuantity?: number;         // Current stock
  certifications?: string[];      // ['ISO 9001', 'CE']
  applications?: string[];        // ['water_supply', 'hvac']
  specifications?: object;        // Additional specs as JSON
}
```

### PumpOrder

```typescript
{
  id: number;
  orderNumber: string;            // Auto-generated (PO-YYYY-XXXXX)
  customerReference?: string;     // Customer's PO number
  status: PumpOrderStatus;        // Order status
  orderType: PumpOrderType;       // NEW_PUMP, SPARE_PARTS, REPAIR, RENTAL
  customerCompany?: string;
  customerContact?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  requestedDeliveryDate?: Date;
  confirmedDeliveryDate?: Date;
  supplierId?: number;
  items: PumpOrderItem[];         // Order line items
  subtotal: number;               // Before VAT
  vatAmount: number;              // 15% VAT
  totalAmount: number;            // Including VAT
  currency: string;               // Default: 'ZAR'
  specialInstructions?: string;
  statusHistory: StatusHistoryEntry[];
}
```

### PumpOrderItem

```typescript
{
  id: number;
  orderId: number;
  productId?: number;             // Link to catalog product
  itemType: PumpOrderItemType;    // NEW_PUMP, SPARE_PART, REPAIR_SERVICE, RENTAL
  description: string;
  pumpType?: string;
  manufacturer?: string;
  modelNumber?: string;
  partNumber?: string;
  flowRate?: number;
  head?: number;
  motorPowerKw?: number;
  casingMaterial?: string;
  impellerMaterial?: string;
  sealType?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  lineTotal: number;              // Auto-calculated
  leadTimeDays?: number;
  notes?: string;
  specifications?: object;
}
```

## Usage Examples

### Creating a Pump Product

```bash
POST /pump-products
Content-Type: application/json

{
  "sku": "KSB-ETN-50-200",
  "title": "KSB Etanorm 50-200",
  "description": "Single-stage end suction pump",
  "pumpType": "end_suction",
  "category": "CENTRIFUGAL",
  "manufacturer": "KSB",
  "modelNumber": "ETN 50-200",
  "flowRateMin": 20,
  "flowRateMax": 100,
  "headMin": 20,
  "headMax": 65,
  "motorPowerKw": 7.5,
  "listPrice": 45000,
  "stockQuantity": 3,
  "certifications": ["ISO 9001", "CE"],
  "applications": ["water_supply", "hvac"]
}
```

### Creating a Pump Order

```bash
POST /pump-orders
Content-Type: application/json

{
  "orderType": "NEW_PUMP",
  "customerCompany": "Mining Corp SA",
  "customerContact": "John Smith",
  "customerEmail": "john@miningcorp.co.za",
  "items": [
    {
      "itemType": "NEW_PUMP",
      "description": "KSB Etanorm 50-200 Pump",
      "manufacturer": "KSB",
      "modelNumber": "ETN 50-200",
      "quantity": 2,
      "unitPrice": 45000
    }
  ],
  "specialInstructions": "Deliver to site entrance"
}
```

### Updating Order Status

```bash
PATCH /pump-orders/1/status?status=CONFIRMED&updatedBy=admin&notes=Approved%20by%20manager
```

### Filtering Products

```bash
GET /pump-products?category=CENTRIFUGAL&manufacturer=KSB&minFlowRate=50&maxHead=100&page=1&limit=20
```

## Frontend Integration

### Customer Portal

- `/customer/portal/pumps` - Browse pump catalog
- Product browser with search and filters
- Pump selection wizard for guided selection
- Quote request functionality

### Supplier Portal

- `/supplier/portal/pump-quotes` - View quote requests
- `/supplier/portal/pump-quotes/:id` - Respond to quotes
- Quote comparison tools

### Admin Portal

- `/admin/pumps/products` - Manage product catalog
- `/admin/pumps/products/:id` - Product details
- `/admin/pumps/orders` - Manage orders
- `/admin/pumps/orders/:id` - Order details

## Engineering Tools

The module includes several engineering calculators:

- **NPSH Calculator** - Calculate Net Positive Suction Head
- **Pump Curve Chart** - Visualize H-Q curves
- **System Curve Overlay** - Find operating point
- **API 610 Selection Wizard** - Classify pumps per API standard
- **Material Compatibility Checker** - Check material suitability
- **Lifecycle Cost Calculator** - Total cost of ownership analysis

## Pump Selection Flowchart

Use this flowchart to determine the appropriate pump type for your application:

```
                              START
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Determine Flow Rate │
                    │    and Head (TDH)   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Check Fluid Type   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌───────────┐   ┌───────────┐   ┌───────────────┐
        │ Clean     │   │ Viscous   │   │ Solids/Slurry │
        │ Liquid    │   │ >500 cP   │   │ >5% solids    │
        └─────┬─────┘   └─────┬─────┘   └───────┬───────┘
              │               │                 │
              ▼               ▼                 ▼
     ┌────────────────┐ ┌────────────┐  ┌──────────────┐
     │ CENTRIFUGAL    │ │ POSITIVE   │  │ SLURRY PUMP  │
     │ PUMP           │ │ DISPLACE-  │  │ (Centrifugal │
     │                │ │ MENT       │  │  or PD)      │
     └────────┬───────┘ └─────┬──────┘  └──────┬───────┘
              │               │                │
              ▼               ▼                ▼
    ┌─────────────────┐    Check Type:     Check Type:
    │  Head > 150m?   │    • Progressive   • Horizontal
    └────┬───────┬────┘      Cavity          Slurry
        YES     NO         • Gear          • Vertical
         │       │         • Lobe            Slurry
         ▼       ▼         • Diaphragm     • Dredge
   ┌──────────┐ ┌─────────────┐
   │MULTISTAGE│ │ SINGLE      │
   │PUMP      │ │ STAGE       │
   └──────────┘ └──────┬──────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌───────────┐
    │END      │  │SPLIT     │  │VERTICAL   │
    │SUCTION  │  │CASE      │  │TURBINE    │
    │(OH1/OH2)│  │(BB1/BB2) │  │(VS1-VS7)  │
    └─────────┘  └──────────┘  └───────────┘
         │             │             │
         ▼             ▼             ▼
    Low-Medium    High Flow     Deep Well/
    Flow/Head     >500 m³/h     Sump Service
```

### Quick Selection Guide

| Application | Recommended Type | Flow Range | Head Range |
|-------------|-----------------|------------|------------|
| Water supply, HVAC | End Suction (OH1/OH2) | 5-500 m³/h | 10-150m |
| Process water | Split Case (BB1) | 100-5000 m³/h | 20-150m |
| Boiler feed | Multistage (BB3/BB4) | 10-500 m³/h | 100-2000m |
| Deep wells | Vertical Turbine (VS1) | 50-2000 m³/h | 50-500m |
| Sump drainage | Vertical Sump (VS4/VS5) | 10-500 m³/h | 5-50m |
| Slurry/Mining | Horizontal Slurry | 50-2000 m³/h | 10-80m |
| Viscous fluids | Progressive Cavity | 0.5-200 m³/h | 5-100m |
| Chemical process | Magnetic Drive | 1-100 m³/h | 10-100m |

## API 610 Type Selection Criteria

API 610 defines centrifugal pump configurations for petroleum and heavy chemical industries.

### OH (Overhung) Types - Horizontal, Single Stage

| Type | Description | Typical Applications | Key Characteristics |
|------|-------------|---------------------|---------------------|
| **OH1** | Foot-mounted | General process | Foot on volute, flexible coupling, lowest cost |
| **OH2** | Centerline-mounted | High temp (>175°C) | Centerline support, better thermal stability |
| **OH3** | Vertical inline | Limited floor space | Vertical installation, compact footprint |
| **OH4** | Rigid coupled | Precision drives | Close-coupled to driver, no separate coupling |
| **OH5** | Close-coupled | Small capacity | Motor-mounted pump, minimal footprint |
| **OH6** | High-speed | Low flow, high head | Integral gearbox, up to 25,000 RPM |

### BB (Between Bearings) Types - Horizontal

| Type | Description | Typical Applications | Key Characteristics |
|------|-------------|---------------------|---------------------|
| **BB1** | Axially split | Large flow | 1-2 stages, easy maintenance, radial split volute |
| **BB2** | Radially split | High pressure | 1-2 stages, heavy wall, barrel construction |
| **BB3** | Axially split multistage | Boiler feed | 2+ stages, balance drum, moderate pressure |
| **BB4** | Radially split multistage | High pressure BFW | 2+ stages, cartridge design, >100 bar |
| **BB5** | Radially split multistage | Very high pressure | Double case, >200 bar, refinery service |

### VS (Vertical Suspended) Types

| Type | Description | Typical Applications | Key Characteristics |
|------|-------------|---------------------|---------------------|
| **VS1** | Wet pit, diffuser | Deep wells | Submersible bowl assembly, long column |
| **VS2** | Wet pit, volute | General vertical | Single stage, volute casing |
| **VS3** | Wet pit, axial flow | High flow, low head | Propeller type, flood control |
| **VS4** | Cantilever, dry pit | Clean liquids | No submerged bearings, short shaft |
| **VS5** | Cantilever, dry pit | Abrasive service | Lined, no submerged bearings |
| **VS6** | Barrel, multistage | Condensate | Vertical barrel, multistage, high pressure |
| **VS7** | Sump type | Small sumps | Compact, integral motor/driver |

### Selection Decision Tree

```
Is pump horizontal or vertical installation?
├── HORIZONTAL
│   ├── Single stage?
│   │   ├── YES → Temperature > 175°C?
│   │   │   ├── YES → OH2 (Centerline mount)
│   │   │   └── NO → Flow > 500 m³/h?
│   │   │       ├── YES → BB1 (Split case)
│   │   │       └── NO → OH1 (Foot mount)
│   │   └── NO (Multistage)
│   │       └── Pressure > 100 bar?
│   │           ├── YES → BB4 or BB5 (Radial split)
│   │           └── NO → BB3 (Axial split)
│   └──
└── VERTICAL
    ├── Wet pit / submerged?
    │   ├── YES → Deep well?
    │   │   ├── YES → VS1 (Vertical turbine)
    │   │   └── NO → VS2 or VS3
    │   └── NO (Dry pit)
    │       └── Abrasive?
    │           ├── YES → VS5
    │           └── NO → VS4
    └──
```

## Pump Sizing Examples

### Example 1: Water Transfer Pump

**Requirements:**
- Flow rate: 100 m³/h
- Total head: 50 m
- Fluid: Clean water @ 25°C
- Specific gravity: 1.0

**Calculations:**

1. **Hydraulic Power (Ph)**
   ```
   Ph = (Q × H × ρ × g) / (3.6 × 10⁶)
   Ph = (100 × 50 × 1000 × 9.81) / (3.6 × 10⁶)
   Ph = 13.6 kW
   ```

2. **Estimated Pump Efficiency** (from charts for this duty point)
   ```
   η ≈ 80% (typical for end suction pump at this size)
   ```

3. **Shaft Power (Ps)**
   ```
   Ps = Ph / η = 13.6 / 0.80 = 17.0 kW
   ```

4. **Motor Selection** (with safety margin)
   ```
   Motor = Ps × 1.15 = 17.0 × 1.15 = 19.6 kW
   Select: 22 kW motor (next standard size)
   ```

5. **Specific Speed (Ns)**
   ```
   Ns = N × Q^0.5 / H^0.75
   Ns = 1450 × (100/3.6)^0.5 / 50^0.75
   Ns = 1450 × 5.27 / 18.8
   Ns ≈ 406 (confirms centrifugal is suitable)
   ```

**Result:** OH1 or OH2 end suction pump, 22 kW motor, 80 mm suction × 65 mm discharge

---

### Example 2: Boiler Feed Water Pump

**Requirements:**
- Flow rate: 50 m³/h
- Discharge pressure: 80 bar (≈816 m head)
- Fluid: Deaerated water @ 105°C
- Specific gravity: 0.95

**Calculations:**

1. **Hydraulic Power**
   ```
   Ph = (50 × 816 × 950 × 9.81) / (3.6 × 10⁶)
   Ph = 105.6 kW
   ```

2. **Estimated Pump Efficiency**
   ```
   η ≈ 78% (multistage pump)
   ```

3. **Shaft Power**
   ```
   Ps = 105.6 / 0.78 = 135.4 kW
   ```

4. **Motor Selection**
   ```
   Motor = 135.4 × 1.10 = 149 kW
   Select: 160 kW motor
   ```

5. **Number of Stages** (assuming 60m head per stage)
   ```
   Stages = 816 / 60 = 13.6 → 14 stages
   ```

**Result:** BB3 or BB4 multistage pump, 14 stages, 160 kW motor

---

### Example 3: Slurry Pump

**Requirements:**
- Flow rate: 200 m³/h
- Total head: 40 m
- Fluid: Mine tailings slurry
- Solids concentration: 25% by weight
- Particle size: d50 = 150 μm
- Slurry SG: 1.35

**Calculations:**

1. **Equivalent Water Head** (for pump selection)
   ```
   Hw = H / SG = 40 / 1.35 = 29.6 m water
   ```

2. **Hydraulic Power**
   ```
   Ph = (200 × 40 × 1350 × 9.81) / (3.6 × 10⁶)
   Ph = 29.4 kW
   ```

3. **Efficiency Correction** (for solids)
   ```
   Slurry efficiency = Water efficiency × 0.85
   η ≈ 65% × 0.85 = 55%
   ```

4. **Shaft Power**
   ```
   Ps = 29.4 / 0.55 = 53.5 kW
   ```

5. **Motor Selection** (generous margin for slurry)
   ```
   Motor = 53.5 × 1.25 = 66.9 kW
   Select: 75 kW motor
   ```

**Result:** Horizontal slurry pump (e.g., Warman AH type), 75 kW motor, high chrome wetted parts

---

### Example 4: Viscous Fluid Pump

**Requirements:**
- Flow rate: 15 m³/h
- Discharge pressure: 10 bar (102 m head)
- Fluid: Fuel oil @ 40°C
- Viscosity: 500 cP
- Specific gravity: 0.92

**Calculations:**

1. **Check if centrifugal is suitable**
   ```
   Viscosity limit for centrifugal ≈ 200 cP
   500 cP > 200 cP → Consider PD pump
   ```

2. **If using centrifugal, correction factors needed:**
   ```
   Cq (flow) ≈ 0.92
   Ch (head) ≈ 0.89
   Cη (efficiency) ≈ 0.65
   ```

3. **Recommended pump type:**
   - Progressive cavity pump
   - Or rotary gear pump

4. **For Progressive Cavity:**
   ```
   Ph = (15 × 102 × 920 × 9.81) / (3.6 × 10⁶)
   Ph = 3.8 kW

   η ≈ 70% (PD pump)
   Ps = 3.8 / 0.70 = 5.4 kW

   Motor = 5.4 × 1.15 = 6.2 kW
   Select: 7.5 kW motor
   ```

**Result:** Progressive cavity pump, 7.5 kW motor, 4" discharge

---

### NPSH Calculation Example

**System:**
- Suction tank: Atmospheric (101.3 kPa)
- Liquid level above pump: 2 m
- Suction pipe losses: 0.8 m
- Fluid: Water @ 60°C (vapor pressure = 19.9 kPa)

**NPSHa Calculation:**
```
NPSHa = (Pa - Pv) / (ρg) + Hs - Hf

Where:
Pa = 101.3 kPa (atmospheric)
Pv = 19.9 kPa (vapor pressure @ 60°C)
ρ = 983 kg/m³ (water @ 60°C)
g = 9.81 m/s²
Hs = +2 m (suction head, positive = flooded)
Hf = 0.8 m (friction losses)

NPSHa = (101,300 - 19,900) / (983 × 9.81) + 2 - 0.8
NPSHa = 8.4 + 2 - 0.8
NPSHa = 9.6 m
```

**Safety margin:**
```
NPSHr (from pump curve) = 4.0 m
NPSHa - NPSHr = 9.6 - 4.0 = 5.6 m margin ✓

Rule: NPSHa should be > NPSHr + 0.5m minimum
9.6 > 4.5 ✓ OK
```

## Testing

Run tests with:

```bash
# Unit tests
npm test -- pump

# E2E tests
npm run test:e2e -- pump
```

Test coverage:
- 62 unit tests (controllers and services)
- 39 E2E tests (HTTP endpoint testing)
- Integration tests for pump RFQ endpoints
