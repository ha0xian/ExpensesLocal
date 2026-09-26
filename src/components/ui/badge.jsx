import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex h-6 w-fit items-center justify-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap", { variants: { variant: {
  default: "border-transparent bg-primary text-primary-foreground", secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive/10 text-destructive", outline: "border-border text-foreground",
  success: "border-transparent bg-success-soft text-success-foreground", warning: "border-transparent bg-warning-soft text-warning-foreground",
} }, defaultVariants: { variant: "default" } });
function Badge({ className, variant = "default", asChild = false, ...props }) { const Comp = asChild ? Slot.Root : "span"; return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };
