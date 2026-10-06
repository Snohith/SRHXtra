import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils/classes";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface SharedProps {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

type ButtonProps =
  | (SharedProps & {
      href: string;
      target?: string;
      rel?: string;
      prefetch?: boolean;
    })
  | (SharedProps &
      ButtonHTMLAttributes<HTMLButtonElement> & {
        href?: undefined;
      });

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-[#11141a] hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(255,109,0,0.3)]",
  secondary: "bg-black/[0.04] text-foreground hover:bg-black/[0.08] hover:text-accent border border-border hover:border-accent/30",
  outline: "border border-border-strong text-foreground hover:bg-accent hover:text-white hover:border-accent",
  ghost: "text-muted hover:bg-black/[0.04] hover:text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[40px] px-4 py-2 text-xs uppercase tracking-widest font-bold",
  md: "min-h-[44px] px-6 py-3 text-sm font-bold uppercase tracking-wider",
  lg: "min-h-[48px] px-8 py-4 text-base font-bold uppercase tracking-widest",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const classes = cx(
    "inline-flex items-center justify-center text-center rounded-full font-semibold transition duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if ("href" in props && props.href) {
    return (
      <Link
        className={classes}
        href={props.href}
        prefetch={props.prefetch}
        rel={props.rel}
        target={props.target}
      >
        {children}
      </Link>
    );
  }

  const { className: _className, children: _children, type, ...nativeProps } =
    props as ButtonHTMLAttributes<HTMLButtonElement> & {
      children?: ReactNode;
      className?: string;
    };

  return (
    <button
      className={classes}
      type={type ?? "button"}
      {...nativeProps}
    >
      {children}
    </button>
  );
}
