import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAllBillboardsHandler } from './get-all-billboards.handler';
import { GetAllBillboards } from '../impl';
import { IBillboardsRepository } from '../../../domain/interfaces';
import { BillboardsEntity } from '../../../domain/models';

describe('GetAllBillboardsHandler', () => {
  let handler: GetAllBillboardsHandler;
  let billboardsRepository: jest.Mocked<IBillboardsRepository>;
  let loggerSpy: jest.SpyInstance;

  const mockMetadata = {
    version: 1,
    timestamp: Date.now(),
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    causationId: 'test-causation-id',
  };

  const createMockBillboard = (
    overrides: Partial<BillboardsEntity> = {},
  ): BillboardsEntity => ({
    _id: 'billboard-123',
    message: 'Test message',
    isWildcard: false,
    organizationIds: ['org-123'],
    createdBy: 'user-123',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  });

  beforeEach(async () => {
    const mockBillboardsRepository = {
      findAllForOrganization: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllBillboardsHandler,
        {
          provide: 'IBillboardsRepository',
          useValue: mockBillboardsRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAllBillboardsHandler>(GetAllBillboardsHandler);
    billboardsRepository = module.get('IBillboardsRepository');

    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should fetch billboards for a specific organization', async () => {
      // Arrange
      const queryData = {
        organizationId: 'org-123',
      };

      const query = new GetAllBillboards(queryData, mockMetadata);

      const mockBillboards: BillboardsEntity[] = [
        createMockBillboard({
          _id: 'billboard-1',
          message: 'First announcement',
          organizationIds: ['org-123'],
        }),
        createMockBillboard({
          _id: 'billboard-2',
          message: 'Second announcement',
          organizationIds: ['org-123', 'org-456'],
        }),
      ];

      billboardsRepository.findAllForOrganization.mockResolvedValue(
        mockBillboards,
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboards for organizationId=org-123',
      );

      expect(billboardsRepository.findAllForOrganization).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });

      expect(result).toEqual(mockBillboards);
      expect(result).toHaveLength(2);
    });

    it('should fetch all billboards when organizationId is not provided', async () => {
      // Arrange
      const queryData = {
        organizationId: null,
      };

      const query = new GetAllBillboards(queryData, mockMetadata);

      const mockBillboards: BillboardsEntity[] = [
        createMockBillboard({
          _id: 'billboard-1',
          message: 'Global announcement',
          isWildcard: true,
          organizationIds: [],
        }),
        createMockBillboard({
          _id: 'billboard-2',
          message: 'Another global announcement',
          isWildcard: true,
          organizationIds: [],
        }),
      ];

      billboardsRepository.findAllForOrganization.mockResolvedValue(
        mockBillboards,
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboards for organizationId=all',
      );

      expect(billboardsRepository.findAllForOrganization).toHaveBeenCalledWith({
        organizationId: null,
      });

      expect(result).toEqual(mockBillboards);
    });

    it('should handle undefined organizationId', async () => {
      // Arrange
      const queryData = {
        organizationId: undefined,
      };

      const query = new GetAllBillboards(queryData, mockMetadata);

      const mockBillboards: BillboardsEntity[] = [];

      billboardsRepository.findAllForOrganization.mockResolvedValue(
        mockBillboards,
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboards for organizationId=all',
      );

      expect(billboardsRepository.findAllForOrganization).toHaveBeenCalledWith({
        organizationId: undefined,
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when no billboards found', async () => {
      // Arrange
      const queryData = {
        organizationId: 'org-999',
      };

      const query = new GetAllBillboards(queryData, mockMetadata);

      billboardsRepository.findAllForOrganization.mockResolvedValue([]);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual([]);
      expect(billboardsRepository.findAllForOrganization).toHaveBeenCalledWith({
        organizationId: 'org-999',
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const queryData = {
        organizationId: 'org-123',
      };

      const query = new GetAllBillboards(queryData, mockMetadata);
      const error = new Error('Database connection error');

      billboardsRepository.findAllForOrganization.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection error',
      );

      expect(billboardsRepository.findAllForOrganization).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });
    });

    it('should pass additional query data to repository', async () => {
      // Arrange
      const queryData = {
        organizationId: 'org-123',
        isActive: true,
        limit: 10,
        offset: 0,
      };

      const query = new GetAllBillboards(queryData, mockMetadata);

      billboardsRepository.findAllForOrganization.mockResolvedValue([]);

      // Act
      await handler.execute(query);

      // Assert
      expect(billboardsRepository.findAllForOrganization).toHaveBeenCalledWith({
        organizationId: 'org-123',
        isActive: true,
        limit: 10,
        offset: 0,
      });
    });

    it('should return billboards with mixed organization assignments', async () => {
      // Arrange
      const queryData = {
        organizationId: 'org-123',
      };

      const query = new GetAllBillboards(queryData, mockMetadata);

      const mockBillboards: BillboardsEntity[] = [
        createMockBillboard({
          _id: 'billboard-1',
          message: 'Specific to org-123',
          organizationIds: ['org-123'],
        }),
        createMockBillboard({
          _id: 'billboard-2',
          message: 'Wildcard billboard',
          isWildcard: true,
          organizationIds: [],
        }),
        createMockBillboard({
          _id: 'billboard-3',
          message: 'Multiple orgs including org-123',
          organizationIds: ['org-123', 'org-456', 'org-789'],
        }),
      ];

      billboardsRepository.findAllForOrganization.mockResolvedValue(
        mockBillboards,
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].organizationIds).toContain('org-123');
      expect(result[1].isWildcard).toBe(true);
      expect(result[2].organizationIds).toContain('org-123');
    });
  });
});
