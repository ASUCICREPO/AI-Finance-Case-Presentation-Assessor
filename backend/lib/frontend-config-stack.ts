import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface FrontendConfigStackProps extends cdk.StackProps {
  amplifyAppId: string;
  amplifyDefaultDomain: string;
  branchName: string;
  useGitHub: boolean;
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  agentCoreWebSocketUrl: string;
}

/**
 * Frontend Config Stack
 * Configures Amplify branch with environment variables needed by the frontend.
 */
export class FrontendConfigStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendConfigStackProps) {
    super(scope, id, props);

    // TODO: Create Amplify branch with environment variables
    // Reference: Real-Estate-Program/backend/lib/frontend-config-stack.ts

    // Environment variables that will be injected into the frontend:
    // NEXT_PUBLIC_API_URL
    // NEXT_PUBLIC_USER_POOL_ID
    // NEXT_PUBLIC_USER_POOL_CLIENT_ID
    // NEXT_PUBLIC_IDENTITY_POOL_ID
    // NEXT_PUBLIC_AGENTCORE_WS_URL
    // NEXT_PUBLIC_AWS_REGION

    new cdk.CfnOutput(this, 'FrontendApiUrl', { value: props.apiUrl });
    new cdk.CfnOutput(this, 'FrontendWsUrl', { value: props.agentCoreWebSocketUrl });
  }
}
