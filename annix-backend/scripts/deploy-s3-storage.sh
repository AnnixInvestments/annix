#!/bin/bash
#
# S3 Storage Deployment Script
#
# This script helps deploy and configure S3 storage for the Annix application.
# Run each section as needed, or use the full deployment flow.
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - Fly CLI installed and authenticated
# - Access to production Fly.io apps
#
# Usage:
#   ./deploy-s3-storage.sh [command]
#
# Commands:
#   setup-bucket     Create and configure S3 bucket
#   setup-iam        Create IAM user and policy
#   configure-fly    Set Fly.io secrets
#   migrate          Run data migrations
#   verify           Verify deployment
#   full             Run full deployment

set -e

# Configuration
BUCKET_NAME="${AWS_S3_BUCKET:-annix-sync-files-production}"
REGION="${AWS_REGION:-af-south-1}"
FLY_APP="${FLY_APP:-annix-backend}"
IAM_USER="annix-sync-app"
IAM_POLICY="AnnixS3AccessPolicy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not installed. Install from https://aws.amazon.com/cli/"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI not configured. Run 'aws configure' first."
        exit 1
    fi

    log_info "AWS CLI configured successfully"
}

check_fly_cli() {
    if ! command -v fly &> /dev/null; then
        log_error "Fly CLI not installed. Install from https://fly.io/docs/hands-on/install-flyctl/"
        exit 1
    fi

    if ! fly auth whoami &> /dev/null; then
        log_error "Fly CLI not authenticated. Run 'fly auth login' first."
        exit 1
    fi

    log_info "Fly CLI configured successfully"
}

setup_bucket() {
    log_info "Setting up S3 bucket: $BUCKET_NAME in $REGION"

    # Check if bucket exists
    if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        log_info "Bucket $BUCKET_NAME already exists"
    else
        log_info "Creating bucket $BUCKET_NAME..."

        if [ "$REGION" = "us-east-1" ]; then
            aws s3api create-bucket --bucket "$BUCKET_NAME"
        else
            aws s3api create-bucket \
                --bucket "$BUCKET_NAME" \
                --region "$REGION" \
                --create-bucket-configuration LocationConstraint="$REGION"
        fi

        log_info "Bucket created successfully"
    fi

    # Enable versioning
    log_info "Enabling bucket versioning..."
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled

    # Enable server-side encryption
    log_info "Enabling server-side encryption..."
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'

    # Block public access
    log_info "Blocking public access..."
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }'

    # Configure CORS
    log_info "Configuring CORS..."
    aws s3api put-bucket-cors \
        --bucket "$BUCKET_NAME" \
        --cors-configuration '{
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": [
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "https://*.annix.co.za",
                        "https://*.fly.dev"
                    ],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3600
                }
            ]
        }'

    # Set lifecycle rules
    log_info "Setting lifecycle rules..."
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$BUCKET_NAME" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "ID": "CleanupIncompleteUploads",
                    "Status": "Enabled",
                    "Filter": {},
                    "AbortIncompleteMultipartUpload": {
                        "DaysAfterInitiation": 7
                    }
                }
            ]
        }'

    log_info "S3 bucket setup complete!"
}

setup_iam() {
    log_info "Setting up IAM user and policy"

    # Create IAM policy
    POLICY_DOCUMENT=$(cat <<EOF
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
                "arn:aws:s3:::$BUCKET_NAME",
                "arn:aws:s3:::$BUCKET_NAME/*"
            ]
        }
    ]
}
EOF
)

    # Check if policy exists
    if aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$IAM_POLICY" 2>/dev/null; then
        log_info "IAM policy $IAM_POLICY already exists"
    else
        log_info "Creating IAM policy $IAM_POLICY..."
        aws iam create-policy \
            --policy-name "$IAM_POLICY" \
            --policy-document "$POLICY_DOCUMENT"
    fi

    # Check if user exists
    if aws iam get-user --user-name "$IAM_USER" 2>/dev/null; then
        log_info "IAM user $IAM_USER already exists"
    else
        log_info "Creating IAM user $IAM_USER..."
        aws iam create-user --user-name "$IAM_USER"
    fi

    # Attach policy to user
    log_info "Attaching policy to user..."
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    aws iam attach-user-policy \
        --user-name "$IAM_USER" \
        --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/$IAM_POLICY" 2>/dev/null || true

    # Create access keys
    log_info "Creating access keys..."
    log_warn "Store these credentials securely - the secret key will not be shown again!"

    KEYS=$(aws iam create-access-key --user-name "$IAM_USER" 2>/dev/null || echo "")

    if [ -n "$KEYS" ]; then
        echo "$KEYS" | jq -r '.AccessKey | "AWS_ACCESS_KEY_ID=\(.AccessKeyId)\nAWS_SECRET_ACCESS_KEY=\(.SecretAccessKey)"'
        log_warn "Save these credentials before continuing!"
    else
        log_info "Access keys already exist or creation failed. Use AWS Console to manage keys."
    fi

    log_info "IAM setup complete!"
}

configure_fly() {
    log_info "Configuring Fly.io secrets"

    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        log_error "AWS credentials not set. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        log_info "Example:"
        log_info "  export AWS_ACCESS_KEY_ID=your_key_here"
        log_info "  export AWS_SECRET_ACCESS_KEY=your_secret_here"
        exit 1
    fi

    log_info "Setting Fly.io secrets for app: $FLY_APP"

    fly secrets set \
        STORAGE_TYPE=s3 \
        AWS_REGION="$REGION" \
        AWS_S3_BUCKET="$BUCKET_NAME" \
        AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        AWS_S3_URL_EXPIRATION=3600 \
        -a "$FLY_APP"

    log_info "Fly.io secrets configured!"
}

run_migrations() {
    log_info "Running data migrations"

    log_info "Step 1: Dry run to preview changes..."

    log_info "Preview FieldFlow recordings migration:"
    pnpm migrate:fieldflow-recordings:dry-run || log_warn "FieldFlow migration preview failed"

    log_info "Preview CV Assistant migration:"
    pnpm migrate:cv-assistant-docs:dry-run || log_warn "CV Assistant migration preview failed"

    log_info "Preview Rubber paths migration:"
    pnpm migrate:rubber-paths:dry-run || log_warn "Rubber paths migration preview failed"

    log_info "Preview Annix App paths migration:"
    pnpm migrate:annix-app-paths:dry-run || log_warn "Annix App paths migration preview failed"

    log_info "Preview full S3 migration:"
    pnpm migrate:s3:dry-run || log_warn "S3 migration preview failed"

    read -p "Proceed with actual migration? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Step 2: Running actual migrations..."

        pnpm migrate:fieldflow-recordings || log_warn "FieldFlow migration failed"
        pnpm migrate:cv-assistant-docs || log_warn "CV Assistant migration failed"
        pnpm migrate:rubber-paths || log_warn "Rubber paths migration failed"
        pnpm migrate:annix-app-paths || log_warn "Annix App paths migration failed"
        pnpm migrate:s3 || log_warn "S3 migration failed"

        log_info "Migrations complete!"
    else
        log_info "Migration cancelled"
    fi
}

verify_deployment() {
    log_info "Verifying S3 deployment"

    # Check bucket access
    log_info "Checking bucket access..."
    if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        log_info "✓ Bucket accessible"
    else
        log_error "✗ Cannot access bucket"
    fi

    # Check bucket versioning
    log_info "Checking bucket versioning..."
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" --query 'Status' --output text)
    if [ "$VERSIONING" = "Enabled" ]; then
        log_info "✓ Versioning enabled"
    else
        log_warn "✗ Versioning not enabled"
    fi

    # Check encryption
    log_info "Checking encryption..."
    if aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" &>/dev/null; then
        log_info "✓ Encryption enabled"
    else
        log_warn "✗ Encryption not configured"
    fi

    # List objects to verify structure
    log_info "Checking bucket structure..."
    PREFIXES=$(aws s3api list-objects-v2 --bucket "$BUCKET_NAME" --delimiter '/' --query 'CommonPrefixes[].Prefix' --output text 2>/dev/null || echo "")

    if [ -n "$PREFIXES" ]; then
        log_info "Found prefixes:"
        echo "$PREFIXES" | tr '\t' '\n' | while read -r prefix; do
            log_info "  - $prefix"
        done
    else
        log_info "Bucket is empty or has no top-level prefixes"
    fi

    # Check Fly.io configuration
    if command -v fly &> /dev/null; then
        log_info "Checking Fly.io configuration..."
        STORAGE_TYPE=$(fly secrets list -a "$FLY_APP" 2>/dev/null | grep STORAGE_TYPE || echo "")
        if [ -n "$STORAGE_TYPE" ]; then
            log_info "✓ STORAGE_TYPE secret configured"
        else
            log_warn "✗ STORAGE_TYPE secret not found"
        fi
    fi

    log_info "Verification complete!"
}

print_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup-bucket     Create and configure S3 bucket"
    echo "  setup-iam        Create IAM user and policy"
    echo "  configure-fly    Set Fly.io secrets"
    echo "  migrate          Run data migrations"
    echo "  verify           Verify deployment"
    echo "  full             Run full deployment"
    echo ""
    echo "Environment variables:"
    echo "  AWS_S3_BUCKET    S3 bucket name (default: annix-sync-files-production)"
    echo "  AWS_REGION       AWS region (default: af-south-1)"
    echo "  FLY_APP          Fly.io app name (default: annix-backend)"
}

# Main
case "${1:-}" in
    setup-bucket)
        check_aws_cli
        setup_bucket
        ;;
    setup-iam)
        check_aws_cli
        setup_iam
        ;;
    configure-fly)
        check_fly_cli
        configure_fly
        ;;
    migrate)
        run_migrations
        ;;
    verify)
        check_aws_cli
        verify_deployment
        ;;
    full)
        check_aws_cli
        check_fly_cli
        setup_bucket
        setup_iam
        log_info ""
        log_info "Next steps:"
        log_info "1. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from the output above"
        log_info "2. Run: $0 configure-fly"
        log_info "3. Deploy the app: fly deploy -a $FLY_APP"
        log_info "4. Run: $0 migrate"
        log_info "5. Run: $0 verify"
        ;;
    *)
        print_usage
        ;;
esac
