import { ApiProperty } from '@nestjs/swagger';

/**
 * @class BillboardDto
 * @description Data transfer object for a billboard.
 */
export class BillboardDto {
  @ApiProperty({ example: 'msg-123' })
    id: string;

  @ApiProperty({ example: 'org-1' })
    organizationId: string;

  @ApiProperty({
    example:
      '🚨 System maintenance scheduled at *midnight*. Please save work. [Read more](https://status.example.com)',
  })
    message: string;

  @ApiProperty({ example: '2025-09-24T08:21:49.000Z' })
    createdAt: string;
}
