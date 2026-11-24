import { QueryFailedError } from 'typeorm';

export interface MappedDbError {
  status: number;
  code: string;
  message: string;
}

/** Translates the few Postgres errors that are client mistakes; everything else stays a 500. */
export function mapQueryFailed(error: QueryFailedError): MappedDbError | null {
  const pgCode = (error.driverError as { code?: string } | undefined)?.code;
  switch (pgCode) {
    case '23505':
      return { status: 409, code: 'ALREADY_EXISTS', message: 'Resource already exists' };
    case '23503':
      return { status: 409, code: 'REFERENCE_CONFLICT', message: 'Referenced resource does not exist or is in use' };
    case '22P02':
      return { status: 400, code: 'MALFORMED_VALUE', message: 'Malformed identifier or value' };
    default:
      return null;
  }
}
