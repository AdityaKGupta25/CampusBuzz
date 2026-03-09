import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
};

export function Card({ children, padding = "md", className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "bg-white rounded-2xl border border-slate-100 shadow-sm",
                paddingMap[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, icon, className }: CardHeaderProps) {
    return (
        <div className={cn("flex items-start gap-4 mb-6", className)}>
            {icon && (
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    {icon}
                </div>
            )}
            <div>
                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

interface CardSectionProps {
    children: React.ReactNode;
    className?: string;
}

export function CardSection({ children, className }: CardSectionProps) {
    return (
        <div className={cn("border-t border-slate-100 pt-6 mt-6", className)}>
            {children}
        </div>
    );
}
