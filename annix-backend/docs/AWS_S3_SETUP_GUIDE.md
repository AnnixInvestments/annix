# AWS S3 Setup Guide for Annix-sync

This guide walks you through setting up AWS S3 storage for the Annix-sync application.

## Prerequisites

- A valid email address for AWS account creation
- A credit/debit card for AWS billing (free tier available)
- ~30 minutes for setup

## Phase 1: AWS Account Setup

### Step 1: Create AWS Account

1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Click "Create an AWS Account"
3. Enter your email and choose a root account name
4. Complete the verification process
5. Select the "Basic Support - Free" plan

### Step 2: Enable MFA on Root Account (Critical for Security)

1. Sign in to AWS Console as root user
2. Click your account name (top right) > "Security credentials"
3. Under "Multi-factor authentication (MFA)", click "Assign MFA device"
4. Choose "Authenticator app" and scan QR code with your authenticator app
5. Enter two consecutive MFA codes to complete setup

## Phase 2: Create S3 Bucket

### Step 1: Navigate to S3

1. In AWS Console, search for "S3" in the search bar
2. Click "S3" under Services

### Step 2: Create Bucket

1. Click "Create bucket"
2. Configure settings:
   - **Bucket name**: `annix-sync-files-production` (must be globally unique)
   - **AWS Region**: `Africa (Cape Town) af-south-1` (or your preferred region)
   - **Object Ownership**: ACLs disabled (recommended)
   - **Block Public Access**: Keep ALL options checked (block all public access)
   - **Bucket Versioning**: Enable (for file recovery)
   - **Default encryption**: Enable with SSE-S3 (Amazon S3 managed keys)
3. Click "Create bucket"

### Step 3: Configure Lifecycle Rules (Cost Optimization)

1. Select your bucket > "Management" tab
2. Click "Create lifecycle rule"
3. Configure:
   - **Name**: `archive-old-files`
   - **Apply to all objects**: Yes
   - **Transition actions**:
     - Move to Glacier after 365 days (optional, for long-term storage)
   - **Expiration actions**:
     - Delete incomplete multipart uploads after 7 days
4. Click "Create rule"

## Phase 3: Create IAM User and Policy

### Step 1: Create IAM Policy

1. Go to IAM > Policies > Create policy
2. Switch to JSON editor and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AnnixS3Access",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetObjectVersion",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::annix-sync-files-production",
                "arn:aws:s3:::annix-sync-files-production/*"
            ]
        }
    ]
}
```

3. Click "Next"
4. Name: `AnnixS3AccessPolicy`
5. Click "Create policy"

### Step 2: Create IAM User

1. Go to IAM > Users > Create user
2. User name: `annix-sync-app`
3. Click "Next"
4. Select "Attach policies directly"
5. Search for and select `AnnixS3AccessPolicy`
6. Click "Next" > "Create user"

### Step 3: Create Access Keys

1. Click on the user `annix-sync-app`
2. Go to "Security credentials" tab
3. Under "Access keys", click "Create access key"
4. Select "Application running outside AWS"
5. Click "Next" > "Create access key"
6. **IMPORTANT**: Download the CSV or copy both:
   - Access key ID
   - Secret access key
7. Store these securely - you won't see the secret key again!

## Phase 4: Configure Your Application

### Step 1: Update Environment Variables

Add the following to your `.env` file:

```env
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=af-south-1
AWS_S3_BUCKET=annix-sync-files-production
AWS_S3_URL_EXPIRATION=3600
```

### Step 2: Migrate Existing Files (if applicable)

If you have existing files in local storage:

```bash
# Preview migration (no changes made)
yarn migrate:s3:dry-run

# Perform actual migration
yarn migrate:s3
```

### Step 3: Verify Configuration

1. Start the application
2. Test file upload functionality
3. Verify files appear in S3 bucket
4. Test file download/preview

## Phase 5: Set Up Budget Alerts

### Step 1: Create Budget

1. Go to AWS Billing > Budgets
2. Click "Create budget"
3. Select "Cost budget"
4. Configure:
   - Budget name: `Annix-S3-Monthly`
   - Budget amount: $10 (adjust as needed)
   - Alert threshold: 80%
5. Add your email for notifications
6. Click "Create budget"

## Cost Estimates

Based on the GitHub issue analysis:

| Usage Level | Storage | Requests | Monthly Cost |
|-------------|---------|----------|--------------|
| Low (100 files/month, 5GB) | ~$0.12 | ~$0.50 | ~$0.60 |
| Moderate (500 files/month, 20GB) | ~$0.46 | ~$1.84 | ~$2.30 |

*Prices for af-south-1 region. Free tier includes 5GB for 12 months.*

## Security Best Practices

- [ ] MFA enabled on root account
- [ ] All bucket public access blocked
- [ ] SSE-S3 encryption enabled
- [ ] Bucket versioning enabled
- [ ] IAM user has minimal permissions
- [ ] Access keys stored securely (not in code)
- [ ] Presigned URLs have short expiration (1 hour)
- [ ] Access keys rotated every 90 days

## Rollback Procedure

If issues occur after switching to S3:

1. Stop the application
2. Update `.env`: `STORAGE_TYPE=local`
3. Restore database from pre-migration backup (if paths were changed)
4. Restart application
5. Local files should still be intact

## Troubleshooting

### "Access Denied" errors
- Verify IAM policy is attached to user
- Check bucket name matches in policy and environment
- Ensure bucket region matches AWS_REGION

### "Bucket not found" errors
- Verify bucket name is correct (case-sensitive)
- Check AWS_REGION matches bucket location

### Files not uploading
- Check AWS credentials are correct
- Verify STORAGE_TYPE=s3 in environment
- Check application logs for detailed errors

## Support

For issues with this setup:
1. Check AWS CloudWatch logs
2. Review application logs for S3-related errors
3. Verify all environment variables are set correctly
