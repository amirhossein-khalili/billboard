import { Inject, Logger } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { BaseQueryHandler } from 'com.chargoon.cloud.svc.common';
import { GetAllBillboards } from '../impl';
import { IBillboardsRepository } from '../../../domain/interfaces';

/**
 * @class GetAllBillboardsHandler
 * @description Query handler for retrieving all billboards for an organization.
 */
@QueryHandler(GetAllBillboards)
export class GetAllBillboardsHandler extends BaseQueryHandler<GetAllBillboards> {
  private readonly logger = new Logger(GetAllBillboardsHandler.name);

  constructor(
    @Inject('IBillboardsRepository')
    protected readonly repository: IBillboardsRepository,
  ) {
    super();
  }

  /**
   * @method execute
   * @description Executes the get all billboards query.
   * @param {GetAllBillboards} query - The query to execute.
   * @returns {Promise<any>} A promise that resolves to the list of billboards.
   */
  async execute(query: GetAllBillboards) {
    const { organizationId } = query.data;

    this.logger.verbose(
      `Fetching billboards for organizationId=${organizationId ?? 'all'}`,
    );
    return this.repository.findAllForOrganization(query.data);
  }
}
