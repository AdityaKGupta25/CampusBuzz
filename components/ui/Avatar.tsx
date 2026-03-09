import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
    name: string;
    src?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const PALETTE = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100   text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100   text-rose-700",
    "bg-amber-100  text-amber-700",
    "bg-cyan-100   text-cyan-700",
    "bg-fuchsia-100 text-fuchsia-700",
];

function getInitials(name: string) {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function hashColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTE.length;
    return PALETTE[h];
}

const sizeMap = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base" };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt={name}
                className={cn("rounded-full object-cover flex-shrink-0", sizeMap[size], className)}
            />
        );
    }
    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center font-semibold flex-shrink-0",
                sizeMap[size],
                hashColor(name),
                className
            )}
        >
            {getInitials(name)}
        </div>
    );
}
