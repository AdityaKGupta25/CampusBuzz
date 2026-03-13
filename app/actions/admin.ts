"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * SECURE SERVER ACTION: Individual User Onboarding
 * Uses the service_role key to bypass RLS and create Auth accounts.
 * Always verifies the calling user is an ADMIN first.
 */

// ─── Service-role client (ONLY usage in server context) ──────────────────────
const serviceClient = createClient(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export interface OnboardUserPayload {
    email: string;
    fullName: string;
    role: "student" | "faculty" | "hod" | "admin" | "founder";
    departmentId: string | null;
    password?: string;
}

export async function onboardUserAction(payload: OnboardUserPayload) {
    const { email, fullName, role, departmentId, password } = payload;

    try {
        // Use SSR client to resolve the user session correctly from cookies
        const cookieStore = await cookies();
        const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { /* ignore */ }
                },
            },
        });

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return { error: "Authentication required." };

        // Resolve admin profile via email (more robust during migration)
        const { data: adminProfile } = await serviceClient
            .from("users")
            .select("role, institution_id")
            .eq("email", session.user.email)
            .single();

        if (adminProfile?.role !== "admin") {
            return { error: `Permission denied. Your role is ${adminProfile?.role || "unknown"}.` };
        }

        const institution_id = adminProfile.institution_id;
        if (!institution_id) {
            return { error: "Admin account not linked to an institution." };
        }

        // 1.5 VALIDATION: One HOD per Department
        if (role === "hod" && departmentId) {
            const { data: existingHOD } = await serviceClient
                .from("users")
                .select("full_name")
                .eq("department_id", departmentId)
                .eq("role", "hod")
                .maybeSingle();

            if (existingHOD) {
                return { error: `Critical Conflict: Department already has an HOD assigned (${existingHOD.full_name}). Decommission the existing HOD before assigning a new one.` };
            }
        }

        // 2. CREATE AUTH USER
        const { data: newUser, error: authError } = await serviceClient.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: password || "Welcome@CampusBuzz2026",
            email_confirm: true,
            user_metadata: {
                full_name: fullName.trim(),
                role: role,
                institution_id: institution_id,
                department_id: departmentId
            }
        });

        // 3. SYNC TO PUBLIC.USERS (Critical for Multi-Tenancy)
        if (authError) {
            // Handle "already exists" by performing a manual profile update instead
            if (authError.message.toLowerCase().includes("already exists")) {
                const { error: syncError } = await serviceClient
                    .from("users")
                    .upsert({
                        email: email.trim().toLowerCase(),
                        full_name: fullName.trim(),
                        role: role,
                        department_id: departmentId || null,
                        institution_id: institution_id
                    }, { onConflict: "email" });

                if (syncError) return { error: `User exists but sync failed: ${syncError.message}` };
                return { success: true, message: "User profile updated (Account already existed)." };
            }
            return { error: authError.message };
        }

        // Even if we have a trigger, manual sync here is safer for immediate UI updates
        const { error: dbError } = await serviceClient
            .from("users")
            .upsert({
                auth_uid: newUser.user.id,
                email: email.trim().toLowerCase(),
                full_name: fullName.trim(),
                role: role,
                department_id: departmentId || null,
                institution_id: institution_id
            }, { onConflict: "email" });

        if (dbError) return { error: `Auth account created but DB sync failed: ${dbError.message}` };

        return { success: true, userId: newUser.user.id };

    } catch (err: any) {
        console.error("[onboardUserAction] critical failure:", err);
        return { error: err.message ?? "Internal server error" };
    }
}

export async function updateUserAction(payload: {
    userId: string;
    email: string;
    fullName: string;
    role: "student" | "faculty" | "hod" | "admin" | "founder";
    departmentId: string | null;
}) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { /* ignore */ }
                },
            },
        });

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return { error: "Authentication required." };

        const { data: adminProfile } = await serviceClient
            .from("users")
            .select("role, institution_id")
            .eq("email", session.user.email)
            .single();

        if (adminProfile?.role !== "admin" && adminProfile?.role !== "founder") {
            return { error: "Permission denied. Required administrative clearance not detected." };
        }

        // Ensure the target user belongs to the same institution
        const { data: targetUser } = await serviceClient
            .from("users")
            .select("institution_id, role")
            .eq("id", payload.userId)
            .single();

        if (!targetUser) return { error: "User not found." };

        // ── Founder Protection: Global owners cannot belong to a specific cluster ──
        const isFounder = targetUser.role === 'founder' || payload.role === 'founder';

        // Check institution match (bypass for founders as they are global)
        if (!isFounder && targetUser.institution_id !== adminProfile.institution_id) {
            return { error: "Security breach: User context mismatch." };
        }

        // VALIDATION: One HOD per Department
        if (payload.role === "hod" && payload.departmentId) {
            const { data: existingHOD } = await serviceClient
                .from("users")
                .select("id, full_name")
                .eq("department_id", payload.departmentId)
                .eq("role", "hod")
                .neq("id", payload.userId) // Exclude current user from check
                .maybeSingle();

            if (existingHOD) {
                return { error: `Critical Conflict: Department already has an HOD assigned (${existingHOD.full_name}).` };
            }
        }

        const { error } = await serviceClient
            .from("users")
            .update({
                full_name: payload.fullName,
                role: payload.role,
                department_id: isFounder ? null : (payload.departmentId || null),
                institution_id: isFounder ? null : targetUser.institution_id
            })
            .eq("id", payload.userId);

        if (error) return { error: error.message };

        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function deleteUserAction(userId: string) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { /* ignore */ }
                },
            },
        });

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return { error: "Authentication required." };

        const { data: adminProfile } = await serviceClient
            .from("users")
            .select("role, institution_id")
            .eq("email", session.user.email)
            .single();

        if (adminProfile?.role !== "admin") return { error: "Permission denied. Admin role required." };

        // Verify institution match before deleting
        const { data: targetUser } = await serviceClient
            .from("users")
            .select("institution_id, auth_uid")
            .eq("id", userId)
            .single();

        if (!targetUser) return { error: "User not found." };
        if (targetUser.institution_id !== adminProfile.institution_id) {
            return { error: "Security breach: User belongs to a different institution." };
        }

        // Delete from public.users (will also trigger Auth delete if configured, but let's be explicit)
        const { error: dbError } = await serviceClient.from("users").delete().eq("id", userId);
        if (dbError) return { error: dbError.message };

        // Delete from Auth if linked
        if (targetUser.auth_uid) {
            await serviceClient.auth.admin.deleteUser(targetUser.auth_uid);
        }

        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}
