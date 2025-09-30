import { ApiProperty } from '@nestjs/swagger';

/**
 * @class CreateBillboardMessagesDto
 * @description Data transfer object for uploading a file to create billboard messages.
 */
export class CreateBillboardMessagesDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The Excel file to import.',
  })
  file: any;
}
