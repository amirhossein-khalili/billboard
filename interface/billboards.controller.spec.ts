import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';
import { BillboardController } from './billboards.controller';
import { BillboardsService } from '../application/billboards.service';
import {
  GetBillboardMessagesResponseDto,
  DeleteBillboardMessageDto,
} from '../domain/dtos';

describe('BillboardController', () => {
  let controller: BillboardController;
  let billboardsService: jest.Mocked<BillboardsService>;
  let getMetadataSpy: jest.SpyInstance;

  const mockMetadata = { tenantId: 'tenant-123' };

  beforeEach(() => {
    billboardsService = {
      getBillboardMessages: jest.fn(),
      importMessagesFromExcel: jest.fn(),
      deleteBillboardMessage: jest.fn(),
    } as unknown as jest.Mocked<BillboardsService>;

    controller = new BillboardController(billboardsService);

    getMetadataSpy = jest
      .spyOn(controller as any, 'getMetadata')
      .mockResolvedValue(mockMetadata as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillboardMessages', () => {
    it('should strip __meta, fetch metadata, and call service', async () => {
      const dto = {
        organizationId: 'org-42',
        __meta: { ignore: 'me' },
      } as any;

      const headers = { authorization: 'Bearer token' };
      const serviceResult = {
        messages: [],
      } as unknown as GetBillboardMessagesResponseDto;

      billboardsService.getBillboardMessages.mockResolvedValue(serviceResult);

      const result = await controller.getBillboardMessages(dto, headers);

      expect(getMetadataSpy).toHaveBeenCalled();
      const [metaDto, metaHeaders, metaReqOrOptions, maybeOptions] = getMetadataSpy.mock.calls[0];

      expect(metaDto).toMatchObject({ organizationId: 'org-42' });
      expect(metaHeaders).toBe(headers);

      const options = maybeOptions ?? metaReqOrOptions;
      expect(options).toMatchObject({ pagination: false });

      expect(billboardsService.getBillboardMessages).toHaveBeenCalledWith(
        { organizationId: 'org-42' },
        mockMetadata,
      );
      expect(result).toBe(serviceResult);
    });
  });

  describe('importBillboardMessages', () => {
    it('should throw BadRequestException when file missing', async () => {
      await expect(
        controller.importBillboardMessages(undefined as any, {}, {} as any),
      ).rejects.toThrow(BadRequestException);

      expect(getMetadataSpy).not.toHaveBeenCalled();
      expect(billboardsService.importMessagesFromExcel).not.toHaveBeenCalled();
    });

    it('should call service when file buffer provided', async () => {
      const file = {
        buffer: Buffer.from('fake-xlsx'),
      } as Express.Multer.File;

      const headers = { 'x-request-id': '123' };
      const req = { user: { id: 'user-1' } } as any;
      const serviceResult = { data: [], meta: {} } as any;

      billboardsService.importMessagesFromExcel.mockResolvedValue(
        serviceResult,
      );

      const result = await controller.importBillboardMessages(
        file,
        headers,
        req,
      );

      expect(getMetadataSpy).toHaveBeenCalled();
      const [, metaHeaders, metaReq, options] = getMetadataSpy.mock.calls[0];

      expect(metaHeaders).toBe(headers);
      expect(metaReq).toBe(req);
      expect(options).toMatchObject({ pagination: false });

      expect(billboardsService.importMessagesFromExcel).toHaveBeenCalledWith(
        file.buffer,
        mockMetadata,
      );
      expect(result).toBe(serviceResult);
    });
  });

  describe('deleteBillboardMessage', () => {
    it('should fetch metadata and call service with param and meta', async () => {
      const param = {
        billboardMessageId: 'msg-7',
      } as DeleteBillboardMessageDto;
      const headers = { authorization: 'Bearer hello' };
      const req = { ip: '127.0.0.1' } as any;
      const serviceResult = {
        data: { billboardMessageId: 'msg-7' },
        meta: {},
      } as any;

      billboardsService.deleteBillboardMessage.mockResolvedValue(serviceResult);

      const result = await controller.deleteBillboardMessage(
        param,
        headers,
        req,
      );

      expect(getMetadataSpy).toHaveBeenCalled();
      const [, metaHeaders, metaReq, options] = getMetadataSpy.mock.calls[0];

      expect(metaHeaders).toBe(headers);
      expect(metaReq).toBe(req);
      expect(options).toMatchObject({ pagination: false });

      expect(billboardsService.deleteBillboardMessage).toHaveBeenCalledWith(
        param,
        mockMetadata,
      );
      expect(result).toBe(serviceResult);
    });
  });
});
