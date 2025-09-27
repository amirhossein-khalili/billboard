/* eslint-disable max-classes-per-file */
import { GetAllBillboardsDto } from '../../../domain/dtos';
import { BaseQuery } from './base-query.query';

/**
 * @class GetAllBillboards
 * @description Query to get all billboards for an organization.
 */
export class GetAllBillboards extends BaseQuery<GetAllBillboardsDto> {}
