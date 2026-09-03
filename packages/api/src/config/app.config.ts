export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'fleetos_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'test',
  },
  cognito: {
    tenantPoolId: process.env.TENANT_POOL_ID || '',
    platformPoolId: process.env.PLATFORM_POOL_ID || '',
    region: process.env.AWS_REGION || 'ap-south-1',
  },
  s3: {
    evidenceBucket: process.env.EVIDENCE_BUCKET || 'fleetos-evidence',
  },
});
