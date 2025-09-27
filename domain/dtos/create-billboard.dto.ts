/**
 * @class CreateBillboardDto
 * @description Data transfer object for creating a billboard.
 */
export class CreateBillboardDto {
  /**
   * @property {string} message - The content of the billboard message.
   */
  message: string;

  /**
   * @property {boolean} isWildcard - Whether the billboard is for all organizations.
   */
  isWildcard: boolean;

  /**
   * @property {string[]} organizationIds - The IDs of the organizations to which the billboard belongs.
   */
  organizationIds: string[];

  /**
   * @property {string} createdBy - The ID of the user who created the billboard.
   */
  createdBy: string;

  /**
   * @property {Date} createdAt - The creation timestamp of the billboard.
   */
  createdAt: Date;
}
