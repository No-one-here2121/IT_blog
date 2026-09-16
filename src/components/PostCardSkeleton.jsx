export default function PostCardSkeleton() {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="skeleton h-44 w-full rounded-none"></div>

      <div className="card-body p-5 space-y-3">
        {/* Author & date skeleton */}
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full shrink-0"></div>
          <div className="space-y-1.5 flex-1">
            <div className="skeleton h-3 w-24"></div>
            <div className="skeleton h-2.5 w-16"></div>
          </div>
          <div className="skeleton h-5 w-16 rounded-full"></div>
        </div>

        {/* Title skeleton */}
        <div className="skeleton h-5 w-4/5"></div>
        <div className="skeleton h-4 w-2/3"></div>

        {/* Excerpt skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-3 w-5/6"></div>
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-1.5 pt-2">
          <div className="skeleton h-4 w-12 rounded-sm"></div>
          <div className="skeleton h-4 w-14 rounded-sm"></div>
          <div className="skeleton h-4 w-10 rounded-sm"></div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-base-200 px-5 py-3 flex justify-between bg-base-200/20">
        <div className="flex gap-4">
          <div className="skeleton h-4 w-10"></div>
          <div className="skeleton h-4 w-10"></div>
        </div>
        <div className="skeleton h-5 w-16 rounded-md"></div>
      </div>
    </div>
  );
}
