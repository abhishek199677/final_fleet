import { Module } from '@nestjs/common';
import { WorkSessionsController } from './work-sessions.controller';
import { WorkSessionsService } from './work-sessions.service';
import { WorkSessionsRepository } from './work-sessions.repository';

@Module({
  controllers: [WorkSessionsController],
  providers: [WorkSessionsService, WorkSessionsRepository],
  exports: [WorkSessionsService],
})
export class WorkSessionsModule {}
