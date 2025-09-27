import { Inject, Logger } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { BaseQueryHandler } from 'com.chargoon.cloud.svc.common';
import { GetAllBillboards } from '../impl';
import { IBillboardsRepository } from '../../../domain/interfaces';

@QueryHandler(GetAllBillboards)
export class GetAllBillboardsHandler extends BaseQueryHandler<GetAllBillboards> {
  private readonly logger = new Logger(GetAllBillboardsHandler.name);

  constructor(
    @Inject('IBillboardsRepository')
    protected readonly repository: IBillboardsRepository,
  ) {
    super();
  }

  async execute(query: GetAllBillboards) {
    const { organizationId } = query.data;

    this.logger.verbose(
      `Fetching billboards for organizationId=${organizationId ?? 'all'}`,
    );
    return this.repository.findAllForOrganization(query.data);
  }
}
