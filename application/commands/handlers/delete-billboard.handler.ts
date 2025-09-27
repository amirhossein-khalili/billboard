import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  IBillboardsRepository,
  IUserBillboardsStateRepository,
} from '../../../domain/interfaces';
import { DeleteOrganizationBillboardCommand } from '../impls';

export type DeleteOrganizationBillboardResult = {
  organizationId: string;
  billboardId: string;
  removed: boolean;
  fullyDeleted: boolean;
  reason?: string;
};

@CommandHandler(DeleteOrganizationBillboardCommand)
export class DeleteOrganizationBillboardHandler
  extends BaseCommandHandler
  implements ICommandHandler<DeleteOrganizationBillboardCommand> {
  protected readonly logger = new Logger(
    DeleteOrganizationBillboardHandler.name,
  );

  constructor(
    @Inject('IBillboardsRepository')
    private readonly billboardsRepository: IBillboardsRepository,
    @Inject('IUserBillboardsStateRepository')
    private readonly userBillboardsStateRepository: IUserBillboardsStateRepository,
    protected readonly amqpConnection: AmqpConnection,
  ) {
    super(amqpConnection);
  }

  async execute(
    command: DeleteOrganizationBillboardCommand,
  ): Promise<DeleteOrganizationBillboardResult> {
    const {
      billboardId, organizationId, deletedAt, deletedBy,
    } = command.data;

    const outcome = await this.billboardsRepository.deleteForOrganization(
      billboardId,
      organizationId,
      { deletedAt, deletedBy },
    );

    if (!outcome.removed) {
      this.logger.warn(
        `Billboard not removed: organizationId=${organizationId}, billboardId=${billboardId}`,
      );
      return {
        organizationId,
        billboardId,
        removed: false,
        fullyDeleted: false,
        reason: 'not_found_or_already_deleted',
      };
    }

    if (outcome.fullyDeleted) {
      await this.userBillboardsStateRepository.deleteByMessageId(billboardId);
    } else {
      await this.userBillboardsStateRepository.deleteByMessageIdAndOrg(
        billboardId,
        organizationId,
      );
    }

    return {
      organizationId,
      billboardId,
      removed: true,
      fullyDeleted: outcome.fullyDeleted,
    };
  }
}
