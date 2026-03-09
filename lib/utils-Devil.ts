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

/** Export data to a CSV file */
export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    // Get headers from first object keys
    const headers = Object.keys(data[0]);
    const csvHeader = headers.join(",");

    // Map rows
    const csvRows = data.map(row => {
        return headers.map(header => {
            const val = row[header];
            // Format value: handle strings with commas/quotes, and handle objects/arrays
            const escaped = ('' + (val ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + "\n" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
