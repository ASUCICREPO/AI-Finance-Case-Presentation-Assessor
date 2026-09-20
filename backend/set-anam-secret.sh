#!/bin/bash

# Script to set up Anam API key in AWS Secrets Manager
# Usage: ./set-anam-secret.sh YOUR_ANAM_API_KEY

set -e

if [ -z "$1" ]; then
  echo "Error: Anam API key not provided"
  echo "Usage: ./set-anam-secret.sh YOUR_ANAM_API_KEY"
  exit 1
fi

API_KEY="$1"
SECRET_NAME="finance-assessor/anam-api-key"
REGION="us-east-1"

echo "Setting up Anam API key secret..."

# Check if secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" 2>/dev/null; then
  echo "Secret already exists. Updating..."
  aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$API_KEY" \
    --region "$REGION"
  echo "✅ Secret updated successfully!"
else
  echo "Creating new secret..."
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --secret-string "$API_KEY" \
    --description "Anam AI API key for Finance Case Presentation Assessor avatars" \
    --region "$REGION"
  echo "✅ Secret created successfully!"
fi

echo ""
echo "Next steps:"
echo "1. Deploy the CDK stack: cd backend && npx cdk deploy FinanceAssessorStack"
echo "2. The Lambda will now be able to access the Anam API key"
echo "3. Test by visiting: https://main.d2y1cwozysxwnb.amplifyapp.com/ta/personas/"
