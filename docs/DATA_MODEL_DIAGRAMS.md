# Annix-Sync Data Model Diagrams

This document contains Entity-Relationship diagrams for all major domains in the system.

---

## 1. User & Authentication Domain

```mermaid
erDiagram
    User ||--o{ UserRole : has
    User ||--o{ AdminSession : has
    User ||--o| CustomerProfile : has
    User ||--o| SupplierProfile : has

    User {
        int id PK
        string username
        string email UK
        string firstName
        string lastName
        string password
        string salt
        string status
        datetime lastLoginAt
    }

    UserRole {
        int id PK
        string name UK
    }

    AdminSession {
        int id PK
        string sessionToken UK
        int userId FK
        string clientIp
        string userAgent
        datetime expiresAt
        boolean isRevoked
    }
```

---

## 2. Customer Domain

```mermaid
erDiagram
    CustomerCompany ||--o{ CustomerProfile : employs
    CustomerProfile ||--o| User : linkedTo
    CustomerProfile ||--o{ CustomerDeviceBinding : has
    CustomerProfile ||--o{ CustomerSession : has
    CustomerProfile ||--o{ CustomerLoginAttempt : has
    CustomerProfile ||--o| CustomerOnboarding : has
    CustomerProfile ||--o{ CustomerDocument : uploads
    CustomerCompany ||--o{ CustomerPreferredSupplier : prefers
    CustomerCompany ||--o{ SupplierInvitation : sends

    CustomerCompany {
        int id PK
        string legalName
        string tradingName
        string registrationNumber UK
        string vatNumber
        string industry
        string streetAddress
        string city
        string provinceState
        string country
    }

    CustomerProfile {
        int id PK
        int userId FK
        int companyId FK
        string firstName
        string lastName
        string jobTitle
        enum role
        enum accountStatus
        boolean emailVerified
    }

    CustomerSession {
        int id PK
        int customerProfileId FK
        string sessionToken UK
        string refreshToken
        string deviceFingerprint
        string ipAddress
        boolean isActive
        datetime expiresAt
    }

    CustomerDocument {
        int id PK
        int customerProfileId FK
        enum documentType
        string fileName
        string filePath
        enum validationStatus
        json ocrExtractedData
    }

    CustomerOnboarding {
        int id PK
        int customerProfileId FK
        enum status
        boolean companyDetailsComplete
        boolean documentsComplete
        datetime submittedAt
    }
```

---

## 3. Supplier Domain

```mermaid
erDiagram
    SupplierCompany ||--o{ SupplierProfile : employs
    SupplierProfile ||--o| User : linkedTo
    SupplierProfile ||--o{ SupplierDeviceBinding : has
    SupplierProfile ||--o{ SupplierSession : has
    SupplierProfile ||--o{ SupplierCapability : offers
    SupplierProfile ||--o{ SupplierDocument : uploads
    SupplierProfile ||--o| SupplierOnboarding : has

    SupplierCompany {
        int id PK
        string legalName
        string tradingName
        string registrationNumber UK
        string vatNumber
        string taxNumber
        int beeLevel
        datetime beeCertificateExpiry
        json operationalRegions
    }

    SupplierProfile {
        int id PK
        int userId FK
        int companyId FK
        string firstName
        string lastName
        enum accountStatus
        boolean emailVerified
    }

    SupplierCapability {
        int id PK
        int supplierProfileId FK
        enum productCategory
        array materialSpecializations
        decimal monthlyCapacityTons
        array certifications
        int standardLeadTimeDays
        boolean nationwideCoverage
        int capabilityScore
    }

    SupplierDocument {
        int id PK
        int supplierProfileId FK
        enum documentType
        string fileName
        enum validationStatus
        datetime expiryDate
    }
```

---

## 4. RFQ & BOQ Domain

```mermaid
erDiagram
    Rfq ||--o{ RfqItem : contains
    Rfq ||--o{ RfqDocument : has
    Rfq ||--o{ Drawing : has
    Rfq ||--o{ Boq : generates
    RfqItem ||--o| StraightPipeRfq : details
    RfqItem ||--o| BendRfq : details
    Boq ||--o{ BoqLineItem : contains
    User ||--o{ Rfq : creates

    Rfq {
        int id PK
        string rfqNumber UK
        string projectName
        string customerName
        string customerEmail
        enum status
        decimal totalWeightKg
        decimal totalCost
        int createdById FK
    }

    RfqItem {
        int id PK
        int rfqId FK
        int lineNumber
        string description
        enum itemType
        int quantity
        decimal weightPerUnitKg
        decimal totalWeightKg
    }

    StraightPipeRfq {
        int id PK
        int rfqItemId FK
        int nominalBoreMm
        enum scheduleType
        string scheduleNumber
        decimal wallThicknessMm
        string pipeEndConfiguration
        decimal individualPipeLength
        decimal workingPressureBar
        int steelSpecificationId FK
    }

    BendRfq {
        int id PK
        int rfqItemId FK
        int nominalBoreMm
        string scheduleNumber
        string bendType
        int bendDegrees
        json tangentLengths
        int quantityValue
    }

    Boq {
        int id PK
        string boqNumber UK
        string title
        enum status
        decimal totalWeightKg
        decimal totalEstimatedCost
        int rfqId FK
    }

    BoqLineItem {
        int id PK
        int boqId FK
        int lineNumber
        string itemCode
        enum itemType
        decimal quantity
        decimal unitWeightKg
    }
```

---

## 5. Pipe Specifications Domain

```mermaid
erDiagram
    SteelSpecification ||--o{ PipeDimension : defines
    SteelSpecification ||--o{ Fitting : supports
    NominalOutsideDiameterMm ||--o{ PipeDimension : sizes
    PipeDimension ||--o{ PipePressure : ratedAt

    SteelSpecification {
        int id PK
        string steelSpecName UK
    }

    NominalOutsideDiameterMm {
        int id PK
        decimal nominalDiameterMm
        decimal outsideDiameterMm
    }

    PipeDimension {
        int id PK
        int steelSpecificationId FK
        int nominalOdId FK
        decimal wallThicknessMm
        decimal internalDiameterMm
        decimal massKgm
        string scheduleDesignation
    }

    PipePressure {
        int id PK
        int pipeDimensionId FK
        decimal temperatureC
        decimal maxWorkingPressureMpa
        decimal allowableStressMpa
    }

    NbNpsLookup {
        int id PK
        decimal nbMm
        decimal outsideDiameterMm
        string npsInches
    }
```

---

## 6. Flange Domain

```mermaid
erDiagram
    FlangeStandard ||--o{ FlangePressureClass : has
    FlangePressureClass ||--o{ FlangeDimension : defines
    NominalOutsideDiameterMm ||--o{ FlangeDimension : sizes
    Bolt ||--o{ FlangeDimension : bolts
    Bolt ||--o{ BoltMass : masses
    Bolt ||--o{ NutMass : nuts

    FlangeStandard {
        int id PK
        string code UK
    }

    FlangePressureClass {
        int id PK
        int flangeStandardId FK
        string designation
    }

    FlangeDimension {
        int id PK
        int nominalOdId FK
        int standardId FK
        int pressureClassId FK
        int boltId FK
        decimal D
        decimal b
        decimal d4
        int numHoles
        decimal pcd
        decimal massKg
    }

    Bolt {
        int id PK
        string designation UK
    }

    BoltMass {
        int id PK
        int boltId FK
        decimal lengthMm
        decimal massKg
    }

    NutMass {
        int id PK
        int boltId FK
        string size
        decimal massKg
    }
```

---

## 7. Fitting Domain

```mermaid
erDiagram
    SteelSpecification ||--o{ Fitting : supports
    FittingType ||--o{ Fitting : types
    Fitting ||--o{ FittingVariant : variants
    FittingVariant ||--o{ FittingBore : sizes
    FittingVariant ||--o{ FittingDimension : dimensions
    NominalOutsideDiameterMm ||--o{ FittingBore : sizes
    AngleRange ||--o{ FittingDimension : angles

    FittingType {
        int id PK
        string name UK
    }

    Fitting {
        int id PK
        int steelSpecificationId FK
        int fittingTypeId FK
    }

    FittingVariant {
        int id PK
        int fittingId FK
    }

    FittingBore {
        int id PK
        int fittingVariantId FK
        int nominalOdId FK
    }

    FittingDimension {
        int id PK
        int fittingVariantId FK
        int angleRangeId FK
        string dimensionName
        decimal dimensionValueMm
    }

    AngleRange {
        int id PK
        int angleMin
        int angleMax
    }

    Sabs62FittingDimension {
        int id PK
        string fittingType
        decimal nominalDiameterMm
        decimal centreToFaceCMm
        string angleRange
    }

    Sabs719FittingDimension {
        int id PK
        string fittingType
        decimal nominalDiameterMm
        decimal dimensionAMm
        decimal dimensionBMm
    }
```

---

## 8. Drawing & Document Domain

```mermaid
erDiagram
    Drawing ||--o{ DrawingVersion : versions
    Drawing ||--o{ DrawingComment : comments
    Rfq ||--o{ Drawing : has
    User ||--o{ Drawing : uploads
    User ||--o{ DrawingVersion : uploads
    User ||--o{ DrawingComment : writes
    DrawingComment ||--o{ DrawingComment : replies

    Drawing {
        int id PK
        string drawingNumber UK
        string title
        enum fileType
        string filePath
        int currentVersion
        enum status
        int rfqId FK
        int uploadedById FK
    }

    DrawingVersion {
        int id PK
        int drawingId FK
        int uploadedById FK
        int versionNumber
        string filePath
        string changeNotes
    }

    DrawingComment {
        int id PK
        int drawingId FK
        int userId FK
        int parentCommentId FK
        string commentText
        enum commentType
        decimal positionX
        decimal positionY
        int pageNumber
        boolean isResolved
    }
```

---

## 9. Audit & Workflow Domain

```mermaid
erDiagram
    User ||--o{ AuditLog : performs
    User ||--o{ ReviewWorkflow : submits
    User ||--o{ ReviewWorkflow : reviews

    AuditLog {
        int id PK
        int performedById FK
        string entityType
        int entityId
        enum action
        json oldValues
        json newValues
        string ipAddress
        datetime timestamp
    }

    ReviewWorkflow {
        int id PK
        enum workflowType
        enum entityType
        int entityId
        enum currentStatus
        int submittedById FK
        int assignedReviewerId FK
        int decidedById FK
        string decisionNotes
        datetime dueDate
        boolean isActive
    }
```

---

## 10. Mining Industry Domain

```mermaid
erDiagram
    Commodity ||--o{ SaMine : extracts
    Commodity ||--o{ SlurryProfile : produces

    Commodity {
        int id PK
        string commodityName
    }

    SaMine {
        int id PK
        int commodityId FK
        string mineName
        string operatingCompany
        string province
        string district
        enum mineType
        enum operationalStatus
        decimal latitude
        decimal longitude
    }

    SlurryProfile {
        int id PK
        int commodityId FK
        string profileName
        decimal typicalSgMin
        decimal typicalSgMax
        decimal solidsConcentrationMin
        decimal solidsConcentrationMax
        enum abrasionRisk
        enum corrosionRisk
        string primaryFailureMode
    }

    LinedCoatingRule {
        int id PK
        string mineName
        string linedPipeSize
        string coatingSpecification
    }
```

---

## 11. Coating Specifications Domain

```mermaid
erDiagram
    CoatingEnvironment ||--o{ CoatingSpecification : recommends

    CoatingEnvironment {
        int id PK
        string environmentName
        string corrosivityClass
        string description
    }

    CoatingSpecification {
        int id PK
        int environmentId FK
        string coatingType
        string lifespan
        string system
        int coats
        string totalDftUmRange
        string applications
    }

    CoatingStandard {
        int id PK
        string standardName
        string description
    }
```

---

## 12. Specialized Pipe Materials Domain

```mermaid
erDiagram
    HdpePipeSpecification {
        int id PK
        int nominalBore
        decimal outerDiameter
        int sdr
        decimal wallThickness
        decimal weightKgPerM
        int pressureRatingPn
        enum materialGrade
    }

    PvcPipeSpecification {
        int id PK
        int nominalDiameter
        decimal outerDiameter
        int pressureRating
        decimal wallThickness
        decimal weightKgPerM
        enum pvcType
        enum standard
    }

    HdpeFittingType {
        int id PK
        string typeName
        string description
    }

    PvcFittingType {
        int id PK
        string typeName
        string description
    }
```

---

## 13. Structural Steel Domain

```mermaid
erDiagram
    StructuralSteelGrade ||--o{ StructuralSteelType : compatible
    StructuralSteelType ||--o{ StructuralSteelSection : sections
    FabricationOperation ||--o{ ShopLaborRate : rates
    FabricationComplexity ||--o{ ShopLaborRate : rates

    StructuralSteelGrade {
        int id PK
        string code UK
        string name
        string standard
        decimal yieldStrengthMpa
        decimal tensileStrengthMpa
        json compatibleTypes
    }

    StructuralSteelType {
        int id PK
        string typeName
        string category
        decimal unitMassKgPerMeter
    }

    StructuralSteelSection {
        int id PK
        string sectionName
        string sectionSize
        decimal width
        decimal height
        decimal thickness
    }

    FabricationOperation {
        int id PK
        string operationName
        string description
        decimal typicalTimePerUnit
    }

    ShopLaborRate {
        int id PK
        string operation
        string complexity
        decimal laborRatePerHour
    }
```

---

## Entity Relationship Summary

| Domain | Entities | Primary Purpose |
|--------|----------|-----------------|
| User & Auth | 3 | Authentication and session management |
| Customer | 9 | Customer company and user management |
| Supplier | 9 | Supplier company and capability tracking |
| RFQ & BOQ | 7 | Quote request and bill of quantities |
| Drawings | 3 | Technical drawing management |
| Pipe Specs | 5 | Pipe dimensions and pressure ratings |
| Flanges | 6 | Flange standards and dimensions |
| Fittings | 8 | Fitting types and dimensions |
| Audit | 2 | Audit logging and workflows |
| Mining | 4 | South African mining industry data |
| Coating | 3 | Coating specifications |
| HDPE/PVC | 6 | Plastic pipe specifications |
| Structural | 5 | Structural steel data |

**Total: ~70 database entities**

---

## Notes on Diagram Viewing

These diagrams use Mermaid syntax. To view them properly:
1. Use a Markdown viewer that supports Mermaid (GitHub, GitLab, VS Code with Mermaid extension)
2. Or paste the Mermaid code into https://mermaid.live for interactive viewing
3. Or use a tool like draw.io to import/recreate the diagrams
