'use client';

import { Coffee, RotateCcw, RotateCw, SearchX, TriangleAlert } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';

const primaryButton =
  'inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[13px] font-semibold text-surface-milk shadow-card transition-all hover:bg-primary-hover active:scale-95';

/** Quán chưa mở bán món nào (API trả mảng rỗng) – không phải lỗi. */
export function EmptyMenuState() {
  return (
    <StatePanel
      icon={<Coffee className="h-10 w-10" aria-hidden="true" />}
      title="Chưa có sản phẩm mở bán"
      description="Hiện chưa có sản phẩm nào được mở bán. Vui lòng quay lại sau!"
    />
  );
}

interface NoResultsStateProps {
  keyword: string;
  category: string;
  onReset: () => void;
}

/** Có dữ liệu nhưng không món nào khớp từ khóa / danh mục. */
export function NoResultsState({ keyword, category, onReset }: NoResultsStateProps) {
  const trimmed = keyword.trim();
  return (
    <StatePanel
      icon={<SearchX className="h-10 w-10" aria-hidden="true" />}
      title="Không tìm thấy món phù hợp"
      description={
        <>
          Không có sản phẩm nào khớp
          {trimmed && (
            <>
              {' '}với từ khóa <strong className="text-navy">&quot;{trimmed}&quot;</strong>
            </>
          )}{' '}
          trong danh mục <strong className="text-navy">&quot;{category}&quot;</strong>.
        </>
      }
      actions={
        <button type="button" onClick={onReset} className={primaryButton}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Xóa bộ lọc
        </button>
      }
    />
  );
}

interface MenuErrorStateProps {
  onRetry: () => void;
}

/** Lỗi mạng / server khi tải thực đơn. */
export function MenuErrorState({ onRetry }: MenuErrorStateProps) {
  return (
    <StatePanel
      tone="danger"
      icon={<TriangleAlert className="h-10 w-10" aria-hidden="true" />}
      title="Không thể tải thực đơn"
      description="Đã có lỗi xảy ra trong quá trình lấy danh sách sản phẩm. Vui lòng kiểm tra lại kết nối mạng."
      actions={
        <button type="button" onClick={onRetry} className={primaryButton}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Thử lại
        </button>
      }
    />
  );
}
