import { type DbEvent } from "@/lib/supabase";

export type RiskLevel = "low" | "medium" | "high";
export type EventStatus = "pending" | "approved" | "rejected" | "changes_requested" | "revision_required" | "draft" | "live" | "completed" | "archived";

export interface HodEvent {
    id: string;
    title: string;
    faculty: string;       // users.full_name
    department: string;    // departments.name
    club: string;          // clubs.name
    startDate: string;     // ISO string
    endDate: string;       // ISO string
    budgetRequired: number;
    riskLevel: RiskLevel;
    venue: string;         // venues.name
    description: string;
    submittedAt: string;   // created_at
    status: EventStatus | string;
    isArchived: boolean;
    governanceNote?: string | null;
    rejectionReason?: string | null;
    archiveRequested?: boolean;
    archiveRequestNote?: string | null;
    isFeatured: boolean;
    eventType: string;
    complianceChecklist: { id: string; label: string; checked: boolean }[];
    rounds: any[];
    bannerUrl?: string;
    prizes?: any[];
    registeredCount?: number;
    capacity?: number;
    impactStats?: {
        totalAttendance: number;
        deptsReached: number;
        avgScore: number;
    };
}

export function mapDbEventToHodEvent(row: DbEvent): HodEvent {
    // Explicitly casting status to EventStatus if it matches, otherwise string
    return {
        id: row.id,
        title: row.title,
        faculty: row.creator?.full_name ?? "Unknown",
        department: row.department?.name ?? "—",
        club: (row as any).club?.name ?? "Independant",
        startDate: row.start_time,
        endDate: row.end_time,
        budgetRequired: Number(row.budget_required),
        riskLevel: row.risk_level as RiskLevel,
        venue: row.venue?.name ?? "TBD",
        description: row.description ?? "",
        submittedAt: row.created_at,
        status: row.status,
        isArchived: row.is_archived,
        governanceNote: row.governance_note,
        rejectionReason: row.rejection_reason,
        archiveRequested: row.archive_requested,
        archiveRequestNote: row.archive_request_note,
        eventType: (row as any).event_type,
        complianceChecklist: (row as any).compliance_checklist ?? [],
        rounds: (row as any).event_rounds ?? [],
        bannerUrl: row.banner_url ?? undefined,
        isFeatured: row.is_featured ?? false,
    };
}

export function formatSubmittedAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
