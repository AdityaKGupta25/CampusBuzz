"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User as AuthUser } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole = "student" | "faculty" | "hod" | "admin";

export interface UserProfile {
    /** auth.users.id (UUID) */
    authId: string;
    /** public.users.id (UUID, used for FK joins) */
    dbId: string;
    full_name: string;
    email: string;
    role: AppRole;
    avatar_url: string | null;
    bio: string | null;
    social_links: any | null;
    employee_id: string | null;
    department_id: string | null;
    department_name: string | null;
    institution_id: string | null;   // ← tenant key
    institution_name: string | null;
    institution_logo_url: string | null;
    created_at: string;
}

interface UserContextValue {
    /** null = not loaded yet, undefined = no session */
    user: UserProfile | null | undefined;
    /** True while the first load is in-flight */
    loading: boolean;
    /** Any error that occurred during load */
    error: string | null;
    /** Force a re-fetch (e.g. after profile update) */
    refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue>({
    user: null,
    loading: true,
    error: null,
    refresh: async () => { },
});

// ─── Row type returned by Supabase ────────────────────────────────────────────

interface UserRow {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
    bio: string | null;
    social_links: any | null;
    employee_id: string | null;
    department_id: string | null;
    institution_id: string | null;
    created_at: string;
    department: { name: string } | { name: string }[] | null;
    institutions: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null | undefined>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadUser = useCallback(async (authUser: AuthUser | null) => {
        if (!authUser) {
            setUser(undefined);
            setLoading(false);
            return;
        }

        try {
            const { data, error: dbErr } = await supabase
                .from("users")
                .select(`
                    id,
                    full_name,
                    email,
                    role,
                    avatar_url,
                    bio,
                    social_links,
                    employee_id,
                    department_id,
                    institution_id,
                    created_at,
                    department:departments(name),
                    institutions:institutions(name, logo_url)
                `)
                .eq("auth_uid", authUser.id)
                .single();

            if (dbErr || !data) {
                setError("Could not load user profile.");
                setUser(undefined);
                return;
            }

            const row = data as unknown as UserRow;

            // departments and institutions joins can come back as object or array
            const dept = Array.isArray(row.department)
                ? row.department[0]
                : row.department;
            const inst = Array.isArray(row.institutions)
                ? row.institutions[0]
                : row.institutions;

            setUser({
                authId: authUser.id,
                dbId: row.id,
                full_name: row.full_name ?? authUser.email ?? "User",
                email: row.email ?? authUser.email ?? "",
                role: (row.role ?? "student") as AppRole,
                avatar_url: row.avatar_url ?? null,
                bio: row.bio ?? null,
                social_links: row.social_links ?? null,
                employee_id: row.employee_id ?? null,
                department_id: row.department_id ?? null,
                department_name: dept?.name ?? null,
                institution_id: row.institution_id ?? null,
                institution_name: inst?.name ?? null,
                institution_logo_url: inst?.logo_url ?? null,
                created_at: row.created_at,
            });

            setError(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load profile.");
            setUser(undefined);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Initial load + auth state listener ───────────────────────────────────

    useEffect(() => {
        let mounted = true;

        // Get the current session immediately on mount
        // use getSession() for faster initial load (reads from local storage/cookies)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) void loadUser(session?.user ?? null);
        });

        // Subscribe to future auth changes (login / logout / token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (mounted) void loadUser(session?.user ?? null);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadUser]);

    // ── Public refresh ────────────────────────────────────────────────────────

    const refresh = useCallback(async () => {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await loadUser(authUser);
    }, [loadUser]);

    return (
        <UserContext.Provider value={{ user, loading, error, refresh }}>
            {children}
        </UserContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the global user profile anywhere in the app.
 *
 * ```tsx
 * const { user, loading } = useUser();
 * if (loading) return <Spinner />;
 * if (!user)   return <p>Not logged in</p>;
 * return <p>Hello, {user.full_name}</p>;
 * ```
 */
export function useUser() {
    return useContext(UserContext);
}

// ─── Helpers exported for convenience ────────────────────────────────────────

/** Two-letter initials from a display name */
export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

/** Deterministic avatar gradient based on the user's name */
export function getAvatarGradient(name: string): string {
    const gradients = [
        "linear-gradient(135deg,#4f46e5,#7c3aed)",
        "linear-gradient(135deg,#0891b2,#0e7490)",
        "linear-gradient(135deg,#059669,#047857)",
        "linear-gradient(135deg,#d97706,#b45309)",
        "linear-gradient(135deg,#db2777,#be185d)",
    ];
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
    return gradients[Math.abs(hash) % gradients.length];
}
