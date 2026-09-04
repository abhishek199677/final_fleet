import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { AdminSupportController } from './admin-support.controller';

@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
