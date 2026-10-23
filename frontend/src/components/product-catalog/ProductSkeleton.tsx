/** Khung xương loading (shimmer) cho lưới Menu: 4 cột desktop / 2 cột mobile. */
export default function ProductSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Đang tải thực đơn"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-3xl border border-border-subtle bg-surface-milk p-3 shadow-card sm:p-4"
        >
          <div className="skeleton aspect-square w-full rounded-2xl" />
          <div className="skeleton h-4 w-2/3 rounded-full" />
          <div className="flex items-center justify-between pt-2">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-10 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
