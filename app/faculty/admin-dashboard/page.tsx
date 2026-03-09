"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Shield, Activity, Users, BookOpen, GraduationCap,
    AlertTriangle, ChevronRight, RefreshCw, TrendingUp,
    Building2, CalendarDays, CheckCircle2, XCircle,
    Loader2, Gavel, FileWarning, BarChart3, Zap,
    ArrowUpRight, Clock, Eye, UploadCloud,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalStats {
    totalEvents: number;
    activeStudents: number;
    facultyWithEvents: number;
    certLedgerSize: number;
    liveEvents: number;
    pendingApprovals: number;
    highRiskEvents: number;
    escalatedCount: number;
}

interface DeptReport {
    id: string;
    name: string;
    hod_name: string | null;
    total_events: number;
    live_events: number;
    pending_events: number;
    high_risk_count: number;
    student_count: number;
    budget_cap: number;
    budget_used: number;
}

interface EscalatedEvent {
    id: string;
    title: string;
    risk_level: string;
    status: string;
    department_name: string;
    creator_name: string;
    created_at: string;
    comment: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return String(n);
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function riskColor(level: string) {
    if (level === "high") return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (level === "medium") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-xl bg-zinc-800/60", className)} />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    sub?: string;
    accent: string;
    delay?: number;
    loading?: boolean;
}

function StatCard({ icon, label, value, sub, accent, delay = 0, loading }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: "easeOut" }}
            className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 overflow-hidden group hover:border-zinc-700 transition-all"
        >
            {/* Blue admin glow top-left */}
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />

            <div className="relative z-10 space-y-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", accent)}>
                    {icon}
                </div>
                <div>
                    {loading
                        ? <Skeleton className="h-8 w-20 mb-1" />
                        : <p className="text-3xl font-black text-white tracking-tight">{value}</p>
                    }
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{label}</p>
                    {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Department Card ─────────────────────────────────────────────────────────

function DeptCard({ dept, index }: { dept: DeptReport; index: number }) {
    const router = useRouter();
    const totalNonDraft = dept.total_events;
    const liveRatio = totalNonDraft > 0 ? (dept.live_events / totalNonDraft) * 100 : 0;
    const budgetRatio = dept.budget_cap > 0 ? (dept.budget_used / dept.budget_cap) * 100 : 0;
    const hasHighRisk = dept.high_risk_count > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.4, ease: "easeOut" }}
            className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-blue-500/30 hover:bg-zinc-900/80 transition-all"
            style={{ boxShadow: "0 0 0 0 rgba(59,130,246,0)" }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(59,130,246,0.06)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 rgba(59,130,246,0)";
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{dept.name}</p>
                        <p className="text-[10px] text-zinc-600 truncate">
                            {dept.hod_name ? `HOD: ${dept.hod_name}` : "HOD: Unassigned"}
                        </p>
                    </div>
                </div>
                {hasHighRisk && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <AlertTriangle size={9} /> {dept.high_risk_count} High Risk
                    </span>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-center">
                {[
                    { label: "Events", value: dept.total_events },
                    { label: "Live", value: dept.live_events },
                    { label: "Pending", value: dept.pending_events },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-zinc-950/60 rounded-xl py-2.5 border border-zinc-800">
                        <p className="text-base font-black text-white">{value}</p>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{label}</p>
                    </div>
                ))}
            </div>

            {/* Active events bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Event Activity</p>
                    <p className="text-[9px] font-bold text-zinc-500">{Math.round(liveRatio)}%</p>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${liveRatio}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    />
                </div>
            </div>

            {/* Budget bar */}
            {dept.budget_cap > 0 && (
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Budget</p>
                        <p className="text-[9px] font-bold text-zinc-500">
                            ₹{(dept.budget_used / 1000).toFixed(0)}k / ₹{(dept.budget_cap / 1000).toFixed(0)}k
                        </p>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(budgetRatio, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
                            className={cn("h-full rounded-full", budgetRatio > 85 ? "bg-rose-500" : "bg-emerald-500")}
                        />
                    </div>
                </div>
            )}

            {/* CTA */}
            <button
                onClick={() => router.push(`/faculty/explore?dept=${dept.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-800 hover:text-blue-400 hover:border-blue-500/30 transition-all group/btn"
            >
                View Dept Report <ChevronRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
        </motion.div>
    );
}

// ─── Escalation Row ──────────────────────────────────────────────────────────

function EscalationRow({ event, index }: { event: EscalatedEvent; index: number }) {
    const router = useRouter();
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * index, duration: 0.35 }}
            className="flex items-center gap-4 p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-amber-500/25 hover:bg-zinc-900/70 transition-all group cursor-pointer"
            onClick={() => router.push(`/faculty/event/${event.id}/manage`)}
        >
            {/* Risk pill */}
            <span className={cn("shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", riskColor(event.risk_level))}>
                {event.risk_level}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                    {event.department_name} · By {event.creator_name} · {fmtDate(event.created_at)}
                </p>
                {event.comment && (
                    <p className="text-[10px] text-amber-500/70 mt-0.5 italic truncate">
                        "{event.comment}"
                    </p>
                )}
            </div>

            {/* Status */}
            <div className="shrink-0 flex items-center gap-2">
                <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                    Escalated
                </span>
                <ArrowUpRight size={13} className="text-zinc-700 group-hover:text-amber-400 transition-colors" />
            </div>
        </motion.div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onGetStarted }: { onGetStarted: () => void }) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
            {/* ambient glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center top, rgba(59,130,246,0.09) 0%, transparent 70%)" }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 max-w-lg w-full text-center space-y-8"
            >
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
                        style={{ boxShadow: "0 0 60px rgba(59,130,246,0.15)" }}>
                        <Building2 size={40} className="text-blue-400" />
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">
                            Institution Not Configured
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Your campus is an empty canvas.
                    </h1>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        No departments, faculty, or students have been onboarded yet.
                        Start by uploading your college roster to bring the platform to life.
                    </p>
                </div>

                {/* Primary CTA */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGetStarted}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-sm"
                    style={{
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                        boxShadow: "0 16px 40px rgba(59,130,246,0.25)",
                    }}
                >
                    <UploadCloud size={18} />
                    🚀 Get Started: Upload your College Roster via Bulk Onboard
                </motion.button>

                {/* Steps */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                        { step: "01", label: "Upload CSV", desc: "Faculty, students, HODs" },
                        { step: "02", label: "Auto-Dept", desc: "Departments are created" },
                        { step: "03", label: "Go Live", desc: "Platform is ready" },
                    ].map(({ step, label, desc }) => (
                        <div key={step} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-left space-y-1">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{step}</p>
                            <p className="text-xs font-bold text-white">{label}</p>
                            <p className="text-[10px] text-zinc-600">{desc}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
    const { user } = useUser();
    const router = useRouter();

    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [depts, setDepts] = useState<DeptReport[]>([]);
    const [escalated, setEscalated] = useState<EscalatedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [isEmpty, setIsEmpty] = useState(false);

    const loadData = useCallback(async () => {
        if (!user?.institution_id) return;
        const institutionId = user.institution_id;

        setLoading(true);
        try {
            // ── Parallel fetches ──────────────────────────────────────
            const [
                eventsRes,
                studentsRes,
                facultyRes,
                ledgerRes,
                liveRes,
                pendingRes,
                highRiskRes,
                escalatedRes,
                deptsRes,
            ] = await Promise.all([
                // Total events
                supabase.from("events").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
                // Active students
                supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student").eq("institution_id", institutionId),
                // Faculty who created at least one event (distinct creator_id count)
                supabase.from("events").select("creator_id", { count: "exact", head: true }).eq("institution_id", institutionId),
                // Cert ledger
                supabase.from("verified_ledger").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
                // Live events
                supabase.from("events").select("id", { count: "exact", head: true }).in("status", ["live", "approved"]).eq("institution_id", institutionId),
                // Pending approvals
                supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending").eq("institution_id", institutionId),
                // High risk events
                supabase.from("events").select("id", { count: "exact", head: true }).eq("risk_level", "high").eq("institution_id", institutionId),
                // Escalated decisions (approvals with status = escalated)
                supabase.from("approvals")
                    .select(`
                        id,
                        comment,
                        event:events!approvals_event_id_fkey!inner(
                            id, title, risk_level, status, created_at,
                            institution_id,
                            department:departments(name),
                            creator:users!events_creator_id_fkey(full_name)
                        )
                    `)
                    .eq("status", "escalated")
                    .eq("event.institution_id", institutionId)
                    .order("created_at", { ascending: false })
                    .limit(10),
                // Departments with joined HOD
                supabase.from("departments").select(`
                    id, name, budget_cap, budget_used
                `).eq("institution_id", institutionId).order("name"),
            ]);

            // ── Process escalated ─────────────────────────────────────
            const escalatedList: EscalatedEvent[] = (escalatedRes.data ?? []).map((a: any) => ({
                id: a.event?.id ?? "",
                title: a.event?.title ?? "Untitled",
                risk_level: a.event?.risk_level ?? "low",
                status: a.event?.status ?? "pending",
                department_name: a.event?.department?.name ?? "—",
                creator_name: a.event?.creator?.full_name ?? "Unknown",
                created_at: a.event?.created_at ?? new Date().toISOString(),
                comment: a.comment ?? null,
            })).filter((e: EscalatedEvent) => e.id);

            // ── Process departments with per-dept event counts ─────────
            const rawDepts = deptsRes.data ?? [];
            const deptIds = rawDepts.map((d: any) => d.id);

            // Fetch event counts per dept in one query
            const { data: deptEvents } = await supabase
                .from("events")
                .select("department_id, status, risk_level")
                .in("department_id", deptIds)
                .eq("institution_id", institutionId);

            // Fetch HOD per dept
            const { data: hods } = await supabase
                .from("users")
                .select("department_id, full_name")
                .eq("role", "hod")
                .in("department_id", deptIds)
                .eq("institution_id", institutionId);

            // Fetch student counts per dept
            const { data: deptStudents } = await supabase
                .from("users")
                .select("department_id")
                .eq("role", "student")
                .in("department_id", deptIds)
                .eq("institution_id", institutionId);

            const eventsByDept = new Map<string, typeof deptEvents>();
            (deptEvents ?? []).forEach((ev: any) => {
                if (!eventsByDept.has(ev.department_id)) eventsByDept.set(ev.department_id, []);
                eventsByDept.get(ev.department_id)!.push(ev);
            });

            const hodByDept = new Map<string, string>();
            (hods ?? []).forEach((h: any) => hodByDept.set(h.department_id, h.full_name));

            const studentsByDept = new Map<string, number>();
            (deptStudents ?? []).forEach((s: any) => {
                studentsByDept.set(s.department_id, (studentsByDept.get(s.department_id) ?? 0) + 1);
            });

            const deptReports: DeptReport[] = rawDepts.map((d: any) => {
                const events = eventsByDept.get(d.id) ?? [];
                return {
                    id: d.id,
                    name: d.name,
                    hod_name: hodByDept.get(d.id) ?? null,
                    total_events: events.length,
                    live_events: events.filter((e: any) => ["live", "approved"].includes(e.status)).length,
                    pending_events: events.filter((e: any) => e.status === "pending").length,
                    high_risk_count: events.filter((e: any) => e.risk_level === "high").length,
                    student_count: studentsByDept.get(d.id) ?? 0,
                    budget_cap: Number(d.budget_cap) ?? 0,
                    budget_used: Number(d.budget_used) ?? 0,
                };
            });

            setStats({
                totalEvents: eventsRes.count ?? 0,
                activeStudents: studentsRes.count ?? 0,
                facultyWithEvents: facultyRes.count ?? 0,
                certLedgerSize: ledgerRes.count ?? 0,
                liveEvents: liveRes.count ?? 0,
                pendingApprovals: pendingRes.count ?? 0,
                highRiskEvents: highRiskRes.count ?? 0,
                escalatedCount: escalatedList.length,
            });
            setDepts(deptReports);
            setEscalated(escalatedList);
            setLastRefresh(new Date());

            // ── Empty-state detection: no depts AND no faculty = fresh install
            const noData =
                (deptsRes.data?.length ?? 0) === 0 &&
                (facultyRes.count ?? 0) === 0;
            setIsEmpty(noData);
        } catch (err) {
            console.error("[AdminDashboard] load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadData(); }, [loadData]);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!loading && isEmpty) {
        return <EmptyState onGetStarted={() => router.push("/faculty/bulk-onboard")} />;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">

            {/* ── Ambient blue glow ── */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none z-0"
                style={{ background: "radial-gradient(ellipse at center top, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10">

                {/* ══════════════════════════════════════════════
                    HEADER
                ══════════════════════════════════════════════ */}
                <div className="flex items-start justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Shield size={15} className="text-blue-400" />
                            </div>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">
                                Admin Command Center
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">
                                Super Admin
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                            Campus Intelligence &amp; Governance
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            Real-time oversight of all departments and events • {user?.full_name ?? "Admin"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden md:block">
                            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Last refreshed</p>
                            <p className="text-xs text-zinc-500 font-medium">
                                {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}
                            </p>
                        </div>
                        <button
                            onClick={() => void loadData()}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-40"
                        >
                            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════
                    STATS ROW
                ══════════════════════════════════════════════ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<CalendarDays size={17} className="text-blue-400" />}
                        label="Total Events"
                        value={stats ? fmt(stats.totalEvents) : 0}
                        sub={stats ? `${stats.liveEvents} currently live` : undefined}
                        accent="bg-blue-500/10 border-blue-500/20"
                        delay={0}
                        loading={loading}
                    />
                    <StatCard
                        icon={<GraduationCap size={17} className="text-indigo-400" />}
                        label="Active Student Body"
                        value={stats ? fmt(stats.activeStudents) : 0}
                        sub="Registered students"
                        accent="bg-indigo-500/10 border-indigo-500/20"
                        delay={0.05}
                        loading={loading}
                    />
                    <StatCard
                        icon={<Users size={17} className="text-violet-400" />}
                        label="Faculty Participation"
                        value={stats ? fmt(stats.facultyWithEvents) : 0}
                        sub="Event coordinators"
                        accent="bg-violet-500/10 border-violet-500/20"
                        delay={0.1}
                        loading={loading}
                    />
                    <StatCard
                        icon={<BookOpen size={17} className="text-emerald-400" />}
                        label="Cert. Ledger Size"
                        value={stats ? fmt(stats.certLedgerSize) : 0}
                        sub="Verified certificates"
                        accent="bg-emerald-500/10 border-emerald-500/20"
                        delay={0.15}
                        loading={loading}
                    />
                </div>

                {/* ── Secondary alert pills ── */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap gap-3"
                    >
                        {[
                            { icon: <Activity size={11} />, label: `${stats.pendingApprovals} Pending Approvals`, color: "text-amber-400 bg-amber-500/8 border-amber-500/20", href: "/faculty/my-events" },
                            { icon: <AlertTriangle size={11} />, label: `${stats.highRiskEvents} High-Risk Events`, color: "text-rose-400 bg-rose-500/8 border-rose-500/20", href: "/faculty/explore" },
                            { icon: <Gavel size={11} />, label: `${stats.escalatedCount} Sovereign Escalations`, color: "text-orange-400 bg-orange-500/8 border-orange-500/20", href: "#sovereign" },
                        ].map(({ icon, label, color, href }) => (
                            <a key={label} href={href}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold cursor-pointer hover:opacity-80 transition-all", color)}>
                                {icon} {label}
                            </a>
                        ))}
                    </motion.div>
                )}

                {/* ══════════════════════════════════════════════
                    DEPARTMENT PERFORMANCE MATRIX
                ══════════════════════════════════════════════ */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-blue-400">
                                <BarChart3 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Governance Matrix</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">Department Performance</h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Building2 size={13} />
                            {loading ? "—" : depts.length} departments
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-52" />
                            ))}
                        </div>
                    ) : depts.length === 0 ? (
                        <div className="h-40 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center">
                            <p className="text-xs text-zinc-700">No departments found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {depts.map((dept, i) => (
                                <DeptCard key={dept.id} dept={dept} index={i} />
                            ))}
                        </div>
                    )}
                </section>

                {/* ══════════════════════════════════════════════
                    SOVEREIGN OVERRIDE — ESCALATED DECISIONS
                ══════════════════════════════════════════════ */}
                <section id="sovereign" className="space-y-5 scroll-mt-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-orange-400">
                                <Gavel size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sovereign Override</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">Escalated Decisions</h2>
                            <p className="text-xs text-zinc-600">
                                Events where HODs couldn't resolve — requires Admin intervention.
                            </p>
                        </div>
                        {stats && stats.escalatedCount > 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                {stats.escalatedCount} awaiting
                            </span>
                        )}
                    </div>

                    {/* Escalation strip border glow */}
                    <div
                        className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: escalated.length > 0 ? "rgba(251,146,60,0.2)" : "rgba(63,63,70,1)" }}
                    >
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                            </div>
                        ) : escalated.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-14">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 size={22} className="text-emerald-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white">Governance is clear</p>
                                    <p className="text-xs text-zinc-600 mt-1">No escalated decisions pending admin action</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-2">
                                {escalated.map((ev, i) => (
                                    <EscalationRow key={ev.id} event={ev} index={i} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    QUICK ACTIONS STRIP
                ══════════════════════════════════════════════ */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            icon: <UploadCloud size={18} className="text-indigo-400" />,
                            title: "Bulk User Onboarding",
                            desc: "Import students, faculty, and HODs from CSV",
                            href: "/faculty/bulk-onboard",
                            accent: "hover:border-indigo-500/30",
                        },
                        {
                            icon: <Building2 size={18} className="text-violet-400" />,
                            title: "Full Directory",
                            desc: "View all registered clubs and departments",
                            href: "/faculty/clubs",
                            accent: "hover:border-violet-500/30",
                        },
                        {
                            icon: <Shield size={18} className="text-blue-400" />,
                            title: "Institutional Settings",
                            desc: "Configure roles, policies, and platform limits",
                            href: "/faculty/admin-settings",
                            accent: "hover:border-blue-500/30",
                        },
                    ].map(({ icon, title, desc, href, accent }) => (
                        <motion.button
                            key={href}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            onClick={() => router.push(href)}
                            className={cn(
                                "text-left p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl transition-all group",
                                accent
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    {icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">{title}</p>
                                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </section>

            </div>
        </div>
    );
}


