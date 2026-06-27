export default function AppSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      <div className="h-14 shrink-0 animate-pulse bg-slate-900 lg:hidden" />
      <div className="flex-1 animate-pulse bg-slate-800" />
      <div className="h-16 shrink-0 animate-pulse bg-slate-900 lg:hidden" />
    </div>
  );
}
