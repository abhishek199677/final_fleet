import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertEngineService } from './alert-engine.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertEngineService],
  exports: [AlertsService, AlertEngineService]
})
export class AlertsModule {}
