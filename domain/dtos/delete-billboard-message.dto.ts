import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @class DeleteBillboardMessageDto
 * @description Data transfer object for deleting a billboard message.
 */
export class DeleteBillboardMessageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The unique identifier of the billboard message to delete',
    example: 'bb-123456',
  })
  billboardMessageId: string;
}
