import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IBillboardsRepository } from '../../../domain/interfaces';
import { BillboardsEntity } from '../../../domain/models';
import { CreateBillboardCommand } from '../impls';

@CommandHandler(CreateBillboardCommand)
export class CreateBillboardHandler
  extends BaseCommandHandler
  implements ICommandHandler<CreateBillboardCommand, BillboardsEntity> {
  protected readonly logger = new Logger(CreateBillboardHandler.name);

  constructor(
    @Inject('IBillboardsRepository')
    private readonly billboardsRepository: IBillboardsRepository,
    protected readonly amqpConnection: AmqpConnection,
  ) {
    super(amqpConnection);
  }

  async execute(command: CreateBillboardCommand): Promise<BillboardsEntity> {
    this.logger.verbose(`${CreateBillboardHandler.name} executed.`);

    const {
      message, isWildcard, organizationIds, createdBy, createdAt,
    } = command.data;

    return this.billboardsRepository.create({
      message,
      isWildcard,
      organizationIds,
      createdBy,
      createdAt,
    });
  }
}
