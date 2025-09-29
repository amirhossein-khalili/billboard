/**
 * @class CreateBillboardMessageDto
 * @description Data transfer object for creating a billboard message.
 */
export class CreateBillboardMessageDto {
  /**
   * @property {string} message - The content of the billboard message.
   */
  message: string;

  /**
   * @property {string} organizationId - The ID of the organization
   * to which the billboard message belongs.
   * Use '*' for all organizations.
   */
  organizationId: string;

  /**
   * @property {Date} createdAt - The creation timestamp of the billboard message.
   */
  createdAt: Date;
}
