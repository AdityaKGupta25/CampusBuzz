"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Calendar,
    Users,
    Download,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    Plus,
    RefreshCw,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    FileText,
    Mail,
    Shield,
    Sparkles,
    BarChart3,
    Filter,
    Award,
    Lock,
    Zap,
    LayoutDashboard,
    ArrowRight,
    Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { Badge } from "@/components/ui/Badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventStatus = "draft" | "pending" | "approved" | "rejected" | "live" | "completed" | "changes_requested" | "revision_required" | "archived" | "review_pending";

interface FacultyEvent {
    id: string;
    title: string;
    creator_id: string;
    status: EventStatus;
    start_time: string;
    end_time: string;
    reg_start_time: string | null;
    reg_end_time: string | null;
    registered_count: number;   // normalised from live registrations(count) join
    risk_level: "low" | "medium" | "high";
    venue: { name: string } | null;
    department: { name: string } | null;
    is_archived: boolean;
    governance_note?: string | null;
    rejection_reason?: string | null;
    event_type: "standalone" | "umbrella" | "sub_event";
    creator: { full_name: string; avatar_url: string | null } | null;
}

// Raw shape returned by Supabase for registrations(count)
interface RawEventRow {
    id: string;
    title: string;
    status: string;
    start_time: string;
    end_time: string;
    reg_start_time: string | null;
    reg_end_time: string | null;
    risk_level: string;
    venue: { name: string } | null;
    department: { name: string } | null;
    registered_count: number;
    is_archived: boolean;
    governance_note?: string | null;
    rejection_reason?: string | null;
}

interface Participant {
    registration_id: string;
    status: string;
    created_at: string;
    student: {
        full_name: string;
        email: string;
    } | null;
}

// ─── Certificate ID generator ─────────────────────────────────────────────────

function generateCertHash(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `CB-2026-${rand}`;
}

// ─── Finalize Logic ───────────────────────────────────────────────────────────

interface FinalizeResult {
    issued: number;
}

async function finalizeEvent(eventId: string, institutionId: string): Promise<FinalizeResult> {
    // 1. Mark event as completed
    const { error: evErr } = await supabase
        .from("events")
        .update({ status: "completed" })
        .eq("id", eventId)
        .eq("institution_id", institutionId);
    if (evErr) throw new Error(`Could not close event: ${evErr.message}`);

    // 2. Fetch all attendees from attendance_logs — join with events for tenant security
    const { data: logs, error: logErr } = await supabase
        .from("attendance_logs")
        .select(`
            student_id,
            event:events!inner(institution_id)
        `)
        .eq("event_id", eventId)
        .eq("event.institution_id", institutionId);
    if (logErr) throw new Error(`Could not read attendance: ${logErr.message}`);
    if (!logs || logs.length === 0) return { issued: 0 };

    // 3. Build verified_ledger rows (skip duplicates via onConflict ignore)
    const rows = logs.map((log) => ({
        student_id: log.student_id as string,
        event_id: eventId,
        certificate_hash: generateCertHash(),
        issued_at: new Date().toISOString(),
    }));

    const { error: certErr } = await supabase
        .from("verified_ledger")
        .upsert(rows, { onConflict: "student_id,event_id", ignoreDuplicates: true });
    if (certErr) throw new Error(`Certificate insert failed: ${certErr.message}`);

    return { issued: rows.length };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
    id: number;
    type: "success" | "error";
    message: string;
}

function ToastList({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-2xl pointer-events-auto"
                    style={{
                        background: t.type === "success" ? "rgba(6,30,18,0.97)" : "rgba(30,6,6,0.97)",
                        border: t.type === "success" ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,68,68,0.4)",
                        backdropFilter: "blur(20px)",
                    }}
                >
                    {t.type === "success"
                        ? <Award size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        : <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />}
                    <p className="text-sm font-semibold flex-1" style={{ color: t.type === "success" ? "#6ee7b7" : "#fca5a5" }}>
                        {t.message}
                    </p>
                    <button className="text-white/30 hover:text-white/60 text-xs" onClick={() => onDismiss(t.id)}>
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function FinalizeModal({
    event,
    onCancel,
    onConfirm,
}: {
    event: FacultyEvent;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);

    async function handleConfirm() {
        setBusy(true);
        try { await onConfirm(); } finally { setBusy(false); }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
        >
            <div
                className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)" }}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
                        >
                            <Award size={22} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-extrabold text-lg">Finalize Event</h2>
                            <p className="text-white/40 text-xs">This action cannot be undone</p>
                        </div>
                    </div>

                    <div
                        className="rounded-2xl p-4 mb-4"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                        <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-3">{event.title}</p>
                        <div className="space-y-2">
                            {[
                                { icon: Lock, label: "Event status", value: "Live → Completed" },
                                { icon: Award, label: "Certificates issued", value: "One per checked-in attendee" },
                                { icon: Zap, label: "Format", value: "CB-2026-XXXXXXXXXX" },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-center gap-2.5">
                                    <Icon size={12} className="text-violet-400 flex-shrink-0" />
                                    <span className="text-white/40 text-xs flex-1">{label}</span>
                                    <span className="text-white/70 text-xs font-semibold">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}
                    >
                        <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-300/80 text-xs leading-snug">
                            Only students with an attendance log entry will receive a certificate.
                            Students who registered but didn&apos;t check in will not be issued one.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        id="finalize-cancel-btn"
                        onClick={onCancel}
                        disabled={busy}
                        className="flex-1 h-12 rounded-2xl font-semibold text-sm text-white/50 transition-all disabled:opacity-40"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                        Cancel
                    </button>
                    <button
                        id="finalize-confirm-btn"
                        onClick={() => void handleConfirm()}
                        disabled={busy}
                        className="flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(99,102,241,0.5))", border: "1px solid rgba(124,58,237,0.5)" }}
                    >
                        {busy
                            ? <><Loader2 size={16} className="animate-spin" /> Finalizing…</>
                            : <><Award size={16} /> Issue Certificates</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Status Meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<EventStatus, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
    draft: { label: "Draft", icon: FileText, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
    pending: { label: "Pending", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
    approved: { label: "Approved", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
    live: { label: "Live Now", icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
    completed: { label: "Completed", icon: Shield, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25" },
    changes_requested: { label: "Revision Required", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
    revision_required: { label: "Revision Required", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
    archived: { label: "Archived", icon: Box, color: "text-white/40", bg: "bg-white/5", border: "border-white/10" },
    review_pending: { label: "Strategic Review", icon: Sparkles, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25" },
};

const RISK_COLOR = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-400   bg-amber-500/10   border-amber-500/20",
    high: "text-red-400     bg-red-500/10     border-red-500/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });
}
function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

// Export participants as CSV
function exportCSV(eventTitle: string, participants: Participant[]) {
    const header = ["Student Name", "Email", "Registration Status", "Registered At"];
    const rows = participants.map((p) => [
        p.student?.full_name ?? "—",
        p.student?.email ?? "—",
        p.status,
        fmtDateTime(p.created_at),
    ]);
    const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventTitle.replace(/\s+/g, "_")}_participants.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ─── Participant Row ──────────────────────────────────────────────────────────

function ParticipantRow({ p, idx }: { p: Participant; idx: number }) {
    const initials = (p.student?.full_name ?? "?")
        .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

    const AVATAR_COLORS = ["#7c3aed", "#db2777", "#0891b2", "#059669", "#d97706"];
    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
            {/* Avatar */}
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                style={{ background: avatarColor }}
            >
                {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                    {p.student?.full_name ?? "Unknown Student"}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                    <Mail size={10} className="text-white/30 flex-shrink-0" />
                    <p className="text-white/40 text-xs truncate">{p.student?.email ?? "—"}</p>
                </div>
            </div>

            {/* Status + Time */}
            <div className="flex-shrink-0 text-right">
                <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    p.status === "confirmed" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" :
                        p.status === "attended" ? "text-sky-300 bg-sky-500/10 border-sky-500/25" :
                            p.status === "waitlisted" ? "text-amber-300 bg-amber-500/10 border-amber-500/25" :
                                "text-red-300 bg-red-500/10 border-red-500/25"
                )}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
                <p className="text-white/25 text-[10px] mt-1">{fmtDateTime(p.created_at)}</p>
            </div>
        </div>
    );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
    event,
    onFinalize,
    onArchive,
    institutionId,
    userRole
}: {
    event: FacultyEvent;
    onFinalize: (event: FacultyEvent) => void;
    onArchive?: (event: FacultyEvent) => Promise<void>;
    institutionId?: string;
    userRole?: string;
}) {
    const router = useRouter();
    const { user } = useUser();
    const [archiving, setArchiving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const meta = STATUS_META[event.status] ?? STATUS_META.draft;
    const StatusIcon = meta.icon;
    const isLive = event.status === "live";
    const fillPct = Math.min(100, Math.round((event.registered_count / Math.max(1, 200)) * 100));

    async function loadParticipants() {
        if (loaded && !error) { setExpanded((v) => !v); return; }
        setExpanded(true);
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from("registrations")
                .select(`
                    id,
                    status,
                    created_at,
                    student:users!registrations_student_id_fkey ( full_name, email ),
                    event:events!inner(institution_id)
                `)
                .eq("event_id", event.id)
                .eq("event.institution_id", institutionId || "")
                .order("created_at", { ascending: true });

            if (err) throw err;

            const mapped: Participant[] = (data ?? []).map((r) => ({
                registration_id: r.id as string,
                status: r.status as string,
                created_at: r.created_at as string,
                student: Array.isArray(r.student) ? r.student[0] : r.student as { full_name: string; email: string } | null,
            }));
            setParticipants(mapped);
            setLoaded(true);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load participants.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <article
            className="rounded-2xl overflow-hidden transition-all duration-500"
            style={{
                background: "rgba(255,255,255,0.025)",
                border: (event.status === "revision_required" || event.status === "changes_requested")
                    ? "2px solid rgba(245,158,11,0.5)"
                    : event.status === "rejected"
                        ? "2px solid rgba(239,68,68,0.5)"
                        : "1px solid rgba(255,255,255,0.07)",
                boxShadow: (event.status === "revision_required" || event.status === "changes_requested")
                    ? "0 0 20px rgba(245,158,11,0.1)"
                    : "none"
            }}
        >
            {/* ── Card Header ── */}
            <div className="p-5">
                <div className="flex items-start gap-4">

                    {/* Left: event info */}
                    <div className="flex-1 min-w-0">
                        {/* Status + risk badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={cn(
                                "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                                meta.bg, meta.color, meta.border,
                            )}>
                                <StatusIcon size={10} />
                                {meta.label}
                                {isLive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping inline-block" />
                                )}
                            </span>

                            {/* Sub-state Indicator for Approved/Live Events */}
                            {(event.status === 'approved' || event.status === 'live') && (
                                (() => {
                                    const now = new Date();
                                    const start = new Date(event.start_time);
                                    const end = new Date(event.end_time);
                                    const regStart = event.reg_start_time ? new Date(event.reg_start_time) : null;
                                    const regEnd = event.reg_end_time ? new Date(event.reg_end_time) : null;

                                    if (now >= start && now <= end) {
                                        return (
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                                <Zap size={10} /> LIVE NOW
                                            </span>
                                        );
                                    }
                                    if (regStart && regEnd) {
                                        if (now < regStart) {
                                            return (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-zinc-500/10 border-zinc-500/30 text-zinc-400">
                                                    <Clock size={10} /> PRE-REGISTRATION
                                                </span>
                                            );
                                        }
                                        if (now >= regStart && now <= regEnd) {
                                            return (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                                                    <RefreshCw size={10} className="animate-spin-slow" /> ENROLLMENT OPEN
                                                </span>
                                            );
                                        }
                                        if (now > regEnd && now < start) {
                                            return (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400">
                                                    <Lock size={10} /> ENROLLMENT CLOSED
                                                </span>
                                            );
                                        }
                                    }
                                    return null;
                                })()
                            )}

                            <span className={cn(
                                "inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize",
                                RISK_COLOR[event.risk_level]
                            )}>
                                {event.risk_level} risk
                            </span>
                            {event.status === "review_pending" && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse">
                                    💎 Student Work Ready
                                </span>
                            )}
                            {userRole !== "admin" && user?.dbId !== event.creator_id && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400">
                                    {event.creator?.avatar_url ? (
                                        <img src={event.creator.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full border border-fuchsia-500/30" />
                                    ) : (
                                        <Zap size={10} />
                                    )}
                                    🤝 CO-HOSTED ({event.creator?.full_name || "Partner"})
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3
                            onClick={() => router.push(`/faculty/event/${event.id}/manage`)}
                            className="text-white font-extrabold text-base leading-snug truncate pr-2 cursor-pointer hover:text-cyan-400 transition-colors"
                        >
                            {event.title}
                        </h3>

                        {/* Date + venue */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            <span className="flex items-center gap-1.5 text-white/40 text-xs">
                                <Calendar size={11} />
                                {fmtDate(event.start_time)}
                            </span>
                            {event.venue && (
                                <span className="flex items-center gap-1.5 text-white/40 text-xs">
                                    <Shield size={11} />
                                    {event.venue.name}
                                </span>
                            )}
                        </div>

                        {/* MANAGE BUTTON for drafts or all */}
                        {/* MANAGE BUTTON for drafts or all */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/faculty/event/${event.id}/manage`);
                            }}
                            className={cn(
                                "mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold group",
                                event.event_type === "umbrella"
                                    ? "w-full bg-cyan-500 text-black border border-cyan-400 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                                    : "bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-white"
                            )}
                        >
                            <LayoutDashboard size={12} className={event.event_type === "umbrella" ? "text-black" : "text-cyan-400"} />
                            {event.event_type === "umbrella" ? "Manage Mega Fest Dashboard" : "Manage Event Dashboard"}
                            <ArrowRight size={12} className={cn(
                                "transition-all",
                                event.event_type === "umbrella" ? "translate-x-0" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
                            )} />
                        </button>
                    </div>

                    {/* Right: registration count */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 text-center">
                        <div
                            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center"
                            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}
                        >
                            <span className="text-indigo-300 font-black text-xl leading-none">
                                {event.registered_count}
                            </span>
                            <span className="text-indigo-300/60 text-[9px] font-semibold mt-0.5">reg.</span>
                        </div>
                    </div>
                </div>

                {/* Mini fill-bar */}
                {event.registered_count > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white/30 text-[10px] flex items-center gap-1">
                                <Users size={9} /> {event.registered_count} registered
                            </span>
                            <span className="text-white/30 text-[10px]">{fillPct}% capacity</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                                style={{ width: `${fillPct}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Finalize Event button — only for live events */}
                {event.status === "live" && (
                    <button
                        id={`finalize-event-${event.id}`}
                        onClick={() => onFinalize(event)}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                        style={{
                            background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.12))",
                            border: "1px solid rgba(124,58,237,0.35)",
                            color: "#c4b5fd",
                        }}
                    >
                        <Award size={14} />
                        Close Event &amp; Issue Certificates
                    </button>
                )}

                {/* Move to Archive — for completed or rejected events */}
                {(event.status === "completed" || event.status === "rejected") && onArchive && (
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            setArchiving(true);
                            await onArchive(event);
                            setArchiving(false);
                        }}
                        disabled={archiving}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
                    >
                        {archiving ? <Loader2 size={12} className="animate-spin" /> : <Box size={12} />}
                        Move to Archive
                    </button>
                )}

                {/* Audit and Submit to HOD button — only for review_pending */}
                {event.status === "review_pending" && (
                    <button
                        onClick={() => router.push(`/faculty/event/${event.id}/manage`)}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 bg-white text-black shadow-xl shadow-white/5"
                    >
                        🔍 Audit & Submit to HOD
                        <ArrowRight size={14} />
                    </button>
                )}

                {/* HOD Feedback Box */}
                {(event.status === "rejected" || event.status === "changes_requested" || event.status === "revision_required") && (
                    <div className={cn(
                        "mt-5 p-4 rounded-2xl border-2 border-dashed flex flex-col gap-3",
                        event.status === "rejected" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} className={event.status === "rejected" ? "text-red-400" : "text-amber-400"} />
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em]",
                                    event.status === "rejected" ? "text-red-400" : "text-amber-400"
                                )}>
                                    {event.status === "rejected"
                                        ? "HOD Rejection"
                                        : (event.status === "revision_required")
                                            ? (userRole === "student" ? "⚠️ FACULTY FEEDBACK" : "📤 FEEDBACK SENT TO STUDENT")
                                            : "⚠️ HOD FEEDBACK"
                                    }
                                </span>
                            </div>
                            {(event.status === "changes_requested" || (event.status === "revision_required" && userRole === "student") || (event.status === "rejected" && userRole !== "student")) && (
                                <button
                                    onClick={() => router.push(`/faculty/event/${event.id}/manage`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                                >
                                    {event.status === "rejected" ? "Review & Re-submit" : "Fix & Resubmit"}
                                    <ArrowRight size={10} />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-white/70 font-medium italic leading-relaxed">
                            "{event.governance_note || event.rejection_reason || "No specific feedback provided. Please contact your department head."}"
                        </p>
                    </div>
                )}


                {/* Toggle participants */}
                <button
                    id={`toggle-participants-${event.id}`}
                    onClick={() => void loadParticipants()}
                    disabled={loading}
                    className="mt-3 w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                    <span className="flex items-center gap-2 text-sm font-semibold text-white/60">
                        {loading
                            ? <><Loader2 size={13} className="animate-spin text-indigo-400" /> Loading participants…</>
                            : <><Users size={13} className="text-indigo-400" /> View Participants ({event.registered_count})</>
                        }
                    </span>
                    {!loading && (expanded
                        ? <ChevronUp size={15} className="text-white/30" />
                        : <ChevronDown size={15} className="text-white/30" />
                    )}
                </button>
            </div>

            {/* ── Participant Accordion ── */}
            {
                expanded && (
                    <div
                        className="border-t"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                        {/* Participant list header */}
                        <div
                            className="flex items-center justify-between px-5 py-3"
                            style={{ background: "rgba(99,102,241,0.04)" }}
                        >
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                <Users size={12} /> Participant List
                            </span>
                            {participants.length > 0 && (
                                <button
                                    id={`export-csv-${event.id}`}
                                    onClick={() => exportCSV(event.title, participants)}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-xl"
                                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                                >
                                    <Download size={11} /> Export CSV
                                </button>
                            )}
                        </div>

                        <div className="px-4 pb-4 pt-2 space-y-2">
                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-400 py-3 px-4 rounded-xl"
                                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            {/* Empty */}
                            {!loading && !error && participants.length === 0 && (
                                <div className="text-center py-8">
                                    <Users size={28} className="text-white/10 mx-auto mb-2" />
                                    <p className="text-white/30 text-sm">No registrations yet</p>
                                </div>
                            )}

                            {/* Rows */}
                            {participants.map((p, i) => (
                                <ParticipantRow key={p.registration_id} p={p} idx={i} />
                            ))}
                        </div>
                    </div>
                )
            }
        </article >
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EventSkeleton() {
    return (
        <div
            className="rounded-2xl p-5 animate-pulse space-y-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/8 rounded-full w-24" />
                    <div className="h-5 bg-white/10 rounded-xl w-4/5" />
                    <div className="h-3 bg-white/5 rounded-full w-2/5" />
                </div>
                <div className="w-14 h-14 bg-white/8 rounded-2xl flex-shrink-0" />
            </div>
            <div className="h-2 bg-white/5 rounded-full" />
            <div className="h-9 bg-white/5 rounded-xl" />
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-5 py-24 px-8 text-center">
            <div className="relative">
                <div
                    className="w-24 h-24 rounded-3xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                    <Calendar size={36} className="text-white/15" />
                </div>
                <div className="absolute inset-0 blur-2xl rounded-3xl opacity-20"
                    style={{ background: "rgba(99,102,241,0.4)" }} />
            </div>
            <div>
                <h2 className="text-white text-xl font-extrabold">No Events Yet</h2>
                <p className="text-white/40 text-sm mt-2 leading-relaxed max-w-[260px] mx-auto">
                    You haven&apos;t created any events. Start by creating your first event for review.
                </p>
            </div>
            <button
                id="create-first-event-btn"
                onClick={onCreateClick}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)" }}
            >
                <Plus size={15} className="text-indigo-400" />
                Create Event
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type StatusFilter = "all" | EventStatus;

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "review_pending", label: "Review" },
    { key: "live", label: "Live" },
    { key: "revision_required", label: "In Revision" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "completed", label: "Completed" },
    { key: "draft", label: "Drafts" },
    { key: "rejected", label: "Rejected" },
];

export default function FacultyMyEventsPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center text-white/40"><Loader2 size={24} className="animate-spin" /></div>}>
            <FacultyMyEventsContent />
        </React.Suspense>
    );
}

function FacultyMyEventsContent() {
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [events, setEvents] = useState<FacultyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");
    const [showArchived, setShowArchived] = useState(false);

    // ── Finalize modal ──
    const [modalEvent, setModalEvent] = useState<FacultyEvent | null>(null);

    // ── Toast system ──
    const toastCounter = useRef(0);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);

    const pushToast = useCallback((type: ToastMsg["type"], message: string) => {
        const id = ++toastCounter.current;
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // ── Finalize handler ──
    // Handle URL params
    useEffect(() => {
        const archivedParam = searchParams.get("archived");
        const isArchiveView = archivedParam === "true";
        setShowArchived(isArchiveView);
        setFilter("all");
    }, [searchParams]);

    const handleFinalize = useCallback(async (): Promise<void> => {
        if (!modalEvent || !user?.institution_id) return;
        const eventId = modalEvent.id;
        const eventTitle = modalEvent.title;
        const insId = user.institution_id;
        setModalEvent(null);   // close modal immediately
        try {
            const { issued } = await finalizeEvent(eventId, insId);
            // Remove/update the event in local state so the card turns to 'completed'
            setEvents((prev) =>
                prev.map((e) => e.id === eventId ? { ...e, status: "completed" as EventStatus } : e)
            );
            pushToast(
                "success",
                issued > 0
                    ? `Event closed. ${issued} certificate${issued !== 1 ? "s" : ""} issued successfully.`
                    : `"${eventTitle}" closed. No attendees checked in — no certificates issued.`
            );
        } catch (err: unknown) {
            pushToast("error", err instanceof Error ? err.message : "Failed to finalize event.");
        }
    }, [modalEvent, user, pushToast]);

    const handleMoveToArchive = useCallback(async (event: FacultyEvent) => {
        if (!user?.institution_id) return;
        try {
            const { error } = await supabase
                .from("events")
                .update({ status: "archived" })
                .eq("id", event.id)
                .eq("institution_id", user.institution_id);

            if (error) throw error;

            // Remove from local state and show toast
            setEvents(prev => prev.filter(e => e.id !== event.id));
            pushToast("success", `"${event.title}" has been migrated to institutional archives.`);
        } catch (err: any) {
            pushToast("error", "Archival failed: " + err.message);
        }
    }, [user?.institution_id, pushToast]);

    const loadEvents = useCallback(async () => {
        if (!user?.dbId || !user?.institution_id) return;

        const institutionId = user.institution_id;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Event IDs where user is assigned as a Host/Staff (Co-Ownership logic)
            const { data: staffRecords } = await supabase
                .from("event_staff")
                .select("event_id")
                .eq("student_id", user.dbId);
            
            const coHostIds = (staffRecords ?? []).map(r => r.event_id);

            // 2. Build the primary Governance Query
            let query = supabase
                .from("events")
                .select(`
                    *,
                    registrations(count),
                    venue:venues ( name ),
                    department:departments ( name ),
                    creator:users!events_creator_id_fkey ( full_name, avatar_url )
                `)
                .eq("institution_id", institutionId)
                .neq("event_type", "sub_event");

            // 3. Filter: (User is Creator) OR (User is Co-Host)
            if (coHostIds.length > 0) {
                query = query.or(`creator_id.eq.${user.dbId},id.in.(${coHostIds.join(',')})`);
            } else {
                query = query.eq("creator_id", user.dbId);
            }

            if (showArchived) {
                query = query.eq("status", "archived");
            } else {
                query = query.neq("status", "archived");
            }

            const { data, error: evErr } = await query.order("created_at", { ascending: false });

            if (evErr) {
                console.error("DEBUG SUPABASE ERROR:", evErr.message, evErr.details, evErr.hint);
                throw evErr;
            }

            const normalised: FacultyEvent[] = (data ?? []).map((row: any) => ({
                id: row.id,
                title: row.title,
                creator_id: row.creator_id,
                status: row.status as EventStatus,
                start_time: row.start_time,
                end_time: row.end_time,
                reg_start_time: row.reg_start_time,
                reg_end_time: row.reg_end_time,
                risk_level: row.risk_level as FacultyEvent["risk_level"],
                venue: row.venue,
                department: row.department,
                registered_count: row.registrations?.[0]?.count ?? 0,
                is_archived: row.is_archived || false,
                governance_note: row.governance_note,
                rejection_reason: row.rejection_reason,
                event_type: row.event_type,
                creator: row.creator
            }));

            setEvents(normalised);
        } catch (e: any) {
            const msg = e?.message || String(e);
            console.error("[Faculty My Events] Load Failure:", msg);
            setError(msg);
            pushToast("error", "Database Error: " + msg);
        } finally {
            setLoading(false);
        }
    }, [user, showArchived, pushToast]);

    useEffect(() => { void loadEvents(); }, [loadEvents]);

    // Stats
    const totalRegs = events.reduce((s, e) => s + e.registered_count, 0);
    const liveCount = events.filter((e) => e.status === "live").length;
    const pendingCount = events.filter((e) => e.status === "pending").length;
    const reviewCount = events.filter((e) => e.status === "review_pending").length;

    // Filtered + searched events
    const filtered = events
        .filter((e) => {
            if (filter === "all") return true;
            if (filter === "revision_required") return e.status === "revision_required" || e.status === "changes_requested";
            return e.status === filter;
        })
        .filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()));

    // Export ALL events as CSV summary
    function exportAllCSV() {
        const header = ["Event Title", "Status", "Date", "Venue", "Total Registrations"];
        const rows = filtered.map((e) => [
            e.title,
            e.status,
            fmtDate(e.start_time),
            e.venue?.name ?? "TBA",
            e.registered_count,
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "my_events.csv"; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-h-screen font-sans pb-16" style={{ color: "white" }}>

            <header
                className="sticky top-0 z-30 px-5 pt-5 pb-4"
                style={{
                    background: "rgba(9,9,15,0.94)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(20px)",
                }}
            >
                <div className="flex items-center gap-4 mb-5">
                    <div className="flex-1">
                        <p className="text-white/40 text-xs font-medium">{showArchived ? "Institutional Registry" : "Faculty Dashboard"}</p>
                        <h1 className="text-white font-extrabold text-xl leading-tight">{showArchived ? "Archived Events" : "My Events"}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            id="refresh-btn"
                            onClick={() => void loadEvents()}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-white/5 border border-white/10"
                        >
                            <RefreshCw size={15} className={cn("text-white/50", loading && "animate-spin")} />
                        </button>

                        <button
                            id="archive-toggle-btn"
                            onClick={() => {
                                setShowArchived(!showArchived);
                                setFilter("all");
                            }}
                            className={cn(
                                "h-10 px-4 rounded-2xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest leading-none border",
                                showArchived
                                    ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20"
                                    : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-white"
                            )}
                        >
                            <Box size={14} />
                            {showArchived ? "Viewing Archives" : "Archives"}
                        </button>
                        <button
                            id="create-event-btn"
                            onClick={() => router.push("/faculty/create-event")}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
                            style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.4)" }}
                        >
                            <Plus size={14} className="text-indigo-300" />
                            New
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                {!loading && events.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { label: "Total Events", value: events.length, color: "#818cf8" },
                            { label: "Registrations", value: totalRegs, color: "#34d399" },
                            reviewCount > 0
                                ? { label: "Awaiting Review", value: reviewCount, color: "#22d3ee" }
                                : { label: "Live Now", value: liveCount, color: "#a78bfa" },
                        ].map(({ label, value, color }) => (
                            <div
                                key={label}
                                className="rounded-2xl px-3 py-2.5 text-center"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                                <p className="font-black text-lg leading-none transition-all duration-500" style={{ color }}>{value}</p>
                                <p className="text-white/35 text-[10px] font-medium mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search bar */}
                <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                    <Search size={14} className="text-white/30 flex-shrink-0" />
                    <input
                        id="search-events"
                        type="text"
                        placeholder="Search events…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm placeholder-white/25 outline-none"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60">
                            <XCircle size={14} />
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                    {FILTER_TABS.map(({ key, label }) => {
                        const count = key === "all"
                            ? events.length
                            : (key === "revision_required")
                                ? events.filter((e) => e.status === "revision_required" || e.status === "changes_requested").length
                                : events.filter((e) => e.status === key).length;
                        if (count === 0 && key !== "all") return null;
                        const isActive = filter === key;
                        return (
                            <button
                                key={key}
                                id={`filter-${key}`}
                                onClick={() => setFilter(key)}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                                    isActive
                                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                        : "bg-white/5 border-white/8 text-white/35 hover:text-white/60"
                                )}
                            >
                                {label}
                                {count > 0 && (
                                    <span className={cn(
                                        "min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[9px] font-black",
                                        isActive ? "bg-indigo-500/40 text-indigo-200" : "bg-white/10 text-white/35"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="px-4 pt-5 space-y-4">

                {/* Error */}
                {error && (
                    <div
                        className="flex items-start gap-3 rounded-2xl p-4 text-sm"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
                    >
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold">Failed to load events</p>
                            <p className="text-xs mt-0.5 opacity-70">{error}</p>
                        </div>
                        <button onClick={() => void loadEvents()} className="text-xs font-bold text-red-300 flex items-center gap-1">
                            <RefreshCw size={11} /> Retry
                        </button>
                    </div>
                )}

                {/* Loading skeletons */}
                {loading && (
                    <>
                        <EventSkeleton />
                        <EventSkeleton />
                        <EventSkeleton />
                    </>
                )}

                {/* Empty */}
                {!loading && !error && events.length === 0 && (
                    <EmptyState onCreateClick={() => router.push("/faculty/create-event")} />
                )}

                {/* No results for current filter/search */}
                {!loading && !error && events.length > 0 && filtered.length === 0 && (
                    <div className="text-center py-16">
                        <Filter size={28} className="text-white/15 mx-auto mb-3" />
                        <p className="text-white/35 text-sm">No events match your filter</p>
                        <button
                            onClick={() => { setFilter("all"); setSearch(""); }}
                            className="mt-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                {/* Export all + count row */}
                {!loading && filtered.length > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-white/35">
                            <BarChart3 size={12} />
                            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
                            {totalRegs > 0 && ` · ${totalRegs} total registrations`}
                        </div>
                        <button
                            id="export-all-csv-btn"
                            onClick={exportAllCSV}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-xl"
                            style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)" }}
                        >
                            <Download size={11} /> Export All CSV
                        </button>
                    </div>
                )}

                {/* Event cards */}
                {!loading && filtered.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        onFinalize={(ev) => setModalEvent(ev)}
                        onArchive={handleMoveToArchive}
                        institutionId={user?.institution_id || ""}
                        userRole={user?.role}
                    />
                ))}

                {/* Bottom hint */}
                {!loading && filtered.length > 0 && (
                    <p className="text-center text-[11px] text-white/20 pt-2 pb-4">
                        Tap an event to expand the participant list
                    </p>
                )}
            </main>

            {/* ── Finalize Confirmation Modal ── */}
            {modalEvent && (
                <FinalizeModal
                    event={modalEvent}
                    onCancel={() => setModalEvent(null)}
                    onConfirm={handleFinalize}
                />
            )}

            {/* ── Toast Notifications ── */}
            <ToastList toasts={toasts} onDismiss={dismissToast} />

            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
}
