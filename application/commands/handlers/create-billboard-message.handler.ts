import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IBillboardMessagesRepository } from '../../../domain/interfaces';
import { BillboardMessagesEntity } from '../../../domain/models';
import { CreateBillboardMessageCommand } from '../impls';

/**
 * @class CreateBillboardMessageHandler
 * @description Command handler for creating a new billboard message.
 */
@CommandHandler(CreateBillboardMessageCommand)
export class CreateBillboardMessageHandler
  extends BaseCommandHandler
  implements
    ICommandHandler<CreateBillboardMessageCommand, BillboardMessagesEntity> {
  protected readonly logger = new Logger(CreateBillboardMessageHandler.name);

  constructor(
    @Inject('IBillboardMessagesRepository')
    private readonly billboardMessagesRepository: IBillboardMessagesRepository,
    protected readonly amqpConnection: AmqpConnection,
  ) {
    super(amqpConnection);
  }

  /**
   * @method execute
   * @description Executes the create billboard message command.
   * @param {CreateBillboardMessageCommand} command - The command to execute.
   * @returns {Promise<BillboardMessagesEntity>} A promise that resolves
   * to the created billboard message entity.
   */
  async execute(
    command: CreateBillboardMessageCommand,
  ): Promise<BillboardMessagesEntity> {
    this.logger.verbose(`${CreateBillboardMessageHandler.name} executed.`);

    const { message, organizationId, createdAt } = command.data;

    return this.billboardMessagesRepository.create({
      message,
      organizationId,
      createdAt,
    });
  }
}
