"use client";

import React, { useState, useEffect } from "react";
import {
    ClipboardCheck,
    Wallet,
    TrendingUp,
    AlertOctagon,
    Clock,
    CalendarDays,
    IndianRupee,
    User,
    Building2,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Eye,
    RefreshCw,
    AlertCircle,
    Loader2,
    ChevronRight,
    Search as SearchIcon,
    Shield,
    Zap,
    AlertTriangle,
    Info,
    ListChecks,
    ArrowRight,
    MapPin,
    Box,
    Archive,
    ShieldCheck,
    FileSpreadsheet,
    Download,
    PieChart,
    History,
    BellRing,
    X,
    Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn, exportToCSV } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useUser } from "@/context/UserContext";
import {
    fetchPendingEvents,
    fetchDepartmentEvents,
    updateEventStatus,
    updateGovernanceNote,
    requestEventArchive,
    toggleEventFeatured,
    type DbEvent,
    supabase,
} from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

import {
    mapDbEventToHodEvent,
    type HodEvent,
    type RiskLevel,
    type EventStatus
} from "@/lib/hod-utils";
import { DeepGovernanceReviewSheet } from "@/components/hod/DeepGovernanceReviewSheet";
import { ConfirmModal } from "@/components/hod/ConfirmModal";
import { StudentEventView } from "@/app/student/event/[id]/page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

function formatSubmittedAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}



// ─── Stats Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string | number;
    subtext: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    trend?: { value: string; up: boolean };
}

function formatShorthand(n: number, isCurrency = false): string {
    if (n >= 10000000) return (isCurrency ? "₹" : "") + (n / 10000000).toFixed(1).replace(/\.0$/, "") + "Cr";
    if (n >= 100000) return (isCurrency ? "₹" : "") + (n / 100000).toFixed(1).replace(/\.0$/, "") + "L";
    if (n >= 1000) return (isCurrency ? "₹" : "") + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return (isCurrency ? "₹" : "") + n.toLocaleString("en-IN");
}

function StatCard({ label, value, subtext, icon: Icon, iconBg, iconColor, trend }: StatCardProps) {
    return (
        <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-6 transition-all duration-300 hover:border-cyan-500/20 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{label}</p>
                    <p className="text-3xl font-bold text-white mt-2 tracking-tight">{value}</p>
                    <p className="text-xs text-white/20 mt-1 font-medium">{subtext}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", iconBg)}>
                    <Icon size={24} className={iconColor} />
                </div>
            </div>
            {trend && (
                <div className="flex items-center gap-1.5 mt-5">
                    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold", trend.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                        <TrendingUp
                            size={10}
                            className={trend.up ? "" : "rotate-180"}
                        />
                        {trend.value}
                    </div>
                    <span className="text-[10px] text-white/10 font-bold uppercase tracking-tighter">vs last month</span>
                </div>
            )}
        </div>
    );
}

// ─── Event Approval Card ──────────────────────────────────────────────────────

interface EventCardProps {
    event: HodEvent;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onInviteChanges: (id: string) => void;
    onView: (event: HodEvent) => void;
    onUpdateRemark: (event: HodEvent) => void;
    onRequestArchive: (event: HodEvent) => void;
    onToggleFeatured: (eventId: string, isFeatured: boolean) => Promise<void>;
}

function EventCard({
    event,
    onApprove,
    onReject,
    onInviteChanges,
    onView,
    onUpdateRemark,
    onRequestArchive,
    onToggleFeatured
}: EventCardProps) {
    const isSettled = ["approved", "rejected", "live", "completed", "revision_required", "changes_requested", "archived"].includes(event.status as string);
    const [isFeaturing, setIsFeaturing] = useState(false);

    const handleFeatureClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFeaturing(true);
        try {
            await onToggleFeatured(event.id, !event.isFeatured);
        } finally {
            setIsFeaturing(false);
        }
    };

    return (
        <div
            onClick={() => onView(event)}
            className={cn(
                "group relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all duration-500 cursor-pointer flex flex-col h-full",
                event.isFeatured && "ring-2 ring-indigo-500/30 border-indigo-500/30 bg-indigo-500/5",
                isSettled && "opacity-80 hover:opacity-100"
            )}
        >
            {/* Background Glow when Featured */}
            {event.isFeatured && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[60px] pointer-events-none" />
            )}

            <div className="p-6 relative flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110",
                            getStatusStyle(event.status as any)
                        )}>
                            {getStatusIcon(event.status as any)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                    event.status === "pending" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
                                        (event.status === "approved" || event.status === "live") ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-white/40 bg-white/5 border-white/10"
                                )}>
                                    {event.status}
                                </span>
                                <Badge variant={event.riskLevel} dot className="text-[9px]">
                                    {event.riskLevel.toUpperCase()} RISK
                                </Badge>
                            </div>
                            <h3 className="font-bold text-white text-base leading-snug line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                {event.title}
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={handleFeatureClick}
                        disabled={isFeaturing}
                        className={cn(
                            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            event.isFeatured
                                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-indigo-400"
                                : "bg-zinc-900 text-white/20 hover:text-white hover:bg-zinc-800 border border-zinc-800",
                            isFeaturing && "animate-pulse"
                        )}
                        title={event.isFeatured ? "Remove from Billboard" : "Feature on Billboard"}
                    >
                        {isFeaturing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Star size={18} className={cn(event.isFeatured ? "fill-current" : "")} />
                        )}
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-white/40 leading-relaxed line-clamp-2 mb-6">
                    {event.description || "No description provided for this campus initiative."}
                </p>

                {/* Meta grid */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-5 pt-5 border-t border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center flex-shrink-0 border border-zinc-800">
                            <User size={14} className="text-white/30" />
                        </div>
                        <div className="min-w-0">
                            <dt className="text-[10px] text-white/20 uppercase font-black tracking-widest">Faculty</dt>
                            <dd className="text-xs font-bold text-white/70 truncate">{event.faculty}</dd>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center flex-shrink-0 border border-zinc-800">
                            <CalendarDays size={14} className="text-white/30" />
                        </div>
                        <div className="min-w-0">
                            <dt className="text-[10px] text-white/20 uppercase font-black tracking-widest">Date</dt>
                            <dd className="text-xs font-bold text-white/70">{formatDate(event.startDate)}</dd>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center flex-shrink-0 border border-zinc-800">
                            <IndianRupee size={14} className="text-white/30" />
                        </div>
                        <div className="min-w-0">
                            <dt className="text-[10px] text-white/20 uppercase font-black tracking-widest">Budget</dt>
                            <dd className={cn(
                                "text-xs font-black",
                                event.riskLevel === "high" ? "text-red-400" :
                                    event.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400"
                            )}>
                                {formatCurrency(event.budgetRequired)}
                            </dd>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center flex-shrink-0 border border-zinc-800">
                            <Building2 size={14} className="text-white/30" />
                        </div>
                        <div className="min-w-0">
                            <dt className="text-[10px] text-white/20 uppercase font-black tracking-widest">Venue</dt>
                            <dd className="text-xs font-bold text-white/70 truncate">{event.venue || "TBD"}</dd>
                        </div>
                    </div>
                </dl>

                {/* archive_requested status indicator */}
                {event.status === "completed" && event.archiveRequested && (
                    <div className="mt-6 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                        <BellRing size={16} className="text-orange-400" />
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Archive Requested</span>
                    </div>
                )}

                {/* HOD Feedback Note on Card */}
                {isSettled && (event.governanceNote || event.rejectionReason) && (
                    <div className={cn(
                        "mt-6 p-4 rounded-xl border border-dashed text-[11px] leading-relaxed",
                        event.status === 'rejected' ? "bg-red-500/5 border-red-500/10 text-red-300/70" : "bg-amber-500/5 border-amber-500/10 text-amber-300/70"
                    )}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-black uppercase tracking-widest text-[9px] block opacity-40">HOD Governance Remark:</span>
                            {(event.status === "revision_required" || event.status === "changes_requested") && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateRemark(event); }}
                                    className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Update Note
                                </button>
                            )}
                        </div>
                        <p className="italic font-medium">"{event.governanceNote || event.rejectionReason}"</p>
                    </div>
                )}
            </div>

            {/* Submitted timestamp */}
            <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-white/20" />
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        Submitted {formatSubmittedAgo(event.submittedAt)}
                    </span>
                </div>
                {event.status === "pending" && (
                    <div className="flex items-center gap-1.5 grayscale opacity-50">
                        <Shield size={10} className="text-indigo-400" />
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">Auth Required</span>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                {event.status === "pending" ? (
                    <button
                        id={`review-btn-${event.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onView(event);
                        }}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
                            "bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-900/40 border border-indigo-400/50"
                        )}
                    >
                        Review Governance Dossier
                        <ArrowRight size={16} />
                    </button>
                ) : event.status === "completed" ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (event.archiveRequested) onView(event);
                            else onRequestArchive(event);
                        }}
                        disabled={event.archiveRequested}
                        className={cn(
                            "w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]",
                            event.archiveRequested
                                ? "bg-zinc-900 text-white/20 border border-zinc-800 cursor-not-allowed"
                                : "bg-orange-500 text-black hover:bg-orange-400 shadow-orange-900/40"
                        )}
                    >
                        {event.archiveRequested ? (
                            <><CheckCircle2 size={16} /> Archive Signal Sent</>
                        ) : (
                            <><BellRing size={16} /> Trigger Final Registry Lock</>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onView(event);
                        }}
                        className={cn(
                            "w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
                            (event.status === "approved" || event.status === "live" || event.status === "completed" || event.status === "archived")
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black"
                                : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white"
                        )}
                    >
                        {(event.status === "approved" || event.status === "live" || event.status === "completed" || event.status === "archived") ? (
                            <><Eye size={16} /> Open Governance Dossier</>
                        ) : (
                            <><XCircle size={16} /> View Rejection Record</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Helpers for EventCard ────────────────────────────────────────────────────

function getStatusStyle(status: EventStatus) {
    switch (status) {
        case "pending": return "bg-amber-500/10 border-amber-500/20 text-amber-500";
        case "approved":
        case "live": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
        case "completed":
        case "archived": return "bg-indigo-500/10 border-indigo-500/20 text-indigo-500";
        case "rejected": return "bg-red-500/10 border-red-500/20 text-red-500";
        default: return "bg-zinc-900 border-zinc-800 text-white/40";
    }
}

function getStatusIcon(status: EventStatus) {
    switch (status) {
        case "pending": return <Clock size={18} />;
        case "approved":
        case "live": return <ShieldCheck size={18} />;
        case "completed":
        case "archived": return <History size={18} />;
        case "rejected": return <XCircle size={18} />;
        default: return <Info size={18} />;
    }
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function HodDashboardPage() {
    const { user } = useUser();
    const [activeNav, setActiveNav] = useState<"approvals" | "archive">("approvals");
    const [vaultFilter, setVaultFilter] = useState<"all" | "approved" | "revision" | "completed" | "archived" | "rejected">("all");

    // ── Data state ──────────────────────────────────────────────────────────────
    const [events, setEvents] = useState<HodEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [realStats, setRealStats] = useState({
        archivedCount: 0,
        deptOutreach: 0,
        approvedBudget: 0,
    });

    // ── Search / filter ─────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [filterRisk, setFilterRisk] = useState<RiskLevel | "all">("all");

    // ── Confirm modal ───────────────────────────────────────────────────────────
    const [modal, setModal] = useState<{
        eventId: string;
        action: "approve" | "reject" | "request_changes" | "update_remark" | "request_archive";
    } | null>(null);
    const [modalComment, setModalComment] = useState("");
    const [isActioning, setIsActioning] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // ── Detail drawer ───────────────────────────────────────────────────────────
    const [drawerEvent, setDrawerEvent] = useState<HodEvent | null>(null);

    // ── Fetch pending events on mount ───────────────────────────────────────────
    async function loadEvents() {
        if (!user?.institution_id) return;
        setIsLoading(true);
        setFetchError(null);
        try {
            console.log(`[HOD] Loading events for tab: ${activeNav}`);
            if (activeNav === "approvals") {
                const rows = await fetchPendingEvents(user.institution_id);
                setEvents(rows.map(row => mapDbEventToHodEvent(row as any)));
            } else {
                // Vault: Fetch decision history
                const rows = await fetchDepartmentEvents(user.institution_id, {
                    // We don't filter by isArchived anymore, we want the specific decision statuses
                    // Note: 'revision_required' is excluded as it represents Faculty -> Student loop, not HOD action.
                    status: ['approved', 'live', 'changes_requested', 'rejected', 'completed', 'archived']
                });
                console.log(`[HOD] Found ${rows.length} records in Vault`);
                setEvents(rows.map(row => mapDbEventToHodEvent(row as any)));
            }
            // Also load overall dashboard stats
            void loadDashboardStats();
        } catch (err: any) {
            console.error("[HOD] Fetch error depth:", JSON.stringify(err, null, 2));
            setFetchError(
                err?.message || err?.details || "Failed to load events. Database sync may be required."
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function loadDashboardStats() {
        if (!user?.institution_id) return;

        try {
            // 1. Archived Records: Count all institution events where status='archived'
            const { count: archCount, error: archErr } = await supabase
                .from("events")
                .select("id", { count: "exact", head: true })
                .eq("institution_id", user.institution_id)
                .eq("status", "archived");

            if (archErr) throw archErr;

            // 2. Departmental Outreach: sum(registered_count) for HOD's dept
            let totalOutreach = 0;
            let totalBudget = 0;

            if (user.department_id) {
                const { data: outreachData, error: outreachErr } = await supabase
                    .from("events")
                    .select("registered_count")
                    .eq("department_id", user.department_id);

                if (outreachErr) throw outreachErr;
                totalOutreach = outreachData?.reduce((sum, e) => sum + (e.registered_count || 0), 0) || 0;

                // 3. Approved Budget: sum(budget_required) for 'approved' and 'live' in dept
                const { data: budgetData, error: budgetErr } = await supabase
                    .from("events")
                    .select("budget_required")
                    .eq("department_id", user.department_id)
                    .in("status", ["approved", "live"]);

                if (budgetErr) throw budgetErr;
                totalBudget = budgetData?.reduce((sum, e) => sum + Number(e.budget_required || 0), 0) || 0;
            }

            setRealStats({
                archivedCount: archCount || 0,
                deptOutreach: totalOutreach,
                approvedBudget: totalBudget,
            });
        } catch (err) {
            console.error("[HOD] Stats load error:", err);
        }
    }

    useEffect(() => {
        if (user?.institution_id) {
            void loadEvents();
        }
    }, [activeNav, user?.institution_id]);

    // ── Derived stats (all from current events list) ────────────────────────────
    const pending = events.length; // all shown events are pending (we filter at DB level)
    const highRisk = events.filter((e) => e.riskLevel === "high").length;
    const totalBudget = 500000;
    const usedBudget = 0;          // approved ones are already removed from the list
    const budgetPct = Math.round((usedBudget / totalBudget) * 100);

    // ── Search / risk filter (client-side on the already-fetched list) ──────────
    const filtered = events.filter((e) => {
        const matchSearch =
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            e.faculty.toLowerCase().includes(search.toLowerCase());
        const matchRisk = filterRisk === "all" || e.riskLevel === filterRisk;

        let matchVault = true;
        if (activeNav === "archive") {
            if (vaultFilter === "approved") matchVault = ["approved", "live"].includes(e.status as string);
            else if (vaultFilter === "revision") matchVault = ["changes_requested"].includes(e.status as string);
            else if (vaultFilter === "completed") matchVault = e.status === "completed";
            else if (vaultFilter === "archived") matchVault = e.status === "archived";
            else if (vaultFilter === "rejected") matchVault = e.status === "rejected";
        }

        return matchSearch && matchRisk && matchVault;
    });

    // ── Open modal helpers ──────────────────────────────────────────────────────
    function triggerApprove(id: string) {
        setModalComment("");
        setActionError(null);
        setModal({ eventId: id, action: "approve" });
    }
    function triggerInviteChanges(id: string) {
        setModalComment("");
        setActionError(null);
        setModal({ eventId: id, action: "request_changes" });
    }
    function triggerReject(id: string) {
        setModalComment("");
        setActionError(null);
        setModal({ eventId: id, action: "reject" });
    }
    function triggerUpdateRemark(event: HodEvent) {
        setModalComment(event.governanceNote || "");
        setActionError(null);
        setModal({ eventId: event.id, action: "update_remark" });
    }
    function triggerRequestArchive(event: HodEvent) {
        setModalComment("Event is over, please archive records.");
        setActionError(null);
        setModal({ eventId: event.id, action: "request_archive" });
    }

    // ── Confirm: call Supabase then remove card optimistically ──────────────────
    async function handleConfirm() {
        if (!modal) return;
        if ((modal.action === "reject" || modal.action === "request_changes" || modal.action === "update_remark" || modal.action === "request_archive") && !modalComment.trim()) {
            setActionError(`Please enter a message.`);
            return;
        }

        setIsActioning(true);
        setActionError(null);
        try {
            if (modal.action === "update_remark") {
                await updateGovernanceNote(modal.eventId, modalComment.trim());
                setEvents(prev => prev.map(e => e.id === modal.eventId ? { ...e, governanceNote: modalComment.trim() } : e));
            } else if (modal.action === "request_archive") {
                await requestEventArchive(modal.eventId, modalComment.trim());
                setEvents(prev => prev.map(e => e.id === modal.eventId ? { ...e, archiveRequested: true, archiveRequestNote: modalComment.trim() } : e));
            } else {
                const nextStatus =
                    modal.action === "approve" ? "approved" :
                        modal.action === "reject" ? "rejected" : "changes_requested";

                await updateEventStatus(
                    modal.eventId,
                    nextStatus as any,
                    modalComment.trim() || undefined
                );
                // Optimistically remove the card from the list if it's the approvals tab
                if (activeNav === "approvals") {
                    setEvents((prev) => prev.filter((e) => e.id !== modal.eventId));
                } else {
                    // Update status in place if in vault
                    setEvents(prev => prev.map(e => e.id === modal.eventId ? { ...e, status: nextStatus } : e));
                }
            }
            // Also close drawer if it was showing this event
            setDrawerEvent((prev) =>
                prev?.id === modal.eventId ? null : prev
            );
            setModal(null);
            setModalComment("");
            // Refresh stats after action
            void loadDashboardStats();
        } catch (err: unknown) {
            setActionError(
                err instanceof Error ? err.message : "Action failed. Please try again."
            );
        } finally {
            setIsActioning(false);
        }
    }

    // ── Toggle Featured ──────────────────────────────────────────────────────────
    async function handleToggleFeatured(eventId: string, isFeatured: boolean) {
        try {
            await toggleEventFeatured(eventId, isFeatured);
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isFeatured } : e));
            // Show a mini feedback if needed, but the UI updates instantly
        } catch (err) {
            console.error("Failed to toggle featured status:", err);
            // Revert or show error toast
        }
    }

    const modalEvent = modal ? events.find((e) => e.id === modal.eventId) : null;

    return (
        <main className="flex-1 flex flex-col min-w-0 min-h-screen bg-zinc-950 font-sans">
            {/* Top bar */}
            <header className="h-16 bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
                <div className="flex items-center gap-8">
                    <div>
                        <h1 className="text-base font-bold text-white tracking-tight">Governance Dashboard</h1>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                            Computer Science Department
                        </p>
                    </div>

                    <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

                    <nav className="flex gap-1 bg-zinc-900/40 p-1 rounded-xl w-fit border border-zinc-800" aria-label="Dashboard views">
                        <button
                            id="nav-approvals"
                            onClick={() => setActiveNav("approvals")}
                            className={cn(
                                "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                                activeNav === "approvals"
                                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                    : "text-white/40 hover:text-white/80"
                            )}
                        >
                            Pending Approvals
                        </button>
                        <button
                            id="nav-archive"
                            onClick={() => setActiveNav("archive")}
                            className={cn(
                                "px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                activeNav === "archive"
                                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                    : "text-white/40 hover:text-white/80"
                            )}
                        >
                            <History size={14} />
                            Governance Vault
                        </button>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {activeNav === "archive" && (
                        <Button
                            id="export-naac-btn"
                            variant="secondary"
                            size="sm"
                            className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            icon={<FileSpreadsheet size={14} />}
                            onClick={() => {
                                const exportData = events.map(e => ({
                                    'Event Title': e.title,
                                    'Status': e.status,
                                    'Department': e.department,
                                    'Faculty': e.faculty,
                                    'Venue': e.venue,
                                    'Risk Level': e.riskLevel,
                                    'Budget': e.budgetRequired,
                                    'Submitted At': formatDate(e.submittedAt)
                                }));
                                exportToCSV(exportData, `HOD_Audit_Report_${new Date().toISOString().split('T')[0]}`);
                            }}
                        >
                            Export Audit Report
                        </Button>
                    )}
                </div>
            </header>

            {/* Page content */}
            <div className="flex-1 p-6 space-y-6">

                {/* ── Fetch error banner ── */}
                {fetchError && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold">Failed to load events</p>
                            <p className="mt-0.5 opacity-80">{fetchError}</p>
                        </div>
                        <button
                            onClick={() => void loadEvents()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                        >
                            <RefreshCw size={13} /> Retry
                        </button>
                    </div>
                )}

                {/* ── Stats ── */}
                <section aria-label="Summary statistics">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            label={activeNav === "approvals" ? "Pending Approvals" : "Archived Records"}
                            value={isLoading ? "—" : activeNav === "approvals" ? events.length : realStats.archivedCount}
                            subtext={activeNav === "approvals" ? "Awaiting your decision" : "Institutional (Completed) Records"}
                            icon={activeNav === "approvals" ? ClipboardCheck : History}
                            iconBg={activeNav === "approvals" ? "bg-amber-500/10" : "bg-white/5"}
                            iconColor={activeNav === "approvals" ? "text-amber-400" : "text-white/40"}
                        />
                        <StatCard
                            label="Departmental Outreach"
                            value={isLoading ? "—" : formatShorthand(realStats.deptOutreach)}
                            subtext="Total participants registered"
                            icon={TrendingUp}
                            iconBg="bg-indigo-500/10"
                            iconColor="text-indigo-400"
                        />
                        <StatCard
                            label="Approved Budget"
                            value={isLoading ? "—" : formatShorthand(realStats.approvedBudget, true)}
                            subtext="Total sanctioned for your department"
                            icon={IndianRupee}
                            iconBg="bg-emerald-500/10"
                            iconColor="text-emerald-400"
                        />
                    </div>
                </section>

                {/* ── Vault Sub-Filters ── */}
                {activeNav === "archive" && (
                    <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-xl border border-zinc-800 w-fit overflow-x-auto no-scrollbar max-w-full">
                        <History size={14} className="ml-2 text-white/20 flex-shrink-0" />
                        {(["all", "approved", "revision", "completed", "archived", "rejected"] as const).map((vf) => (
                            <button
                                key={vf}
                                onClick={() => setVaultFilter(vf)}
                                className={cn(
                                    "px-4 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    vaultFilter === vf
                                        ? "bg-zinc-800 text-white border border-zinc-700"
                                        : "text-white/30 hover:text-white hover:bg-zinc-900/60"
                                )}
                            >
                                {vf === "revision" ? "In Revision" : vf}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Toolbar ── */}
                <section className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/40 border border-zinc-800 p-2 rounded-xl">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                        <Input
                            id="search-events"
                            type="text"
                            placeholder="Search events or faculty…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12"
                        />
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-zinc-900/40 rounded-xl border border-zinc-800">
                        <Filter size={14} className="ml-2 text-white/20" />
                        {(["all", "low", "medium", "high"] as const).map((r) => (
                            <button
                                key={r}
                                id={`filter-${r}`}
                                onClick={() => setFilterRisk(r)}
                                className={cn(
                                    "px-4 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterRisk === r
                                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-900/40"
                                        : "text-white/30 hover:text-white hover:bg-zinc-900/60"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </section>

                {/* ── Cards grid ── */}
                <section aria-label="Event approval queue">
                    <div className="flex items-center justify-between mb-4 mt-4">
                        <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                            {activeNav === "approvals" ? "Approval Queue" : "Governance Records"}
                            {!isLoading && (
                                <span className="ml-2 opacity-50 font-medium">
                                    // {filtered.length} {filtered.length !== 1 ? "Entries" : "Entry"}
                                </span>
                            )}
                        </h2>
                        <button
                            id="refresh-events"
                            onClick={() => void loadEvents()}
                            title="Refresh"
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>

                    {/* Loading skeleton */}
                    {isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-5 shadow-sm animate-pulse"
                                >
                                    <div className="h-4 bg-zinc-800 rounded-full w-3/4 mb-3" />
                                    <div className="h-3 bg-zinc-800 rounded-full w-1/2 mb-6" />
                                    <div className="grid grid-cols-2 gap-3">
                                        {[1, 2, 3, 4].map((j) => (
                                            <div key={j} className="h-8 bg-zinc-800 rounded-lg" />
                                        ))}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="h-10 bg-zinc-800 rounded-xl" />
                                        <div className="h-10 bg-emerald-900/20 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty states */}
                    {!isLoading && events.length === 0 && !fetchError && (
                        <div className="bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-xl p-16 text-center group">
                            <div className="w-16 h-16 rounded-full bg-zinc-950 mx-auto mb-6 flex items-center justify-center transition-transform group-hover:scale-110">
                                <CheckCircle2 size={32} className="text-cyan-500 opacity-20" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">All caught up!</h3>
                            <p className="text-sm text-white/30 max-w-xs mx-auto font-medium">
                                {activeNav === "approvals"
                                    ? "There are no pending approvals in your department right now."
                                    : "No archived events found in the governance vault."}
                            </p>
                            <button
                                id="refresh-empty"
                                onClick={() => void loadEvents()}
                                className="mt-8 mx-auto flex items-center gap-2 px-6 h-11 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-black text-white uppercase tracking-widest hover:bg-zinc-900 transition-all"
                            >
                                <RefreshCw size={14} /> Check Again
                            </button>
                        </div>
                    )}

                    {!isLoading && events.length > 0 && filtered.length === 0 && (
                        <div className="bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-xl p-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-zinc-950 mx-auto mb-6 flex items-center justify-center">
                                <SearchIcon size={32} className="text-white/10" />
                            </div>
                            <p className="text-lg font-bold text-white">No results found</p>
                            <p className="text-sm text-white/30 mt-2 max-w-xs mx-auto font-medium">
                                We couldn't find any events matching your current search or risk filters.
                            </p>
                            <button
                                id="clear-filters"
                                onClick={() => { setSearch(""); setFilterRisk("all"); }}
                                className="mt-8 mx-auto flex items-center gap-2 px-6 h-11 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-black text-white uppercase tracking-widest hover:bg-zinc-900 transition-all font-bold"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}

                    {/* Event cards */}
                    {!isLoading && filtered.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filtered.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onApprove={triggerApprove}
                                    onReject={triggerReject}
                                    onInviteChanges={triggerInviteChanges}
                                    onView={setDrawerEvent}
                                    onUpdateRemark={triggerUpdateRemark}
                                    onRequestArchive={triggerRequestArchive}
                                    onToggleFeatured={handleToggleFeatured}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ── Confirm Modal ── */}
            {modal && modalEvent && (
                <ConfirmModal
                    event={modalEvent}
                    action={modal.action}
                    comment={modalComment}
                    onCommentChange={(v) => { setModalComment(v); setActionError(null); }}
                    onConfirm={handleConfirm}
                    onCancel={() => { setModal(null); setActionError(null); }}
                    isLoading={isActioning}
                    error={actionError}
                />
            )}

            {/* ── Detail Drawer ── */}
            <AnimatePresence>
                {drawerEvent && (
                    drawerEvent.status === "pending" ? (
                        <DeepGovernanceReviewSheet
                            event={drawerEvent}
                            onClose={() => setDrawerEvent(null)}
                            onApprove={triggerApprove}
                            onReject={triggerReject}
                            onInviteChanges={triggerInviteChanges}
                        />
                    ) : (
                        <div className="fixed inset-0 z-[150] bg-[#09090b] overflow-y-auto">
                            <StudentEventView
                                eventId={drawerEvent.id}
                                previewMode={true}
                                onClosePreview={() => setDrawerEvent(null)}
                            />
                        </div>
                    )
                )}
            </AnimatePresence>
        </main>
    );
}
