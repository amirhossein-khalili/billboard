import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from 'com.chargoon.cloud.svc.common/dist/base-command-handler';
import { InjectRedis } from 'com.chargoon.cloud.svc.common';
import Redis from 'ioredis';
import { domainInfo } from '../../../domain/utils';
import { CreateBillboardCommand } from '../impl';

@CommandHandler(CreateBillboardCommand)
export class CreateBillboardHandler
  extends BaseCommandHandler
  implements ICommandHandler<CreateBillboardCommand>
{
  protected readonly logger = new Logger(CreateBillboardHandler.name);

  constructor(@InjectRedis() protected redis: Redis) {
    super(null);
  }

  async execute(command: CreateBillboardCommand) {
    this.logger.verbose(`${CreateBillboardHandler.name} executed.`);
    const { data, meta } = command;
    try {
      ////
    } catch (err) {
      await this.publishEvent<CreateBillboardDto>({
        event: {
          evt: 'events.administration.cache_reset_failed',
          data,
          meta,
        },
        messages: [
          {
            level: 'error',
            service: domainInfo().service,
            domain: domainInfo().domain,
            context: 'CreateBillboardCommand',
            exception: err.name,
            message: err.message,
          },
        ],
        exception: err,
      });
    }
  }
}
