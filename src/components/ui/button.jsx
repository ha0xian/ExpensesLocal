import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-medium transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  { variants: { variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border-border bg-background hover:bg-muted",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
    ghost: "hover:bg-muted",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    link: "min-h-0 px-0 text-primary underline-offset-4 hover:underline",
  }, size: { default: "h-11", sm: "h-9 min-h-9 px-3", lg: "h-12 px-5", icon: "size-11 p-0", "icon-sm": "size-9 min-h-9 p-0" } }, defaultVariants: { variant: "default", size: "default" } }
);

function Button({ className, variant = "default", size = "default", asChild = false, type = "button", ...props }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" data-variant={variant} data-size={size} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { Button, buttonVariants };
