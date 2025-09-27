import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IBillboardsRepository } from '../../../domain/interfaces';
import { BillboardsEntity } from '../../../domain/models';
import { CreateBillboardCommand } from '../impls';

/**
 * @class CreateBillboardHandler
 * @description Command handler for creating a new billboard.
 */
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

  /**
   * @method execute
   * @description Executes the create billboard command.
   * @param {CreateBillboardCommand} command - The command to execute.
   * @returns {Promise<BillboardsEntity>} A promise that resolves to the created billboard entity.
   */
  async execute(command: CreateBillboardCommand): Promise<BillboardsEntity> {
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
