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
    | "changes_requested";

export type EventType = "standalone" | "umbrella" | "sub_event";

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
    club_id?: string | null;
    is_umbrella?: boolean;
    parent_event_id?: string | null;
    event_type?: EventType;
}

/**
 * Insert a new event row.
 * Throws on error so callers can catch and surface to the user.
 */
export async function insertEvent(payload: EventInsert) {
    const { data, error } = await supabase
        .from("events")
        .insert(payload)
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
    departmentId: string;
}> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) throw new Error("Not authenticated. Please log in first.");

    const { data, error } = await supabase
        .from("users")
        .select("id, department_id")
        .eq("auth_uid", user.id)
        .single();

    if (error || !data) throw new Error("User profile not found. Contact your administrator.");
    if (!data.department_id) throw new Error("Your account has no department assigned. Contact your administrator.");

    return { userId: data.id, departmentId: data.department_id };
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
    banner_url: string | null;       // optional uploaded poster
    registered_count: number;        // denormalised seat counter
    is_archived: boolean;
    event_type: EventType;
    registration_config?: any;       // JSONB config
    compliance_checklist?: any[];    // Compliance items
    // Joined relations
    creator: { full_name: string } | null;
    department: { name: string } | null;
    venue: { name: string; capacity: number } | null;
    club: { name: string } | null;
    event_rounds?: any[];            // Timeline
}

/**
 * Fetch all events with status = 'pending', joined with creator, department, venue.
 * The HoD RLS policy guarantees they only see their own department's events.
 */
export async function fetchPendingEvents(): Promise<DbEvent[]> {
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
            event_type,
            compliance_checklist,
            creator:users!events_creator_id_fkey ( full_name ),
            department:departments ( name ),
            venue:venues ( name, capacity ),
            club:clubs ( name ),
            event_rounds ( * )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as DbEvent[];
}

/**
 * Fetch all events for the current HOD's department, filtered by archival status.
 * This is used for the Governance Archive and historical analysis.
 */
export async function fetchDepartmentEvents(options: { isArchived: boolean }): Promise<DbEvent[]> {
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
            event_type,
            compliance_checklist,
            creator:users!events_creator_id_fkey ( full_name ),
            department:departments ( name ),
            venue:venues ( name, capacity ),
            club:clubs ( name ),
            event_rounds ( * )
        `)
        .eq("is_archived", options.isArchived)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as DbEvent[];
}

/**
 * Fetch approved + live events for the student feed.
 * Sorted by start_time ascending (soonest first).
 * Students see these via the public RLS SELECT policy.
 */
export async function fetchPublicEvents(): Promise<DbEvent[]> {
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
            registration_config,
            creator:users!events_creator_id_fkey ( full_name ),
            department:departments ( name ),
            venue:venues ( name, capacity )
        `)
        .in("status", ["approved", "live", "completed"])
        .order("start_time", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as DbEvent[];
}

/**
 * Update an event's status to 'approved' or 'rejected'.
 * Calls a SECURITY DEFINER RPC so HOD approval bypasses RLS
 * and is validated server-side.
 */
export async function updateEventStatus(
    eventId: string,
    newStatus: EventStatus,
    comment?: string
): Promise<{ id: string; status: EventStatus }> {
    // Use the SECURITY DEFINER function — avoids RLS blocking HOD updates
    const { data, error } = await supabase.rpc("hod_update_event_status", {
        p_event_id: eventId,
        p_status: newStatus,
        p_comment: comment ?? null,
    });

    if (error) {
        // Surface a human-readable message
        throw new Error(error.message ?? "Failed to update event status.");
    }

    return data as { id: string; status: EventStatus };
}


