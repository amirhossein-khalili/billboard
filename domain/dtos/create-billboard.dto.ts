export class CreateBillboardDto {
  message: string;

  isWildcard: boolean;

  organizationIds: string[];

  createdBy: string;

  createdAt: Date;
}
