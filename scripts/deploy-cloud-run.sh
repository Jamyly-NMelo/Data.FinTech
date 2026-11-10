#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set the Google Cloud project ID}"
: "${REGION:?Set the Cloud Run and Artifact Registry region}"
: "${APPS_SCRIPT_URL:?Set the Apps Script Web App /exec URL}"
: "${GOOGLE_CLIENT_ID:?Set the Google OAuth Web Client ID}"
: "${ALLOWED_ORIGINS:?Set the exact production origin, without a trailing slash}"
: "${SECRET_VERSION:?Set the numeric Secret Manager version}"

if [[ ! "$SECRET_VERSION" =~ ^[0-9]+$ ]]; then
  echo "SECRET_VERSION must be a numeric Secret Manager version." >&2
  exit 1
fi

if [[ "$ALLOWED_ORIGINS" == *,* ]]; then
  echo "Set exactly one production origin in ALLOWED_ORIGINS." >&2
  exit 1
fi

SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT:-datafin-runtime@$PROJECT_ID.iam.gserviceaccount.com}"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/data-fintech/data-fintech:latest"

gcloud run deploy data-fintech \
  --project="$PROJECT_ID" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --min=0 \
  --max=3 \
  --cpu=1 \
  --memory=512Mi \
  --cpu-throttling \
  --concurrency=80 \
  --set-env-vars="APPS_SCRIPT_URL=$APPS_SCRIPT_URL,GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,ALLOWED_ORIGINS=$ALLOWED_ORIGINS" \
  --set-secrets="GATEWAY_SECRET=datafin-gateway-secret:$SECRET_VERSION"
