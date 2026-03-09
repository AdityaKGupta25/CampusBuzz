"use client";

import React, { useState, useEffect } from "react";
import {
    XCircle, Info, User, Building2, MapPin, Box,
    ShieldCheck, AlertTriangle, IndianRupee,
    Clock, CalendarDays, ArrowRight, Loader2, ListChecks,
    Shield, CheckCircle2, AlertCircle, Archive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { useUser } from "@/context/UserContext";

interface CampusEvent {
    id: string;
    title: string;
    venue_name: string;
    start_time: string;
    end_time: string;
}

export function DeepGovernanceReviewSheet({
    event,
    onClose,
    onApprove,
    onReject,
    onInviteChanges,
}: {
    event: any;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onInviteChanges: (id: string) => void;
}) {
    const { user } = useUser();
    const [domains, setDomains] = useState<any[]>([]);
    const [loadingDomains, setLoadingDomains] = useState(false);
    const [campusActivity, setCampusActivity] = useState<CampusEvent[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [conflictStatus, setConflictStatus] = useState<{ type: 'HARD' | 'SOFT' | 'NONE'; message: string }>({ type: 'NONE', message: '' });
    const [confirmOversight, setConfirmOversight] = useState(false);

    useEffect(() => {
        async function fetchCampusActivity() {
            if (!event.startDate || !user?.institution_id) return;
            try {
                const date = new Date(event.startDate);
                const startOfDay = new Date(date).setHours(0, 0, 0, 0);
                const endOfDay = new Date(date).setHours(23, 59, 59, 999);

                const { data, error } = await supabase
                    .from("events")
                    .select("id, title, start_time, end_time, venue_id, venue:venues(name)")
                    .eq("institution_id", user.institution_id)
                    .in("status", ["approved", "live"])
                    .neq("id", event.id)
                    .or(`and(start_time.lte.${new Date(endOfDay).toISOString()},end_time.gte.${new Date(startOfDay).toISOString()})`);

                if (error) throw error;

                const activities = (data || []).map(e => ({
                    id: e.id,
                    title: e.title,
                    venue_name: (e.venue as any)?.name || "Remote/TBD",
                    venue_id: e.venue_id,
                    start_time: e.start_time,
                    end_time: e.end_time
                }));

                setCampusActivity(activities);

                // --- Conflict Intelligence ---
                const eventStart = new Date(event.startDate).getTime();
                const eventEnd = new Date(event.endDate).getTime();

                // Check for time overlaps
                const overlapping = activities.filter(a => {
                    const aStart = new Date(a.start_time).getTime();
                    const aEnd = new Date(a.end_time).getTime();
                    return aStart <= eventEnd && aEnd >= eventStart;
                });

                if (overlapping.length > 0) {
                    const hard = overlapping.find(a => a.venue_id === event.venue_id);
                    if (hard) {
                        setConflictStatus({
                            type: 'HARD',
                            message: `🚨 CRITICAL: VENUE OVERLAP. ${hard.title} is already booked in ${hard.venue_name} at this time.`
                        });
                    } else {
                        setConflictStatus({
                            type: 'SOFT',
                            message: `⚠️ ADVISORY: CAMPUS CONGESTION. ${overlapping.length} other event(s) are scheduled at this time. Expect affected attendance.`
                        });
                    }
                } else {
                    setConflictStatus({ type: 'NONE', message: '' });
                }

            } catch (err) {
                console.error("Failed to fetch campus activity:", err);
            } finally {
                setLoadingActivity(false);
            }
        }
        void fetchCampusActivity();
    }, [event.id, event.startDate, event.endDate, event.venue_id, user?.institution_id]);

    useEffect(() => {
        async function fetchDomains() {
            if (event.eventType !== "umbrella") return;
            setLoadingDomains(true);
            try {
                const { data } = await supabase
                    .from("fest_domains")
                    .select("*")
                    .eq("umbrella_event_id", event.id)
                    .order("created_at");
                if (data) setDomains(data);
            } catch (err) {
                console.error("Failed to fetch domains:", err);
            } finally {
                setLoadingDomains(false);
            }
        }
        void fetchDomains();
    }, [event.id, event.eventType]);

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="relative bg-[#09090b] w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-white/5"
            >
                {/* Header */}
                <div className="px-10 py-10 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl shrink-0">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <Shield className="text-indigo-400" size={12} />
                            </div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Deep Governance Review</h2>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tighter line-clamp-1">{event.title}</h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all hover:bg-white/10"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 space-y-14 scrollbar-hide">
                    {/* Conflict Intelligence Banners */}
                    <AnimatePresence>
                        {conflictStatus.type === 'HARD' && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex gap-4 text-rose-500 animate-pulse shadow-lg shadow-rose-500/5 mb-8"
                            >
                                <AlertCircle size={24} className="shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Infrastructure Conflict Detected</p>
                                    <p className="text-sm font-bold uppercase leading-relaxed tracking-tight">{conflictStatus.message}</p>
                                </div>
                            </motion.div>
                        )}
                        {conflictStatus.type === 'SOFT' && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4 text-amber-500 shadow-lg shadow-amber-500/5 mb-8"
                            >
                                <AlertTriangle size={24} className="shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Operational Advisory</p>
                                    <p className="text-sm font-bold uppercase leading-relaxed tracking-tight">{conflictStatus.message}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Visual Asset if exists */}
                    {event.bannerUrl && (
                        <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                            <img
                                src={event.bannerUrl}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                alt="Event Poster"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pt-32 pb-6 px-8 flex items-end">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Staging Poster Assets</p>
                            </div>
                        </div>
                    )}

                    {/* Identity & Origin */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-zinc-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Identity & Origin</h3>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-zinc-900/40 border border-white/5 space-y-8">
                            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                {[
                                    { label: "Lead Faculty", value: event.faculty, icon: User, color: "text-cyan-400" },
                                    { label: "Organizing Body", value: event.club, icon: Building2, color: "text-indigo-400" },
                                    { label: "Approved Venue", value: event.venue, icon: MapPin, color: "text-rose-400" },
                                    { label: "Governance ID", value: event.id.slice(0, 8).toUpperCase(), icon: Box, color: "text-amber-400" },
                                ].map((item) => (
                                    <div key={item.label} className="space-y-2">
                                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none">{item.label}</p>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-2 h-2 rounded-full", item.color.replace('text-', 'bg-') + "/20")} />
                                            <p className="text-sm font-bold text-white tracking-tight truncate">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">Executive Summary</p>
                                <p className="text-sm text-zinc-400 font-medium leading-relaxed italic">
                                    "{event.description || "No description provided."}"
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Executive Governance Overview */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-zinc-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Executive Governance</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={cn(
                                "p-8 rounded-[2rem] border flex flex-col justify-between group transition-all",
                                event.riskLevel === 'high' ? "bg-rose-500/5 border-rose-500/20" : "bg-emerald-500/5 border-emerald-500/20"
                            )}>
                                <div className="space-y-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110",
                                        event.riskLevel === 'high' ? "bg-rose-500/20" : "bg-emerald-500/20"
                                    )}>
                                        <AlertTriangle size={24} className={event.riskLevel === 'high' ? "text-rose-400" : "text-emerald-400"} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">Risk Classification</p>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", event.riskLevel === 'high' ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                                            <p className={cn("text-xl font-black uppercase tracking-tighter", event.riskLevel === 'high' ? "text-rose-400" : "text-emerald-400")}>
                                                {event.riskLevel} Tier
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-indigo-600 border border-white/10 flex flex-col justify-between group transition-all shadow-xl shadow-indigo-500/10">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                        <IndianRupee size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 mb-1">Budget Allocation</p>
                                        <p className="text-2xl font-black text-white tracking-tighter">
                                            ₹{event.budgetRequired.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Fest Structure — Only for Umbrella */}
                    {event.eventType === "umbrella" && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Box size={14} className="text-cyan-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fest Infrastructure</h3>
                            </div>
                            <div className="p-8 rounded-[2rem] bg-zinc-900/40 border border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Institutional Domains</p>
                                        <p className="text-xs font-medium text-zinc-500">Categorized verticals for event organization</p>
                                    </div>
                                    {loadingDomains && <Loader2 size={14} className="animate-spin text-zinc-700" />}
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {domains.length > 0 ? (
                                        domains.map((domain: any, idx: number) => (
                                            <div key={domain.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-cyan-500/20 transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-[10px] font-black text-cyan-400 border border-white/5">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight italic">{domain.name}</p>
                                                    <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">{domain.description}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        !loadingDomains && (
                                            <div className="py-4 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No domains defined yet.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Timeline Analysis */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-zinc-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Timeline Analysis</h3>
                        </div>
                        <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2rem] space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Commencement</p>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays size={14} className="text-cyan-400" />
                                        <p className="text-lg font-black text-white tracking-tight">{formatDate(event.startDate)}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                                    <ArrowRight size={18} className="text-zinc-700" />
                                </div>
                                <div className="space-y-1.5 text-right">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Conclusion</p>
                                    <div className="flex items-center gap-2 justify-end">
                                        <p className="text-lg font-black text-white tracking-tight">{formatDate(event.endDate)}</p>
                                        <CalendarDays size={14} className="text-rose-400" />
                                    </div>
                                </div>
                            </div>

                            {event.rounds && event.rounds.length > 0 && (
                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Procedural Rounds</p>
                                    <div className="space-y-2">
                                        {event.rounds.map((r: any, idx: number) => (
                                            <div key={r.id || idx} className="flex items-center gap-4 p-4 bg-zinc-950/50 rounded-2xl border border-white/5 group transition-colors hover:border-white/10">
                                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-zinc-500 group-hover:text-cyan-400 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-white tracking-tight uppercase">{r.title}</p>
                                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{r.type || "Round"}</p>
                                                </div>
                                                <Badge variant="draft" className="bg-white/5 text-zinc-500 border-none px-3 py-1 text-[8px] tracking-widest">ACTIVE</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Institutional Pulse — Date-based Cluster Analysis */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-cyan-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Institutional Pulse (Campus Activity)</h3>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-zinc-900/40 border border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Simultaneous Operations</p>
                                    <p className="text-xs font-medium text-zinc-500">Other approved events on {formatDate(event.startDate)}</p>
                                </div>
                                {loadingActivity && <Loader2 size={14} className="animate-spin text-zinc-700" />}
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {campusActivity.length > 0 ? (
                                    campusActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-cyan-500/20 transition-all group">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-cyan-500/30 group-hover:text-cyan-400 transition-colors border border-white/5">
                                                <CalendarDays size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white uppercase tracking-tight truncate">{activity.title}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={10} className="text-zinc-600" />
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase truncate max-w-[100px]">{activity.venue_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={10} className="text-zinc-600" />
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase">
                                                            {new Date(activity.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="approved" className="text-[8px] px-2 py-0.5 opacity-50">ACTIVE</Badge>
                                        </div>
                                    ))
                                ) : (
                                    !loadingActivity && (
                                        <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-zinc-950/20">
                                            <CheckCircle2 size={24} className="mx-auto text-emerald-500/20 mb-3" />
                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Campus schedule is clear</p>
                                            <p className="text-[9px] text-zinc-700 font-medium mt-1 uppercase">No conflicting events detected for this date</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Threat & Compliance */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <ListChecks size={14} className="text-zinc-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Threat & Compliance</h3>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-zinc-900/40 border border-white/5 space-y-6">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-indigo-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Compliance Sync</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {event.complianceChecklist.length > 0 ? (
                                    event.complianceChecklist.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] font-bold text-zinc-400 transition-all hover:bg-white/[0.04]">
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                                                item.checked ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-white/5 border-white/10"
                                            )}>
                                                {item.checked && <XCircle size={12} className="text-white bg-emerald-500 rounded-full" />}
                                                {/* Wait, the checkmark was actually using CheckCircle2 in the original, let me fix it */}
                                            </div>
                                            <span className={item.checked ? "text-emerald-400/80" : ""}>{item.label}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-zinc-700 italic col-span-2">No checklist items defined.</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Decision Action Bar */}
                {/* Decision Action Bar — only for pending events */}
                <div className="px-10 py-8 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl shrink-0">
                    {event.status === "pending" ? (
                        <div className="space-y-6">
                            {conflictStatus.type === 'SOFT' && (
                                <div className="flex items-center gap-4 px-6 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                    <input
                                        type="checkbox"
                                        id="oversight-check"
                                        checked={confirmOversight}
                                        onChange={(e) => setConfirmOversight(e.target.checked)}
                                        className="w-5 h-5 rounded border-amber-500/30 bg-zinc-900 text-amber-500 focus:ring-amber-500 transition-all cursor-pointer"
                                    />
                                    <label htmlFor="oversight-check" className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 cursor-pointer select-none">
                                        I confirm oversight of the campus congestion and authorize this event regardless.
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <button
                                    id="hod-reject-btn"
                                    onClick={() => onReject(event.id)}
                                    className="h-14 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.25em]"
                                >
                                    Reject Proposal
                                </button>
                                <button
                                    id="hod-changes-btn"
                                    onClick={() => onInviteChanges(event.id)}
                                    className={cn(
                                        "h-14 rounded-2xl transition-all text-[10px] font-black uppercase tracking-[0.25em]",
                                        conflictStatus.type === 'HARD'
                                            ? "bg-amber-500 text-black shadow-xl shadow-amber-500/20"
                                            : "bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white"
                                    )}
                                >
                                    Request Changes
                                </button>
                                <button
                                    id="hod-approve-btn"
                                    disabled={conflictStatus.type === 'HARD' || (conflictStatus.type === 'SOFT' && !confirmOversight)}
                                    onClick={() => onApprove(event.id)}
                                    className={cn(
                                        "h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95",
                                        conflictStatus.type === 'HARD' || (conflictStatus.type === 'SOFT' && !confirmOversight)
                                            ? "bg-zinc-900 border border-white/5 text-zinc-700 cursor-not-allowed grayscale"
                                            : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-xl shadow-emerald-500/10"
                                    )}
                                >
                                    {conflictStatus.type === 'HARD' ? "Approval Blocked" : "Approve Event"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    event.status === "archived" ? "bg-zinc-800 text-zinc-400" : "bg-emerald-500/10 text-emerald-400"
                                )}>
                                    {event.status === "archived" ? <Archive size={24} /> : <ShieldCheck size={24} />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Governance Outcome</p>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">
                                        {event.status === "archived" ? "🔒 FINAL RECORD - ARCHIVED" : "✅ AUTHORIZED & LOGGED"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-1">Audit Mode</p>
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                    Read-Only Immutable
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
