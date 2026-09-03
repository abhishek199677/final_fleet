import { Module } from '@nestjs/common';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';
import { MachinesRepository } from './machines.repository';

@Module({
  controllers: [MachinesController],
  providers: [MachinesService, MachinesRepository],
  exports: [MachinesService],
})
export class MachinesModule {}
