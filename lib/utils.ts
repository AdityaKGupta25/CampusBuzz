import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Requires: `npm install clsx tailwind-merge`
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Format a Date object to a readable string */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...options,
    });
}

/** Format a datetime-local input value to a pretty string */
export function formatDateTime(isoString: string): string {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Return a currency-formatted string (INR) */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}
/** Export data to a CSV file and trigger a download */
export function exportToCSV(data: any[], fileName: string) {
    if (!data || data.length === 0) return;

    // Check if we are in a browser environment
    if (typeof window === "undefined") return;

    // Extract headers from the first object
    const headers = Object.keys(data[0]);
    const csvHeader = headers.join(",");

    // Map rows to CSV format
    const csvRows = data.map(obj => {
        return headers
            .map(header => {
                const val = obj[header];
                // Handle different value types and escape strings
                if (val === null || val === undefined) return "";
                const stringVal = String(val);
                // Escape quotes and wrap in quotes if it contains comma or newline
                if (stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes("\"")) {
                    return `"${stringVal.replace(/"/g, '""')}"`;
                }
                return stringVal;
            })
            .join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
