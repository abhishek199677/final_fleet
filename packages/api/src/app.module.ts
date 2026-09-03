import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { HealthModule } from './modules/health/health.module';
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
import { DatabaseModule } from './common/database/database.module';
import { TenantJwtStrategy } from './common/strategies/tenant-jwt.strategy';
import { PlatformJwtStrategy } from './common/strategies/platform-jwt.strategy';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'tenant-jwt' }),
    HealthModule,
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
    DatabaseModule,
  ],
  providers: [TenantJwtStrategy, PlatformJwtStrategy],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
