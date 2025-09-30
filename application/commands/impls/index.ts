import { DeleteBillboardMessagePayloadDto } from '../../../domain/dtos/delete-billboard-message-Payload.dto';
import { CreateBillboardMessageDto } from '../../../domain/dtos';
import { BaseCommand } from './base-command';

export class CreateBillboardMessageCommand extends BaseCommand<CreateBillboardMessageDto> {}
export class DeleteBillboardMessageCommand extends BaseCommand<DeleteBillboardMessagePayloadDto> {}