import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ErrorBlock({
  onRetry,
  message,
}: {
  onRetry?: (() => void) | undefined;
  message?: string | undefined;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        {message ?? "We couldn't load this data right now."}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        The connection to the analytics workspace didn't respond. Try again in a moment.
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 p-10 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** Renders loading / error / empty / data for one query result. */
export function QueryBoundary<T>({
  isPending,
  isError,
  data,
  refetch,
  emptyTitle,
  emptyDescription,
  loading,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  data: T[] | undefined;
  refetch?: (() => void) | undefined;
  emptyTitle: string;
  emptyDescription: string;
  loading?: ReactNode | undefined;
  children: (rows: T[]) => ReactNode;
}) {
  if (isPending) return <>{loading ?? <LoadingBlock />}</>;
  if (isError) return <ErrorBlock onRetry={refetch} />;
  if (!data || data.length === 0)
    return <EmptyBlock title={emptyTitle} description={emptyDescription} />;
  return <>{children(data)}</>;
}
