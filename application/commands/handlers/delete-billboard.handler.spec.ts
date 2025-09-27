import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  DeleteOrganizationBillboardHandler,
  DeleteOrganizationBillboardResult,
} from './delete-billboard.handler';
import { DeleteOrganizationBillboardCommand } from '../impls';
import {
  IBillboardsRepository,
  IUserBillboardsStateRepository,
} from '../../../domain/interfaces';

describe('DeleteOrganizationBillboardHandler', () => {
  let handler: DeleteOrganizationBillboardHandler;
  let billboardsRepository: jest.Mocked<IBillboardsRepository>;
  let userBillboardsStateRepository: jest.Mocked<IUserBillboardsStateRepository>;

  const mockMetadata = {
    version: 1,
    timestamp: Date.now(),
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    causationId: 'test-causation-id',
  };

  beforeEach(async () => {
    const mockBillboardsRepository = {
      deleteForOrganization: jest.fn(),
    };

    const mockUserBillboardsStateRepository = {
      deleteByMessageId: jest.fn(),
      deleteByMessageIdAndOrg: jest.fn(),
    };

    const mockAmqpConnection = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOrganizationBillboardHandler,
        {
          provide: 'IBillboardsRepository',
          useValue: mockBillboardsRepository,
        },
        {
          provide: 'IUserBillboardsStateRepository',
          useValue: mockUserBillboardsStateRepository,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    handler = module.get<DeleteOrganizationBillboardHandler>(
      DeleteOrganizationBillboardHandler,
    );
    billboardsRepository = module.get('IBillboardsRepository');
    userBillboardsStateRepository = module.get(
      'IUserBillboardsStateRepository',
    );

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully delete billboard for organization (partial deletion)', async () => {
      // Arrange
      const command = new DeleteOrganizationBillboardCommand(
        {
          billboardId: 'billboard-123',
          organizationId: 'org-456',
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
        mockMetadata,
      );

      billboardsRepository.deleteForOrganization.mockResolvedValue({
        removed: true,
        fullyDeleted: false,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(billboardsRepository.deleteForOrganization).toHaveBeenCalledWith(
        'billboard-123',
        'org-456',
        {
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
      );

      expect(
        userBillboardsStateRepository.deleteByMessageIdAndOrg,
      ).toHaveBeenCalledWith('billboard-123', 'org-456');

      expect(
        userBillboardsStateRepository.deleteByMessageId,
      ).not.toHaveBeenCalled();

      expect(result).toEqual<DeleteOrganizationBillboardResult>({
        organizationId: 'org-456',
        billboardId: 'billboard-123',
        removed: true,
        fullyDeleted: false,
      });
    });

    it('should successfully delete billboard completely (full deletion)', async () => {
      // Arrange
      const command = new DeleteOrganizationBillboardCommand(
        {
          billboardId: 'billboard-123',
          organizationId: 'org-456',
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
        mockMetadata,
      );

      billboardsRepository.deleteForOrganization.mockResolvedValue({
        removed: true,
        fullyDeleted: true,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(billboardsRepository.deleteForOrganization).toHaveBeenCalledWith(
        'billboard-123',
        'org-456',
        {
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
      );

      expect(
        userBillboardsStateRepository.deleteByMessageId,
      ).toHaveBeenCalledWith('billboard-123');

      expect(
        userBillboardsStateRepository.deleteByMessageIdAndOrg,
      ).not.toHaveBeenCalled();

      expect(result).toEqual<DeleteOrganizationBillboardResult>({
        organizationId: 'org-456',
        billboardId: 'billboard-123',
        removed: true,
        fullyDeleted: true,
      });
    });

    it('should handle billboard not found or already deleted', async () => {
      // Arrange
      const command = new DeleteOrganizationBillboardCommand(
        {
          billboardId: 'billboard-123',
          organizationId: 'org-456',
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
        mockMetadata,
      );

      billboardsRepository.deleteForOrganization.mockResolvedValue({
        removed: false,
        fullyDeleted: false,
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(billboardsRepository.deleteForOrganization).toHaveBeenCalledWith(
        'billboard-123',
        'org-456',
        {
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
      );

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Billboard not removed: organizationId=org-456, billboardId=billboard-123',
      );

      expect(
        userBillboardsStateRepository.deleteByMessageId,
      ).not.toHaveBeenCalled();
      expect(
        userBillboardsStateRepository.deleteByMessageIdAndOrg,
      ).not.toHaveBeenCalled();

      expect(result).toEqual<DeleteOrganizationBillboardResult>({
        organizationId: 'org-456',
        billboardId: 'billboard-123',
        removed: false,
        fullyDeleted: false,
        reason: 'not_found_or_already_deleted',
      });
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const command = new DeleteOrganizationBillboardCommand(
        {
          billboardId: 'billboard-123',
          organizationId: 'org-456',
          deletedAt: new Date('2025-01-15T10:00:00Z'),
          deletedBy: 'user-789',
        },
        mockMetadata,
      );

      const error = new Error('Database connection error');
      billboardsRepository.deleteForOrganization.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection error',
      );

      expect(
        userBillboardsStateRepository.deleteByMessageId,
      ).not.toHaveBeenCalled();
      expect(
        userBillboardsStateRepository.deleteByMessageIdAndOrg,
      ).not.toHaveBeenCalled();
    });
  });
});
