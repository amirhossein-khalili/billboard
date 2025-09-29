import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  IBillboardMessagesRepository,
  IUserBillboardMessagesStateRepository,
} from '../../../domain/interfaces';
import { DeleteBillboardMessageCommand } from '../impls';

export type DeleteBillboardMessageResult = {
  billboardMessage: {
    id: string;
    removed: boolean;
    fullyDeleted: boolean;
  };
  reason?: string;
};

@CommandHandler(DeleteBillboardMessageCommand)
export class DeleteBillboardMessageHandler
  extends BaseCommandHandler
  implements ICommandHandler<DeleteBillboardMessageCommand>
{
  protected readonly logger = new Logger(DeleteBillboardMessageHandler.name);

  constructor(
    @Inject('IBillboardMessagesRepository')
    private readonly billboardMessagesRepository: IBillboardMessagesRepository,
    @Inject('IUserBillboardMessagesStateRepository')
    private readonly userBillboardMessagesStateRepository: IUserBillboardMessagesStateRepository,
    protected readonly amqpConnection: AmqpConnection,
  ) {
    super(amqpConnection);
  }

  async execute(
    command: DeleteBillboardMessageCommand,
  ): Promise<DeleteBillboardMessageResult> {
    const { billboardMessageId, deletedBy, deletedAt } = command.data;

    this.logger.verbose(
      `Deleting billboard message: ${billboardMessageId} by ${deletedBy}`,
    );

    const outcome =
      await this.billboardMessagesRepository.deleteBillboardMessage(
        billboardMessageId,
        { deletedBy, deletedAt },
      );

    if (outcome.removed) {
      await this.userBillboardMessagesStateRepository.deleteByMessageId(
        billboardMessageId,
      );
    }

    return {
      billboardMessage: {
        id: billboardMessageId,
        removed: outcome.removed,
        fullyDeleted: outcome.fullyDeleted,
      },
      reason: outcome.reason,
    };
  }
}
