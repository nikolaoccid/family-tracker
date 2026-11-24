import type { Response } from 'express';
import { InvalidError } from '../errors/domain-error';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, NEXT_CURSOR_HEADER, PageQueryDto } from './page-query.dto';

export function resolveLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
}

export type CursorPart = string | number;

export function encodeCursor(parts: CursorPart[]): string {
  return Buffer.from(JSON.stringify(parts)).toString('base64url');
}

export function decodeCursor(cursor: string | undefined): CursorPart[] | undefined {
  if (!cursor) return undefined;
  try {
    const parts: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(parts) && parts.every((p) => typeof p === 'string' || typeof p === 'number')) {
      return parts as CursorPart[];
    }
  } catch {
    // fall through
  }
  throw new InvalidError('INVALID_CURSOR', 'Malformed cursor');
}

export interface PageRequest {
  limit: number;
  after?: CursorPart[];
}

export function pageRequest(query: PageQueryDto): PageRequest {
  return { limit: resolveLimit(query.limit), after: decodeCursor(query.cursor) };
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

/** Callers fetch `limit + 1` rows; the extra row only signals that another page exists. */
export function toPage<T>(rows: T[], limit: number, cursorOf: (row: T) => CursorPart[]): Page<T> {
  if (rows.length <= limit) return { items: rows };
  const items = rows.slice(0, limit);
  return { items, nextCursor: encodeCursor(cursorOf(items[items.length - 1])) };
}

/** Paging metadata travels in a header so list bodies stay plain arrays. */
export function sendPage<T>(res: Response, page: Page<T>): T[] {
  if (page.nextCursor) res.setHeader(NEXT_CURSOR_HEADER, page.nextCursor);
  return page.items;
}
