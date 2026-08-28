import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface FinanceAssessorStackProps extends cdk.StackProps {
  allowedOrigins: string[];
}

/**
 * Main backend stack for the AI Finance Case Presentation Assessor.
 * 
 * Resources:
 * - Amazon Cognito (User Pool + Identity Pool) for Student/TA authentication
 * - Amazon S3 for uploads (Excel workbooks), session recordings, transcripts, reports
 * - Amazon DynamoDB for personas, cases, assessments, sessions
 * - AWS Lambda functions: Persona CRUD, Excel Parser, Validation Agent, Post-Session Analytics, S3 Pre-signed URL
 * - Amazon API Gateway REST API
 * - Amazon Bedrock Guardrails for content safety
 */
export class FinanceAssessorStack extends cdk.Stack {
  // Exposed for other stacks
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly authenticatedRole: iam.Role;
  public readonly personasTable: dynamodb.Table;
  public readonly uploadsBucket: s3.Bucket;
  public readonly apiUrl: string;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly identityPoolId: string;
  public readonly guardrailId: string;
  public readonly guardrailVersion: string;
  public readonly guardrailArn: string;

  constructor(scope: Construct, id: string, props: FinanceAssessorStackProps) {
    super(scope, id, props);

    // ──────────────────────────────────────────────────────────
    // Cognito User Pool
    // ──────────────────────────────────────────────────────────
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true },
        givenName: { required: true },
        familyName: { required: true },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }), // 'student' | 'ta' | 'instructor'
        group: new cognito.StringAttribute({ mutable: true }),
        course: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient('WebClient', {
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;

    // Identity Pool for authenticated AWS access
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });
    this.identityPoolId = identityPool.ref;

    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'authenticated' },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: identityPool.ref,
      roles: { authenticated: this.authenticatedRole.roleArn },
    });

    // ──────────────────────────────────────────────────────────
    // S3 Bucket — uploads (Excel workbooks), recordings, reports
    // ──────────────────────────────────────────────────────────
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: props.allowedOrigins,
          allowedHeaders: ['*'],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ──────────────────────────────────────────────────────────
    // DynamoDB Tables
    // ──────────────────────────────────────────────────────────
    this.personasTable = new dynamodb.Table(this, 'PersonasTable', {
      partitionKey: { name: 'personaID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const casesTable = new dynamodb.Table(this, 'CasesTable', {
      partitionKey: { name: 'caseID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      partitionKey: { name: 'sessionID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const assessmentsTable = new dynamodb.Table(this, 'AssessmentsTable', {
      partitionKey: { name: 'assessmentID', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ──────────────────────────────────────────────────────────
    // Lambda Functions
    // ──────────────────────────────────────────────────────────
    const lambdaDefaults: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        PERSONAS_TABLE: this.personasTable.tableName,
        CASES_TABLE: casesTable.tableName,
        SESSIONS_TABLE: sessionsTable.tableName,
        ASSESSMENTS_TABLE: assessmentsTable.tableName,
        UPLOADS_BUCKET: this.uploadsBucket.bucketName,
      },
    };

    // Persona CRUD Lambda
    const personaCrudFn = new lambda.Function(this, 'PersonaCrudFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/persona-crud'),
      description: 'CRUD operations for stakeholder personas',
    } as lambda.FunctionProps);
    this.personasTable.grantReadWriteData(personaCrudFn);

    // Excel Parser Lambda (with openpyxl bundled)
    const excelParserFn = new lambda.Function(this, 'ExcelParserFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/excel-parser', {
        bundling: {
          image: lambda.Runtime.PYTHON_3_12.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
          ],
        },
      }),
      description: 'Parses uploaded Excel/Google Sheet workbooks for AI analysis',
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    } as lambda.FunctionProps);
    this.uploadsBucket.grantReadWrite(excelParserFn);

    // Validation Agent Lambda
    const validationAgentFn = new lambda.Function(this, 'ValidationAgentFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/validation-agent'),
      description: 'Validates student submissions and triggers assessment workflows',
    } as lambda.FunctionProps);
    this.uploadsBucket.grantRead(validationAgentFn);
    sessionsTable.grantReadWriteData(validationAgentFn);

    // Post-Session Analytics Lambda
    const postSessionAnalyticsFn = new lambda.Function(this, 'PostSessionAnalyticsFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/post-session-analytics'),
      description: 'Generates assessment reports and scoring after Q&A sessions',
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
    } as lambda.FunctionProps);
    sessionsTable.grantReadWriteData(postSessionAnalyticsFn);
    assessmentsTable.grantReadWriteData(postSessionAnalyticsFn);
    this.uploadsBucket.grantReadWrite(postSessionAnalyticsFn);

    // S3 Pre-signed URL Lambda
    const s3PresignedUrlFn = new lambda.Function(this, 'S3PresignedUrlFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/s3-presigned-url'),
      description: 'Generates pre-signed URLs for secure file uploads/downloads',
    } as lambda.FunctionProps);
    this.uploadsBucket.grantReadWrite(s3PresignedUrlFn);

    // Anam AI Session Token Lambda
    const anamSessionTokenFn = new lambda.Function(this, 'AnamSessionTokenFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/anam-session-token'),
      description: 'Exchanges Anam API key for short-lived session token for avatar rendering',
      environment: {
        ANAM_API_KEY: process.env.ANAM_API_KEY || 'PLACEHOLDER_SET_IN_CONSOLE',
        ALLOWED_ORIGINS: 'http://localhost:3000,https://main.d2y1cwozysxwnb.amplifyapp.com',
      },
    });

    // ──────────────────────────────────────────────────────────
    // API Gateway
    // ──────────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'FinanceAssessorApi', {
      restApiName: 'Finance Case Assessor API',
      defaultCorsPreflightOptions: {
        allowOrigins: props.allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // /personas
    const personasResource = api.root.addResource('personas');
    personasResource.addMethod('GET', new apigateway.LambdaIntegration(personaCrudFn));
    personasResource.addMethod('POST', new apigateway.LambdaIntegration(personaCrudFn));
    const personaById = personasResource.addResource('{personaId}');
    personaById.addMethod('GET', new apigateway.LambdaIntegration(personaCrudFn));
    personaById.addMethod('PUT', new apigateway.LambdaIntegration(personaCrudFn));
    personaById.addMethod('DELETE', new apigateway.LambdaIntegration(personaCrudFn));

    // /upload-url
    const uploadUrlResource = api.root.addResource('upload-url');
    uploadUrlResource.addMethod('POST', new apigateway.LambdaIntegration(s3PresignedUrlFn));

    // /parse-excel
    const parseExcelResource = api.root.addResource('parse-excel');
    parseExcelResource.addMethod('POST', new apigateway.LambdaIntegration(excelParserFn));

    // /validate
    const validateResource = api.root.addResource('validate');
    validateResource.addMethod('POST', new apigateway.LambdaIntegration(validationAgentFn));

    // /analytics
    const analyticsResource = api.root.addResource('analytics');
    analyticsResource.addMethod('POST', new apigateway.LambdaIntegration(postSessionAnalyticsFn));
    analyticsResource.addMethod('GET', new apigateway.LambdaIntegration(postSessionAnalyticsFn));

    // /anam-session
    const anamSessionResource = api.root.addResource('anam-session');
    anamSessionResource.addMethod('POST', new apigateway.LambdaIntegration(anamSessionTokenFn));

    this.apiUrl = api.url;

    // ──────────────────────────────────────────────────────────
    // Bedrock Guardrails (placeholder IDs — configure in console)
    // ──────────────────────────────────────────────────────────
    this.guardrailId = 'PLACEHOLDER_GUARDRAIL_ID';
    this.guardrailVersion = 'DRAFT';
    this.guardrailArn = `arn:aws:bedrock:${this.region}:${this.account}:guardrail/${this.guardrailId}`;

    // ──────────────────────────────────────────────────────────
    // Outputs
    // ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', { value: this.apiUrl });
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClientId });
    new cdk.CfnOutput(this, 'IdentityPoolId', { value: this.identityPoolId });
    new cdk.CfnOutput(this, 'UploadsBucketName', { value: this.uploadsBucket.bucketName });
  }
}
