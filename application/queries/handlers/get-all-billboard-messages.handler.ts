import { Inject, Logger } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { BaseQueryHandler } from 'com.chargoon.cloud.svc.common';
import { GetAllBillboardMessages } from '../impl';
import { IBillboardMessagesRepository } from '../../../domain/interfaces';

@QueryHandler(GetAllBillboardMessages)
export class GetAllBillboardMessagesHandler extends BaseQueryHandler<GetAllBillboardMessages> {
  private readonly logger = new Logger(GetAllBillboardMessagesHandler.name);

  constructor(
    @Inject('IBillboardMessagesRepository')
    protected readonly repository: IBillboardMessagesRepository,
  ) {
    super();
  }

  async execute(query: GetAllBillboardMessages) {
    const { organizationId } = query.data;

    this.logger.verbose(
      `Fetching billboard messages for organizationId=${organizationId === '*' || organizationId === null || organizationId === undefined ? 'all' : organizationId}`,
    );
    return this.repository.findAllForOrganization(query.data);
  }
}