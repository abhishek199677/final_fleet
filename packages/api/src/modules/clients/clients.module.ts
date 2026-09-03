import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './clients.service';

@Module({ controllers: [ClientsController], providers: [ClientsService, ClientsRepository], exports: [ClientsService] })
export class ClientsModule {}
