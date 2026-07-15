import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm transition-[background-color,border-color,box-shadow,transform] placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:border-cyan-400/60 focus-visible:bg-card/90 focus-visible:ring-2 focus-visible:ring-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
