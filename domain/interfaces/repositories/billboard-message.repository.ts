import {
  CreateBillboardMessageDto,
  DeleteBillboardMessageAuditDto,
  DeleteBillboardMessageOutcomeDto,
  GetAllBillboardMessagesDto,
} from '../../dtos';
import { BillboardMessagesEntity } from '../../models';

export interface IBillboardMessagesRepository {
  create(
    data: Partial<CreateBillboardMessageDto>,
  ): Promise<BillboardMessagesEntity>;

  findAllForOrganization(
    data: GetAllBillboardMessagesDto,
  ): Promise<BillboardMessagesEntity[]>;

  deleteBillboardMessage(
    billboardMessageId: string,
    audit: DeleteBillboardMessageAuditDto,
  ): Promise<DeleteBillboardMessageOutcomeDto>;
}
