import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { MachinesModule } from './modules/machines/machines.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { SitesModule } from './modules/sites/sites.module';
import { WorkSessionsModule } from './modules/work-sessions/work-sessions.module';
import { FuelDowntimeModule } from './modules/fuel-downtime/fuel-downtime.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { CashModule } from './modules/cash/cash.module';
import { ClientMoneyModule } from './modules/client-money/client-money.module';
import { BillingEngineModule } from './modules/billing/billing-engine.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PhotosModule } from './modules/photos/photos.module';
import { ImportModule } from './modules/import/import.module';
import { ExportModule } from './modules/export/export.module';
import { NotifyModule } from './modules/notify/notify.module';
import { DatabaseModule } from './common/database/database.module';
import { TenantJwtStrategy } from './common/strategies/tenant-jwt.strategy';
import { PlatformJwtStrategy } from './common/strategies/platform-jwt.strategy';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'tenant-jwt' }),
    HealthModule,
    AuthModule,
    TenantsModule,
    MachinesModule,
    ClientsModule,
    DeploymentsModule,
    OperatorsModule,
    SitesModule,
    WorkSessionsModule,
    FuelDowntimeModule,
    MaintenanceModule,
    ExpensesModule,
    CashModule,
    ClientMoneyModule,
    BillingEngineModule,
    AlertsModule,
    PhotosModule,
    ImportModule,
    ExportModule,
    NotifyModule,
    DatabaseModule,
  ],
  providers: [TenantJwtStrategy, PlatformJwtStrategy],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware, RateLimitMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
