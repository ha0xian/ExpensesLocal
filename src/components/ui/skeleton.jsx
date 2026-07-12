import { cn } from "../../lib/utils.js";

export function Skeleton({ className, ...props }) {
  return <div className={cn("ui-skeleton", className)} {...props} />;
}
