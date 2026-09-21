import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
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

    // TA Dashboard Tables
    // Students Table - roster of all students with their info
    const studentsTable = new dynamodb.Table(this, 'StudentsTable', {
      partitionKey: { name: 'studentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // GSI for querying students by email
    studentsTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying students by section
    studentsTable.addGlobalSecondaryIndex({
      indexName: 'section-index',
      partitionKey: { name: 'section', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastName', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying students by sessionNumber and groupNumber (for assignment lookup)
    studentsTable.addGlobalSecondaryIndex({
      indexName: 'sessionGroup-index',
      partitionKey: { name: 'sessionNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'groupNumber', type: dynamodb.AttributeType.STRING },
    });

    // Groups Table - groups within each assessment/session
    const groupsTable = new dynamodb.Table(this, 'GroupsTable', {
      partitionKey: { name: 'groupId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // GSI for querying groups by assessment
    groupsTable.addGlobalSecondaryIndex({
      indexName: 'assessmentId-index',
      partitionKey: { name: 'assessmentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'groupName', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying groups by sessionNumber and groupNumber (for assignment lookup)
    groupsTable.addGlobalSecondaryIndex({
      indexName: 'sessionGroup-index',
      partitionKey: { name: 'sessionNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'groupNumber', type: dynamodb.AttributeType.STRING },
    });

    // Submissions Table - student submissions with AI and reviewer scores
    const submissionsTable = new dynamodb.Table(this, 'SubmissionsTable', {
      partitionKey: { name: 'submissionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // GSI for querying submissions by student
    submissionsTable.addGlobalSecondaryIndex({
      indexName: 'studentId-index',
      partitionKey: { name: 'studentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying submissions by assessment
    submissionsTable.addGlobalSecondaryIndex({
      indexName: 'assessmentId-index',
      partitionKey: { name: 'assessmentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying submissions by status (Pending, Reviewed, Overridden)
    submissionsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });

    // Course Sessions Table - class sections (morning/evening, session 1/2)
    const courseSessionsTable = new dynamodb.Table(this, 'CourseSessionsTable', {
      partitionKey: { name: 'courseSessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // GSI for querying by status (active, upcoming, archived)
    courseSessionsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying by semester/year
    courseSessionsTable.addGlobalSecondaryIndex({
      indexName: 'semesterYear-index',
      partitionKey: { name: 'semester', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
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
        STUDENTS_TABLE: studentsTable.tableName,
        GROUPS_TABLE: groupsTable.tableName,
        SUBMISSIONS_TABLE: submissionsTable.tableName,
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

    // Generate AI Score Lambda - scores submissions using Bedrock
    const generateAiScoreFn = new lambda.Function(this, 'GenerateAiScoreFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/generate-ai-score'),
      description: 'Generates AI rubric-based scores for submissions using Bedrock',
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
    } as lambda.FunctionProps);
    submissionsTable.grantReadWriteData(generateAiScoreFn);
    // Grant Bedrock permissions for AI scoring
    generateAiScoreFn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:Converse', 'bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // S3 Pre-signed URL Lambda
    const s3PresignedUrlFn = new lambda.Function(this, 'S3PresignedUrlFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/s3-presigned-url'),
      description: 'Generates pre-signed URLs for secure file uploads/downloads',
    } as lambda.FunctionProps);
    this.uploadsBucket.grantReadWrite(s3PresignedUrlFn);

    // Anam API Key from Secrets Manager
    // Create or retrieve the secret - set the value manually in AWS Console
    const anamApiKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'AnamApiKeySecret',
      'finance-assessor/anam-api-key'
    );

    // Anam AI Session Token Lambda
    const anamSessionTokenFn = new lambda.Function(this, 'AnamSessionTokenFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/anam-session-token'),
      description: 'Exchanges Anam API key for short-lived session token for avatar rendering',
      environment: {
        ANAM_API_KEY_SECRET_ARN: anamApiKeySecret.secretArn,
        ALLOWED_ORIGINS: 'http://localhost:3000,https://main.d2y1cwozysxwnb.amplifyapp.com',
      },
    });

    // Grant Lambda permission to read the secret
    anamApiKeySecret.grantRead(anamSessionTokenFn);

    // TA Dashboard Lambda Functions
    // Students CRUD Lambda
    const studentsCrudFn = new lambda.Function(this, 'StudentsCrudFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/students-crud'),
      description: 'CRUD operations for student roster management',
    } as lambda.FunctionProps);
    studentsTable.grantReadWriteData(studentsCrudFn);
    groupsTable.grantReadData(studentsCrudFn);

    // Groups CRUD Lambda
    const groupsCrudFn = new lambda.Function(this, 'GroupsCrudFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/groups-crud'),
      description: 'CRUD operations for assessment groups',
    } as lambda.FunctionProps);
    groupsTable.grantReadWriteData(groupsCrudFn);
    studentsTable.grantReadData(groupsCrudFn);
    assessmentsTable.grantReadData(groupsCrudFn);

    // Submissions CRUD Lambda
    const submissionsCrudFn = new lambda.Function(this, 'SubmissionsCrudFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/submissions-crud'),
      description: 'CRUD operations for student submissions and grading',
      timeout: cdk.Duration.seconds(60),
    } as lambda.FunctionProps);
    submissionsTable.grantReadWriteData(submissionsCrudFn);
    studentsTable.grantReadData(submissionsCrudFn);
    assessmentsTable.grantReadData(submissionsCrudFn);
    sessionsTable.grantReadData(submissionsCrudFn);
    this.uploadsBucket.grantRead(submissionsCrudFn);

    // Gradebook Lambda - for exporting grades and analytics
    const gradebookFn = new lambda.Function(this, 'GradebookFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/gradebook'),
      description: 'Gradebook operations - export, analytics, bulk updates',
      timeout: cdk.Duration.seconds(60),
    } as lambda.FunctionProps);
    submissionsTable.grantReadWriteData(gradebookFn);
    studentsTable.grantReadData(gradebookFn);
    groupsTable.grantReadData(gradebookFn);
    assessmentsTable.grantReadData(gradebookFn);
    this.uploadsBucket.grantReadWrite(gradebookFn);

    // Assessments CRUD Lambda
    const assessmentsCrudFn = new lambda.Function(this, 'AssessmentsCrudFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/assessments-crud'),
      description: 'CRUD operations for assessment management',
    } as lambda.FunctionProps);
    assessmentsTable.grantReadWriteData(assessmentsCrudFn);
    groupsTable.grantReadData(assessmentsCrudFn);
    studentsTable.grantReadData(assessmentsCrudFn);

    // Course Sessions CRUD Lambda - class sections (morning/evening, session 1/2)
    const courseSessionsCrudFn = new lambda.Function(this, 'CourseSessionsCrudFn', {
      ...lambdaDefaults,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/course-sessions-crud'),
      description: 'CRUD operations for course sessions (class sections)',
      environment: {
        ...lambdaDefaults.environment,
        COURSE_SESSIONS_TABLE: courseSessionsTable.tableName,
      },
    } as lambda.FunctionProps);
    courseSessionsTable.grantReadWriteData(courseSessionsCrudFn);
    studentsTable.grantReadData(courseSessionsCrudFn);
    groupsTable.grantReadData(courseSessionsCrudFn);

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

    // /generate-ai-score - Generate AI scores for submissions
    const generateAiScoreResource = api.root.addResource('generate-ai-score');
    generateAiScoreResource.addMethod('GET', new apigateway.LambdaIntegration(generateAiScoreFn));
    generateAiScoreResource.addMethod('POST', new apigateway.LambdaIntegration(generateAiScoreFn));

    // /anam-session
    const anamSessionResource = api.root.addResource('anam-session');
    anamSessionResource.addMethod('GET', new apigateway.LambdaIntegration(anamSessionTokenFn));
    anamSessionResource.addMethod('POST', new apigateway.LambdaIntegration(anamSessionTokenFn));

    // TA Dashboard API Endpoints
    // /students
    const studentsResource = api.root.addResource('students');
    studentsResource.addMethod('GET', new apigateway.LambdaIntegration(studentsCrudFn));
    studentsResource.addMethod('POST', new apigateway.LambdaIntegration(studentsCrudFn));
    const studentById = studentsResource.addResource('{studentId}');
    studentById.addMethod('GET', new apigateway.LambdaIntegration(studentsCrudFn));
    studentById.addMethod('PUT', new apigateway.LambdaIntegration(studentsCrudFn));
    studentById.addMethod('DELETE', new apigateway.LambdaIntegration(studentsCrudFn));
    // Bulk operations
    const studentsBulk = studentsResource.addResource('bulk');
    studentsBulk.addMethod('POST', new apigateway.LambdaIntegration(studentsCrudFn)); // Bulk import

    // /groups
    const groupsResource = api.root.addResource('groups');
    groupsResource.addMethod('GET', new apigateway.LambdaIntegration(groupsCrudFn));
    groupsResource.addMethod('POST', new apigateway.LambdaIntegration(groupsCrudFn));
    const groupById = groupsResource.addResource('{groupId}');
    groupById.addMethod('GET', new apigateway.LambdaIntegration(groupsCrudFn));
    groupById.addMethod('PUT', new apigateway.LambdaIntegration(groupsCrudFn));
    groupById.addMethod('DELETE', new apigateway.LambdaIntegration(groupsCrudFn));
    // Group members management
    const groupMembers = groupById.addResource('members');
    groupMembers.addMethod('POST', new apigateway.LambdaIntegration(groupsCrudFn)); // Add members
    groupMembers.addMethod('DELETE', new apigateway.LambdaIntegration(groupsCrudFn)); // Remove members

    // /submissions
    const submissionsResource = api.root.addResource('submissions');
    submissionsResource.addMethod('GET', new apigateway.LambdaIntegration(submissionsCrudFn));
    submissionsResource.addMethod('POST', new apigateway.LambdaIntegration(submissionsCrudFn));
    const submissionById = submissionsResource.addResource('{submissionId}');
    submissionById.addMethod('GET', new apigateway.LambdaIntegration(submissionsCrudFn));
    submissionById.addMethod('PUT', new apigateway.LambdaIntegration(submissionsCrudFn));
    // Grading endpoint
    const submissionGrade = submissionById.addResource('grade');
    submissionGrade.addMethod('POST', new apigateway.LambdaIntegration(submissionsCrudFn));
    // Transcript endpoint
    const submissionTranscript = submissionById.addResource('transcript');
    submissionTranscript.addMethod('GET', new apigateway.LambdaIntegration(submissionsCrudFn));

    // /gradebook
    const gradebookResource = api.root.addResource('gradebook');
    gradebookResource.addMethod('GET', new apigateway.LambdaIntegration(gradebookFn)); // Get grades summary
    const gradebookExport = gradebookResource.addResource('export');
    gradebookExport.addMethod('POST', new apigateway.LambdaIntegration(gradebookFn)); // Export to CSV
    const gradebookStats = gradebookResource.addResource('stats');
    gradebookStats.addMethod('GET', new apigateway.LambdaIntegration(gradebookFn)); // Analytics/stats

    // /assessments (TA Dashboard)
    const assessmentsResource = api.root.addResource('assessments');
    assessmentsResource.addMethod('GET', new apigateway.LambdaIntegration(assessmentsCrudFn));
    assessmentsResource.addMethod('POST', new apigateway.LambdaIntegration(assessmentsCrudFn));
    const assessmentById = assessmentsResource.addResource('{assessmentId}');
    assessmentById.addMethod('GET', new apigateway.LambdaIntegration(assessmentsCrudFn));
    assessmentById.addMethod('PUT', new apigateway.LambdaIntegration(assessmentsCrudFn));
    assessmentById.addMethod('DELETE', new apigateway.LambdaIntegration(assessmentsCrudFn));
    // Assign assessment to groups
    const assessmentAssign = assessmentById.addResource('assign');
    assessmentAssign.addMethod('POST', new apigateway.LambdaIntegration(assessmentsCrudFn));
    // Get assessments for a student (student dashboard)
    const studentAssessments = assessmentsResource.addResource('student');
    studentAssessments.addMethod('GET', new apigateway.LambdaIntegration(assessmentsCrudFn));

    // /course-sessions (TA Dashboard - class sections)
    const courseSessionsResource = api.root.addResource('course-sessions');
    courseSessionsResource.addMethod('GET', new apigateway.LambdaIntegration(courseSessionsCrudFn));
    courseSessionsResource.addMethod('POST', new apigateway.LambdaIntegration(courseSessionsCrudFn));
    const courseSessionById = courseSessionsResource.addResource('{sessionId}');
    courseSessionById.addMethod('GET', new apigateway.LambdaIntegration(courseSessionsCrudFn));
    courseSessionById.addMethod('PUT', new apigateway.LambdaIntegration(courseSessionsCrudFn));
    courseSessionById.addMethod('DELETE', new apigateway.LambdaIntegration(courseSessionsCrudFn));
    // Archive a course session (soft delete)
    const courseSessionArchive = courseSessionById.addResource('archive');
    courseSessionArchive.addMethod('POST', new apigateway.LambdaIntegration(courseSessionsCrudFn));
    // Duplicate a course session
    const courseSessionDuplicate = courseSessionById.addResource('duplicate');
    courseSessionDuplicate.addMethod('POST', new apigateway.LambdaIntegration(courseSessionsCrudFn));

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
    new cdk.CfnOutput(this, 'StudentsTableName', { value: studentsTable.tableName });
    new cdk.CfnOutput(this, 'GroupsTableName', { value: groupsTable.tableName });
    new cdk.CfnOutput(this, 'SubmissionsTableName', { value: submissionsTable.tableName });
    new cdk.CfnOutput(this, 'CourseSessionsTableName', { value: courseSessionsTable.tableName });
  }
}
