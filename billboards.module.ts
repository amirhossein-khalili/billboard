import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BillboardController } from './interface/billboards.controller';
import { BillboardsService } from './application/billboards.service';
import {
  BillboardsRepository,
  UserBillboardsStateRepository,
} from './infrastructure';
import {
  BillboardsEntity,
  BillboardsSchema,
  UserBillboardStateEntity,
  UserBillboardStateSchema,
} from './domain/models';
import { BillboardsXlsxParser } from './application/utils';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

/**
 * @module BillboardsModule
 * @description This module encapsulates all the functionality related to billboards.
 * It imports necessary modules, registers controllers, and provides services,
 * repositories, and other components required for managing billboards.
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: BillboardsEntity.name, schema: BillboardsSchema },
      { name: UserBillboardStateEntity.name, schema: UserBillboardStateSchema },
    ]),
  ],
  controllers: [BillboardController],
  providers: [
    BillboardsService,
    BillboardController,
    BillboardsXlsxParser,
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: 'IBillboardsRepository',
      useClass: BillboardsRepository,
    },
    {
      provide: 'IUserBillboardsStateRepository',
      useClass: UserBillboardsStateRepository,
    },
  ],
})
export class BillboardsModule {}
