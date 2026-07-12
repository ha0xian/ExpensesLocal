import { cn } from "../../lib/utils.js";

export function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <div
      aria-orientation={orientation}
      className={cn("ui-separator", orientation === "vertical" && "ui-separator-vertical", className)}
      role="separator"
      {...props}
    />
  );
}
