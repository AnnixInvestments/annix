# Annix Accounting Platform — Research & Feasibility Report

## Executive Summary

Building an accounting add-on/standalone app is **technically feasible** with our existing stack (Node.js, PostgreSQL, S3) but represents one of the **hardest SaaS categories** to execute well. The difficulty is not in the code — it's in accounting logic, legal compliance, trust, and edge cases.

**The winning strategy is NOT to build "another accounting app."** The opportunity is to build a **South African Business Compliance OS** where accounting is one module, deeply integrated with the existing Annix app portfolio. No competitor currently owns the compliance + accounting + industrial workflow space in SA.

**Verdict: Build it, but as a compliance-first platform with accounting as the financial backbone.**

---

## 1. South African Tax & Regulatory Landscape

### 1.1 Tax Types the App Must Handle

| Tax | Rate/Rules | Threshold | Filing Frequency | Deadline |
|-----|-----------|-----------|-----------------|----------|
| **VAT** | 15% standard; 0% zero-rated; exempt | R1M turnover = compulsory registration; R50K optional | Bi-monthly (Cat A) or monthly (Cat C) | 25th of month following period end |
| **PAYE** | 18%-45% progressive (7 brackets) | All employers | Monthly EMP201 | 7th of following month |
| **UIF** | 1% employer + 1% employee | Ceiling R17,712/month | Monthly (with PAYE) | 7th of following month |
| **SDL** | 1% of payroll | Payroll > R500,000/year | Monthly (with PAYE) | 7th of following month |
| **Provisional Tax** | Based on estimated taxable income | Registered provisional taxpayers | Bi-annual | Aug 31 (IRP6-1) & Feb 28 (IRP6-2) |
| **Dividends Tax** | 20% withholding | All dividend distributions | Per distribution | By end of month following |
| **Withholding Tax** | 5-15% (varies by payment type) | Foreign service payments, royalties, interest | Per transaction | By end of month following |
| **Capital Gains Tax** | 40% inclusion rate (individuals), 80% (companies) | Annual R40K exclusion (individuals) | Annual with ITR | Annual filing season |
| **Turnover Tax** | 0-3% simplified schedule | Qualifying small businesses < R1M | Annual | Annual with ITR |
| **Carbon Tax** | Per tonne CO2-equivalent | Industrial emitters | Annual | Annual |
| **Corporate Income Tax** | 27% (from 2023) | All companies | Annual ITR14 | 12 months after year-end |

### 1.2 VAT Categories & Rules

| Category | Rate | Examples |
|----------|------|---------|
| Standard rated | 15% | Most domestic goods and services |
| Zero-rated (Section 11) | 0% | Exports, 21 basic foodstuffs, diesel, illuminating paraffin, international transport |
| Exempt (Section 12) | N/A | Financial services, residential rent, public transport, educational services |
| Deemed supplies | 15% | Private use of business assets, connected person transactions |

**Tax Invoice Requirements (mandatory fields):**
- Supplier name, address, VAT number
- Recipient name, address, VAT number (for invoices > R5,000)
- Invoice number (unique, sequential)
- Date of issue
- Description of goods/services
- Quantity and price
- VAT amount and total (incl. and excl.)

### 1.3 Export Zero-Rating (Section 11 — Critical for User's Requirement)

Two types of exports with different documentary requirements:

**Direct Exports (seller controls export):**
- Commercial invoice with export destination
- Bill of lading / airway bill / consignment note
- Customs declaration (SAD500)
- Proof goods physically left SA via designated port
- Keep all docs for 5 years minimum

**Indirect Exports (buyer controls export):**
- Proof of export within 90 days of invoice
- Buyer's written undertaking to export
- Cartage contractor details
- If not exported within 90 days: must charge 15% VAT retrospectively

**The app must:** Track export documentation, enforce 90-day deadlines, alert on missing proof, auto-switch to 15% if deadline passes.

### 1.4 Upcoming SARS E-Invoicing Mandate (Critical — Build for This Now)

SARS is implementing mandatory e-invoicing under the VAT Modernisation Programme:

| Phase | Timeline | Scope |
|-------|----------|-------|
| Framework publication & stakeholder engagement | 2026 | Rules and standards published |
| Pilot & large taxpayer onboarding | 2026-2027 | Category C filers, B2G, high-risk sectors |
| Broader rollout | 2027-2029 | All VAT vendors phased in |
| Full operational capability | ~2028-2029 | All businesses must comply |

**Key requirements:**
- All e-invoices routed through **SARS Central Tax Hub** for real-time validation
- Digitally structured invoices (likely XML/JSON — standards TBD)
- Near-real-time transmission from business systems to SARS
- Data accuracy at invoice creation becomes critical (not end-of-month fixes)
- Service provider interoperability model (decentralised exchange)

**This is our biggest first-mover advantage.** If we build structured e-invoice generation from day one, we'll be ahead of Sage/Xero/QuickBooks who will need to retrofit.

### 1.5 Non-Tax Compliance Obligations

| Obligation | Body | Deadline | Penalty |
|------------|------|----------|---------|
| **Annual Returns** | CIPC | Within 30 business days of anniversary | R100-R4,000 fee + deregistration risk |
| **Beneficial Ownership** | CIPC | Within 10 business days of incorporation; ongoing updates | Barred from CIPC services; potential deregistration |
| **B-BBEE Certificate** | Various | Annual renewal | Loss of government contracts; tender disqualification |
| **COIDA Registration** | Compensation Fund | Annual renewal (April/May) | Criminal offense; R100K-R200K fine |
| **Employment Equity** | DoL | Annual reporting (Oct 1) for 50+ employees | R1.5M-R2.7M fine |
| **Tax Clearance** | SARS | Valid for 12 months | Cannot do business with government |
| **POPIA Compliance** | Information Regulator | Ongoing | R10M fine or 10 years imprisonment |
| **CIPC Securities Register** | CIPC | Ongoing | Deregistration |

**No accounting platform currently tracks all of these.** This is the compliance autopilot opportunity.

---

## 2. Competitor Analysis

### 2.1 Market Overview

The SA accounting software market is dominated by 4 players. The broader Africa accounting & budgeting software market is growing, with 80% of SA SMEs reporting improved compliance after adopting cloud accounting. 45% of SA businesses cite cloud tools as critical for success.

### 2.2 Detailed Competitor Breakdown

#### Sage Business Cloud / Pastel
- **Price:** From R199/month; extra charge per additional user
- **Strengths:** SA market leader (~90% historical share), native SA payroll (PAYE/UIF/SDL/IRP5), strong VAT reporting, integrates with Sage Payroll, migration path from Pastel
- **Weaknesses:** Legacy Pastel data corruption issues persist, mobile app limited functionality, email-only support with delays, technical/accounting-oriented UI, extra user charges add up, slow to innovate
- **Multi-currency:** Yes
- **Bank feeds:** FNB, Standard Bank, ABSA, Nedbank

#### Xero
- **Price:** From R99/month; unlimited users on all plans
- **Strengths:** Modern UI, unlimited users (best value), excellent bank feeds, strong multi-currency (160+ currencies), extensive third-party app ecosystem (800+ integrations), practice manager for accountants
- **Weaknesses:** No native SA payroll (needs SimplePay/PaySpace add-on at extra cost), quote-to-invoice details always incomplete, bank integrations break frequently, support refuses "how to use" questions, expensive for small companies on functional plans
- **Multi-currency:** Yes (best in class)
- **Bank feeds:** All major SA banks

#### QuickBooks Online
- **Price:** From R125/month; user limits vary by plan
- **Strengths:** User-friendly for non-accountants, good all-in-one for SMEs, strong mobile app
- **Weaknesses:** Email-only support (day-long response times), numerous bugs and lag, limited inventory management on lower plans, limited report customisation, poor African localisation (no Paystack/M-Pesa integration), steep learning curve despite "simple" branding
- **Multi-currency:** Yes
- **Bank feeds:** Major SA banks (with syncing delays)

#### Zoho Books
- **Price:** From ~R0 (free tier for small businesses); paid from ~R250/month
- **Strengths:** Affordable, auto VAT rate population, VAT201 report generation, audit/correction tools, part of Zoho ecosystem (CRM, HR, etc.)
- **Weaknesses:** Smaller SA user base, less SA-specific depth, fewer local integrations
- **Multi-currency:** Yes
- **Bank feeds:** Limited SA bank support

#### Other Competitors
| Name | Price | Notable |
|------|-------|---------|
| **TymsBook** | ~R55/month ($3) | African-developed, unlimited users included, very affordable, but newer and less established |
| **Wave** | Free | Genuinely free, but basic inventory, limited SA tax localisation, may not scale |
| **FreshBooks** | From R310/month ($17) | Excellent invoicing and time tracking, but expensive and limited advanced accounting |
| **Stub** | TBD | SA startup, partnered with Capitec (Oct 2025) for direct banking integration |

### 2.3 Universal Competitor Weaknesses

These are the gaps NO competitor fills well:

1. **No unified compliance tracking** — Accounting, tax, CIPC, COIDA, BEE all in separate systems
2. **Manual tax law updates** — All rely on internal teams pushing patches; no proactive guidance
3. **Weak export/trade features** — Basic zero-rating but no document tracking, deadline enforcement, or customs integration
4. **No industrial workflow integration** — None connect to RFQ/BOQ/fabrication/job costing
5. **Poor compliance guidance** — Track numbers but don't tell users what to DO
6. **Fragmented payroll** — Xero needs SimplePay; QuickBooks payroll is weak for SA
7. **UI stuck in 2010s** — Sage especially
8. **No real-time SARS sync** — All are periodic filing, not continuous compliance
9. **No e-invoicing readiness** — None are built for the 2026-2028 SARS e-invoicing mandate

---

## 3. Strategic Positioning — How We Win

### 3.1 The Core Thesis

**Don't build accounting software. Build a South African Business Compliance OS with accounting as the financial backbone.**

```
                YOUR APP PORTFOLIO
    ┌──────────────────────────────────────┐
    │  RFQ/BOQ  │  Stock Control  │  AU Rubber  │
    │  FieldFlow │  CV Assistant  │  Future Apps │
    └──────────┬───────────────────┬────────┘
               │                   │
               ▼                   ▼
    ┌──────────────────────────────────────┐
    │      COMPLIANCE ENGINE               │
    │  SARS │ CIPC │ COIDA │ BEE │ POPIA  │
    └──────────┬───────────────────┬────────┘
               │                   │
               ▼                   ▼
    ┌──────────────────────────────────────┐
    │      ACCOUNTING ENGINE               │
    │  Ledger │ VAT │ Invoicing │ Reports  │
    └──────────┬───────────────────┬────────┘
               │                   │
               ▼                   ▼
    ┌──────────────────────────────────────┐
    │      DATA LAYER                      │
    │  PostgreSQL (Ledger + Multi-tenant)  │
    │  S3 (Documents + Receipts)           │
    └──────────────────────────────────────┘
```

### 3.2 Key Differentiators

| Differentiator | What It Means | Why Competitors Can't Match |
|---------------|---------------|---------------------------|
| **Compliance Autopilot** | Monitors ALL SA obligations (SARS, CIPC, COIDA, BEE, POPIA) with deadline alerts and risk scoring | They only do accounting — compliance is a different product category |
| **Industrial Integration** | RFQ/BOQ pricing flows into invoicing; Stock Control into COGS; FieldFlow time into labour costing | They're generic; we serve piping/fabrication/industrial specifically |
| **E-Invoicing Native** | Built for SARS Central Tax Hub from day one | They'll need to retrofit 2026-2028 |
| **Real-Time VAT** | VAT return builds live as transactions happen, not end-of-month | All competitors are periodic |
| **Unlimited Users, No Per-User Tax** | Like Xero but cheaper; unlike Sage | Sage charges per user; QuickBooks limits by plan |
| **AI Bookkeeping** (Gemini) | Auto-categorise transactions, receipt OCR, anomaly detection, cash flow prediction | Competitors are adding AI slowly; we can use Gemini from day one |
| **Export Trade Engine** | Zero-rating doc tracker, 90-day deadline enforcement, auto-revert to 15%, customs doc storage | Competitors handle zero-rating but not the workflow around it |
| **Embedded Accounting** | Any Annix app can create financial entries via internal API | Standalone products can't embed into customer workflows |

### 3.3 The "No One Does This" Feature — Compliance Dashboard

```
┌─────────────────────────────────────────────┐
│  COMPLIANCE SCORE: 72%                      │
├─────────────────────────────────────────────┤
│                                             │
│  ■ SARS                                    │
│    ⚠ VAT201 submission due in 9 days       │
│    ⚠ PAYE EMP201 overdue by 2 days         │
│    ✓ Provisional tax paid                  │
│    ✓ Tax clearance valid (expires Aug 12)  │
│                                             │
│  ■ CIPC                                    │
│    ✓ Annual return filed                   │
│    ⚠ Beneficial ownership update needed    │
│                                             │
│  ■ LABOUR                                  │
│    ⚠ COIDA renewal due in 40 days          │
│    ✓ UIF registered                        │
│    ⚠ Employment equity report due Oct 1    │
│                                             │
│  ■ B-BBEE                                  │
│    ⚠ Certificate expires in 60 days        │
│                                             │
│  ■ FINANCIAL HEALTH                        │
│    Cash runway: 94 days                     │
│    Outstanding receivables: R482,000        │
│    Tax liability estimate: R67,200          │
│    Profit trend: ↑ 12% vs last quarter     │
│                                             │
│  YOUR BUSINESS WILL BREAK THE LAW IN:      │
│  ██████████░░  2 DAYS (PAYE submission)     │
└─────────────────────────────────────────────┘
```

---

## 4. Technical Architecture

### 4.1 Stack (Using Existing Annix Infrastructure)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | **NestJS** (TypeScript) | Already used in annix-backend; accounting engine as new modules |
| Database | **PostgreSQL** | Already used; add accounting schema with RLS for multi-tenancy |
| Storage | **AWS S3** | Already configured; add `accounting/` prefix to bucket |
| Frontend | **Next.js** (React) | Already used in annix-frontend; new accounting pages |
| AI | **Gemini** via AiChatService | Already available; use for OCR, categorisation, forecasting |
| Exchange Rates | **Open Exchange Rates** or **Fixer.io** | Free/cheap APIs for daily FX rates |
| PDF Generation | **Puppeteer** or **pdfkit** | Already available in stack |

### 4.2 Database Schema (Core Tables)

```sql
-- Multi-tenant company/organisation
CREATE TABLE accounting_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(50),
    vat_number VARCHAR(20),
    country_code CHAR(2) DEFAULT 'ZA',
    base_currency CHAR(3) DEFAULT 'ZAR',
    fiscal_year_start_month INT DEFAULT 3,  -- March for most SA companies
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chart of Accounts (SA-standard template)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES accounting_companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL
        CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
    sub_type VARCHAR(50),  -- e.g. 'CURRENT_ASSET', 'FIXED_ASSET', 'VAT_CONTROL'
    parent_id UUID REFERENCES accounts(id),
    currency CHAR(3) DEFAULT 'ZAR',
    is_system BOOLEAN DEFAULT false,  -- system accounts can't be deleted
    is_active BOOLEAN DEFAULT true,
    UNIQUE(company_id, code)
);

-- Immutable journal entries (the heart of the system)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES accounting_companies(id),
    entry_date DATE NOT NULL,
    reference VARCHAR(100),
    description TEXT,
    source_module VARCHAR(50),  -- 'INVOICE', 'EXPENSE', 'MANUAL', 'PAYROLL', 'RFQ'
    source_id UUID,  -- links back to invoice/expense/etc
    status VARCHAR(20) DEFAULT 'POSTED'
        CHECK (status IN ('DRAFT','POSTED','VOID')),
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- IMMUTABLE: posted entries cannot be updated, only voided + reversed
    void_reason TEXT,
    voided_by UUID REFERENCES users(id),
    voided_at TIMESTAMPTZ
);

-- Journal lines (debits and credits — must always balance)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit NUMERIC(15,2) NOT NULL DEFAULT 0
        CHECK (debit >= 0),
    credit NUMERIC(15,2) NOT NULL DEFAULT 0
        CHECK (credit >= 0),
    -- Multi-currency support
    currency CHAR(3) NOT NULL DEFAULT 'ZAR',
    exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
    base_debit NUMERIC(15,2) NOT NULL DEFAULT 0,   -- amount in base currency
    base_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    -- Constraint: must be debit OR credit, not both
    CHECK (debit = 0 OR credit = 0),
    CHECK (debit > 0 OR credit > 0)
);

-- Database-level balance constraint (trigger)
-- Every journal_entry must have SUM(debit) = SUM(credit)

-- Tax rates (versioned by effective date for auto-updates)
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code CHAR(2) NOT NULL DEFAULT 'ZA',
    tax_type VARCHAR(50) NOT NULL,  -- 'VAT_STANDARD', 'VAT_ZERO', 'VAT_EXEMPT', 'PAYE', etc.
    name VARCHAR(100) NOT NULL,
    rate NUMERIC(6,4) NOT NULL,  -- 0.1500 for 15%
    effective_from DATE NOT NULL,
    effective_to DATE,  -- null = currently active
    category VARCHAR(50),  -- 'OUTPUT', 'INPUT', 'PAYROLL'
    UNIQUE(country_code, tax_type, effective_from)
);

-- PAYE tax brackets (versioned per tax year)
CREATE TABLE paye_brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_year VARCHAR(10) NOT NULL,  -- '2025/2026'
    bracket_from NUMERIC(12,2) NOT NULL,
    bracket_to NUMERIC(12,2),  -- null for top bracket
    rate NUMERIC(6,4) NOT NULL,
    cumulative_tax NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Exchange rates (daily feed)
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    rate NUMERIC(12,6) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL,  -- 'OPEN_EXCHANGE_RATES', 'MANUAL'
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES accounting_companies(id),
    customer_id UUID,
    invoice_number VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INVOICE','CREDIT_NOTE','QUOTE')),
    currency CHAR(3) NOT NULL DEFAULT 'ZAR',
    exchange_rate NUMERIC(12,6) DEFAULT 1.0,
    subtotal NUMERIC(15,2) NOT NULL,
    tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    total NUMERIC(15,2) NOT NULL,
    is_export BOOLEAN DEFAULT false,  -- zero-rated export
    export_destination VARCHAR(100),
    export_proof_deadline DATE,  -- 90 days from issue for indirect exports
    export_proof_received BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SENT','PAID','PARTIAL','OVERDUE','VOID')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, invoice_number)
);

-- Fiscal periods (for period-end closing)
CREATE TABLE fiscal_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES accounting_companies(id),
    year INT NOT NULL,
    period INT NOT NULL,  -- 1-12
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','CLOSING','CLOSED')),
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMPTZ
);

-- Compliance obligations tracker
CREATE TABLE compliance_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES accounting_companies(id),
    obligation_type VARCHAR(50) NOT NULL,
        -- 'VAT201', 'EMP201', 'EMP501', 'IRP6', 'ITR14',
        -- 'CIPC_ANNUAL_RETURN', 'COIDA_RENEWAL', 'BEE_CERTIFICATE',
        -- 'TAX_CLEARANCE', 'EQUITY_REPORT'
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SUBMITTED','COMPLETED','OVERDUE')),
    submitted_at TIMESTAMPTZ,
    document_path TEXT,  -- S3 path to filed document
    reminder_sent BOOLEAN DEFAULT false,
    auto_generated BOOLEAN DEFAULT true
);

-- Audit log (immutable, append-only)
CREATE TABLE accounting_audit_log (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Event-Driven Accounting (How Actions Create Entries)

Every action across the Annix platform creates financial entries automatically:

| App Action | Journal Entry |
|-----------|--------------|
| Invoice created (R1,150 incl. VAT) | DR Accounts Receivable R1,150 / CR Revenue R1,000 / CR VAT Output R150 |
| Invoice paid | DR Bank R1,150 / CR Accounts Receivable R1,150 |
| Export invoice (zero-rated, $500) | DR Accounts Receivable R9,250 / CR Export Revenue R9,250 (at exchange rate) |
| Expense captured (R575 incl. VAT) | DR Expense R500 / CR Bank R575 / DR VAT Input R75 |
| Salary paid (R25,000 gross) | DR Salary Expense R25,000 / CR PAYE Payable R3,750 / CR UIF Payable R177 / CR Bank R21,073 |
| RFQ material cost booked | DR Raw Materials R50,000 / CR Accounts Payable R50,000 |
| Stock received from AU Rubber | DR Inventory R120,000 / CR Accounts Payable R120,000 |
| FieldFlow time logged (billable) | DR WIP R2,400 / CR Labour Revenue Accrual R2,400 |
| FX revaluation (period-end) | DR/CR FX Gains/Losses / CR/DR Foreign Receivables |

### 4.4 S3 Storage Structure

```
annix-sync-files/
└── accounting/
    ├── {company_id}/
    │   ├── invoices/         # Generated invoice PDFs
    │   ├── credit-notes/     # Credit note PDFs
    │   ├── receipts/         # OCR'd receipt images
    │   ├── bank-statements/  # Imported CSV/OFX files
    │   ├── tax-returns/      # VAT201, EMP201, IRP6 submissions
    │   ├── compliance/       # CIPC returns, BEE certs, COIDA docs
    │   ├── reports/          # Generated financial reports
    │   └── audit-exports/    # Full audit trail exports
    └── templates/
        ├── chart-of-accounts/ # SA-standard CoA templates
        └── invoice-templates/ # Customisable invoice layouts
```

### 4.5 Multi-Tenancy with Row-Level Security

```sql
-- Enable RLS on all accounting tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON accounts
    USING (company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = current_setting('app.current_user_id')::UUID
    ));
```

### 4.6 SARS ISV Integration

To submit returns directly to SARS e-Filing:

1. Complete and sign ISV Terms and Conditions
2. Email to clsisvapplications@sars.gov.za
3. Receive unique access key per product
4. Implement interface per IBIR-006 specification
5. Complete trade testing (March-April window annually)
6. Supported return types: ITR12, ITR14, IRP6, ITR12T, PAYE, Transfer Duty, Tax Directives

**Timeline for ISV registration: Allow 3-6 months minimum.**

---

## 5. Multi-Currency Architecture

### 5.1 Core Design

Every transaction stores:
- **Transaction currency** — what the invoice/payment was in (e.g., USD)
- **Exchange rate** — rate at transaction date
- **Base currency amount** — converted to ZAR for reporting

### 5.2 Exchange Rate Feed

- Use Open Exchange Rates API (free tier: 1,000 requests/month, ~R0)
- Store daily rates in `exchange_rates` table
- Admin can manually override rates
- Cron job fetches rates daily at midnight SAST

### 5.3 FX Gains & Losses

| Type | When | Accounting |
|------|------|-----------|
| **Realized** | Invoice paid at different rate than booked | DR/CR FX Gain/Loss (P&L) |
| **Unrealized** | Period-end revaluation of outstanding balances | DR/CR FX Revaluation (Balance Sheet, then P&L on settlement) |

Period-end revaluation process:
1. Query all open foreign-currency receivables/payables
2. Revalue at closing exchange rate
3. Post adjustment journal entries
4. Report unrealized gains/losses separately

---

## 6. AI Features (Using Gemini via AiChatService)

| Feature | How It Works | Competitor Status |
|---------|-------------|------------------|
| **Receipt OCR** | Photo upload → Gemini extracts vendor, amount, VAT, date, category | Xero has basic; ours can be better with Gemini vision |
| **Transaction Auto-Categorisation** | Bank feed line → Gemini suggests account + tax code | Basic rule engines exist; AI is smarter |
| **Anomaly Detection** | Flag unusual transactions, duplicate invoices, sudden expense spikes | Nobody does this well |
| **Cash Flow Prediction** | Historical patterns → forecast cash position 30/60/90 days | Xero has basic; ours can factor in RFQ pipeline |
| **Natural Language Queries** | "How much did we spend on steel in Q3?" → SQL → answer | Nobody has this |
| **Tax Optimisation Hints** | "Move this purchase to capital asset to reduce VAT liability" | Nobody has this |
| **Compliance Risk Scoring** | Analyse filing history, overdue obligations, missing docs → risk score | Nobody has this |

---

## 7. SA Bank Integration

### 7.1 Current State of Open Banking in SA

| Bank | API Status | Integration Method |
|------|-----------|-------------------|
| **Nedbank** | Live OAuth 2.0 REST APIs (first in Africa) | Direct API integration possible |
| **FNB** | Bank feed integration available | Via accounting integrations portal; confirmed non-exclusive |
| **Standard Bank** | In development | Limited API access currently |
| **ABSA** | Partnerships in progress | Open API ecosystem developing |
| **Capitec** | Partnered with Stub (Oct 2025) | Possible integration channel |

### 7.2 Practical Approach

**Phase 1 (MVP):** CSV/OFX/QIF import from all banks (universally supported)
**Phase 2:** Nedbank direct API feed (OAuth 2.0)
**Phase 3:** FNB bank feed integration
**Phase 4:** Standard Bank / ABSA as APIs become available

### 7.3 Auto-Reconciliation Engine

1. Import bank transactions (CSV or API feed)
2. Match against outstanding invoices/expenses using:
   - Amount matching (exact + tolerance for bank fees)
   - Reference/description matching
   - Date proximity
   - AI-assisted matching for ambiguous cases (Gemini)
3. User confirms/adjusts matches
4. Post reconciliation journal entries

---

## 8. Development Roadmap

### Phase 1 — MVP: Financial Tracker + Compliance (Months 1-3)

**Goal:** Usable financial tracking with compliance alerts. Not full accounting yet.

**Month 1 — Foundation**
- Accounting engine: chart of accounts, journal entries, balance constraints
- SA-standard chart of accounts template
- Multi-tenant schema with RLS
- Basic financial reports: trial balance, P&L, balance sheet

**Month 2 — Invoicing & VAT**
- Invoice creation with automatic journal posting
- VAT calculation (standard 15%, zero-rated exports, exempt)
- Export invoice workflow (zero-rating + doc tracking + 90-day deadline)
- Credit notes
- Expense capture with VAT input tracking
- VAT201 report generation

**Month 3 — Compliance + Dashboard**
- Compliance obligation tracker (SARS, CIPC, COIDA, BEE deadlines)
- Compliance score dashboard
- Deadline alerts and notifications
- Multi-user RBAC (Admin, Accountant, Bookkeeper, Viewer, Approver)
- Audit log
- Basic multi-currency (ZAR + USD/EUR/GBP)

### Phase 2 — Core Accounting (Months 4-6)

- Bank statement import (CSV/OFX)
- Auto-reconciliation engine
- Aged receivables / aged payables reports
- Recurring invoices
- Payment reminders
- Quote → Invoice workflow
- Exchange rate feeds + FX revaluation
- EMP201 generation (PAYE/UIF/SDL)
- Cash flow statement

### Phase 3 — Integration & Intelligence (Months 7-9)

- Integration API for existing Annix apps (RFQ → invoice, Stock → COGS, FieldFlow → labour)
- AI receipt OCR (Gemini)
- AI transaction categorisation
- Nedbank API bank feed
- Cash flow prediction
- Business health scoring dashboard
- SARS ISV registration + e-Filing submission (begin process in Phase 1, implement here)

### Phase 4 — Advanced (Months 10-12)

- Full payroll module (PAYE brackets, UIF, SDL, IRP5, EMP501)
- Asset register + depreciation schedules
- Inventory costing (FIFO/weighted average)
- Multi-entity consolidation
- Custom report builder
- E-invoicing preparation (structured data for SARS Central Tax Hub)
- API marketplace for third-party integrations

### Phase 5 — Scale (Year 2)

- SARS e-invoicing certification (when mandate begins)
- Full B-BBEE reporting module
- CIPC auto-filing
- Advanced AI tax advisor
- Mobile app
- Accountant/bookkeeper portal (manage multiple clients)
- White-label option

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Double-entry logic bugs | **Critical** — wrong reports destroy trust | Extensive automated testing; database-level balance constraints; immutable ledger |
| Tax calculation errors | **Critical** — legal liability for users | Tax expert on retainer; test against known SARS examples; disclaimer that user is responsible for final filing |
| SARS ISV rejection | **High** — can't auto-submit returns | Start registration early (Phase 1); have manual export as fallback |
| Bank API instability | **Medium** — feeds break | CSV import as universal fallback; retry logic; monitoring |
| E-invoicing standards change | **Medium** — built for wrong spec | Modular invoice format layer; follow SARS announcements closely |

### 9.2 Business Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Accountants won't trust new software | **High** | Start as compliance tool (lower bar); add accounting gradually; offer free trial with real data import |
| Competing with Sage/Xero/QB | **High** | Don't compete head-on; differentiate with compliance + industrial integration |
| Ongoing compliance maintenance cost | **Medium** | Budget for tax consultant; build admin tools for rate updates; community feedback loop |
| Scope creep | **High** | Strict MVP discipline; compliance first, full accounting later |

---

## 10. Team & Cost Estimate

### Minimum Team

| Role | Allocation | Why |
|------|-----------|-----|
| Backend developer (NestJS) | Full-time | Core accounting engine, API, integrations |
| Frontend developer (Next.js) | Full-time | Dashboard, invoicing UI, reports |
| SA Tax/Accounting expert | Part-time retainer | Validate calculations, review compliance rules, annual tax updates |
| QA / Testing | Part-time | Financial accuracy testing is non-negotiable |

### Estimated Costs (MVP — 3 months)

| Item | Estimate |
|------|---------|
| Development (2 devs x 3 months) | R0 (you + Claude) |
| Tax consultant retainer | R5,000-R15,000/month |
| Open Exchange Rates API | Free tier |
| Additional S3 storage | Minimal (already have) |
| SARS ISV registration | Free (but time-intensive) |
| **Total MVP cost** | **R15,000-R45,000** (mostly consultant) |

---

## 11. Pricing Strategy

### Recommended Model

| Tier | Price (ZAR/month) | Target | Features |
|------|-------------------|--------|----------|
| **Starter** | R99 | Sole traders, freelancers | Invoicing, expenses, VAT, 1 user, compliance alerts |
| **Business** | R199 | SMEs (1-20 employees) | Everything + bank recon, multi-currency, unlimited users, full compliance dashboard |
| **Professional** | R399 | Growing businesses | Everything + payroll, multi-entity, API access, priority support |
| **Enterprise** | Custom | Large businesses | Everything + white-label, custom integrations, dedicated support |
| **Add-on** (for existing Annix apps) | R49-R99 | Current Annix users | Embedded accounting module with app-specific financial flows |

**Key pricing moves:**
- Undercut Sage (R199) at the Business tier while offering unlimited users (like Xero)
- Include compliance alerts in ALL tiers (unique value)
- Add-on pricing for existing users incentivises adoption

---

## 12. Final Verdict

### Should you build it?

**Yes — but with these conditions:**

1. **Build compliance first, accounting second.** The compliance autopilot alone is a product no one else offers properly in SA.

2. **Start as an add-on to your existing apps.** Don't try to compete with Xero/Sage head-on from day one. Let your existing user base be the first customers.

3. **Get a tax consultant from day one.** This is non-negotiable. One wrong VAT calculation and you lose trust forever.

4. **Build for e-invoicing from day one.** The SARS mandate (2026-2028) is a massive first-mover opportunity. If you're ready when it becomes compulsory, you win.

5. **Don't scope-creep.** Phase 1 is compliance dashboard + invoicing + VAT tracking. That alone is valuable. Full double-entry accounting comes in Phase 2.

6. **The moat is integration.** Your RFQ/Stock Control/AU Rubber data flowing into accounting is something Xero/Sage can never replicate. That's your defensible position.

### The bottom line

This is a 12-month project to reach feature parity with basic competitors, but you don't need feature parity. You need to be **10x better at 3 things**: compliance tracking, industrial workflow integration, and e-invoicing readiness. That's achievable in 3-6 months.

---

## Sources

- [SARS ISV Registration](https://www.sars.gov.za/individuals/i-need-help-with-my-tax/your-tax-questions-answered/independent-software-vendors/)
- [SARS Rates of Tax](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/)
- [SARS e-Filing Features](https://www.sars.gov.za/about/sars-tax-and-customs-system/efiling-features/)
- [SARS VAT 404 Guide](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/Legal-Pub-Guide-VAT404-VAT-404-Guide-for-Vendors.pdf)
- [SA VAT Export Zero-Rating (SAICA)](https://saicawebprstorage.blob.core.windows.net/uploads/resources/Zero-rated-exports.pdf)
- [SA E-Invoicing Timeline (Fonoa)](https://www.fonoa.com/resources/blog/south-africa-e-invoicing-real-time-vat-reporting)
- [SA E-Invoicing (Comarch)](https://www.comarch.com/trade-and-services/data-management/legal-regulation-changes/south-africa-transitions-to-mandatory-e-invoicing-and-real-time-vat-reporting/)
- [SA E-Invoicing (KPMG)](https://kpmg.com/us/en/taxnewsflash/news/2026/02/south-africa-tax-authority-confirms-multi-year-e-invoicing-digital-reporting-reform.html)
- [SA VAT Modernisation (VATCalc)](https://www.vatcalc.com/south-africa/south-africa-vat-digital-reporting-consultation/)
- [CIPC Deadlines & Penalties](https://www.blog.bodocs.co.za/2025/05/22/cipc-compliance-deadlines-penalties/)
- [Xero vs Sage vs QuickBooks SA](https://odea.co.za/xero-vs-sage-vs-quickbooks-south-africa/)
- [QuickBooks Alternatives Africa](https://profitbooks.net/quickbooks-alternatives-in-south-africa/)
- [Payroll Calculator SA](https://www.acciyo.com/payroll-calculator-south-africa-your-complete-guide-to-paye-uif-and-net-salary-for-2025-2026/)
- [Nedbank API Marketplace](https://apim.nedbank.co.za/)
- [FNB Accounting Integrations](https://www.fnb.co.za/accounting-integrations/index.html)
- [SA Open Banking Roadmap](https://finch-technologies.com/open-banking-a-collaborative-roadmap-for-south-african-banks-and-fintechs/)
- [A.L.E. Double-Entry Engine (Node.js)](https://github.com/CjS77/ale)
- [pgledger (PostgreSQL)](https://github.com/pgr0ss/pgledger)
- [Multi-Currency FX Gains/Losses](https://corporatefinanceinstitute.com/resources/accounting/foreign-exchange-gain-loss/)
- [SA Accounting Software Market](https://www.6wresearch.com/industry-report/south-africa-accounting-software-market-outlook)
- [Capitec + Stub Partnership](https://www.businesstechafrica.co.za/entrepreneurship/smes/2025/05/30/the-state-of-south-african-small-business-2025/)
- [SA 2026/2027 Tax Roadmap](https://pinionafrica.com/2026/02/03/south-africas-2026-2027-tax-regulatory-roadmap-navigating-your-obligations/)
