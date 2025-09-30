import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteBillboardMessageOutcomeDto {
  @IsBoolean()
  removed: boolean;

  @IsBoolean()
  fullyDeleted: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}