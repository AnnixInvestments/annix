# Complete Functionality List - Annix-Sync

## 1. Customer Portal Features

### Authentication & Security
- [x] Multi-step registration (Company → Documents → Profile → Security)
- [x] Email verification with token
- [x] Login with device fingerprinting
- [x] Token-based authentication with refresh
- [x] Password hashing with salt
- [x] Session management with invalidation reasons
- [x] IP address tracking and mismatch warnings
- [x] Failed login attempt tracking
- [x] Device binding (primary/secondary devices)

### Profile Management
- [x] View and edit personal profile
- [x] Change contact information
- [x] View account status
- [x] View login history

### Company Management
- [x] View and edit company details
- [x] Company address management
- [x] VAT and registration number tracking

### Document Management
- [x] Upload documents (Registration cert, Tax clearance, BEE, Insurance, etc.)
- [x] OCR-based document validation
- [x] Document status tracking (Pending → Valid/Invalid)
- [x] Document expiry tracking
- [x] View validation notes

### RFQ Creation & Management
- [x] Create new RFQ with type selection
- [x] Multi-step RFQ form for straight pipes
- [x] Multi-step RFQ form for bends/elbows
- [x] Multi-step RFQ form for fittings
- [x] Combined RFQ with multiple item types
- [x] Real-time weight calculations
- [x] Real-time cost estimates
- [x] 3D preview of pipe configurations
- [x] ASME B31.3 pressure validation
- [x] Schedule recommendation based on pressure
- [x] Attach documents to RFQ
- [x] View RFQ list with filtering
- [x] View RFQ details
- [x] Track RFQ status

### Pipe Specifications
- [x] Steel specification selection (SABS, ASTM)
- [x] Nominal bore selection (NB in mm)
- [x] Schedule type selection (schedule number vs wall thickness)
- [x] Wall thickness lookup from schedules
- [x] Pipe end configuration (Plain End, Flanged Both Ends, etc.)
- [x] Working pressure and temperature input
- [x] Quantity specification (total length or number of pipes)
- [x] Individual pipe length specification

### Bend Specifications
- [x] Bend type selection (45°, 90°, etc.)
- [x] Bend radius calculation
- [x] Center-to-face dimension lookup
- [x] Tangent length management
- [x] Multiple tangent support
- [x] SABS62 and SABS719 standard support
- [x] 3D bend preview

### Fitting Specifications
- [x] Fitting type selection (Tee, Lateral, Reducer, etc.)
- [x] SABS62 standard fittings
- [x] SABS719 fabricated fittings
- [x] Automatic pipe length lookup
- [x] Angle range for laterals/Y-pieces
- [x] Schedule and wall thickness for fabricated fittings

### Flange Specifications
- [x] Flange standard selection (BS 4504, SABS 1123)
- [x] Pressure class selection
- [x] Bolt specification lookup
- [x] Flange dimension lookup
- [x] Mass calculation

### Supplier Relationships
- [x] View preferred suppliers list
- [x] Add preferred suppliers
- [x] Set supplier priority
- [x] Send supplier invitations
- [x] Track invitation status

### Onboarding Workflow
- [x] Multi-step onboarding process
- [x] Submit for review
- [x] Track onboarding status
- [x] Receive rejection reasons
- [x] Resubmit after remediation

---

## 2. Supplier Portal Features

### Authentication & Security
- [x] Multi-step registration with BEE support
- [x] Email verification
- [x] Device fingerprinting
- [x] Session management
- [x] Login attempt tracking

### Profile Management
- [x] View and edit personal profile
- [x] Contact information management

### Company Management
- [x] Company details (legal, trading names)
- [x] Registration and VAT numbers
- [x] BEE level tracking
- [x] BEE certificate expiry management
- [x] Verification agency tracking
- [x] Operational regions configuration

### Capability Management
- [x] Product category selection (Pipes, Bends, Flanges, etc.)
- [x] Material specializations
- [x] Monthly capacity (tons)
- [x] Size range specification
- [x] Pressure ratings
- [x] Regional coverage (provincial/nationwide/international)
- [x] Certifications (ISO 9001, ASME, API, etc.)
- [x] Lead time configuration
- [x] Minimum order values
- [x] Quality documentation capabilities

### Document Management
- [x] Upload company documents
- [x] Document type categorization
- [x] Validation status tracking
- [x] Expiry date management

### Onboarding
- [x] Complete company details
- [x] Upload required documents
- [x] Submit for admin review
- [x] Track approval status

---

## 3. Admin Portal Features

### Dashboard
- [x] System statistics overview
- [x] Total RFQs count
- [x] Total customers count
- [x] Total suppliers count
- [x] Pending approvals count
- [x] Recent activity

### Customer Management
- [x] View all customers list
- [x] Search and filter customers
- [x] View customer details
- [x] View customer company information
- [x] View customer documents
- [x] Suspend customer accounts
- [x] Reactivate suspended accounts
- [x] View login history
- [x] Manage device bindings

### Supplier Management
- [x] View all suppliers list
- [x] Search and filter suppliers
- [x] View supplier details
- [x] View supplier capabilities
- [x] View supplier documents
- [x] Approve/reject supplier onboarding
- [x] Suspend supplier accounts
- [x] Reactivate accounts

### Onboarding Approvals
- [x] View pending customer onboarding
- [x] View pending supplier onboarding
- [x] Review submitted documents
- [x] Approve applications
- [x] Reject with reasons
- [x] Request additional documents

### Document Validation
- [x] Review uploaded documents
- [x] Mark documents as valid/invalid
- [x] Add validation notes
- [x] Request document updates

### User Management
- [x] View admin users
- [x] Create admin users
- [x] Manage user roles

### RFQ Management
- [x] View all RFQs
- [x] Filter by status
- [x] View RFQ details

---

## 4. Technical Specifications Support

### Steel Specifications
- [x] SABS 62 (Spiral welded)
- [x] SABS 719 ERW (Electric resistance welded)
- [x] ASTM standards
- [x] Multiple steel grades

### Pipe Schedules
- [x] Standard schedules (Sch 10, 20, 30, 40, 80, etc.)
- [x] XS (Extra Strong)
- [x] XXS (Double Extra Strong)
- [x] Wall thickness lookup tables

### Pressure-Temperature Ratings
- [x] ASME B31.3 compliance
- [x] Temperature-dependent allowable stress
- [x] Joint efficiency factors
- [x] Corrosion allowance

### Flange Standards
- [x] BS 4504 (British Standard)
- [x] SABS 1123 (South African)
- [x] ANSI (American)
- [x] Multiple pressure classes per standard

### Fitting Standards
- [x] SABS62 manufactured fittings
- [x] SABS719 fabricated fittings
- [x] Center-to-face dimensions
- [x] Pipe length calculations

### Bend Specifications
- [x] Long radius bends
- [x] Medium radius bends
- [x] Short radius (elbow)
- [x] Various angles (15°, 22.5°, 30°, 45°, 60°, 90°)

---

## 5. Calculations & Engineering

### Weight Calculations
- [x] Pipe weight per meter
- [x] Total pipe weight
- [x] Flange weight
- [x] Bolt and nut weights
- [x] Fitting weight
- [x] Bend weight
- [x] Total system weight

### Pressure Calculations
- [x] Maximum allowable pressure
- [x] Minimum wall thickness for pressure
- [x] Schedule recommendation
- [x] Pressure validation warnings

### Dimension Lookups
- [x] OD from NB
- [x] Wall thickness from schedule
- [x] Internal diameter calculation
- [x] Flange dimensions from size/standard/class
- [x] Bolt specifications from flange

### Surface Area Calculations
- [x] External surface area (for coating)
- [x] Internal surface area (for lining)
- [x] Flange face area

---

## 6. Mining Industry Features

### Mine Database
- [x] South African mines database
- [x] Mine location (latitude/longitude)
- [x] Mine type (Underground/Open Cast)
- [x] Operational status
- [x] Operating company
- [x] Province/district

### Commodity Tracking
- [x] Commodity types (Gold, Platinum, Coal, etc.)
- [x] Commodity-specific slurry profiles

### Environmental Intelligence
- [x] Slurry characteristics
- [x] Specific gravity ranges
- [x] Solids concentration
- [x] pH ranges
- [x] Temperature ranges
- [x] Abrasion risk assessment
- [x] Corrosion risk assessment

### Coating Recommendations
- [x] Environment-based coating selection
- [x] Lining recommendations per commodity
- [x] Mine-specific coating rules
- [x] Lifespan categories (Low/Medium/High)

---

## 7. Document & Drawing Management

### Drawing Features
- [x] Upload drawings (PDF, DWG, DXF, images)
- [x] Drawing versioning
- [x] Change notes per version
- [x] Drawing status workflow
- [x] Comment system with positions
- [x] Comment types (General, Annotation, Review Note, etc.)
- [x] Comment threading (replies)
- [x] Comment resolution tracking

### Bill of Quantities (BOQ)
- [x] Create BOQ from RFQ
- [x] Manual BOQ creation
- [x] Line item management
- [x] Item type categorization
- [x] Quantity and weight tracking
- [x] Unit pricing
- [x] Total calculations
- [x] BOQ status workflow

### Document Upload
- [x] Multiple file format support
- [x] File size tracking
- [x] MIME type detection
- [x] Secure file storage (S3)

---

## 8. Workflow & Audit

### Status Workflows
- [x] RFQ: Draft → Pending → Quoted → Accepted/Rejected
- [x] Onboarding: Draft → Submitted → Under Review → Approved/Rejected
- [x] Drawing: Draft → Submitted → Under Review → Approved/Rejected
- [x] BOQ: Same as Drawing workflow

### Review Workflow
- [x] Submit for review
- [x] Assign reviewer
- [x] Request changes
- [x] Approve/Reject
- [x] Decision notes
- [x] Due date tracking

### Audit Logging
- [x] Track all entity changes
- [x] Store old and new values
- [x] Record user who made change
- [x] IP address logging
- [x] User agent logging
- [x] Timestamp tracking
- [x] Action type categorization

---

## 9. Specialized Materials

### HDPE Pipes
- [x] SDR-based sizing
- [x] PE100/PE80 grades
- [x] Pressure ratings (PN)
- [x] Weight per meter
- [x] Fitting types
- [x] Buttweld pricing
- [x] Stub pricing

### PVC Pipes
- [x] Multiple PVC types (PVC-U, CPVC, PVC-O, PVC-M)
- [x] Multiple standards (EN 1452, ISO 1452, ASTM, SABS)
- [x] Pressure ratings
- [x] Fitting types
- [x] Cement pricing

### Structural Steel
- [x] Steel grades (code, yield strength, tensile strength)
- [x] Section types and sizes
- [x] Mass per meter
- [x] Fabrication operations
- [x] Complexity multipliers
- [x] Shop labor rates

---

## 10. Integration Points

### AWS S3
- [x] Document storage
- [x] Drawing storage
- [x] Secure URL generation

### Google Maps
- [x] Mine location picker
- [x] Latitude/longitude capture
- [x] Address geocoding

### OCR Processing
- [x] Document text extraction
- [x] Data comparison with user input
- [x] Similarity scoring
- [x] Validation feedback

---

## 11. UI/UX Features

### 3D Visualization
- [x] Straight pipe 3D preview
- [x] Bend 3D preview
- [x] Tee fitting 3D preview
- [x] Flange visualization
- [x] Interactive rotation

### Form Features
- [x] Multi-step wizards
- [x] Real-time validation
- [x] Auto-fill from previous selections
- [x] Conditional field display
- [x] Loading states
- [x] Error messages

### Navigation
- [x] Role-based portal navigation
- [x] Breadcrumb navigation
- [x] Tab navigation
- [x] Modal dialogs

### Data Display
- [x] Filterable lists
- [x] Searchable tables
- [x] Status badges
- [x] Summary cards
- [x] Statistics widgets

---

## Summary Statistics

| Category | Feature Count |
|----------|---------------|
| Authentication & Security | 15 |
| Customer Portal | 40+ |
| Supplier Portal | 25+ |
| Admin Portal | 25+ |
| Technical Specifications | 30+ |
| Calculations | 15+ |
| Mining Features | 15+ |
| Document/Drawing | 20+ |
| Workflow/Audit | 15+ |
| Specialized Materials | 20+ |
| **Total Implemented Features** | **~220+** |
