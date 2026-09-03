import { Module } from '@nestjs/common';
import { ClientMoneyController } from './client-money.controller';
import { ClientMoneyService } from './client-money.service';

@Module({ controllers: [ClientMoneyController], providers: [ClientMoneyService], exports: [ClientMoneyService] })
export class ClientMoneyModule {}
