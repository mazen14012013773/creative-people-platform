import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination as PaginationType } from '@/types';
import { formatNumber } from '@/lib/utils';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ pagination, onPageChange }: PaginationProps) => {
  const { page, totalPages, total } = pagination;

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm font-semibold text-slate-500">
        إجمالي {formatNumber(total)} نتيجة — صفحة {formatNumber(page)} من{' '}
        {formatNumber(totalPages)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="size-4" />
          السابق
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          التالي
          <ChevronLeft className="size-4" />
        </button>
      </div>
    </div>
  );
};
