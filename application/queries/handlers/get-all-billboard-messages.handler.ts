import { Inject, Logger } from '@nestjs/common';
import { QueryHandler } from '@nestjs/cqrs';
import { BaseQueryHandler } from 'com.chargoon.cloud.svc.common';
import { GetAllBillboardMessages } from '../impl';
import { IBillboardMessagesRepository } from '../../../domain/interfaces';

/**
 * @class GetAllBillboardMessagesHandler
 * @description Query handler for retrieving all billboard messages for an organization.
 */
@QueryHandler(GetAllBillboardMessages)
export class GetAllBillboardMessagesHandler extends BaseQueryHandler<GetAllBillboardMessages> {
  private readonly logger = new Logger(GetAllBillboardMessagesHandler.name);

  constructor(
    @Inject('IBillboardMessagesRepository')
    protected readonly repository: IBillboardMessagesRepository,
  ) {
    super();
  }

  /**
   * @method execute
   * @description Executes the get all billboard messages query.
   * @param {GetAllBillboardMessages} query - The query to execute.
   * @returns {Promise<any>} A promise that resolves to the list of billboard messages.
   */
  async execute(query: GetAllBillboardMessages) {
    const { organizationId } = query.data;

    this.logger.verbose(
      `Fetching billboard messages for organizationId=${organizationId === '*' || organizationId === null || organizationId === undefined ? 'all' : organizationId}`,
    );
    return this.repository.findAllForOrganization(query.data);
  }
}
