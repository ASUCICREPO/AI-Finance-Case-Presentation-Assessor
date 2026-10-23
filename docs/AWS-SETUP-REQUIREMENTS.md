# AWS Account Setup Requirements

Complete requirements for deploying the AI Finance Case Presentation Assessor.

---

## AWS Services Required

| Service | Purpose |
|---------|---------|
| Amazon Cognito | User authentication (Student/TA/Instructor roles) |
| Amazon S3 | File storage (Excel uploads, transcripts, reports) |
| Amazon DynamoDB | Data storage (personas, sessions, assessments, students, groups) |
| AWS Lambda | Backend functions (Python 3.12) |
| Amazon API Gateway | REST API endpoints |
| Amazon Bedrock | AI models for voice Q&A and assessment |
| Bedrock AgentCore | Real-time bidirectional voice streaming |
| AWS Amplify | Frontend hosting (Next.js) |
| Amazon ECR | Container registry for AgentCore |
| AWS Secrets Manager | Anam API key storage |
| AWS CloudFormation | Infrastructure deployment via CDK |

---

## Amazon Bedrock Models

**IMPORTANT:** These models must be enabled in your AWS account via the Bedrock console before deployment.

| Model | Model ID | Purpose |
|-------|----------|---------|
| **Amazon Nova 2 Sonic** | `amazon.nova-2-sonic-v1:0` | Real-time bidirectional voice Q&A |
| **Anthropic Claude Sonnet 4.5** | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | Rubric-based assessment scoring |
| **Amazon Nova 2 Lite** | `global.amazon.nova-2-lite-v1:0` | Quick Q&A feedback generation |

### Enabling Bedrock Models

1. Go to **Amazon Bedrock Console** → **Model access**
2. Click **Manage model access**
3. Enable:
   - ✅ Amazon Nova 2 Sonic
   - ✅ Amazon Nova 2 Lite  
   - ✅ Anthropic Claude Sonnet 4.5
4. Accept any EULAs and wait for access to be granted

---

## Local Development Requirements

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend and CDK |
| npm | 9+ | Package management |
| Python | 3.12 | Lambda functions |
| AWS CLI | 2.x | AWS operations |
| AWS CDK | 2.257+ | Infrastructure deployment |
| Docker | Latest | AgentCore container builds |
| Git | Latest | Version control |

### Installation Commands

```bash
# Node.js (via nvm recommended)
nvm install 18
nvm use 18

# AWS CDK
npm install -g aws-cdk

# AWS CLI (macOS)
brew install awscli

# Docker Desktop
# Download from https://www.docker.com/products/docker-desktop
```

---

## Backend Dependencies (CDK/TypeScript)

```json
{
  "dependencies": {
    "@aws-cdk/aws-amplify-alpha": "^2.257.0-alpha.0",
    "@aws-cdk/aws-bedrock-agentcore-alpha": "^2.257.0-alpha.0",
    "aws-cdk-lib": "^2.257.0",
    "cdk-nag": "^2.38.2",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "aws-cdk": "^2.1125.0",
    "typescript": "~5.6.3"
  }
}
```

---

## AgentCore Dependencies (Python)

```txt
strands-agents[bidi,otel]==1.54.0
bedrock-agentcore==1.3.0
boto3==1.40.61
botocore==1.40.61
aioboto3==15.5.0
pyaudio==0.2.14
jinja2==3.1.6
openpyxl==3.1.5
```

**Note:** These versions are pinned due to dependency conflicts between bedrock-agentcore and aioboto3. Do not modify without testing.

---

## Frontend Dependencies (Next.js/React)

```json
{
  "dependencies": {
    "@anam-ai/js-sdk": "^4.26.0",
    "@aws-crypto/sha256-js": "^5.2.0",
    "@aws-sdk/client-transcribe-streaming": "^3.985.0",
    "@aws-sdk/credential-providers": "^3.994.0",
    "@aws-sdk/protocol-http": "^3.370.0",
    "@aws-sdk/signature-v4": "^3.370.0",
    "@react-pdf/renderer": "^4.3.2",
    "amazon-cognito-identity-js": "^6.3.16",
    "fix-webm-duration": "^1.0.6",
    "lucide-react": "^0.563.0",
    "next": "^16.1.6",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "sonner": "^2.0.7",
    "xlsx": "^0.18.5"
  }
}
```

---

## Lambda Functions (Python)

| Lambda | Description | Special Dependencies |
|--------|-------------|---------------------|
| persona-crud | Stakeholder persona management | boto3 (bundled) |
| excel-parser | Excel workbook parsing | openpyxl |
| validation-agent | Submission validation | boto3 (bundled) |
| post-session-analytics | Assessment reports | boto3 (bundled) |
| generate-ai-score | AI rubric scoring | boto3 + Bedrock |
| s3-presigned-url | Secure file URLs | boto3 (bundled) |
| students-crud | Student roster management | boto3 (bundled) |
| groups-crud | Assessment groups | boto3 (bundled) |
| submissions-crud | Submissions & grading | boto3 (bundled) |
| gradebook | Export & analytics | boto3 (bundled) |
| assessments-crud | Assessment management | boto3 (bundled) |
| course-sessions-crud | Class sections | boto3 (bundled) |
| anam-session-token | Anam avatar tokens | boto3 + requests |
| validate-admin-code | Admin access validation | boto3 (bundled) |

---

## AWS IAM Permissions Required

The deploying user/role needs permissions for:

- CloudFormation (full stack management)
- Cognito (user pools, identity pools)
- S3 (bucket creation, policies)
- DynamoDB (table creation)
- Lambda (function creation, layers)
- API Gateway (REST API creation)
- IAM (roles, policies for services)
- Bedrock (model invocation)
- Bedrock AgentCore (runtime creation)
- ECR (repository creation, image push)
- Amplify (app creation, hosting)
- Secrets Manager (secret creation/read)

**Recommended:** Use an IAM user/role with `AdministratorAccess` for initial deployment, then scope down for production.

---

## External Services

### Anam AI (Avatar)

- **Purpose:** Visual avatar for AI persona during Q&A sessions
- **Setup:**
  1. Create account at [anam.ai](https://anam.ai)
  2. Generate API key
  3. Store in AWS Secrets Manager: `finance-assessor/anam-api-key`

```bash
aws secretsmanager create-secret \
  --name "finance-assessor/anam-api-key" \
  --secret-string "your-anam-api-key-here" \
  --profile wpcareyppt
```

---

## Deployment Steps

### 1. Configure AWS CLI

```bash
aws configure --profile wpcareyppt
# Enter: Access Key ID, Secret Access Key, Region (us-east-1)
```

### 2. Enable Bedrock Models

Via AWS Console → Amazon Bedrock → Model access

### 3. Create Anam Secret

```bash
aws secretsmanager create-secret \
  --name "finance-assessor/anam-api-key" \
  --secret-string "your-anam-api-key" \
  --profile wpcareyppt
```

### 4. Deploy Backend

```bash
cd backend
npm install
AWS_PROFILE=wpcareyppt npx cdk bootstrap  # First time only
AWS_PROFILE=wpcareyppt npx cdk deploy --all -c branchName=main
```

### 5. Configure Frontend Environment

Create `frontend/.env.local` with CDK outputs:

```env
NEXT_PUBLIC_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com/prod/
NEXT_PUBLIC_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_AGENTCORE_WS_URL=wss://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/...
NEXT_PUBLIC_AWS_REGION=us-east-1
```

### 6. Deploy Frontend

Amplify auto-deploys from GitHub on push to `main`.

---

## Region Requirements

**Recommended Region:** `us-east-1` (N. Virginia)

This region has full support for:
- Amazon Nova 2 Sonic (voice)
- Anthropic Claude Sonnet 4.5
- Bedrock AgentCore

---

## Estimated AWS Costs (Monthly)

| Service | Estimate |
|---------|----------|
| Cognito | Free tier (50k MAU) |
| DynamoDB | ~$5-10 (on-demand) |
| S3 | ~$1-5 |
| Lambda | ~$5-20 |
| API Gateway | ~$5-15 |
| Bedrock (models) | ~$50-200 (usage-based) |
| Amplify | ~$5-15 |
| **Total** | **~$70-270/month** |

*Costs vary significantly based on usage (number of Q&A sessions, transcript length, etc.)*

---

## Troubleshooting

### "Model not found" errors
→ Enable the model in Bedrock console → Model access

### AgentCore deployment fails
→ Ensure Docker is running and you have ECR permissions

### CORS errors in browser
→ Check `allowedOrigins` in backend-stack.ts includes your domain

### WebSocket connection fails
→ Verify Cognito identity pool and authenticated role permissions

---

## Contact

Developed by ASU AI Cloud Innovation Center powered by AWS.
