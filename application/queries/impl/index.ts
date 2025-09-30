/* eslint-disable max-classes-per-file */
import { GetAllBillboardMessagesDto } from '../../../domain/dtos';
import { BaseQuery } from './base-query.query';

/**
 * @class GetAllBillboardMessages
 * @description Query to get all billboard messages for an organization.
 */
export class GetAllBillboardMessages extends BaseQuery<GetAllBillboardMessagesDto> {}