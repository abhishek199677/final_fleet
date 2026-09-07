import { Module } from '@nestjs/common';
import { NightlyWorker } from './nightly.worker';
import { OcrWorker } from './ocr.worker';
import { MediaWorker } from './media.worker';
import { BillingEngineModule } from '../modules/billing/billing-engine.module';
import { AlertsModule } from '../modules/alerts/alerts.module';

@Module({
  imports: [BillingEngineModule, AlertsModule],
  providers: [NightlyWorker, OcrWorker, MediaWorker],
  exports: [NightlyWorker, OcrWorker, MediaWorker],
})
export class WorkersModule {}
