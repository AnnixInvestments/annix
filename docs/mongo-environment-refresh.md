# MongoDB Environment Refresh

Once MongoDB is the system of record, environment refreshes use MongoDB data only.

## Staging

`.github/workflows/refresh-staging-db.yml` runs daily at 04:00 UTC and can be dispatched manually. It:

1. Produces a complete temporary `mongodump` of production before disturbing staging.
2. Scales `annix-app-staging` down to prevent writes during replacement.
3. Clears the `annix_staging` database while preserving its collection indexes.
4. Restores the production archive into `annix_staging`.
5. Seeds numeric Mongo counters.
6. Scales staging back up.

Staging is therefore a full production-data copy for validation.

Scheduled execution begins only after repository variable `MONGO_REFRESH_ENABLED` is set to `true` at cutover. Manual dispatch remains available once its Mongo secrets are configured.

## Test

`.github/workflows/refresh-test-reference-data.yml` runs daily at 05:00 UTC and can be dispatched manually. It keeps the controlled test login and access setup listed in `annix-backend/scripts/mongo-test-preserved-collections.txt`, empties all other test collections, and copies only the reference collections listed in `annix-backend/scripts/mongo-reference-collections.txt` from production.

The result is a usable test environment with current product, dimensional, engineering, market and curated Orbit/FuturePath reference data, but without RFQs, BOQs, stock transactions, customer/supplier operational activity, messages, documents, audit history, or application sessions imported from production.

Scheduled execution begins only after repository variable `MONGO_TEST_REFERENCE_REFRESH_ENABLED` is set to `true`. Manual dispatch fails before taking test offline if the required Mongo secrets have not been configured.

When a new Mongo collection is added, it must be deliberately classified:

- Add it to `mongo-reference-collections.txt` only if it is safe production reference data required in an empty test system.
- Add it to `mongo-test-preserved-collections.txt` only if it is test-owned setup required to access or configure the environment.
- Leave it out of both files to ensure its test records are emptied.

## Secrets

The workflows require:

| Secret | Purpose |
| --- | --- |
| `FLY_API_TOKEN` | Scale Fly test and staging apps during refresh |
| `PROD_MONGODB_URI` | Read connection for production MongoDB |
| `PROD_MONGO_DATABASE` | Production database name, normally `annix_production` |
| `STAGING_MONGODB_URI` | Write connection for staging MongoDB |
| `STAGING_MONGO_DATABASE` | Staging database name, normally `annix_staging` |
| `TEST_MONGODB_URI` | Write connection for test MongoDB |
| `TEST_MONGO_DATABASE` | Test database name, normally `annix_test` |

The clearing utility rejects targets outside `annix_staging` and `annix_test`.
