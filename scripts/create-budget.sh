#!/usr/bin/env bash
set -euo pipefail

: "${BILLING_ACCOUNT_ID:?Set the Cloud Billing account ID}"
: "${PROJECT_ID:?Set the Google Cloud project ID}"
: "${BUDGET_AMOUNT:?Set a monthly budget amount, for example 25USD}"

gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --display-name="DataFinTech monthly project budget" \
  --budget-amount="$BUDGET_AMOUNT" \
  --filter-projects="projects/$PROJECT_ID" \
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=0.90 \
  --threshold-rule=percent=1.00
