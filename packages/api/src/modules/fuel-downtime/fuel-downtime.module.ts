import { Module } from '@nestjs/common';
import { FuelDowntimeController } from './fuel-downtime.controller';
import { FuelDowntimeService } from './fuel-downtime.service';

@Module({ controllers: [FuelDowntimeController], providers: [FuelDowntimeService], exports: [FuelDowntimeService] })
export class FuelDowntimeModule {}
