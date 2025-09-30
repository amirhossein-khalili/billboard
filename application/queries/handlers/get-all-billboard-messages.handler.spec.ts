import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAllBillboardMessagesHandler } from './get-all-billboard-messages.handler';
import { GetAllBillboardMessages } from '../impl';
import { IBillboardMessagesRepository } from '../../../domain/interfaces';
import { BillboardMessagesEntity } from '../../../domain/models';

describe('GetAllBillboardMessagesHandler', () => {
  let handler: GetAllBillboardMessagesHandler;
  let billboardMessagesRepository: jest.Mocked<IBillboardMessagesRepository>;
  let loggerSpy: jest.SpyInstance;

  const mockMetadata = {
    version: 1,
    timestamp: Date.now(),
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    causationId: 'test-causation-id',
  };

  const createMockBillboardMessage = (
    overrides: Partial<BillboardMessagesEntity> = {},
  ): BillboardMessagesEntity => ({
    _id: 'billboard-message-123',
    message: 'Test message',
    organizationId: 'org-123',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  });

  beforeEach(async () => {
    const mockBillboardMessagesRepository = {
      findAllForOrganization: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllBillboardMessagesHandler,
        {
          provide: 'IBillboardMessagesRepository',
          useValue: mockBillboardMessagesRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAllBillboardMessagesHandler>(
      GetAllBillboardMessagesHandler,
    );
    billboardMessagesRepository = module.get('IBillboardMessagesRepository');

    loggerSpy = jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should fetch billboard messages for a specific organization', async () => {
      const queryData = {
        organizationId: 'org-123',
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      const mockBillboardMessages: BillboardMessagesEntity[] = [
        createMockBillboardMessage({
          _id: 'billboard-message-1',
          message: 'First announcement',
          organizationId: 'org-123',
        }),
        createMockBillboardMessage({
          _id: 'billboard-message-2',
          message: 'Second announcement',
          organizationId: 'org-123',
        }),
      ];

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue(
        mockBillboardMessages,
      );

      const result = await handler.execute(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboard messages for organizationId=org-123',
      );

      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });

      expect(result).toEqual(mockBillboardMessages);
      expect(result).toHaveLength(2);
    });

    it('should fetch all billboard messages when organizationId is asterisk', async () => {
      const queryData = {
        organizationId: '*',
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      const mockBillboardMessages: BillboardMessagesEntity[] = [
        createMockBillboardMessage({
          _id: 'billboard-message-1',
          message: 'Global announcement',
          organizationId: '*',
        }),
        createMockBillboardMessage({
          _id: 'billboard-message-2',
          message: 'Another global announcement',
          organizationId: '*',
        }),
        createMockBillboardMessage({
          _id: 'billboard-message-3',
          message: 'Specific message',
          organizationId: 'org-456',
        }),
      ];

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue(
        mockBillboardMessages,
      );

      const result = await handler.execute(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboard messages for organizationId=all',
      );

      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: '*',
      });

      expect(result).toEqual(mockBillboardMessages);
      expect(result).toHaveLength(3);
    });

    it('should fetch all billboard messages when organizationId is null', async () => {
      const queryData = {
        organizationId: null,
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      const mockBillboardMessages: BillboardMessagesEntity[] = [
        createMockBillboardMessage({
          _id: 'billboard-message-1',
          message: 'Global announcement',
          organizationId: '*',
        }),
        createMockBillboardMessage({
          _id: 'billboard-message-2',
          message: 'Specific message',
          organizationId: 'org-456',
        }),
      ];

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue(
        mockBillboardMessages,
      );

      const result = await handler.execute(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboard messages for organizationId=all',
      );

      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: null,
      });

      expect(result).toEqual(mockBillboardMessages);
    });

    it('should handle undefined organizationId', async () => {
      const queryData = {
        organizationId: undefined,
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      const mockBillboardMessages: BillboardMessagesEntity[] = [];

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue(
        mockBillboardMessages,
      );

      const result = await handler.execute(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching billboard messages for organizationId=all',
      );

      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: undefined,
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when no billboard messages found', async () => {
      const queryData = {
        organizationId: 'org-999',
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue([]);

      const result = await handler.execute(query);

      expect(result).toEqual([]);
      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: 'org-999',
      });
    });

    it('should handle repository errors', async () => {
      const queryData = {
        organizationId: 'org-123',
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);
      const error = new Error('Database connection error');

      billboardMessagesRepository.findAllForOrganization.mockRejectedValue(
        error,
      );

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection error',
      );

      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });
    });

    it('should pass additional query data to repository', async () => {
      const queryData = {
        organizationId: 'org-123',
        isActive: true,
        limit: 10,
        offset: 0,
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue([]);

      await handler.execute(query);

      expect(
        billboardMessagesRepository.findAllForOrganization,
      ).toHaveBeenCalledWith({
        organizationId: 'org-123',
        isActive: true,
        limit: 10,
        offset: 0,
      });
    });

    it('should return billboard messages with mixed organization assignments', async () => {
      const queryData = {
        organizationId: 'org-123',
      };

      const query = new GetAllBillboardMessages(queryData, mockMetadata);

      const mockBillboardMessages: BillboardMessagesEntity[] = [
        createMockBillboardMessage({
          _id: 'billboard-message-1',
          message: 'Specific to org-123',
          organizationId: 'org-123',
        }),
        createMockBillboardMessage({
          _id: 'billboard-message-2',
          message: 'Wildcard billboard message',
          organizationId: '*',
        }),
      ];

      billboardMessagesRepository.findAllForOrganization.mockResolvedValue(
        mockBillboardMessages,
      );

      const result = await handler.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].organizationId).toBe('org-123');
      expect(result[1].organizationId).toBe('*');
    });
  });
});
