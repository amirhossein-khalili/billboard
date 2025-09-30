/* eslint-disable max-classes-per-file */
import { IsBoolean, IsString } from 'class-validator';

export class BillboardMessageResultDto {
  @IsString()
    id: string;

  @IsBoolean()
    removed: boolean;

  @IsBoolean()
    fullyDeleted: boolean;

  @IsString()
    reason?: string;
}

export class DeleteBillboardMessageResultDto {
  billboardMessage: BillboardMessageResultDto;
}
