import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1"
                    >
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative flex items-center">
                    {leftIcon && (
                        <span className="absolute left-3 text-slate-400 pointer-events-none">
                            {leftIcon}
                        </span>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full rounded-2xl border bg-zinc-950/50 px-5 py-4 text-sm text-zinc-100",
                            "transition-all duration-150 outline-none",
                            "placeholder:text-zinc-500",
                            "focus:border-zinc-500 focus:ring-1 focus:ring-white/10",
                            "disabled:opacity-30 disabled:cursor-not-allowed",
                            error
                                ? "border-red-400 focus:ring-red-400"
                                : "border-zinc-800",
                            leftIcon && "pl-12",
                            rightIcon && "pr-12",
                            className
                        )}
                        {...props}
                    />

                    {rightIcon && (
                        <span className="absolute right-3 text-slate-400 pointer-events-none">
                            {rightIcon}
                        </span>
                    )}
                </div>

                {(error || hint) && (
                    <p
                        className={cn(
                            "text-xs",
                            error ? "text-red-500" : "text-slate-500"
                        )}
                    >
                        {error ?? hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

// ——— Textarea variant ———
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1"
                    >
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                <textarea
                    ref={ref}
                    id={inputId}
                    className={cn(
                        "w-full rounded-2xl border bg-zinc-950/50 px-5 py-4 text-sm text-zinc-100",
                        "transition-all duration-150 resize-none outline-none",
                        "placeholder:text-zinc-500",
                        "focus:border-zinc-500 focus:ring-1 focus:ring-white/10",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        error
                            ? "border-red-400 focus:ring-red-400"
                            : "border-zinc-800",
                        className
                    )}
                    rows={props.rows ?? 4}
                    {...props}
                />

                {(error || hint) && (
                    <p className={cn("text-xs", error ? "text-red-500" : "text-slate-500")}>
                        {error ?? hint}
                    </p>
                )}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";

// ——— Select variant ———
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1"
                    >
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                <select
                    ref={ref}
                    id={inputId}
                    className={cn(
                        "w-full rounded-2xl border bg-zinc-950/50 px-5 py-4 text-sm text-zinc-100",
                        "transition-all duration-150 appearance-none cursor-pointer outline-none",
                        "focus:border-zinc-500 focus:ring-1 focus:ring-white/10",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        error
                            ? "border-red-400 focus:ring-red-400"
                            : "border-zinc-800",
                        className
                    )}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {(error || hint) && (
                    <p className={cn("text-xs", error ? "text-red-500" : "text-slate-500")}>
                        {error ?? hint}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";
