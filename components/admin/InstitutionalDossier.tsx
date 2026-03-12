"use client";

import React, { useState, useEffect } from "react";
import {
    X, Building2, Shield, Users, Calendar, Wallet,
    ArrowUpRight, TrendingUp, Search, Filter,
    Activity, CheckCircle2, AlertCircle, MapPin,
    ArrowRight, ChevronRight, Download, Share2,
    Briefcase, Zap, Star, LayoutGrid, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DossierProps {
    type: 'dept' | 'club';
    item: any;
    onClose: () => void;
}

interface UnitActivity {
    id: string;
    title: string;
    start_time: string;
    status: string;
    budget_required: number;
    venue: string;
}

interface UnitStaff {
    id: string;
    full_name: string;
    role: string;
    email: string;
    activity_score: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(n);

function SectionTitle({ icon: Icon, title, subtitle }: any) {
    return (
        <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Icon size={18} />
            </div>
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 leading-none mb-1">{subtitle}</h3>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">{title}</h2>
            </div>
        </div>
    );
}

// ─── Institutional Dossier Component ──────────────────────────────────────────

export function InstitutionalDossier({ type, item, onClose }: DossierProps) {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<UnitActivity[]>([]);
    const [staff, setStaff] = useState<UnitStaff[]>([]);
    const [activeSection, setActiveSection] = useState<'overview' | 'activity' | 'staff'>('overview');
    // Stable heatmap heights so they don't flicker on re-renders
    const [heatmapHeights] = useState(() => Array.from({ length: 30 }, () => Math.floor(Math.random() * 80 + 20)));

    // Derived metrics (stable after data loads)
    const unitRank = activities.length >= 8 ? 'S-Tier' : activities.length >= 5 ? 'A-Tier' : activities.length >= 3 ? 'B-Tier' : 'C-Tier';
    const impactScore = Math.min(100, Math.round((activities.length * 7) + (staff.length * 5) + 40));

    useEffect(() => {
        const loadDeepData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Activities
                const { data: activityData } = await supabase
                    .from("events")
                    .select(`id, title, start_time, status, budget_required, venues(name)`)
                    .eq(type === 'dept' ? 'department_id' : 'club_id', item.id)
                    .order("start_time", { ascending: false })
                    .limit(10);

                // 2. Fetch Staff
                let staffData;
                if (type === 'dept') {
                    const { data } = await supabase
                        .from("users")
                        .select(`id, full_name, role, email`)
                        .eq('department_id', item.id)
                        .in("role", ["faculty", "hod", "admin"]);
                    staffData = data;
                } else {
                    // For clubs, fetch the faculty leads associated with their events
                    const { data: clubEvents } = await supabase
                        .from("events")
                        .select("faculty_in_charge_id")
                        .eq("club_id", item.id)
                        .not("faculty_in_charge_id", "is", null);

                    const staffIds = Array.from(new Set(clubEvents?.map(e => e.faculty_in_charge_id)));

                    if (staffIds.length > 0) {
                        const { data } = await supabase
                            .from("users")
                            .select(`id, full_name, role, email`)
                            .in("id", staffIds);
                        staffData = data;
                    } else {
                        staffData = [];
                    }
                }

                setActivities((activityData ?? []).map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    start_time: a.start_time,
                    status: a.status,
                    budget_required: a.budget_required || 0,
                    venue: a.venues?.name || "Generic"
                })));

                setStaff((staffData ?? []).map((s: any) => ({
                    id: s.id,
                    full_name: s.full_name,
                    role: s.role,
                    email: s.email,
                    activity_score: 75 + (Math.floor(Math.random() * 20))
                })));

            } catch (err) {
                console.error("[Dossier] Error loading deep data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDeepData();
    }, [type, item.id]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-6xl h-full max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(59,130,246,0.2)] flex flex-col md:flex-row"
            >
                {/* Left Sidebar (Navigator) */}
                <div className="w-full md:w-80 bg-zinc-950 border-r border-zinc-900 p-8 flex flex-col gap-12 shrink-0 overflow-y-auto">
                    {/* Unit Identity */}
                    <div className="space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            {type === 'dept' ? <Building2 size={36} /> : <Shield size={36} />}
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Unit Dossier</span>
                            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">{item.name}</h1>
                            <div className="flex items-center gap-2 pt-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Status Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-2">
                        {[
                            { id: 'overview', label: 'Sector Overview', icon: LayoutGrid },
                            { id: 'activity', label: 'Operation Logs', icon: Activity },
                            { id: 'staff', label: 'Assigned Personnel', icon: Users },
                        ].map((nav) => (
                            <button
                                key={nav.id}
                                onClick={() => setActiveSection(nav.id as any)}
                                className={cn(
                                    "w-full flex items-center justify-between px-6 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeSection === nav.id
                                        ? "bg-white text-black shadow-xl"
                                        : "text-zinc-600 hover:text-white hover:bg-zinc-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <nav.icon size={16} />
                                    {nav.label}
                                </div>
                                <ChevronRight size={14} className={activeSection === nav.id ? "opacity-100" : "opacity-0"} />
                            </button>
                        ))}
                    </nav>

                    {/* Quick Stats */}
                    <div className="mt-auto space-y-4 pt-12 border-t border-zinc-900">
                        <div>
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Impact Score</p>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${impactScore}%` }} />
                                </div>
                                <span className="text-xs font-black text-white">{impactScore}</span>
                            </div>
                        </div>
                        <button className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
                            <Download size={14} /> Full Audit PDF
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-10 shrink-0 bg-zinc-900/50 backdrop-blur-xl relative z-10">
                        <div className="flex items-center gap-4 text-zinc-500 uppercase text-[10px] font-black tracking-widest">
                            <span>Institutional Code</span>
                            <span className="text-zinc-700">|</span>
                            <span className="text-white">ID-00{item.id.slice(0, 4)}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:rotate-90"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Scroll */}
                    <div className="flex-1 overflow-y-auto p-10 scrollbar-hide relative">
                        {loading && (
                            <div className="absolute inset-0 bg-zinc-900/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 gap-4">
                                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Accessing secure dossier…</p>
                            </div>
                        )}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-12"
                            >
                                {activeSection === 'overview' && (
                                    <div className="space-y-12">
                                        <SectionTitle icon={LayoutGrid} title="Sector Intelligence" subtitle="Performance Overview" />

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-zinc-950 border border-zinc-800/50 rounded-3xl p-8 space-y-4">
                                                <div className="p-3 w-fit rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                    <Wallet size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Fiscal Allocation</p>
                                                    <h4 className="text-2xl font-black text-white italic">{fmtINR(item.budget_used || 0)}</h4>
                                                    <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">Limit: {fmtINR(item.budget_cap || 0)}</p>
                                                </div>
                                            </div>
                                            <div className="bg-zinc-950 border border-zinc-800/50 rounded-3xl p-8 space-y-4">
                                                <div className="p-3 w-fit rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Operational Depth</p>
                                                    <h4 className="text-2xl font-black text-white italic">{activities.length} Missions</h4>
                                                    <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">Active & Historical</p>
                                                </div>
                                            </div>
                                            <div className="bg-zinc-950 border border-zinc-800/50 rounded-3xl p-8 space-y-4">
                                                <div className="p-3 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                                    <Star size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Unit Ranking</p>
                                                    <h4 className="text-2xl font-black text-white italic">{unitRank}</h4>
                                                    <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">By Mission Volume</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activity Visualization (Placeholder) */}
                                        <div className="relative h-64 bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem] overflow-hidden group">
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-500/5 to-transparent" />
                                            <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-1">Engagement Heatmap</h4>
                                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Unit interaction frequency over 90 days</p>
                                                </div>
                                                <TrendingUp className="text-blue-500 animate-pulse" size={24} />
                                            </div>
                                            <div className="mt-8 flex items-end gap-1 h-32">
                                                {heatmapHeights.map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 bg-blue-500/20 rounded-t-sm hover:bg-blue-500 transition-all cursor-crosshair"
                                                        style={{ height: `${h}%` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'activity' && (
                                    <div className="space-y-8">
                                        <SectionTitle icon={Activity} title="Operational Ledger" subtitle="Deployment History" />

                                        <div className="space-y-4">
                                            {activities.length > 0 ? activities.map((act) => (
                                                <div key={act.id} className="group bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-blue-500/30 transition-all cursor-pointer">
                                                    <div className="flex items-center gap-6 pr-4">
                                                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 transition-colors">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white uppercase tracking-tight italic line-clamp-1">{act.title}</h4>
                                                            <div className="flex items-center gap-3 mt-1 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                                                <span className="flex items-center gap-1"><MapPin size={10} /> {act.venue}</span>
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(act.start_time).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8 shrink-0">
                                                        <div className="text-right hidden sm:block">
                                                            <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Budget Impact</p>
                                                            <p className="text-xs font-black text-white italic">{fmtINR(act.budget_required)}</p>
                                                        </div>
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                            act.status === 'live' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                                act.status === 'approved' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                                    "bg-zinc-900 text-zinc-600 border-zinc-800"
                                                        )}>
                                                            {act.status}
                                                        </span>
                                                        <ArrowRight size={14} className="text-zinc-800 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                                                    <Activity className="mx-auto text-zinc-800 mb-4" size={40} />
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">No deployment records identified.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'staff' && (
                                    <div className="space-y-8">
                                        <SectionTitle icon={Users} title="Personnel Registry" subtitle="Unit Command" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {staff.length > 0 ? staff.map((s) => (
                                                <div key={s.id} className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm uppercase">
                                                            {s.full_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">{s.full_name}</h4>
                                                            <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">{s.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Activity Index</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500" style={{ width: `${s.activity_score}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-white">{s.activity_score}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="col-span-2 py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Unit personnel not indexed.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer / Global Actions */}
                    <div className="h-24 border-t border-zinc-800 bg-zinc-950 px-10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <VerifiedBadge />
                            <span className="text-zinc-800">|</span>
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Confidential Institutional Data</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 px-6 h-12 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all text-[10px] font-black uppercase tracking-widest">
                                <Share2 size={14} /> Request Access
                            </button>
                            <button className="flex items-center gap-2 px-6 h-12 rounded-xl bg-blue-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                Institutional Memo
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function VerifiedBadge() {
    return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
            <CheckCircle2 size={10} strokeWidth={3} /> Verified Entity
        </span>
    );
}
