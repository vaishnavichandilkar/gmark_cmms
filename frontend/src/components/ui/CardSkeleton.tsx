import { Skeleton } from "./Skeleton";

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={`p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between border border-white/5 bg-zinc-950/40 min-h-[160px] ${className || ''}`}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="w-12 h-12 rounded-2xl bg-white/10" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-2 bg-white/10" />
      </div>
      <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-1.5">
        <Skeleton className="h-4 w-1/2 bg-white/10" />
      </div>
    </div>
  );
}
