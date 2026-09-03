import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elasticloadbalancingv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class FleetOSDevStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'FleetOS-VPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

    // VPC Endpoints
    vpc.addGatewayEndpoint('S3-Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // RDS PostgreSQL 16
    const database = new rds.DatabaseInstance(this, 'FleetOS-DB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      databaseName: 'fleetos',
      credentials: rds.Credentials.fromGeneratedSecret('fleetos_admin'),
      backupRetention: cdk.Duration.days(7),
      multiAz: false,
    });

    // S3 Evidence Bucket
    const evidenceBucket = new s3.Bucket(this, 'FleetOS-Evidence', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    // Cognito Pool A — Tenant Users
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
    });

    // Cognito Pool B — Platform Admins
    const platformPool = new cognito.UserPool(this, 'FleetOS-PlatformPool', {
      userPoolName: 'fleetos-platform',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: { otp: true, sms: false },
    });

    // SQS Queues
    const queues = ['ocr', 'media', 'alerts', 'notify', 'billing', 'export', 'import', 'nightly', 'offboarding'].map(
      (name) =>
        new sqs.Queue(this, `FleetOS-${name}`, {
          queueName: `fleetos-${name}`,
          retentionPeriod: cdk.Duration.days(14),
        }),
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'FleetOS-Cluster', {
      vpc,
      clusterName: 'fleetos',
    });

    // ALB
    const alb = new elasticloadbalancingv2.ApplicationLoadBalancer(this, 'FleetOS-ALB', {
      vpc,
      internetFacing: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', { value: database.instanceEndpoint.hostname });
    new cdk.CfnOutput(this, 'EvidenceBucket', { value: evidenceBucket.bucketName });
    new cdk.CfnOutput(this, 'TenantPoolId', { value: tenantPool.userPoolId });
    new cdk.CfnOutput(this, 'PlatformPoolId', { value: platformPool.userPoolId });
    new cdk.CfnOutput(this, 'ALB-DNS', { value: alb.loadBalancerDnsName });
  }
}
