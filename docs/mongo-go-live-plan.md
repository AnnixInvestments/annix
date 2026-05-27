# MongoDB Go-Live Plan

This plan covers the operational path for moving Annix from PostgreSQL to MongoDB as the production system of record, including production, staging, test, and the daily production-to-staging restore.

## Current Status

- PR #310 contains the MongoDB migration work.
- Issue #315 tracks the production-reference-only refresh policy for test.
- The application remains production-neutral until the production environment is explicitly configured with `DATABASE_DRIVER=mongo`.
- Staging is already using the Mongo path for PR validation.
- The daily staging refresh and test reference refresh workflows are present but gated until the required Mongo environments, secrets and approval steps are complete.

## Required Decisions

Before cutover, confirm:

- The production MongoDB Atlas cluster and database name.
- The staging MongoDB Atlas cluster and database name.
- The test MongoDB Atlas cluster and database name.
- Whether staging should receive a complete production copy every day.
- Whether test should receive only approved reference data, with transactional data emptied.
- The rollback window and who has authority to trigger rollback.
- The go-live date and maintenance window.

## Required Configuration

Configure GitHub repository secrets:

| Secret | Purpose |
| --- | --- |
| `FLY_API_TOKEN` | Scale and deploy Fly apps |
| `PROD_MONGODB_URI` | Production MongoDB connection |
| `PROD_MONGO_DATABASE` | Production MongoDB database name |
| `STAGING_MONGODB_URI` | Staging MongoDB connection |
| `STAGING_MONGO_DATABASE` | Staging MongoDB database name |
| `TEST_MONGODB_URI` | Test MongoDB connection |
| `TEST_MONGO_DATABASE` | Test MongoDB database name |

Configure GitHub repository variables:

| Variable | Initial value | Cutover value |
| --- | --- | --- |
| `MONGO_REFRESH_ENABLED` | `false` | `true` after production Mongo is live and validated |
| `MONGO_TEST_REFERENCE_REFRESH_ENABLED` | `false` | `true` after issue #315 is approved and test refresh is validated |

Configure Fly environment secrets for each app:

| App | Required production-mode settings |
| --- | --- |
| `annix-app-production` | `DATABASE_DRIVER=mongo`, production Mongo URI/database |
| `annix-app-staging` | `DATABASE_DRIVER=mongo`, staging Mongo URI/database |
| `annix-app-test` | `DATABASE_DRIVER=mongo`, test Mongo URI/database |

Do not point production, staging or test at the same writable MongoDB database.

## Pre-Go-Live Validation

1. Confirm PR #310 is rebased on `origin/main`.
2. Confirm backend type-check passes.
3. Confirm Biome passes.
4. Confirm the dropped-logic check reports only the known repository-relocation false positives.
5. Confirm PR #310 deploys successfully to staging.
6. Confirm staging health checks pass on Fly.
7. Confirm Mongo login and RBAC flows work for admin, AU Rubber, Annix Orbit and RFQ/customer portal paths.
8. Confirm RFQ data, BOQ data and relation-heavy pages work against staging Mongo.
9. Confirm `lastSeenAt` job staleness behaviour works in Annix Orbit.
10. Confirm Mongo backup workflow is configured and has produced at least one restorable backup.

## Production Cutover

1. Announce the maintenance window.
2. Pause user-facing writes if required.
3. Take a final PostgreSQL backup.
4. Take a final MongoDB backup if the production Mongo database already contains migrated data.
5. Run the final PostgreSQL-to-Mongo migration into the production MongoDB database.
6. Run Mongo counter seeding for production.
7. Run targeted production Mongo verification queries for:
   - users, roles and app access
   - companies and profiles
   - RFQs and RFQ items
   - BOQs and BOQ line items
   - Rubber orders, stock, CoCs, delivery notes, invoices and reconciliations
   - Annix Orbit jobs, candidates, profiles and scheduled job overrides
   - Stock Management product and stock data
8. Set production Fly secrets to `DATABASE_DRIVER=mongo` and the production Mongo connection details.
9. Deploy `main` to `annix-app-production`.
10. Confirm production Fly release is complete.
11. Confirm `/health` returns `200`.
12. Run production smoke tests:
    - admin login
    - customer login
    - supplier login
    - AU Rubber dashboard
    - Annix Orbit dashboard
    - RFQ list/detail
    - stock-control key screens
13. Re-enable user-facing writes.
14. Announce production Mongo go-live.

## Staging Deployment

Staging should remain Mongo-only after go-live.

1. Confirm `annix-app-staging` has `DATABASE_DRIVER=mongo`.
2. Confirm staging points to the isolated staging MongoDB database.
3. Deploy the current production code to staging unless a PR is intentionally holding staging.
4. Confirm staging Fly release is complete.
5. Confirm `/health` returns `200`.
6. Confirm staging can be safely overwritten by the daily restore workflow.

## Test Deployment

Test should use MongoDB but should not contain production transactional data.

1. Confirm issue #315 is approved.
2. Confirm `annix-app-test` has `DATABASE_DRIVER=mongo`.
3. Confirm test points to the isolated test MongoDB database.
4. Deploy the current production code to test.
5. Run the `Refresh test MongoDB with reference data` workflow manually.
6. Confirm test Fly release is complete.
7. Confirm `/health` returns `200`.
8. Confirm test login/access works.
9. Confirm reference data exists.
10. Confirm transactional data is empty:
    - RFQs
    - BOQs
    - stock balances and movements
    - Rubber operational history
    - messages
    - documents
    - sessions
    - audit logs

## Daily Production-To-Staging Restore

The daily restore is implemented by `.github/workflows/refresh-staging-db.yml`.

It runs at 04:00 UTC when `MONGO_REFRESH_ENABLED=true`.

The workflow:

1. Validates MongoDB secrets before making changes.
2. Dumps production MongoDB into a temporary archive.
3. Scales staging to zero machines.
4. Clears the staging MongoDB database while preserving indexes.
5. Restores the production archive into staging using namespace remapping.
6. Seeds Mongo numeric counters.
7. Scales staging back to two machines.

Enable it only after:

- production MongoDB is live,
- production backups are working,
- staging MongoDB is isolated from production,
- a manual staging refresh has completed successfully,
- stakeholders accept that staging is overwritten daily.

Manual validation for the first run:

1. Trigger `Refresh staging MongoDB from production`.
2. Watch the GitHub Actions run to completion.
3. Confirm staging Fly machines are back on two healthy instances.
4. Confirm `/health` returns `200`.
5. Confirm staging contains the latest production RFQ and stock data.
6. Confirm Mongo counters are ahead of the restored maximum numeric IDs.

## Daily Production-To-Test Reference Refresh

The test reference refresh is implemented by `.github/workflows/refresh-test-reference-data.yml`.

It runs at 05:00 UTC when `MONGO_TEST_REFERENCE_REFRESH_ENABLED=true`.

Enable it only after:

- issue #315 has been approved,
- test MongoDB is isolated from production,
- a manual test refresh has completed successfully,
- testers confirm the environment remains usable.

## Rollback Plan

Rollback is available until the team accepts MongoDB as the only system of record.

If production cutover fails before user writes resume:

1. Keep production users in maintenance mode.
2. Set `DATABASE_DRIVER=postgres` for production.
3. Redeploy the previous production release.
4. Confirm `/health` returns `200`.
5. Confirm key PostgreSQL-backed workflows still work.
6. Announce rollback.

If production cutover fails after user writes resume:

1. Stop user-facing writes immediately.
2. Preserve the production MongoDB database for forensic review.
3. Decide whether to replay Mongo writes into PostgreSQL or accept a longer outage.
4. Restore the previous production release only after data ownership is clear.
5. Document the incident before attempting another cutover.

Do not enable the daily staging restore until production rollback risk has been accepted.

## Post-Go-Live Monitoring

For the first 24 hours:

- Watch Fly health and restart counts for production, staging and test.
- Watch MongoDB Atlas connection count, CPU, memory and slow query metrics.
- Watch application logs for repository abstraction errors.
- Watch scheduled job execution.
- Watch RFQ, AU Rubber, Annix Orbit and Stock Management workflows.
- Confirm the first daily Mongo backup succeeds.
- Confirm the first staging restore succeeds after `MONGO_REFRESH_ENABLED=true`.
- Confirm the first test reference refresh succeeds after `MONGO_TEST_REFERENCE_REFRESH_ENABLED=true`.

## Completion Criteria

MongoDB go-live is complete when:

- production is running `DATABASE_DRIVER=mongo`,
- production health checks and smoke tests pass,
- staging is running against isolated MongoDB,
- test is running against isolated MongoDB,
- daily Mongo backups are passing,
- daily production-to-staging restore is enabled and passing,
- production-reference-only test refresh is approved, enabled and passing,
- rollback decision is documented.
