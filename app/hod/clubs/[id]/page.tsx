"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Users,
    User,
    Calendar,
    IndianRupee,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    LayoutGrid,
    Search,
    ChevronRight,
    Sparkles,
    Shield,
    Building2,
    MapPin,
    Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, updateEventStatus } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import {
    mapDbEventToHodEvent,
    type HodEvent,
    type RiskLevel,
    type EventStatus
} from "@/lib/hod-utils";
import { DeepGovernanceReviewSheet } from "@/components/hod/DeepGovernanceReviewSheet";
import { ConfirmModal } from "@/components/hod/ConfirmModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClubDetails {
    id: string;
    name: string;
    description: string | null;
    faculty_in_charge_id: string;
    faculty: {
        full_name: string;
    } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HodClubDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    // ── State ─────────────────────────────────────────────────────────────────
    const [club, setClub] = useState<ClubDetails | null>(null);
    const [events, setEvents] = useState<HodEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Review Modal States
    const [drawerEvent, setDrawerEvent] = useState<HodEvent | null>(null);
    const [modal, setModal] = useState<{
        eventId: string;
        action: "approve" | "reject" | "request_changes";
    } | null>(null);
    const [modalComment, setModalComment] = useState("");
    const [isActioning, setIsActioning] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // ── Fetch Data ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (id) {
            fetchClubAndEvents();
        }
    }, [id]);

    async function fetchClubAndEvents() {
        setLoading(true);
        try {
            // 1. Fetch Club Details
            const { data: clubData, error: clubError } = await supabase
                .from("clubs")
                .select("*, faculty:users!faculty_in_charge_id(full_name)")
                .eq("id", id)
                .single();

            if (clubError) throw clubError;
            setClub(clubData as unknown as ClubDetails);

            // 2. Fetch Club Events with Join Data (expanded for deep review)
            const { data: eventsData, error: eventsError } = await supabase
                .from("events")
                .select(`
                    *,
                    venue:venues(name),
                    creator:users!creator_id(full_name),
                    department:departments(name),
                    club:clubs(name)
                `)
                .eq("club_id", id)
                .order("start_time", { ascending: false });

            if (eventsError) throw eventsError;
            setEvents((eventsData || []).map(row => mapDbEventToHodEvent(row as any)));
        } catch (err: any) {
            console.error("Failed to fetch club details:", err);
        } finally {
            setLoading(false);
        }
    }

    // ── Review Handlers ───────────────────────────────────────────────────────
    function triggerApprove(eventId: string) {
        setModalComment("");
        setActionError(null);
        setModal({ eventId, action: "approve" });
    }
    function triggerReject(eventId: string) {
        setModalComment("");
        setActionError(null);
        setModal({ eventId, action: "reject" });
    }
    function triggerInviteChanges(eventId: string) {
        setModalComment("");
        setActionError(null);
        setModal({ eventId, action: "request_changes" });
    }

    async function handleConfirm() {
        if (!modal) return;
        if ((modal.action === "reject" || modal.action === "request_changes") && !modalComment.trim()) {
            setActionError(`Please enter a reason for ${modal.action === "reject" ? 'rejection' : 'change request'}.`);
            return;
        }

        setIsActioning(true);
        setActionError(null);
        try {
            const nextStatus =
                modal.action === "approve" ? "approved" :
                    modal.action === "reject" ? "rejected" : "changes_requested";

            await updateEventStatus(
                modal.eventId,
                nextStatus as any,
                modalComment.trim() || undefined
            );

            // Refresh list to show updated status
            setEvents(prev => prev.map(e =>
                e.id === modal.eventId ? { ...e, status: nextStatus } : e
            ));

            // Close drawer if it was showing this event
            setDrawerEvent(null);
            setModal(null);
            setModalComment("");
        } catch (err: any) {
            setActionError(err.message || "Action failed.");
        } finally {
            setIsActioning(false);
        }
    }

    // ── Filter Events ─────────────────────────────────────────────────────────
    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
                <p className="text-white/20 font-bold uppercase tracking-widest text-[10px]">Accessing Registry...</p>
            </div>
        );
    }

    if (!club) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-6 p-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <AlertCircle size={32} />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black text-white tracking-tighter">Club Registry Not Found</h1>
                    <p className="text-white/40 font-medium">This organization might have been renamed or removed.</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={18} /> Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-cyan-500/30 font-sans p-6 md:p-10 lg:p-14">
            {/* Header / Navigation */}
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-6">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group mb-4"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Back to Clubs</span>
                        </button>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                    <Users size={20} />
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">{club.name}</h1>
                            </div>
                            <p className="max-w-xl text-zinc-500 font-medium leading-relaxed italic text-sm">
                                "{club.description || "The heart of student engagement, cultivating excellence through shared passion and leadership."}"
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl">
                                <User size={14} className="text-indigo-400" />
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Lead Faculty</p>
                                    <p className="text-xs font-bold text-white/90">{club.faculty?.full_name || "Unassigned"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl">
                                <LayoutGrid size={14} className="text-emerald-400" />
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Registry Stats</p>
                                    <p className="text-xs font-bold text-white/90">{events.length} Events Logged</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search hosted events..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-6 text-sm font-medium text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.05] transition-all"
                    />
                </div>

                {/* Events Grid */}
                <div className="space-y-8 pb-20">
                    <div className="flex items-center gap-3 text-zinc-500">
                        <Sparkles size={16} />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">Institutional Event History</h2>
                    </div>

                    {filteredEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onView={(e) => setDrawerEvent(e)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                <Calendar size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-white/50 uppercase tracking-widest">No events organized yet</p>
                                <p className="text-[10px] text-zinc-700 font-bold uppercase mt-1">This club's portfolio is currently empty</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Overlays ── */}
                <AnimatePresence>
                    {drawerEvent && (
                        <DeepGovernanceReviewSheet
                            event={drawerEvent}
                            onClose={() => setDrawerEvent(null)}
                            onApprove={triggerApprove}
                            onReject={triggerReject}
                            onInviteChanges={triggerInviteChanges}
                        />
                    )}

                    {modal && (
                        <ConfirmModal
                            event={events.find((e) => e.id === modal.eventId)!}
                            action={modal.action}
                            comment={modalComment}
                            onCommentChange={setModalComment}
                            onConfirm={handleConfirm}
                            onCancel={() => setModal(null)}
                            isLoading={isActioning}
                            error={actionError}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventCard({ event, onView }: { event: HodEvent; onView: (e: HodEvent) => void }) {
    const statusColors: any = {
        draft: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
        pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        live: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        completed: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        rejected: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="group relative bg-[#0e0e14]/60 border border-white/5 rounded-[2.5rem] p-8 transition-all hover:bg-zinc-900/40 hover:border-white/10 flex flex-col overflow-hidden"
        >
            {/* Ambient background effect */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/5 blur-[60px] rounded-full group-hover:bg-cyan-500/10 transition-colors" />

            <div className="flex items-start justify-between mb-6">
                <Badge
                    variant={event.status.toLowerCase() as any}
                    className={cn(
                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border shadow-2xl",
                        statusColors[event.status.toLowerCase()] || statusColors.draft
                    )}
                >
                    {event.status}
                </Badge>
                <div className={cn(
                    "p-2.5 rounded-xl border transition-colors",
                    event.riskLevel === 'high' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-white/5 border-white/5 text-zinc-600"
                )}>
                    {event.riskLevel === 'high' ? <Shield size={14} /> : <Box size={14} />}
                </div>
            </div>

            <div className="space-y-4 flex-1">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight leading-tight group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {event.title}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 font-medium">
                        {event.description || "An immersive institutional experience designed to foster student engagement and technical excellence."}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 mt-auto">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Lead Faculty</p>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <User size={10} className="text-indigo-400 flex-shrink-0" />
                            <p className="text-[11px] font-bold text-white/70 truncate">{event.faculty || "Department"}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Commences</p>
                        <div className="flex items-center gap-1.5">
                            <Calendar size={10} className="text-cyan-400 flex-shrink-0" />
                            <p className="text-[11px] font-bold text-white/70">{formatDate(event.startDate)}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Approved Venue</p>
                        <div className="flex items-center gap-1.5">
                            <MapPin size={10} className="text-rose-400 flex-shrink-0" />
                            <p className="text-[11px] font-bold text-white/70 truncate">{event.venue || "TBD"}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-1 leading-none">Fiscal Projection</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-black text-white/20">₹</span>
                        <span className="text-xl font-black text-white tracking-widest">{event.budgetRequired.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                <button
                    onClick={() => onView(event)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-black transition-all group-hover:scale-110 shadow-2xl"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </motion.div>
    );
}
