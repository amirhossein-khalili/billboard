import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CreateBillboardMessageHandler } from './create-billboard-message.handler';
import { CreateBillboardMessageCommand } from '../impls';
import { IBillboardMessagesRepository } from '../../../domain/interfaces';
import { BillboardMessagesEntity } from '../../../domain/models';

describe('CreateBillboardMessageHandler', () => {
  let handler: CreateBillboardMessageHandler;
  let billboardMessagesRepository: jest.Mocked<IBillboardMessagesRepository>;

  const mockMetadata = {
    version: 1,
    timestamp: Date.now(),
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    causationId: 'test-causation-id',
  };

  beforeEach(async () => {
    const mockBillboardMessagesRepository = {
      create: jest.fn(),
    };

    const mockAmqpConnection = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBillboardMessageHandler,
        {
          provide: 'IBillboardMessagesRepository',
          useValue: mockBillboardMessagesRepository,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    handler = module.get<CreateBillboardMessageHandler>(
      CreateBillboardMessageHandler,
    );
    billboardMessagesRepository = module.get('IBillboardMessagesRepository');

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully create a billboard message for specific organization', async () => {
      const commandData = {
        message: 'Test billboard message',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      const command = new CreateBillboardMessageCommand(
        commandData,
        mockMetadata,
      );

      const mockBillboardMessageEntity: BillboardMessagesEntity = {
        _id: 'billboard-message-123',
        message: 'Test billboard message',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };

      billboardMessagesRepository.create.mockResolvedValue(
        mockBillboardMessageEntity,
      );

      const result = await handler.execute(command);

      expect(Logger.prototype.verbose).toHaveBeenCalledWith(
        'CreateBillboardMessageHandler executed.',
      );

      expect(billboardMessagesRepository.create).toHaveBeenCalledWith({
        message: 'Test billboard message',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      });

      expect(result).toEqual(mockBillboardMessageEntity);
    });

    it('should create a billboard message for all organizations using asterisk', async () => {
      const commandData = {
        message: 'Global announcement',
        organizationId: '*',
        createdAt: new Date('2025-01-15T12:00:00Z'),
      };

      const command = new CreateBillboardMessageCommand(
        commandData,
        mockMetadata,
      );

      const mockBillboardMessageEntity: BillboardMessagesEntity = {
        _id: 'billboard-message-456',
        message: 'Global announcement',
        organizationId: '*',
        createdAt: new Date('2025-01-15T12:00:00Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };

      billboardMessagesRepository.create.mockResolvedValue(
        mockBillboardMessageEntity,
      );

      const result = await handler.execute(command);

      expect(billboardMessagesRepository.create).toHaveBeenCalledWith({
        message: 'Global announcement',
        organizationId: '*',
        createdAt: new Date('2025-01-15T12:00:00Z'),
      });

      expect(result).toEqual(mockBillboardMessageEntity);
    });

    it('should handle repository errors gracefully', async () => {
      const commandData = {
        message: 'Test billboard message',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      const command = new CreateBillboardMessageCommand(
        commandData,
        mockMetadata,
      );
      const error = new Error('Database connection error');

      billboardMessagesRepository.create.mockRejectedValue(error);

      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection error',
      );

      expect(billboardMessagesRepository.create).toHaveBeenCalledWith({
        message: 'Test billboard message',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      });
    });

    it('should handle empty message', async () => {
      const commandData = {
        message: '',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      const command = new CreateBillboardMessageCommand(
        commandData,
        mockMetadata,
      );

      const mockBillboardMessageEntity: BillboardMessagesEntity = {
        _id: 'billboard-message-789',
        message: '',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };

      billboardMessagesRepository.create.mockResolvedValue(
        mockBillboardMessageEntity,
      );

      const result = await handler.execute(command);

      expect(result.message).toBe('');
    });
  });
});
