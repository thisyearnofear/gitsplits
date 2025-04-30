import React from "react";
import clsx from "clsx";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
}

const Badge: React.FC<BadgeProps> = ({ className = "", variant = "default", children, ...props }) => (
  <span
    className={clsx(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      {
        "bg-gray-100 text-gray-800": variant === "default",
        "border border-gray-200 bg-transparent": variant === "outline",
        "bg-gray-200 text-gray-900": variant === "secondary"
      },
      className
    )}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
