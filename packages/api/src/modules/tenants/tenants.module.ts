import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';

@Module({
  controllers: [TenantsController, TenantSettingsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
