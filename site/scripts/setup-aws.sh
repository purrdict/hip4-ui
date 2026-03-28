#!/usr/bin/env bash
#
# setup-aws.sh — Create S3 bucket + CloudFront distribution for ui.purrdict.xyz
#
# Run once to set up infrastructure. Idempotent (skips if resources exist).
#
# After running:
#   1. Note the CloudFront distribution domain (e.g. d1234abcdef8.cloudfront.net)
#   2. Add CNAME: ui.purrdict.xyz -> <cloudfront-domain>
#   3. Set CF_REGISTRY_DISTRIBUTION_ID in your environment / GitHub secrets
#
set -euo pipefail

S3_BUCKET="purrdict-ui-registry"
AWS_REGION="us-east-1"
DOMAIN="ui.purrdict.xyz"

echo "=== HIP-4 Registry AWS Setup ==="
echo ""

# --- 1. Create S3 bucket ---
echo "==> Creating S3 bucket: $S3_BUCKET..."
if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
  echo "    Bucket already exists."
else
  aws s3api create-bucket \
    --bucket "$S3_BUCKET" \
    --region "$AWS_REGION"
  echo "    Bucket created."
fi

# Block all public access (CloudFront uses OAC)
aws s3api put-public-access-block \
  --bucket "$S3_BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning for safety
aws s3api put-bucket-versioning \
  --bucket "$S3_BUCKET" \
  --versioning-configuration Status=Enabled

echo "    Public access blocked, versioning enabled."

# --- 2. Request ACM certificate (if not exists) ---
echo ""
echo "==> Checking ACM certificate for $DOMAIN..."

CERT_ARN=$(aws acm list-certificates \
  --region "$AWS_REGION" \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
  --output text 2>/dev/null || echo "")

if [[ -z "$CERT_ARN" || "$CERT_ARN" == "None" ]]; then
  echo "    Requesting new certificate..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$DOMAIN" \
    --validation-method DNS \
    --region "$AWS_REGION" \
    --query "CertificateArn" \
    --output text)
  echo "    Certificate requested: $CERT_ARN"
  echo ""
  echo "    IMPORTANT: Validate the certificate via DNS before proceeding."
  echo "    Run: aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION"
  echo "    Add the CNAME record shown in DomainValidationOptions to your DNS."
  echo ""
  echo "    After validation, re-run this script to create the CloudFront distribution."
  exit 0
else
  echo "    Found certificate: $CERT_ARN"
fi

# Check if cert is validated
CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$AWS_REGION" \
  --query "Certificate.Status" \
  --output text)

if [[ "$CERT_STATUS" != "ISSUED" ]]; then
  echo "    Certificate status: $CERT_STATUS (not yet validated)"
  echo "    Please validate the certificate first, then re-run this script."
  exit 0
fi

echo "    Certificate status: ISSUED"

# --- 3. Create CloudFront OAC ---
echo ""
echo "==> Setting up CloudFront Origin Access Control..."

OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$S3_BUCKET-oac'].Id" \
  --output text 2>/dev/null || echo "")

if [[ -z "$OAC_ID" || "$OAC_ID" == "None" ]]; then
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "{
      \"Name\": \"$S3_BUCKET-oac\",
      \"Description\": \"OAC for $DOMAIN registry\",
      \"SigningProtocol\": \"sigv4\",
      \"SigningBehavior\": \"always\",
      \"OriginAccessControlOriginType\": \"s3\"
    }" \
    --query "OriginAccessControl.Id" \
    --output text)
  echo "    Created OAC: $OAC_ID"
else
  echo "    Found OAC: $OAC_ID"
fi

# --- 4. Create CloudFront distribution ---
echo ""
echo "==> Checking CloudFront distribution..."

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[0]=='$DOMAIN'].Id" \
  --output text 2>/dev/null || echo "")

if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  echo "    Creating CloudFront distribution..."

  DIST_CONFIG=$(cat <<CFEOF
{
  "CallerReference": "$S3_BUCKET-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["$DOMAIN"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$S3_BUCKET",
        "DomainName": "$S3_BUCKET.s3.$AWS_REGION.amazonaws.com",
        "OriginAccessControlId": "$OAC_ID",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$S3_BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "DefaultTTL": 300,
    "MaxTTL": 86400,
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 60
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2and3",
  "Enabled": true,
  "Comment": "HIP-4 component registry - $DOMAIN",
  "PriceClass": "PriceClass_100"
}
CFEOF
  )

  DIST_RESULT=$(aws cloudfront create-distribution \
    --distribution-config "$DIST_CONFIG" \
    --output json)

  DIST_ID=$(echo "$DIST_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['Id'])")
  DIST_DOMAIN=$(echo "$DIST_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['DomainName'])")

  echo "    Distribution created!"
  echo "    ID: $DIST_ID"
  echo "    Domain: $DIST_DOMAIN"

  # --- 5. Add S3 bucket policy for CloudFront OAC ---
  echo ""
  echo "==> Setting S3 bucket policy for CloudFront access..."

  ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

  BUCKET_POLICY=$(cat <<BPEOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$S3_BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"
        }
      }
    }
  ]
}
BPEOF
  )

  aws s3api put-bucket-policy \
    --bucket "$S3_BUCKET" \
    --policy "$BUCKET_POLICY"

  echo "    Bucket policy set."
else
  DIST_DOMAIN=$(aws cloudfront get-distribution \
    --id "$DIST_ID" \
    --query "Distribution.DomainName" \
    --output text)
  echo "    Found existing distribution: $DIST_ID ($DIST_DOMAIN)"
fi

# --- Summary ---
echo ""
echo "============================================"
echo "  Registry Infrastructure Ready"
echo "============================================"
echo ""
echo "  S3 Bucket:      $S3_BUCKET"
echo "  CloudFront ID:  $DIST_ID"
echo "  CF Domain:      $DIST_DOMAIN"
echo ""
echo "  DNS CNAME to add:"
echo "    ui.purrdict.xyz  ->  $DIST_DOMAIN"
echo ""
echo "  GitHub Secrets to set:"
echo "    CF_REGISTRY_DISTRIBUTION_ID = $DIST_ID"
echo ""
echo "  Deploy with:"
echo "    export CF_REGISTRY_DISTRIBUTION_ID=$DIST_ID"
echo "    ./scripts/deploy.sh"
echo ""

# Add CORS configuration for the S3 bucket (shadcn CLI needs it)
echo "==> Setting CORS configuration..."
aws s3api put-bucket-cors \
  --bucket "$S3_BUCKET" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["Content-Length", "Content-Type"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
echo "    CORS configured (allows GET/HEAD from any origin)."

echo ""
echo "==> Setup complete!"
