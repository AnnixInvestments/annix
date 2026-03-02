# Storage Operations Runbook

This document covers backup, restore, and troubleshooting procedures for the Annix S3 storage system.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Backup Procedures](#backup-procedures)
- [Restore Procedures](#restore-procedures)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)

---

## Architecture Overview

### Storage Configuration
- **Bucket**: `annix-sync-files-production` (or as configured)
- **Region**: `af-south-1` (Cape Town)
- **Encryption**: SSE-S3 (AES-256)
- **Versioning**: Enabled

### Area Prefixes
| Prefix | Application | Document Types |
|--------|-------------|----------------|
| `annix-app/` | Core Annix | Customer docs, supplier docs, RFQ docs, drawings |
| `au-rubber/` | AU Rubber | CoCs, delivery notes, graphs |
| `fieldflow/` | FieldFlow | Meeting recordings |
| `cv-assistant/` | CV Assistant | Candidate CVs |
| `stock-control/` | Stock Control | Job cards, invoices, signatures |
| `secure-documents/` | Secure Docs | Encrypted documents |

---

## Backup Procedures

### Automatic Backups (AWS-managed)
S3 versioning is enabled, providing automatic version history for all objects.

### Manual Full Backup

```bash
# Set variables
BUCKET="annix-sync-files-production"
BACKUP_BUCKET="annix-sync-backup-$(date +%Y%m%d)"
REGION="af-south-1"

# Create backup bucket
aws s3api create-bucket \
  --bucket "$BACKUP_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

# Sync all files to backup bucket
aws s3 sync "s3://$BUCKET" "s3://$BACKUP_BUCKET" --region "$REGION"

# Verify backup
aws s3 ls "s3://$BACKUP_BUCKET" --recursive --summarize
```

### Backup Specific Area

```bash
# Backup only FieldFlow recordings
AREA="fieldflow/"
aws s3 sync "s3://$BUCKET/$AREA" "s3://$BACKUP_BUCKET/$AREA"

# Backup only customer documents
aws s3 sync "s3://$BUCKET/annix-app/customers/" "s3://$BACKUP_BUCKET/annix-app/customers/"
```

### Download Backup to Local

```bash
# Download entire bucket to local directory
aws s3 sync "s3://$BUCKET" ./backup-$(date +%Y%m%d)

# Download specific prefix
aws s3 sync "s3://$BUCKET/fieldflow/" ./backup-fieldflow/
```

### Scheduled Backup (AWS CLI + Cron)

```bash
# Add to crontab: crontab -e
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh >> /var/log/s3-backup.log 2>&1
```

---

## Restore Procedures

### Restore Deleted File (from versioning)

```bash
# List all versions of a file
aws s3api list-object-versions \
  --bucket "$BUCKET" \
  --prefix "fieldflow/recordings/123/audio.webm"

# Restore specific version
aws s3api copy-object \
  --bucket "$BUCKET" \
  --copy-source "$BUCKET/fieldflow/recordings/123/audio.webm?versionId=VERSION_ID" \
  --key "fieldflow/recordings/123/audio.webm"
```

### Restore from Backup Bucket

```bash
# Restore single file
aws s3 cp "s3://$BACKUP_BUCKET/path/to/file.pdf" "s3://$BUCKET/path/to/file.pdf"

# Restore entire area
aws s3 sync "s3://$BACKUP_BUCKET/fieldflow/" "s3://$BUCKET/fieldflow/"

# Restore with delete (make destination match source exactly)
aws s3 sync "s3://$BACKUP_BUCKET/" "s3://$BUCKET/" --delete
```

### Restore from Local Backup

```bash
# Upload local backup to S3
aws s3 sync ./backup-20250302/ "s3://$BUCKET/"

# Using migration script (from local uploads directory)
cd annix-backend
pnpm migrate:s3
```

### Database Path Updates After Restore

If restoring files with different paths, update the database:

```sql
-- Example: Update customer document paths
UPDATE customer_documents
SET file_path = REPLACE(file_path, 'old-prefix/', 'new-prefix/')
WHERE file_path LIKE 'old-prefix/%';

-- Verify changes
SELECT id, file_path FROM customer_documents WHERE file_path LIKE 'new-prefix/%' LIMIT 10;
```

---

## Troubleshooting

### Common Issues

#### 1. "Access Denied" Errors

**Symptoms**: 403 Forbidden when uploading or downloading files

**Checklist**:
```bash
# Verify IAM policy is attached
aws iam list-attached-user-policies --user-name annix-sync-app

# Check bucket policy allows access
aws s3api get-bucket-policy --bucket "$BUCKET"

# Test with AWS CLI
aws s3 ls "s3://$BUCKET/" --region "$REGION"

# Verify credentials in Fly.io
fly secrets list -a annix-backend | grep AWS
```

**Solutions**:
1. Verify bucket name in IAM policy matches actual bucket
2. Check AWS_REGION matches bucket location
3. Rotate access keys if compromised

#### 2. "Bucket Not Found" Errors

**Symptoms**: NoSuchBucket errors in logs

**Checklist**:
```bash
# Verify bucket exists
aws s3api head-bucket --bucket "$BUCKET"

# Check bucket region
aws s3api get-bucket-location --bucket "$BUCKET"

# Verify environment variable
fly ssh console -a annix-backend -C "echo \$AWS_S3_BUCKET"
```

**Solutions**:
1. Create bucket if it doesn't exist: `./scripts/deploy-s3-storage.sh setup-bucket`
2. Update AWS_S3_BUCKET secret if bucket name changed

#### 3. Presigned URL Expired

**Symptoms**: Users get "Request has expired" or signature errors

**Checklist**:
```bash
# Check URL expiration setting
fly ssh console -a annix-backend -C "echo \$AWS_S3_URL_EXPIRATION"
```

**Solutions**:
1. Default expiration is 3600 seconds (1 hour)
2. Increase if needed: `fly secrets set AWS_S3_URL_EXPIRATION=7200`
3. Ensure client/server clocks are synchronized

#### 4. File Not Found (404)

**Symptoms**: NotFoundException when downloading files

**Checklist**:
```bash
# Check if file exists in S3
aws s3 ls "s3://$BUCKET/path/to/file.pdf"

# Check database path
psql -c "SELECT file_path FROM customer_documents WHERE id = 123"

# Compare paths
# Database path should match S3 key exactly
```

**Solutions**:
1. Run migration script if files weren't migrated: `pnpm migrate:s3`
2. Check for path prefix mismatches (e.g., missing `annix-app/`)
3. Verify file wasn't deleted

#### 5. Upload Failures

**Symptoms**: Files fail to upload, timeouts

**Checklist**:
```bash
# Check file size (max 5GB for single PUT)
ls -lh /path/to/file

# Check Fly.io logs
fly logs -a annix-backend | grep -i "upload\|s3\|storage"

# Test S3 connectivity
aws s3 cp ./test.txt "s3://$BUCKET/test.txt"
aws s3 rm "s3://$BUCKET/test.txt"
```

**Solutions**:
1. For files > 5GB, multipart upload is needed (handled by SDK)
2. Check network connectivity from Fly.io to AWS
3. Increase timeout if needed

#### 6. CORS Errors

**Symptoms**: Browser console shows CORS errors when accessing presigned URLs

**Checklist**:
```bash
# Check CORS configuration
aws s3api get-bucket-cors --bucket "$BUCKET"
```

**Solutions**:
```bash
# Reconfigure CORS
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://*.annix.co.za", "https://*.fly.dev", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}'
```

### Log Analysis

```bash
# View storage-related logs
fly logs -a annix-backend | grep -E "S3|Storage|upload|download"

# Filter by error level
fly logs -a annix-backend | grep -E "ERROR.*S3|WARN.*Storage"

# Real-time monitoring
fly logs -a annix-backend -f | grep -i storage
```

---

## Monitoring

### S3 Metrics to Watch

1. **BucketSizeBytes**: Total storage used
2. **NumberOfObjects**: Total object count
3. **4xxErrors**: Client errors (access denied, not found)
4. **5xxErrors**: Server errors

### CloudWatch Alarms (Recommended)

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "annix-s3-high-errors" \
  --metric-name "4xxErrors" \
  --namespace "AWS/S3" \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=BucketName,Value="$BUCKET" \
  --alarm-actions "arn:aws:sns:$REGION:ACCOUNT_ID:alerts"
```

### Storage Usage Report

```bash
# Get bucket size
aws s3 ls "s3://$BUCKET" --recursive --summarize | tail -2

# Size by prefix
for prefix in annix-app au-rubber fieldflow cv-assistant stock-control secure-documents; do
  echo "=== $prefix ==="
  aws s3 ls "s3://$BUCKET/$prefix/" --recursive --summarize 2>/dev/null | tail -2
done
```

---

## Emergency Procedures

### Disable S3 (Fallback to Local)

If S3 is completely unavailable:

```bash
# Switch to local storage (temporary, files will be lost on redeploy!)
fly secrets set STORAGE_TYPE=local -a annix-backend

# Redeploy
fly deploy -a annix-backend
```

### Rotate Compromised Credentials

```bash
# Create new access key
aws iam create-access-key --user-name annix-sync-app

# Update Fly.io secrets
fly secrets set \
  AWS_ACCESS_KEY_ID=new_key \
  AWS_SECRET_ACCESS_KEY=new_secret \
  -a annix-backend

# Delete old access key
aws iam delete-access-key --user-name annix-sync-app --access-key-id OLD_KEY_ID
```

### Complete Bucket Rebuild

If bucket is corrupted or needs recreation:

```bash
# 1. Backup existing data
aws s3 sync "s3://$BUCKET" ./emergency-backup/

# 2. Delete and recreate bucket
aws s3 rb "s3://$BUCKET" --force
./scripts/deploy-s3-storage.sh setup-bucket

# 3. Restore data
aws s3 sync ./emergency-backup/ "s3://$BUCKET/"

# 4. Verify
./scripts/deploy-s3-storage.sh verify
```

---

## Contact Information

- **AWS Support**: [AWS Support Console](https://console.aws.amazon.com/support/)
- **Fly.io Status**: [status.fly.io](https://status.fly.io)
- **Internal Support**: support@annix.co.za
