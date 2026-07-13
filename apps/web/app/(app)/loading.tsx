/** Skeleton hiện tức thì khi chuyển trang trong app — thay màn trắng trống. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4" aria-busy aria-label="Đang tải trang">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/60" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-3 h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/60" />
          <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800/60" />
        </div>
      ))}
    </div>
  );
}
