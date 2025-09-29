import { Test } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IMetadata } from 'com.chargoon.cloud.svc.common';
import { DeleteBillboardMessageHandler } from './delete-billboard-message.handler';
import { DeleteBillboardMessageCommand } from '../impls';
import {
  IBillboardMessagesRepository,
  IUserBillboardMessagesStateRepository,
} from '../../../domain/interfaces';

describe('DeleteBillboardMessageHandler', () => {
  let handler: DeleteBillboardMessageHandler;

  const mockBillboardMessagesRepository:
  jest.Mocked<IBillboardMessagesRepository> = {
    deleteBillboardMessage: jest.fn(),
  } as any;

  const mockUserBillboardMessagesStateRepository:
  jest.Mocked<IUserBillboardMessagesStateRepository> = {
    deleteByMessageId: jest.fn(),
  } as any;

  const mockAmqpConnection: Partial<AmqpConnection> = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule(
      {
        providers: [
          DeleteBillboardMessageHandler,
          {
            provide:
              'IBillboardMessagesRepository',
            useValue:
              mockBillboardMessagesRepository,
          },
          {
            provide:
              'IUserBillboardMessagesStateRepository',
            useValue:
              mockUserBillboardMessagesStateRepository,
          },
          {
            provide: AmqpConnection,
            useValue: mockAmqpConnection,
          },
        ],
      },
    ).compile();

    handler = module.get(
      DeleteBillboardMessageHandler,
    );
  });

  it('should delete billboard message and remove user states when removed', async () => {
    const command = new DeleteBillboardMessageCommand(
      {
        billboardMessageId: 'bbm-123',
        deletedBy: 'user-456',
        deletedAt: new Date(
          '2024-01-01T00:00:00Z',
        ),
      },
      {} as IMetadata,
    );

    mockBillboardMessagesRepository.deleteBillboardMessage.mockResolvedValue(
      {
        removed: true,
        fullyDeleted: true,
        reason: undefined,
      },
    );

    const result = await handler.execute(command);

    expect(
      mockBillboardMessagesRepository.deleteBillboardMessage,
    ).toHaveBeenCalledWith('bbm-123', {
      deletedBy: 'user-456',
      deletedAt: new Date('2024-01-01T00:00:00Z'),
    });

    expect(
      mockUserBillboardMessagesStateRepository.deleteByMessageId,
    ).toHaveBeenCalledWith('bbm-123');

    expect(result).toEqual({
      billboardMessage: {
        id: 'bbm-123',
        removed: true,
        fullyDeleted: true,
      },
      reason: undefined,
    });
  });

  it('should skip user state cleanup when message not removed', async () => {
    const command = new DeleteBillboardMessageCommand(
      {
        billboardMessageId: 'bbm-789',
        deletedBy: 'user-999',
        deletedAt: new Date(
          '2024-02-02T12:34:56Z',
        ),
      },
      {} as IMetadata,
    );

    mockBillboardMessagesRepository.deleteBillboardMessage.mockResolvedValue(
      {
        removed: false,
        fullyDeleted: false,
        reason: 'Already deleted',
      },
    );

    const result = await handler.execute(command);

    expect(
      mockBillboardMessagesRepository.deleteBillboardMessage,
    ).toHaveBeenCalledWith('bbm-789', {
      deletedBy: 'user-999',
      deletedAt: new Date('2024-02-02T12:34:56Z'),
    });

    expect(
      mockUserBillboardMessagesStateRepository.deleteByMessageId,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      billboardMessage: {
        id: 'bbm-789',
        removed: false,
        fullyDeleted: false,
      },
      reason: 'Already deleted',
    });
  });
});
