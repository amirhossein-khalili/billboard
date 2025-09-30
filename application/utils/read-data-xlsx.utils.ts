import { isUUID } from 'class-validator';
import { BILLBOARD_WILDCARD_ORGANIZATION_ID } from '../../domain/constants';
import { ErrorReporter, ParsedBillboardMessageRow } from './types';
import { XlsxTableParser } from './xlsx-table-parser';

export class BillboardMessagesXlsxParser extends XlsxTableParser<ParsedBillboardMessageRow> {
  protected validateHeader(header: string[]): string[] {
    const errors: string[] = [];

    const [orgHeader = '', messageHeader = ''] = header.map((h) => h.toLowerCase());

    if (!orgHeader.includes('org') || !orgHeader.includes('id')) {
      errors.push('Column 1 must be "Org ID" (or similar)');
    }

    if (!messageHeader.includes('message')) {
      errors.push('Column 2 must be "Message"');
    }

    return errors;
  }

  protected mapRow(
    cells: string[],
    rowNumber: number,
    _header: string[],
    addError: ErrorReporter,
  ): ParsedBillboardMessageRow | null {
    const [orgCellRaw = '', messageRaw = ''] = cells;

    const organizationIdNormalized = orgCellRaw.trim();
    const message = messageRaw.trim();

    if (!organizationIdNormalized) {
      addError(
        `Org ID is required (use "${BILLBOARD_WILDCARD_ORGANIZATION_ID}" for all organizations)`,
      );
      return null;
    }

    if (organizationIdNormalized.includes(',')) {
      addError(
        'Only one Org ID per row is allowed—split comma-separated values into multiple rows.',
      );
      return null;
    }

    if (
      organizationIdNormalized !== BILLBOARD_WILDCARD_ORGANIZATION_ID
      && !isUUID(organizationIdNormalized)
    ) {
      addError(
        `Org ID must be a UUID or "${BILLBOARD_WILDCARD_ORGANIZATION_ID}"`,
      );
      return null;
    }

    if (!message) {
      addError('Message is required');
      return null;
    }

    if (message.length > 10000) {
      addError('Message exceeds 10000 characters');
      return null;
    }

    const organizationId = organizationIdNormalized === BILLBOARD_WILDCARD_ORGANIZATION_ID
      ? BILLBOARD_WILDCARD_ORGANIZATION_ID
      : organizationIdNormalized;

    return {
      rowNumber,
      organizationId,
      message,
    };
  }
}