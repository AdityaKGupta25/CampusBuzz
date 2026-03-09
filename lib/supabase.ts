import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "[CampusBuzz] Missing Supabase env vars.\n" +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
}

/**
 * Singleton browser-side Supabase client.
 * Uses @supabase/ssr to automatically sync session to cookies.
 */
export const supabase = createBrowserClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-key"
);

// ─── Typed helpers for the events table ──────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";
export type EventStatus =
    | "draft"
    | "pending"
    | "approved"
    | "rejected"
    | "live"
    | "completed"
    | "revision_required"
    | "changes_requested"
    | "review_pending"
    | "archived";

export interface EventInsert {
    title: string;
    description: string;
    creator_id: string;       // UUID — auth user's internal users.id
    department_id: string;    // UUID — faculty's department
    status: EventStatus;
    risk_level: RiskLevel;
    budget_required: number;
    start_time: string;       // ISO-8601 timestamp
    end_time: string;         // ISO-8601 timestamp
    venue_id: string | null;  // UUID or null
}

/**
 * Insert a new event row.
 * Throws on error so callers can catch and surface to the user.
 */
export async function insertEvent(payload: EventInsert, institutionId: string) {
    const { data, error } = await supabase
        .from("events")
        .insert({
            ...payload,
            institution_id: institutionId
        })
        .select("id, title, status")
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch the internal users.id for the currently authenticated user.
 * RLS requires creator_id = current_user_id() so we always need this.
 */
export async function getCurrentUserId(): Promise<string> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("users")
        .select("id, department_id")
        .eq("auth_uid", user.id)
        .single();

    if (error || !data) throw new Error("User profile not found in database");
    return data.id;
}

/**
 * Fetch both the internal users.id AND department_id in one query.
 */
export async function getCurrentUserProfile(): Promise<{
    userId: string;
    departmentId: string | null;
    institutionId: string | null;
}> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) throw new Error("Not authenticated. Please log in first.");

    const { data, error } = await supabase
        .from("users")
        .select("id, department_id, institution_id")
        .eq("auth_uid", user.id)
        .single();

    if (error || !data) throw new Error("User profile not found. Contact your administrator.");

    return {
        userId: data.id,
        departmentId: data.department_id,
        institutionId: data.institution_id
    };
}

// ─── HoD Governance helpers ───────────────────────────────────────────────────

/**
 * Shape returned by the JOIN query below.
 * Maps 1:1 to the PendingEvent interface used by the HoD dashboard.
 */
export interface DbEvent {
    id: string;
    title: string;
    description: string | null;
    status: EventStatus;
    risk_level: RiskLevel;
    budget_required: number;
    start_time: string;
    end_time: string;
    created_at: string;
    banner_url: string | null;
    registered_count: number;
    is_archived: boolean;
    governance_note?: string | null;
    rejection_reason?: string | null;
    archive_requested?: boolean;
    archive_request_note?: string | null;
    is_public: boolean;
    is_featured: boolean;
    institution_id: string;
    // Joined relations
    creator: { full_name: string } | null;
    department: { name: string } | null;
    venue: { name: string; capacity: number } | null;
    institution: { name: string } | null;
}

/**
 * Fetch all events with status = 'pending', joined with creator, department, venue.
 * The HoD RLS policy guarantees they only see their own department's events.
 */
export async function fetchPendingEvents(institutionId: string): Promise<DbEvent[]> {
    const { data, error } = await supabase
        .from("events")
        .select(`
            id,
            title,
            description,
            status,
            risk_level,
            budget_required,
            start_time,
            end_time,
            created_at,
            banner_url,
            registered_count,
            is_archived,
            is_featured,
            institution_id,
            creator:users!events_creator_id_fkey ( full_name ),
            department:departments ( name ),
            venue:venues ( name, capacity )
        `)
        .eq("institution_id", institutionId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as DbEvent[];
}

/**
 * Fetch approved + live events for the student feed.
 * Sorted by start_time ascending (soonest first).
 * Pass institutionId to scope results to a single institution (multi-tenancy).
 */
export async function fetchPublicEvents(institutionId?: string): Promise<DbEvent[]> {
    let query = supabase
        .from("events")
        .select(`
            id,
            title,
            description,
            status,
            risk_level,
            budget_required,
            start_time,
            end_time,
            created_at,
            banner_url,
            registered_count,
            is_archived,
            is_public,
            is_featured,
            institution_id,
            creator:users!events_creator_id_fkey ( full_name ),
            department:departments ( name ),
            venue:venues ( name, capacity ),
            institution:institutions ( name ),
            registration_config
        `)
        .in("status", ["approved", "live", "completed"]);

    // ← Multi-tenancy + Marketplace logic
    if (institutionId) {
        // Show all events from OWN college OR events that are marked public
        query = query.or(`institution_id.eq.${institutionId},is_public.eq.true`);
    } else {
        // If no context, only show public
        query = query.eq("is_public", true);
    }

    const { data, error } = await query.order("start_time", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as DbEvent[];
}

/**
 * Fetch all events for the current HOD's department.
 * The HOD RLS policy guarantees they only see their own department's events.
 */
export async function fetchDepartmentEvents(institutionId: string, filters?: {
    isArchived?: boolean;
    status?: EventStatus | EventStatus[];
    is_archived?: boolean;
}): Promise<DbEvent[]> {
    let query = supabase
        .from("events")
        .select(`
            id,
            title,
            description,
            status,
            risk_level,
            budget_required,
            start_time,
            end_time,
            created_at,
            banner_url,
            registered_count,
            is_archived,
            is_featured,
            governance_note,
            rejection_reason,
            archive_requested,
            archive_request_note,
            creator:users!events_creator_id_fkey ( full_name ),
            department:departments ( name ),
            venue:venues ( name, capacity )
        `)
        .eq("institution_id", institutionId);

    if (filters?.isArchived !== undefined) {
        query = query.eq("is_archived", filters.isArchived);
    } else if (filters?.is_archived !== undefined) {
        query = query.eq("is_archived", filters.is_archived);
    }

    if (filters?.status) {
        if (Array.isArray(filters.status)) {
            query = query.in("status", filters.status);
        } else {
            query = query.eq("status", (filters as any).status);
        }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as DbEvent[];
}

/**
 * Update an event's status to 'approved' or 'rejected'.
 * Calls a SECURITY DEFINER RPC so HOD approval bypasses RLS
 * and is validated server-side.
 */
// ─── Event Management ───────────────────────────────────────────────────────
export async function toggleEventFeatured(eventId: string, isFeatured: boolean) {
    const { data, error } = await supabase
        .from("events")
        .update({ is_featured: isFeatured })
        .eq("id", eventId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateEventStatus(
    eventId: string,
    newStatus: "approved" | "rejected" | "changes_requested" | "revision_required",
    comment?: string
): Promise<{ id: string; status: EventStatus }> {
    // Use the SECURITY DEFINER function — avoids RLS blocking HOD updates
    const { data, error } = await supabase.rpc("hod_update_event_status", {
        p_event_id: eventId,
        p_status: newStatus as any,
        p_comment: comment ?? null,
    });

    if (error) {
        // Surface a human-readable message
        throw new Error(error.message ?? "Failed to update event status.");
    }

    return data as { id: string; status: EventStatus };
}

/**
 * Update the governance note for an event.
 */
export async function updateGovernanceNote(eventId: string, note: string) {
    const { error } = await supabase
        .from("events")
        .update({ governance_note: note, updated_at: new Date().toISOString() })
        .eq("id", eventId);
    if (error) throw error;
}

/**
 * Flag an event as archive_requested by HOD.
 */
export async function requestEventArchive(eventId: string, note: string) {
    const { error } = await supabase
        .from("events")
        .update({
            archive_requested: true,
            archive_request_note: note,
            updated_at: new Date().toISOString()
        })
        .eq("id", eventId);
    if (error) throw error;
}


