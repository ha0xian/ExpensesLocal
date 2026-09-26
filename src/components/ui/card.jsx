import { cn } from "@/lib/utils";
function Card({ className, ...props }) { return <section data-slot="card" className={cn("flex flex-col gap-4 rounded-xl border bg-card py-5 text-card-foreground", className)} {...props} />; }
function CardHeader({ className, ...props }) { return <div data-slot="card-header" className={cn("grid gap-1 px-5 has-data-[slot=card-action]:grid-cols-[1fr_auto]", className)} {...props} />; }
function CardTitle({ className, ...props }) { return <h2 data-slot="card-title" className={cn("text-base font-semibold leading-snug", className)} {...props} />; }
function CardDescription({ className, ...props }) { return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />; }
function CardAction({ className, ...props }) { return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />; }
function CardContent({ className, ...props }) { return <div data-slot="card-content" className={cn("px-5", className)} {...props} />; }
function CardFooter({ className, ...props }) { return <div data-slot="card-footer" className={cn("flex items-center border-t bg-muted/50 px-5 pt-4", className)} {...props} />; }
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
