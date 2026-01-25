import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText({ lines = 1 }: SkeletonTextProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            // Last line is 3/4 width for natural look
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Title skeleton */}
      <Skeleton className="h-5 w-1/3" />
      {/* Text lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: "sm" | "default" | "lg";
}

export function SkeletonAvatar({ size = "default" }: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

interface SkeletonTableRowProps {
  cols?: number;
}

export function SkeletonTableRow({ cols = 4 }: SkeletonTableRowProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            // First column wider (e.g., name)
            i === 0 ? "flex-[2]" : "flex-1"
          )}
        />
      ))}
    </div>
  );
}
