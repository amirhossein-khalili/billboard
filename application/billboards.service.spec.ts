import { Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IMetadata } from 'com.chargoon.cloud.svc.common';
import { BillboardsService } from './billboards.service';
import { BillboardMessagesXlsxParser } from './utils';
import {
  CreateBillboardMessageCommand,
  DeleteBillboardMessageCommand,
} from './commands/impls';
import { GetAllBillboardMessages } from './queries/impl';

jest.mock('com.chargoon.cloud.svc.common', () => {
  const actual = jest.requireActual('com.chargoon.cloud.svc.common');
  return {
    ...actual,
    BaseService: class {
      constructor(protected readonly amqpConnection: any) {}
    },
  };
});

describe('BillboardsService', () => {
  let service: BillboardsService;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;
  let amqpConnection: jest.Mocked<AmqpConnection>;
  let parser: jest.Mocked<BillboardMessagesXlsxParser>;

  const meta: IMetadata = {
    user: { id: 'user-123' },
    requester: {
      position: { id: 'position-123' },
    },
  } as unknown as IMetadata;

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    queryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>;
    amqpConnection = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<AmqpConnection>;
    parser = {
      parse: jest.fn(),
    } as unknown as jest.Mocked<BillboardMessagesXlsxParser>;

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    service = new BillboardsService(
      commandBus,
      queryBus,
      amqpConnection,
      parser,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillboardMessages', () => {
    it('should forward the DTO to the query bus and return its result', async () => {
      const dto = { organizationId: 'org-123', filter: 'active-only' };
      const queryResult = [{ _id: 'msg-1' }];
      (queryBus.execute as jest.Mock).mockResolvedValue(queryResult);

      const result = await service.getBillboardMessages(dto, meta);

      expect(queryBus.execute).toHaveBeenCalledTimes(1);

      const executedQuery = (queryBus.execute as jest.Mock).mock.calls[0][0];
      expect(executedQuery).toBeInstanceOf(GetAllBillboardMessages);
      expect(executedQuery.data).toEqual(dto);
      expect(executedQuery.meta).toBe(meta);

      expect(result).toEqual({
        status: true,
        data: queryResult,
        meta,
      });
    });

    it('should still execute the query when organizationId is supplied directly', async () => {
      const dto = { organizationId: 'supplied-org' };
      (queryBus.execute as jest.Mock).mockResolvedValue([]);

      await service.getBillboardMessages(dto, meta);

      const executedQuery = (queryBus.execute as jest.Mock).mock.calls[0][0];
      expect(executedQuery.data.organizationId).toBe('supplied-org');
    });
  });

  describe('importMessagesFromExcel', () => {
    const buffer = Buffer.from('test');
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    it('should return failure when parser yields no rows and only errors', async () => {
      parser.parse.mockReturnValue({
        rows: [],
        errors: ['Header missing'],
      });

      const result = await service.importMessagesFromExcel(buffer, meta);

      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        data: {
          createdCount: 0,
          createdIds: [],
          errors: ['Header missing'],
        },
        meta: {} as IMetadata,
      });
    });

    it('should create billboard messages for each parsed row', async () => {
      parser.parse.mockReturnValue({
        rows: [
          { rowNumber: 2, organizationId: validUUID, message: 'Hello' },
          { rowNumber: 3, organizationId: '*', message: 'Global' },
        ],
        errors: [],
      });

      (commandBus.execute as jest.Mock)
        .mockResolvedValueOnce({ _id: 'id-1' })
        .mockResolvedValueOnce({ _id: 'id-2' });

      const result = await service.importMessagesFromExcel(buffer, meta);

      expect(commandBus.execute).toHaveBeenCalledTimes(2);

      const firstCommand = (commandBus.execute as jest.Mock).mock.calls[0][0];
      expect(firstCommand).toBeInstanceOf(CreateBillboardMessageCommand);
      expect(firstCommand.data).toMatchObject({
        message: 'Hello',
        organizationId: validUUID,
      });

      const secondCommand = (commandBus.execute as jest.Mock).mock.calls[1][0];
      expect(secondCommand.data.organizationId).toBe('*');

      expect(result).toEqual({
        success: true,
        data: {
          createdCount: 2,
          createdIds: ['id-1', 'id-2'],
          errors: [],
        },
        meta: {} as IMetadata,
      });
    });

    it('should capture errors from failed command executions', async () => {
      parser.parse.mockReturnValue({
        rows: [
          { rowNumber: 2, organizationId: validUUID, message: 'Hello' },
          { rowNumber: 3, organizationId: validUUID, message: 'World' },
        ],
        errors: [],
      });

      (commandBus.execute as jest.Mock)
        .mockResolvedValueOnce({ _id: 'created-1' })
        .mockRejectedValueOnce(new Error('DB failure'));

      const result = await service.importMessagesFromExcel(buffer, meta);

      expect(result).toEqual({
        success: true,
        data: {
          createdCount: 1,
          createdIds: ['created-1'],
          errors: ['Row 3: Failed to create message (DB failure)'],
        },
        meta: {} as IMetadata,
      });
    });

    it('should handle parser errors and command errors together', async () => {
      parser.parse.mockReturnValue({
        rows: [
          { rowNumber: 2, organizationId: validUUID, message: 'Hello' },
          { rowNumber: 3, organizationId: validUUID, message: 'World' },
        ],
        errors: ['Header warning'],
      });

      (commandBus.execute as jest.Mock)
        .mockResolvedValueOnce({ _id: 'created-1' })
        .mockRejectedValueOnce(new Error('DB failure'));

      const result = await service.importMessagesFromExcel(buffer, meta);

      expect(result).toEqual({
        success: true,
        data: {
          createdCount: 1,
          createdIds: ['created-1'],
          errors: [
            'Header warning',
            'Row 3: Failed to create message (DB failure)',
          ],
        },
        meta: {} as IMetadata,
      });
    });
  });

  describe('deleteBillboardMessage', () => {
    const dto = {
      billboardMessageId: 'msg-001',
      organizationId: 'org-001',
    };

    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-30T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should dispatch DeleteBillboardMessageCommand with audit data', async () => {
      (commandBus.execute as jest.Mock).mockResolvedValue({});

      const result = await service.deleteBillboardMessage(dto, meta);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];

      expect(executedCommand).toBeInstanceOf(DeleteBillboardMessageCommand);
      expect(executedCommand.data).toEqual({
        billboardMessageId: 'msg-001',
        organizationId: 'org-001',
        deletedBy: 'user-123',
        deletedAt: new Date('2025-01-30T12:00:00.000Z'),
      });

      expect(result).toEqual({
        success: true,
        data: dto,
        meta,
      });
    });
  });
});
