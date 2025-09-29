import { CreateBillboardMessageHandler } from './create-billboard-message.handler';
import { DeleteBillboardMessageHandler } from './delete-billboard-message.handler';

export const CommandHandlers = [
  CreateBillboardMessageHandler,
  DeleteBillboardMessageHandler,
];
