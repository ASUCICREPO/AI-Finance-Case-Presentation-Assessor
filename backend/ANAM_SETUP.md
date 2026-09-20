# Anam AI Avatar Setup

This document explains how to configure the Anam AI API key for avatar functionality.

## Problem

The Finance Assessor uses Anam AI to render realistic avatars during Q&A sessions. The Lambda function needs an API key to authenticate with Anam's API.

## Solution

We use **AWS Secrets Manager** to securely store the Anam API key instead of hardcoding it in the Lambda environment.

## Setup Instructions

### Option 1: Using the Helper Script (Recommended)

```bash
cd backend
./set-anam-secret.sh YOUR_ACTUAL_ANAM_API_KEY
```

### Option 2: Manual AWS CLI

```bash
aws secretsmanager create-secret \
  --name finance-assessor/anam-api-key \
  --secret-string "YOUR_ACTUAL_ANAM_API_KEY" \
  --description "Anam AI API key for Finance Case Presentation Assessor avatars" \
  --region us-east-1
```

### Option 3: AWS Console

1. Go to AWS Secrets Manager in us-east-1
2. Click "Store a new secret"
3. Select "Other type of secret"
4. Choose "Plaintext" tab
5. Enter your Anam API key (just the key value, no JSON)
6. Name it: `finance-assessor/anam-api-key`
7. Click "Store"

## Deployment

After setting the secret, deploy the CDK stack:

```bash
cd backend
npx cdk deploy FinanceAssessorStack --region us-east-1
```

## How It Works

1. **CDK Stack** (`backend/lib/backend-stack.ts`) references the secret and grants the Lambda read permission
2. **Lambda Function** (`backend/lambda/anam-session-token/index.py`) retrieves the key from Secrets Manager on cold start
3. **Caching** - The API key is cached in memory for warm Lambda invocations
4. **Error Handling** - If the secret is not found, the Lambda returns a 500 error with instructions

## Verify Setup

1. Deploy the stack
2. Visit: https://main.d2y1cwozysxwnb.amplifyapp.com/ta/personas/
3. Avatars should load without 401/502 errors
4. Check CloudWatch Logs for the Lambda function to see: "Successfully retrieved Anam API key from Secrets Manager"

## Troubleshooting

### Still getting 401 errors?

- Check the secret exists: `aws secretsmanager describe-secret --secret-id finance-assessor/anam-api-key --region us-east-1`
- Verify the API key value is correct (test it with Anam's API directly)
- Check Lambda has permission to read the secret (IAM policy in CDK stack)

### Still getting 502 errors?

- Check CloudWatch Logs for the Lambda function
- Look for "Secret not found" or permission errors
- Ensure you deployed after creating the secret

### Secret name changed?

If you need to use a different secret name, update `backend/lib/backend-stack.ts`:

```typescript
const anamApiKeySecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'AnamApiKeySecret',
  'YOUR-NEW-SECRET-NAME'  // Change this
);
```

## Security Notes

- ✅ API key is encrypted at rest in Secrets Manager
- ✅ API key is never logged or exposed in responses
- ✅ Lambda only has read permission (not write)
- ✅ API key is cached in Lambda memory (not persisted to disk)
- ⚠️ Rotate the API key periodically for security

## Cost

AWS Secrets Manager costs:
- $0.40 per secret per month
- $0.05 per 10,000 API calls

For this use case (1 secret, low call volume): **~$0.40/month**
