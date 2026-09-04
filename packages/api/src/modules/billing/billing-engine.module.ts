import { Module } from '@nestjs/common';
import { BillingEngineController } from './billing-engine.controller';
import { BillingEngineService } from './billing-engine.service';
import { BillingEngine } from './billing-engine-logic';

@Module({
  controllers: [BillingEngineController],
  providers: [BillingEngineService, BillingEngine],
  exports: [BillingEngineService, BillingEngine],
})
export class BillingEngineModule {}
