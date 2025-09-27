/* eslint-disable max-classes-per-file */

import { CreateBillboardDto, DeleteOrganizationBillboardDto } from '../../../domain/dtos';
import { BaseCommand } from './base-command';

/**
 * @class CreateBillboardCommand
 * @description Command to create a new billboard.
 */
export class CreateBillboardCommand extends BaseCommand<CreateBillboardDto> {}

/**
 * @type DeleteOrganizationBillboardCommandPayload
 * @description Payload for the command to delete a billboard from an organization.
 */
export type DeleteOrganizationBillboardCommandPayload =
  DeleteOrganizationBillboardDto & {
    deletedBy: string;
    deletedAt: Date;
  };

/**
 * @class DeleteOrganizationBillboardCommand
 * @description Command to delete a billboard from an organization.
 */
export class DeleteOrganizationBillboardCommand
  extends BaseCommand<DeleteOrganizationBillboardCommandPayload> {}
