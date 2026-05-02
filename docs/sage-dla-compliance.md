# Sage Accounting API — DLA Compliance

**Status as of 2026-04-25:** enrolment form + DLA received from Sage on 2026-03-16, NOT yet signed/returned. No sandbox or live API key issued — all Sage integration code is currently dormant in production. The rules below apply pre-emptively to anything that touches Sage. Violations once we hold a key can result in revocation and permanent loss of API access.

Applies to ALL Annix apps (Stock Control, AU Rubber, Comply SA, and any future apps).

## Rate Limits (STRICTLY ENFORCED)
- **100 requests per minute per company** — exceeding this blocks the IP for 1 hour (HTTP 429)
- **Max 1 request per second** recommended spacing
- **2,500 requests per day per company** — not currently enforced but will be, design for it now
- **Heavy API calls must be minimised** — these endpoints degrade Sage infrastructure and excessive use triggers blocking without warning:
  - Detailed Ledger Transaction, Customer/Supplier Ageing, Customer/Supplier Statement, Account Balance, Cash Movement, Item Movement, Outstanding Customer/Supplier Documents, all Transaction Listings, Allocations, Budget, Take On Balance, Trial Balance, Tax Reports
- All Sage API calls MUST go through `sageRateLimiter` from `src/lib/sage-rate-limiter.ts` — never call Sage endpoints directly via `fetch` without rate limiting
- New Sage integrations must use the existing `SageApiService` (Sage One SA) or `SageService` (Sage Cloud) — never create a new direct Sage HTTP client

## Usage Restrictions
- **Complementary add-on only**: The integration must complement Sage Accounting — never use Sage as a billing engine, mass data storage, or primary database
- **Intended scale**: ~3,000 customers, 3,000 suppliers, 5,000 items, 1,000 customer invoices, 1,000 supplier invoices, 2,000 bank transactions per month
- **No direct database access**: Never circumvent the API to access Sage data directly
- **No data migration to competitors**: Never build functionality that converts/exports Sage user data to a competing accounting product
- **No reverse engineering**: Never reverse engineer, decompile, or copy Sage's UI, operating logic, or database structure

## Data & Privacy
- **Customer consent required**: Accessing a Sage customer's data requires that customer's explicit consent and must be limited to the purposes they approved
- **Sage credentials in confidence**: API keys, OAuth tokens, and user credentials must be encrypted at rest (already implemented via AES-256-GCM)
- **Sage may monitor**: Sage collects Transaction Data (API usage, frequency, data transmitted) — assume all API calls are logged

## Branding & IP
- **No Sage Marks without written consent**: Do not use Sage name, logo, or trademarks in the application UI without prior written permission
- **Do not remove proprietary notices**: If Sage API responses include rights notices, preserve them
- **Our application, our responsibility**: Make clear to end users that the integration is Annix's product, not Sage's — Sage has no liability for our application

## Testing & Distribution
- **Test thoroughly before distribution**: Application must be tested to ensure it does not adversely affect Sage Software functionality
- **Keep up with API versions**: Sage may deprecate API versions — responsibility to migrate to latest

## Architecture — All Sage Calls Funnel Through Two Services
- `annix-backend/src/sage-export/sage-api.service.ts` — Sage One SA REST client (rate-limited via `sageRateLimiter`)
- `annix-backend/src/comply-sa/comply-integrations/sage/sage.service.ts` — Sage Cloud OAuth client (rate-limited via `sageRateLimiter`)
- `annix-backend/src/lib/sage-rate-limiter.ts` — Shared rate limiter (100/min, 2500/day, 1s spacing per company)
- Adapter services (`rubber-sage-invoice-post`, `rubber-sage-coc-adapter`, `sage-invoice-adapter`, `rubber-sage-contact-sync`) transform data and call the above two services — they do not make direct HTTP calls to Sage
- **Never bypass this architecture** — any new Sage integration must go through the existing services, never direct `fetch` to Sage URLs
