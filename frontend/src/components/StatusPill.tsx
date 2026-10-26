import { cn } from "../utils/cn";
import type { StatusColor } from "../utils/microgridLogic";

const colorMap: Record<StatusColor, string> = {
  emerald:
    "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  sky:
    "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30",
  rose:
    "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30",
};

export default function StatusPill({
  color,
  children,
  className,
  pulse,
}: {
  color: StatusColor;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        colorMap[color],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              color === "emerald" && "bg-emerald-400",
              color === "sky" && "bg-sky-400",
              color === "rose" && "bg-rose-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              color === "emerald" && "bg-emerald-400",
              color === "sky" && "bg-sky-400",
              color === "rose" && "bg-rose-400"
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
