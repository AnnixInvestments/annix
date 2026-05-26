# MongoDB backup and restore

The PostgreSQL data was protected by Neon's managed daily snapshots. MongoDB
Atlas shared and free-tier clusters do not include automated backups, so the
Mongo equivalent is an application-owned job: a scheduled GitHub Actions
workflow that runs `mongodump` and streams a compressed archive to S3 with a
30-day retention window. This matches the "daily snapshots on S3, 30-day
retention, restorable on request" promise in the Stock Control backup-and-export
guide.

## What runs

`.github/workflows/mongo-backup.yml`:

- Fires daily at 03:00 UTC (05:00 SAST), one hour before the staging-refresh job,
  and on manual `workflow_dispatch`.
- `mongodump --uri=... --db=<MONGO_DATABASE> --archive --gzip` piped straight to
  `aws s3 cp -`, so nothing large is written to the runner disk.
- Stores each backup at
  `s3://<bucket>/database-backups/mongo/<database>-<timestamp>.archive.gz`.
- Prunes archives older than 30 days from that prefix after each successful run.

GitHub only fires `schedule:` triggers from the default branch, so this job goes
live automatically when the Mongo migration reaches `main`. Until then it can be
exercised from the branch with `workflow_dispatch`.

## Required GitHub secrets

| Secret | Value |
|---|---|
| `MONGO_BACKUP_URI` | Atlas SRV connection string for a backup-scoped DB user (read access is sufficient) |
| `MONGO_BACKUP_DATABASE` | Database name to dump (e.g. `annix_production`) |
| `BACKUP_S3_BUCKET` | Target bucket (the existing `annix-sync-files-production` bucket is fine — backups live under a separate `database-backups/` prefix) |
| `BACKUP_AWS_REGION` | Bucket region (`af-south-1`) |
| `BACKUP_AWS_ACCESS_KEY_ID` / `BACKUP_AWS_SECRET_ACCESS_KEY` | Credentials for an IAM principal scoped to `database-backups/*` on that bucket |

Use a dedicated, least-privilege IAM key rather than the app's runtime AWS
credentials so the backup writer can only touch the backup prefix.

## Restoring

1. Pick the archive: `aws s3 ls s3://<bucket>/database-backups/mongo/`.
2. Stream it back, restoring into a NON-production database name first to verify:
   ```
   aws s3 cp s3://<bucket>/database-backups/mongo/<file>.archive.gz - \
     | mongorestore --uri="<target-uri>" --gzip --archive \
       --nsFrom='<source-db>.*' --nsTo='<target-db>.*'
   ```
3. Validate, then repeat against the real target with `--drop` only once the
   restore has been confirmed against the scratch database.

Never restore directly over production without a verified dry run first.
