import type { Pagination } from '../types/freelancer';

export const buildPagination = (
  page: number,
  limit: number,
  total: number,
): Pagination => {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};
