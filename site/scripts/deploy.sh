#!/usr/bin/env bash
#
# deploy.sh — Build and deploy the HIP-4 component registry to S3 + CloudFront.
#
# Usage:
#   ./scripts/deploy.sh                  # build + deploy
#   ./scripts/deploy.sh --skip-build     # deploy existing dist/
#
# Prerequisites:
#   - AWS CLI configured with appropriate permissions
#   - bun installed
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
S3_BUCKET="purrdict-ui-registry"
CF_DISTRIBUTION_ID="${CF_REGISTRY_DISTRIBUTION_ID:-}"

cd "$APP_DIR"

# --- Build unless --skip-build ---
if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Generating registry JSONs..."
  bun run generate-registry

  echo "==> Building Astro site..."
  bunx astro build
fi

# --- Deploy to S3 ---
echo "==> Syncing to s3://$S3_BUCKET/..."
aws s3 sync dist/ "s3://$S3_BUCKET/" \
  --delete \
  --cache-control "public, max-age=60, s-maxage=300"

# Set correct content-type for JSON files (S3 sometimes guesses wrong)
echo "==> Setting content-type for JSON files..."
aws s3 cp "s3://$S3_BUCKET/" "s3://$S3_BUCKET/" \
  --recursive \
  --exclude "*" \
  --include "r/*.json" \
  --content-type "application/json" \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=60, s-maxage=300"

# --- Invalidate CloudFront ---
if [[ -n "$CF_DISTRIBUTION_ID" ]]; then
  echo "==> Invalidating CloudFront distribution $CF_DISTRIBUTION_ID..."
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DISTRIBUTION_ID" \
    --paths "/*"
  echo "==> CloudFront invalidation submitted."
else
  echo "==> No CF_REGISTRY_DISTRIBUTION_ID set, skipping CloudFront invalidation."
  echo "    Set it: export CF_REGISTRY_DISTRIBUTION_ID=EXXXXXXXXXX"
fi

echo "==> Done! Registry deployed to https://ui.purrdict.xyz"
