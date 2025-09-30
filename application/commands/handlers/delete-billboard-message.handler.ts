import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DeleteBillboardMessageResultDto } from 'src/billboards/domain/dtos/delete-billboard-message-result.dto';
import { IBillboardMessagesRepository } from '../../../domain/interfaces';
import { DeleteBillboardMessageCommand } from '../impls';

@CommandHandler(DeleteBillboardMessageCommand)
export class DeleteBillboardMessageHandler
  extends BaseCommandHandler
  implements ICommandHandler<DeleteBillboardMessageCommand> {
  protected readonly logger = new Logger(DeleteBillboardMessageHandler.name);

  constructor(
    @Inject('IBillboardMessagesRepository')
    private readonly billboardMessagesRepository: IBillboardMessagesRepository,
    protected readonly amqpConnection: AmqpConnection,
  ) {
    super(amqpConnection);
  }

  async execute(
    command: DeleteBillboardMessageCommand,
  ): Promise<DeleteBillboardMessageResultDto> {
    const { billboardMessageId, deletedBy, deletedAt } = command.data;

    this.logger.verbose(
      `Deleting billboard message: ${billboardMessageId} by ${deletedBy}`,
    );

    const outcome = await this.billboardMessagesRepository.deleteBillboardMessage(
      billboardMessageId,
      { deletedBy, deletedAt },
    );

    return {
      billboardMessage: {
        id: billboardMessageId,
        removed: outcome.removed,
        fullyDeleted: outcome.fullyDeleted,
      },
    };
  }
}
