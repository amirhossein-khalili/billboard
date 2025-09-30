import { IsDate, IsString } from 'class-validator';

export class DeleteBillboardMessageAuditDto {
  @IsString()
  deletedBy: string;

  @IsDate()
  deletedAt: Date;
}