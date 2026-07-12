import { cn } from "../../lib/utils.js";

const variantClass = {
  default: "ui-badge-default",
  secondary: "ui-badge-secondary",
  destructive: "ui-badge-destructive",
  outline: "ui-badge-outline",
  success: "ui-badge-success",
  warning: "ui-badge-warning",
};

export function Badge({ className, variant = "default", ...props }) {
  return <span className={cn("ui-badge", variantClass[variant], className)} {...props} />;
}
