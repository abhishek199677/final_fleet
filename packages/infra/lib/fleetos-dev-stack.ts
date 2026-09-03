import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class FleetOSDevStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── VPC (public subnets only — no NAT to stay free) ───
    const vpc = new ec2.Vpc(this, 'FleetOS-VPC', {
      maxAzs: 2,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    // VPC Gateway Endpoint for S3 (free)
    vpc.addGatewayEndpoint('S3-Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // ─── RDS PostgreSQL 16 (db.t3.micro — free tier 750 hrs/month) ───
    const dbCredentials = rds.Credentials.fromGeneratedSecret('fleetos_admin');

    const database = new rds.DatabaseInstance(this, 'FleetOS-DB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      multiAz: false,
      allocatedStorage: 20,
      databaseName: 'fleetos',
      credentials: dbCredentials,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Store DB credentials in Secrets Manager
    const dbSecret = database.secret!;

    // ─── S3 Evidence Bucket (free tier: 5GB) ───
    const evidenceBucket = new s3.Bucket(this, 'FleetOS-Evidence', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ─── Cognito Pool A — Tenant Users (free tier: 50K MAUs) ───
    const tenantPool = new cognito.UserPool(this, 'FleetOS-TenantPool', {
      userPoolName: 'fleetos-tenants',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        tenant_id: new cognito.StringAttribute({ mutable: false }),
        role: new cognito.StringAttribute({ mutable: false }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const tenantPoolClient = tenantPool.addClient('WebClient', {
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });

    // ─── Cognito Pool B — Platform Admins (MFA required) ───
    const platformPool = new cognito.UserPool(this, 'FleetOS-PlatformPool', {
      userPoolName: 'fleetos-platform',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: { otp: true, sms: false },
      accountRecovery: cognito.AccountRecovery.NONE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const platformPoolClient = platformPool.addClient('AdminClient', {
      authFlows: {
        userSrp: true,
      },
    });

    // ─── SQS Queues (free tier: 1M requests) ───
    const queueNames = ['ocr', 'media', 'alerts', 'notify', 'billing', 'export', 'import', 'nightly', 'offboarding'];
    const queues: Record<string, sqs.Queue> = {};

    for (const name of queueNames) {
      queues[name] = new sqs.Queue(this, `FleetOS-${name}`, {
        queueName: `fleetos-${name}`,
        retentionPeriod: cdk.Duration.days(14),
        visibilityTimeout: cdk.Duration.seconds(30),
      });
    }

    // ─── Lambda — API Handler (free tier: 1M requests) ───
    const apiLambda = new lambda.Function(this, 'FleetOS-API', {
      functionName: 'fleetos-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DB_SECRET_ARN: dbSecret.secretArn,
        DB_HOST: database.instanceEndpoint.hostname,
        DB_PORT: database.instanceEndpoint.port.toString(),
        DB_NAME: 'fleetos',
        TENANT_POOL_ID: tenantPool.userPoolId,
        PLATFORM_POOL_ID: platformPool.userPoolId,
        EVIDENCE_BUCKET: evidenceBucket.bucketName,
        NODE_ENV: 'development',
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Grant Lambda access to resources
    evidenceBucket.grantReadWrite(apiLambda);
    dbSecret.grantRead(apiLambda);
    Object.values(queues).forEach((q) => q.grantSendMessages(apiLambda));

    // ─── EventBridge Rules ───
    // Alerts every 15 minutes
    new events.Rule(this, 'FleetOS-AlertsRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      targets: [new targets.LambdaFunction(apiLambda)],
    });

    // Nightly rollup at 01:00 UTC
    new events.Rule(this, 'FleetOS-NightlyRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '1' }),
      targets: [new targets.LambdaFunction(apiLambda)],
    });

    // ─── CloudWatch Alarms (free tier: 10) ───
    new cloudwatch.Alarm(this, 'FleetOS-DB-CPU', {
      metric: database.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 3,
    });

    new cloudwatch.Alarm(this, 'FleetOS-DB-Connections', {
      metric: database.metricDatabaseConnections(),
      threshold: 20,
      evaluationPeriods: 3,
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: database.instanceEndpoint.port.toString(),
    });

    new cdk.CfnOutput(this, 'EvidenceBucket', {
      value: evidenceBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'TenantPoolId', {
      value: tenantPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'TenantPoolClientId', {
      value: tenantPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'PlatformPoolId', {
      value: platformPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'PlatformPoolClientId', {
      value: platformPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'QueueUrls', {
      value: JSON.stringify(
        Object.fromEntries(Object.entries(queues).map(([k, q]) => [k, q.queueUrl])),
      ),
    });
  }
}
