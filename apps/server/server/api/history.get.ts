import type { HistoryResponse, CompareError, CompareSource } from '@auction-comparator/shared';
import { requireAuth } from '../utils/auth';
import { getSearchHistory } from '../utils/compare-cache';

export default defineEventHandler(async (event): Promise<HistoryResponse | CompareError> => {
  // Require authentication
  let user;
  try {
    user = await requireAuth(event);
  } catch (error: any) {
    setResponseStatus(event, 401);
    return {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    };
  }

  // Parse query parameters
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100);
  const domain = query.domain as string | undefined;
  const compareSource = query.compareSource as CompareSource | undefined;
  const startDate = query.startDate ? new Date(query.startDate as string) : undefined;
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined;

  // Validate compareSource if provided
  if (compareSource && !['cache_strict', 'cache_loose', 'fresh_fetch'].includes(compareSource)) {
    setResponseStatus(event, 400);
    return {
      code: 'INVALID_REQUEST',
      message: 'Invalid compareSource. Must be one of: cache_strict, cache_loose, fresh_fetch',
    };
  }

  try {
    const result = await getSearchHistory(user.id, {
      page,
      pageSize,
      domain,
      compareSource,
      startDate,
      endDate,
    });

    return {
      entries: result.entries,
      total: result.total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error('[History] Error fetching history:', error);
    setResponseStatus(event, 500);
    return {
      code: 'API_ERROR',
      message: 'Failed to fetch history',
    };
  }
});
