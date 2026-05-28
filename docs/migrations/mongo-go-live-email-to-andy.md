# Mongo Go-Live Email To Andy

Yo Bro!

We’ve prepared the Mongo go-live plan and the proposed approach for refreshing staging/test data after cutover.

The key items are tracked here:

PR #310: PostgreSQL to MongoDB migration / Mongo go-live branch
https://github.com/AnnixInvestments/annix/pull/310

Issue #315: Define and approve production-reference-only Mongo refresh for test
https://github.com/AnnixInvestments/annix/issues/315

Original migration ticket #298: PostgreSQL to MongoDB migration
https://github.com/AnnixInvestments/annix/issues/298

The go-live runbook has been added to PR #310 as `docs/mongo-go-live-plan.md`.

Based on our WhatsApp thread, I’m treating staging and test differently.

For **staging**, the proposal is simple: once Mongo is live, staging gets a full daily restore from production Mongo so we can validate against current production data. That means the feedback widget, RFQs and real-world workflows can be checked against proper production-like data.

For **test**, the proposal is different: test should receive production reference/master data only, while real transactional and sensitive activity is emptied. In your words, it becomes more of a blank canvas / shell of the app: the systems are in place so testing can happen, but without orders, quotes, RFQs, stock transactions or other operational history. We load the reference/setup data once and then let you and your users play with it.

I also want to acknowledge the staging points you flagged:

- AU Rubber and Annix Orbit login had to be fixed before you could validate them.
- RFQ staging looked like it had not pulled in production RFQs, but the RFQs were actually already present in Mongo; the issue was that the imported owner relation was stored in the wrong field. That has now been corrected in staging and fixed in the importer.
- ACSA looked broadly good from your side, with only the small fixes you mentioned needing to be included.
- You asked whether test/prod should move one by one or together. My preference now is to move decisively once staging is accepted, because keeping PostgreSQL/Neon alive in parallel increases the risk of drift and repeated reconciliation work.

So the proposed direction is:

1. Get your final staging check done on Mongo.
2. Cut production over to Mongo once staging is accepted.
3. Move staging and test fully onto Mongo as part of the same cutover window.
4. After cutover, stop relying on Neon/PostgreSQL for live operations.
5. Enable the daily production-to-staging Mongo restore.
6. Keep test as a clean shell with reference data only, not a full transaction copy.

The main reason I’m pushing for a fairly quick cutover is that the longer we keep adding changes while the migration branch is open, the more risk there is of business logic drifting between PostgreSQL and Mongo. Once Mongo is live everywhere, we remove that dual-system risk and can get back to normal feature work with one source of truth.

## Proposed Data To Empty In Test

| Data type | Examples | Reason |
| --- | --- | --- |
| RFQ activity | RFQs, drafts, RFQ items, RFQ documents, supplier responses, quotes, intentions, awards | Test should open with no customer procurement history |
| BOQ/project activity | BOQs, BOQ sections, line items, supplier access/submissions | These are transactional customer/project records |
| Orders and fulfilment | Orders, order items, pump orders, purchase requisitions, deliveries | Avoid copying real commercial operations |
| Stock quantities and movements | Stock items/balances, receipts, issues, transfers, stock takes, monthly snapshots, adjustments | Stock control should be empty in test |
| Rubber production activity | Compound orders/batches, production runs, roll stock, roll issuances/rejections, compound movements, other stock | Operational manufacturing records rather than reference setup |
| Rubber commercial/compliance records | Delivery notes, tax invoices, statements, reconciliations, AU CoCs, supplier CoCs, account sign-offs, quality alerts, correction records | Real trading and quality/compliance history |
| Customer portal transactions | Customer onboarding progress, preferred/blocked supplier activity, invitations, uploaded documents | Real customer activity should not appear in test |
| Supplier portal transactions | Supplier invitations/submissions, operational documents and activity | Same principle for supplier-facing areas |
| Messages and inbound correspondence | Conversations, messages, inbound emails, attachments | Contains operational and potentially personal/confidential information |
| Authentication activity | Sessions, login attempts, passkey challenges, device/session history | Security data should not come from production into test |
| Audit/history records | Audit logs, event trails, import/export histories, change histories | Exposes real activity and makes test noisy |
| Notifications and scheduled execution results | Notification records, job run/execution history, alerts, retry records | Test should generate its own operational history |
| Orbit recruitment transactions | Candidates, applications, matches, interview bookings/invites, seeker actions, CV documents, employer postings | Personal and transactional recruitment data |
| Education lifecycle transactions | Student profiles, applications, results, consent, recommendations, advice logs | Personal user activity rather than reference data |
| Investment/insights transactions | Paper portfolios, holdings, trades, portfolio snapshots, generated decisions | Environment activity, not reusable master data |
| Feedback and support records | Customer feedback, support-type submissions | Real customer-originated data |

## Proposed Data To Keep From Production

- Pipe, flange, fitting, steel, HDPE, PVC and fabrication catalogues.
- Engineering lookup tables, dimensional tables, coating/lining rules and material specifications.
- Pump product catalogue.
- Rubber product/type/specification/pricing/configuration tables.
- Stock-control product/category/variance reference tables, but not stock quantities or movements.
- Mine/location reference data.
- Curated Orbit reference tables such as job sources, salary benchmarks and consent-text versions.
- FuturePath institution, programme, faculty, scholarship and requirements reference tables.

## Proposed Data To Preserve From Test, Rather Than Copy From Production

- Test users and roles.
- App permissions and product access.
- Test companies, profiles and module subscriptions.
- Test stock-control locations, departments, roles and permissions.
- Branding, feature flags and workflow configuration.

In short: for the test environment we propose retaining product/reference setup data from production, such as engineering catalogues, rubber product configuration and stock product master data, while removing all transactional and personal activity.

This means test will contain no RFQs, BOQs, stock balances or movements, orders, deliveries, invoices, CoCs, messages, uploaded documents, sessions, audit logs, recruitment applications or other operational history.

Test users and access configuration will remain test-owned so the environment is usable without importing production identities or security data.

How does that sound?

Nick
