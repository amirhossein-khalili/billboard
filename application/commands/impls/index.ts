/* eslint-disable max-classes-per-file */

import { CreateBillboardDto, DeleteOrganizationBillboardDto } from '../../../domain/dtos';
import { BaseCommand } from './base-command';

export class CreateBillboardCommand extends BaseCommand<CreateBillboardDto> {}

export type DeleteOrganizationBillboardCommandPayload =
  DeleteOrganizationBillboardDto & {
    deletedBy: string;
    deletedAt: Date;
  };

export class DeleteOrganizationBillboardCommand
  extends BaseCommand<DeleteOrganizationBillboardCommandPayload> {}
