// billboards.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BillboardController } from './interface/billboards.controller';
import { BillboardsService } from './application/billboards.service';
import {
  BillboardsEntity,
  BillboardsSchema,
} from './domain/models/billboards.entity';
import { BillboardRepository } from './infrastructure';
import {
  UserBillboardStateEntity,
  UserBillboardStateSchema,
} from './domain/models/user-billboard-state.entity';
import { UserBillboardStateRepository } from './infrastructure';

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
    {
      provide: 'IBillboardRepository',
      useClass: BillboardRepository,
    },
    {
      provide: 'IUserBillboardStateRepository',
      useClass: UserBillboardStateRepository,
    },
    BillboardController,
  ],
  exports: ['IBillboardRepository', 'IUserBillboardStateRepository'],
})
export class BillboardsModule {}
