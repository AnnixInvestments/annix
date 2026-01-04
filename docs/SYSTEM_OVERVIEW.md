# Annix-Sync System Overview

## Executive Summary

Annix-Sync is a comprehensive B2B Request for Quotation (RFQ) platform designed for the industrial piping and steel fabrication industry in South Africa. The system enables customers to request quotes for various pipe products (straight pipes, bends, fittings) while managing supplier relationships and approval workflows.

---

## System Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Customer Portal |     |  Supplier Portal  |     |   Admin Portal    |
|   (Next.js/React) |     |  (Next.js/React)  |     |  (Next.js/React)  |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   |
                    +--------------v---------------+
                    |     NestJS Backend API       |
                    |        (Port 4001)           |
                    +-----+----------------+-------+
                          |                |
              +-----------v----+    +------v--------+
              |   PostgreSQL   |    |   AWS S3      |
              |   Database     |    |   Storage     |
              +----------------+    +---------------+
```

---

## Core Business Domains

### 1. Request for Quotation (RFQ) Management

The primary business function - allowing customers to request quotes for:

- **Straight Pipes**: Specified by nominal bore, schedule, length, and end configuration
- **Bends/Elbows**: Specified by angle, radius, and tangent lengths
- **Fittings**: Tees, laterals, reducers per SABS62/SABS719 standards
- **Flanges**: Various standards (BS 4504, SABS 1123) with pressure classes

**Key Features:**
- Real-time weight and cost calculations
- ASME B31.3 pressure compliance validation
- 3D previews of pipe configurations
- Multi-item RFQs (combine straight pipes + bends + fittings)
- Document attachment support

### 2. Customer Management

- Multi-step registration with company details
- Document upload and OCR validation
- Device fingerprinting for security
- Onboarding workflow with admin approval
- Preferred supplier relationships

### 3. Supplier Management

- Registration with BEE (Black Economic Empowerment) certification
- Capability tracking (products, regions, certifications)
- Document validation workflow
- Customer invitation system

### 4. Admin Operations

- Customer/Supplier onboarding approval
- Document validation and review
- Account suspension/reactivation
- System statistics and monitoring

---

## Key Functionality by Module

### RFQ Module
| Feature | Description |
|---------|-------------|
| Create RFQ | Multi-step form for pipe specifications |
| Calculate | Real-time weight, pressure, cost calculations |
| 3D Preview | Visual representation of pipe configurations |
| Documents | Attach supporting drawings and documents |
| Status Tracking | Draft → Pending → Quoted → Accepted/Rejected |

### Pipe Specifications
| Feature | Description |
|---------|-------------|
| Steel Specs | Multiple steel specifications (ASTM, SABS) |
| Schedules | Schedule-based or wall thickness selection |
| Pressure Rating | Temperature-pressure lookup tables |
| Weight Calculation | Formula: ((OD - WT) * WT) * 0.02466 kg/m |

### Flange System
| Feature | Description |
|---------|-------------|
| Standards | BS 4504, SABS 1123, ANSI |
| Pressure Classes | Multiple rating systems |
| Bolt/Nut Specs | Complete fastener specifications |
| Mass Calculations | Per-component weight data |

### Fitting System
| Feature | Description |
|---------|-------------|
| SABS62 | Standard manufactured fittings |
| SABS719 | Fabricated fittings with pipe lengths |
| Dimensions | Auto-lookup of center-to-face dimensions |
| Types | Tees, laterals, crosses, reducers, elbows |

### Mining Industry Support
| Feature | Description |
|---------|-------------|
| SA Mines Database | South African mines with locations |
| Slurry Profiles | Commodity-specific corrosion/abrasion data |
| Coating Rules | Recommended linings per mine/commodity |
| Environmental Intel | Weather and corrosion environment factors |

---

## User Roles and Permissions

### Customer Roles
- **CUSTOMER_ADMIN**: Full company control, invite users
- **CUSTOMER_STANDARD**: Create RFQs, view company data

### Supplier Roles
- **SUPPLIER_ADMIN**: Manage company and capabilities
- **SUPPLIER_STANDARD**: View invitations and respond

### Admin Roles
- Full system access
- Approve/reject onboarding
- Manage all users
- View system statistics

---

## Security Features

1. **Device Fingerprinting**: Bind accounts to registered devices
2. **Token-Based Auth**: JWT with refresh token rotation
3. **Session Management**: Track active sessions with invalidation
4. **Login Attempts**: Track and limit failed login attempts
5. **IP Tracking**: Log and verify IP addresses
6. **Document Validation**: OCR-based document verification
7. **Audit Logging**: Comprehensive action tracking

---

## Integration Points

### External Services
- **AWS S3**: Document and file storage
- **Google Maps API**: Location picker for mines
- **OCR Service**: Document text extraction

### Data Sources
- Pipe dimension tables (ASTM, SABS)
- Flange dimension tables
- Fitting dimension tables
- Bolt/nut mass tables
- Mining industry data

---

## Technical Stack

### Frontend
- Next.js 15 with App Router
- React with TypeScript
- Tailwind CSS
- Three.js for 3D previews

### Backend
- NestJS (Node.js framework)
- TypeORM for database access
- PostgreSQL database
- JWT authentication

### Infrastructure
- AWS S3 for file storage
- Vercel-ready deployment
- Environment-based configuration

---

## Key Calculations

### Pipe Weight
```
Weight (kg/m) = ((OD_mm - WT_mm) * WT_mm) * 0.02466
```

### Pressure Rating (ASME B31.3)
```
Max Pressure = (2 * S * E * t) / (D - 2 * Y * t)
Where:
  S = Allowable stress at temperature
  E = Joint efficiency
  t = Wall thickness
  D = Outside diameter
  Y = Coefficient (0.4 for ferritic steels below 482°C)
```

### Bend Center-to-Face
```
C/F = R * tan(θ/2)
Where:
  R = Bend radius
  θ = Bend angle in radians
```

---

## Database Entity Count

| Category | Entity Count |
|----------|-------------|
| User & Auth | 6 |
| Customer | 9 |
| Supplier | 9 |
| RFQ & BOQ | 7 |
| Drawings | 3 |
| Pipe Specs | 8 |
| Flanges | 5 |
| Fittings | 8 |
| Bolts/Nuts | 3 |
| Coatings | 3 |
| Mining | 4 |
| Structural Steel | 5 |
| HDPE/PVC | 8 |
| Audit/Workflow | 2 |
| **Total** | **~80 entities** |

---

## Status Workflows

### RFQ Status Flow
```
DRAFT → PENDING → QUOTED → ACCEPTED/REJECTED/CANCELLED
```

### Onboarding Status Flow
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED
         ↑__________________________________|
                (Resubmission allowed)
```

### Document Validation Flow
```
PENDING → VALID/INVALID/FAILED/MANUAL_REVIEW
```

---

## Future Considerations

Based on the current architecture, potential enhancements could include:
- Real-time notifications (WebSocket)
- Advanced pricing engine
- Supplier quoting interface
- Order management post-quote acceptance
- Inventory integration
- ERP system integration
- Mobile applications
