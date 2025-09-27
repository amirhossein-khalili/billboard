import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CreateBillboardHandler } from './create-billboard.handler';
import { CreateBillboardCommand } from '../impls';
import { IBillboardsRepository } from '../../../domain/interfaces';
import { BillboardsEntity } from '../../../domain/models';

describe('CreateBillboardHandler', () => {
  let handler: CreateBillboardHandler;
  let billboardsRepository: jest.Mocked<IBillboardsRepository>;

  const mockMetadata = {
    version: 1,
    timestamp: Date.now(),
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    causationId: 'test-causation-id',
  };

  beforeEach(async () => {
    const mockBillboardsRepository = {
      create: jest.fn(),
    };

    const mockAmqpConnection = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBillboardHandler,
        {
          provide: 'IBillboardsRepository',
          useValue: mockBillboardsRepository,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    handler = module.get<CreateBillboardHandler>(CreateBillboardHandler);
    billboardsRepository = module.get('IBillboardsRepository');

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully create a billboard', async () => {
      // Arrange
      const commandData = {
        message: 'Test billboard message',
        isWildcard: false,
        organizationIds: ['org-123', 'org-456'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      const command = new CreateBillboardCommand(commandData, mockMetadata);

      const mockBillboardEntity: BillboardsEntity = {
        _id: 'billboard-123',
        message: 'Test billboard message',
        isWildcard: false,
        organizationIds: ['org-123', 'org-456'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };

      billboardsRepository.create.mockResolvedValue(mockBillboardEntity);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(Logger.prototype.verbose).toHaveBeenCalledWith(
        'CreateBillboardHandler executed.',
      );

      expect(billboardsRepository.create).toHaveBeenCalledWith({
        message: 'Test billboard message',
        isWildcard: false,
        organizationIds: ['org-123', 'org-456'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      });

      expect(result).toEqual(mockBillboardEntity);
    });

    it('should create a wildcard billboard', async () => {
      // Arrange
      const commandData = {
        message: 'Global announcement',
        isWildcard: true,
        organizationIds: [],
        createdBy: 'admin-user',
        createdAt: new Date('2025-01-15T12:00:00Z'),
      };

      const command = new CreateBillboardCommand(commandData, mockMetadata);

      const mockBillboardEntity: BillboardsEntity = {
        _id: 'billboard-456',
        message: 'Global announcement',
        isWildcard: true,
        organizationIds: [],
        createdBy: 'admin-user',
        createdAt: new Date('2025-01-15T12:00:00Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };

      billboardsRepository.create.mockResolvedValue(mockBillboardEntity);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(billboardsRepository.create).toHaveBeenCalledWith({
        message: 'Global announcement',
        isWildcard: true,
        organizationIds: [],
        createdBy: 'admin-user',
        createdAt: new Date('2025-01-15T12:00:00Z'),
      });

      expect(result).toEqual(mockBillboardEntity);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const commandData = {
        message: 'Test billboard message',
        isWildcard: false,
        organizationIds: ['org-123'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      const command = new CreateBillboardCommand(commandData, mockMetadata);
      const error = new Error('Database connection error');

      billboardsRepository.create.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection error',
      );

      expect(billboardsRepository.create).toHaveBeenCalledWith({
        message: 'Test billboard message',
        isWildcard: false,
        organizationIds: ['org-123'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      });
    });

    it('should handle empty message', async () => {
      // Arrange
      const commandData = {
        message: '',
        isWildcard: false,
        organizationIds: ['org-123'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      const command = new CreateBillboardCommand(commandData, mockMetadata);

      const mockBillboardEntity: BillboardsEntity = {
        _id: 'billboard-789',
        message: '',
        isWildcard: false,
        organizationIds: ['org-123'],
        createdBy: 'user-789',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };

      billboardsRepository.create.mockResolvedValue(mockBillboardEntity);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.message).toBe('');
    });
  });
});
