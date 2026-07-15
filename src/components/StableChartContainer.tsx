import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChartSize = {
  width: number;
  height: number;
};

type StableChartContainerProps = {
  children: ReactNode | ((size: ChartSize) => ReactNode);
  className?: string;
};

export function StableChartContainer({ children, className }: StableChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Use requestAnimationFrame to avoid calling during render
    const rafId = requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const nextSize = {
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      };
      setSize((prev) =>
        prev.width === nextSize.width && prev.height === nextSize.height ? prev : nextSize,
      );
    });

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const nextSize = {
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      };
      setSize((prev) =>
        prev.width === nextSize.width && prev.height === nextSize.height ? prev : nextSize,
      );
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const ready = size.width > 0 && size.height > 0;

  return (
    <div ref={containerRef} className={cn("mt-3 h-72 min-h-[18rem] min-w-0 w-full", className)}>
      {ready ? (
        typeof children === "function" ? (
          children(size)
        ) : (
          children
        )
      ) : (
        <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />
      )}
    </div>
  );
}
