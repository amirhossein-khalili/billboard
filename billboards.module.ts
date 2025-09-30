import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { BillboardController } from './interface/billboards.controller';
import { BillboardsService } from './application/billboards.service';
import {
  BillboardMessagesRepository,
  UserBillboardMessageStateRepository,
} from './infrastructure';
import {
  BillboardMessagesEntity,
  BillboardMessagesSchema,
  UserBillboardMessagesStateEntity,
  UserBillboardMessagesStateSchema,
} from './domain/models';
import { BillboardMessagesXlsxParser } from './application/utils';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: BillboardMessagesEntity.name, schema: BillboardMessagesSchema },
      {
        name: UserBillboardMessagesStateEntity.name,
        schema: UserBillboardMessagesStateSchema,
      },
    ]),
  ],
  controllers: [BillboardController],
  providers: [
    BillboardsService,
    BillboardController,
    BillboardMessagesXlsxParser,
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: 'IBillboardMessagesRepository',
      useClass: BillboardMessagesRepository,
    },
    {
      provide: 'IUserBillboardMessagesStateRepository',
      useClass: UserBillboardMessageStateRepository,
    },
  ],
})
export class BillboardsModule {}