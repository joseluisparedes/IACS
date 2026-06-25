import * as React from "react"
import { cn } from "@/src/lib/utils"

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive', size?: 'default' | 'sm' | 'lg' | 'icon' }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EB5F46] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#EB5F46] text-white hover:bg-[#c94a32] shadow-sm shadow-[#EB5F46]/20": variant === "default",
            "border border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-[#F8FAFC]": variant === "outline",
            "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]": variant === "ghost",
            "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100": variant === "destructive",
            "h-10 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-11 rounded-lg px-6": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
