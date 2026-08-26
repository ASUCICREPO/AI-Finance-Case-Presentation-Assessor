import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface AmplifyHostingStackProps extends cdk.StackProps {
  branchName: string;
  githubOwner?: string;
  githubRepo?: string;
  githubToken?: string;
}

/**
 * Amplify Hosting Stack
 * Creates the AWS Amplify App for hosting the Next.js frontend.
 * Supports both manual deployment and GitHub CI/CD modes.
 */
export class AmplifyHostingStack extends cdk.Stack {
  public readonly appId: string;
  public readonly defaultDomain: string;

  constructor(scope: Construct, id: string, props: AmplifyHostingStackProps) {
    super(scope, id, props);

    // TODO: Implement Amplify App creation
    // Reference: Real-Estate-Program/backend/lib/amplify-hosting-stack.ts

    // Placeholder outputs
    this.appId = 'PLACEHOLDER_APP_ID';
    this.defaultDomain = 'PLACEHOLDER.amplifyapp.com';

    new cdk.CfnOutput(this, 'AmplifyAppId', { value: this.appId });
    new cdk.CfnOutput(this, 'AmplifyDefaultDomain', { value: this.defaultDomain });
  }
}
