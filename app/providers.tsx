"use client";

import { UserProvider } from "@/context/UserContext";
import type { ReactNode } from "react";

/**
 * Thin client-side wrapper that registers all providers.
 * Kept separate so the root layout stays a Server Component.
 */
export function Providers({ children }: { children: ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
}
