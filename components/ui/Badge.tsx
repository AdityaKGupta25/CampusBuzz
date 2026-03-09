import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
    | "default"
    | "low"
    | "medium"
    | "high"
    | "pending"
    | "approved"
    | "rejected"
    | "live"
    | "completed"
    | "draft";

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
    dot?: boolean;
}

const variantMap: Record<BadgeVariant, string> = {
    default: "bg-slate-100 text-slate-600 border-slate-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50  text-amber-700  border-amber-200",
    high: "bg-red-50    text-red-700    border-red-200",
    pending: "bg-amber-50  text-amber-700  border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50    text-red-700    border-red-200",
    live: "bg-blue-50   text-blue-700   border-blue-200",
    completed: "bg-slate-100 text-slate-600  border-slate-200",
    draft: "bg-purple-50 text-purple-700 border-purple-200",
};

const dotMap: Record<BadgeVariant, string> = {
    default: "bg-slate-400",
    low: "bg-emerald-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
    pending: "bg-amber-500",
    approved: "bg-emerald-500",
    rejected: "bg-red-500",
    live: "bg-blue-500",
    completed: "bg-slate-400",
    draft: "bg-purple-500",
};

export function Badge({ variant = "default", children, className, dot = false }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                variantMap[variant],
                className
            )}
        >
            {dot && (
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotMap[variant])} />
            )}
            {children}
        </span>
    );
}
