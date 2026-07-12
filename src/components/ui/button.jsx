import { cn } from "../../lib/utils.js";

const variantClass = {
  default: "ui-button-default",
  destructive: "ui-button-destructive",
  outline: "ui-button-outline",
  secondary: "ui-button-secondary",
  ghost: "ui-button-ghost",
  link: "ui-button-link",
};

const sizeClass = {
  default: "ui-button-md",
  sm: "ui-button-sm",
  lg: "ui-button-lg",
  icon: "ui-button-icon",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}) {
  return (
    <button
      className={cn("ui-button", variantClass[variant], sizeClass[size], className)}
      type={type}
      {...props}
    />
  );
}
