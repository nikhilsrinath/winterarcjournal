export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-3xl space-y-4 pt-5 md:pt-8">
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-10 w-1/3" />
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-36 w-full" />
      <div className="skeleton h-36 w-full" />
    </div>
  );
}
