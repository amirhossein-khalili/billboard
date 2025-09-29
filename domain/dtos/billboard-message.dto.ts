import { ApiProperty } from '@nestjs/swagger';

/**
 * @class BillboardMessageDto
 * @description Data transfer object for a billboard message.
 */
export class BillboardMessageDto {
  @ApiProperty({ example: 'msg-123' })
    id: string;

  @ApiProperty({
    example:
      '🚨 System maintenance scheduled at *midnight*. Please save work. [Read more](https://status.example.com)',
  })
    message: string;
}
