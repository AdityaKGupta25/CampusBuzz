"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Users, Search, Building2, User, Globe, Loader2,
    Sparkles, CheckCircle2, ArrowRight, ShieldAlert,
    LayoutGrid, BookOpen, GraduationCap, RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Club {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    banner_url: string | null;
    faculty_name: string | null;
    department_name: string | null;
    event_count: number;
    upcoming_count: number;
    institution_id: string | null;
}

interface DirectoryStats {
    totalClubs: number;
    totalDepts: number;
    totalFaculty: number;
    totalStudents: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deterministic_gradient(name: string) {
    const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `linear-gradient(135deg, hsla(${h},80%,40%,0.4), hsla(${(h + 40) % 360},80%,20%,0.2))`;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
                style={{ boxShadow: "0 0 40px rgba(59,130,246,0.12)" }}>
                <Building2 size={34} className="text-blue-400" />
            </div>
            <div className="space-y-2">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    No Units Found
                </p>
                <h2 className="text-2xl font-bold text-white">
                    No institutional units found.
                </h2>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                    Please onboard your faculty and clubs via Bulk Onboarding to
                    populate this directory for your institution.
                </p>
            </div>
            <a
                href="/admin/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
                style={{
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    boxShadow: "0 8px 24px rgba(59,130,246,0.25)",
                }}
            >
                <Users size={15} /> Go to Bulk Onboarding
            </a>
        </div>
    );
}

// ─── Club Card ────────────────────────────────────────────────────────────────

function ClubCard({ club, idx }: { club: Club; idx: number }) {
    const [following, setFollowing] = useState(false);
    const bg = deterministic_gradient(club.name);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.35, ease: "easeOut" }}
            whileHover={{ y: -5 }}
            className="group h-full"
        >
            <div className="relative h-full bg-zinc-900/70 border border-zinc-800 rounded-[2rem] overflow-hidden
                            group-hover:border-blue-500/40 group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.25)]
                            transition-all flex flex-col">
                {/* Banner */}
                <div className="relative h-20 w-full shrink-0">
                    {club.banner_url
                        ? <img src={club.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        : <div className="absolute inset-0" style={{ background: bg }} />
                    }
                    <div className="absolute inset-0 bg-black/25" />
                    {club.upcoming_count > 0 && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-blue-500/80 border border-blue-400/50 text-[9px] font-black uppercase tracking-widest text-white">
                            {club.upcoming_count} Upcoming
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 pb-6 flex-1 flex flex-col">
                    {/* Avatar + event count */}
                    <div className="flex justify-between items-end mb-4 relative -mt-6">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-950 border-4 border-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-xl z-10">
                            {club.logo_url
                                ? <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                                : <span className="text-xl font-black text-white/50">{club.name.charAt(0)}</span>
                            }
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 pb-1 z-10">
                            {club.event_count} Events
                        </span>
                    </div>

                    <h3 className="text-xl font-black text-white italic tracking-tighter leading-tight
                                   group-hover:text-blue-300 transition-colors line-clamp-2 mb-2">
                        {club.name}
                    </h3>

                    <div className="flex items-center gap-2 text-white/40 mb-3">
                        <Building2 size={12} />
                        <span className="text-xs font-bold">{club.department_name || "Independent"}</span>
                    </div>

                    <p className="text-sm text-white/50 line-clamp-2 min-h-[2.5rem] mb-5">
                        {club.description || "Institutional unit dedicated to student excellence."}
                    </p>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-4 pb-5 mt-auto">
                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Lead Faculty</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                    <User size={10} className="text-white/40" />
                                </div>
                                <span className="text-xs font-bold text-white/70 truncate">
                                    {club.faculty_name || "—"}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Status</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Globe size={10} className="text-blue-400" />
                                </div>
                                <span className="text-xs font-bold text-blue-400">Recognized</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                        <button
                            onClick={(e) => { e.stopPropagation(); setFollowing(!following); }}
                            className={cn(
                                "flex-1 h-10 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 active:scale-95",
                                following
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                            )}
                        >
                            {following ? <><CheckCircle2 size={13} /> Following</> : <><Users size={13} className="opacity-50" /> Follow</>}
                        </button>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20
                                        group-hover:bg-blue-500 group-hover:text-white text-blue-400 transition-all">
                            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: number; color: string;
}) {
    return (
        <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border", color)}>
            <Icon size={15} />
            <div>
                <p className="text-lg font-black text-white leading-none">{value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDirectoryPage() {
    const { user } = useUser();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [stats, setStats] = useState<DirectoryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const loadDirectory = useCallback(async (institutionId: string) => {
        setLoading(true);
        try {
            // ── Events for scoped event-count stats ──────────────────────────
            const { data: eventsData } = await supabase
                .from("events")
                .select("club_id, start_time")
                .eq("institution_id", institutionId)       // ← tenant-scoped
                .not("club_id", "is", null);

            const now = new Date().toISOString();
            const statsMap: Record<string, { total: number; upcoming: number }> = {};
            (eventsData ?? []).forEach((ev: any) => {
                if (!statsMap[ev.club_id]) statsMap[ev.club_id] = { total: 0, upcoming: 0 };
                statsMap[ev.club_id].total++;
                if (ev.start_time > now) statsMap[ev.club_id].upcoming++;
            });

            // ── Clubs for THIS institution only ──────────────────────────────
            const { data: clubsData } = await supabase
                .from("clubs")
                .select(`
                    id,
                    name,
                    description,
                    logo_url,
                    banner_url,
                    institution_id,
                    faculty:users!faculty_in_charge_id(full_name),
                    department:departments(name)
                `)
                .eq("institution_id", institutionId)
                .not("faculty_in_charge_id", "is", null)
                .order("name");

            const mapped: Club[] = (clubsData ?? []).map((c: any) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                logo_url: c.logo_url ?? null,
                banner_url: c.banner_url ?? null,
                institution_id: c.institution_id,
                faculty_name: Array.isArray(c.faculty) ? c.faculty[0]?.full_name ?? null : c.faculty?.full_name ?? null,
                department_name: Array.isArray(c.department) ? c.department[0]?.name ?? null : c.department?.name ?? null,
                event_count: statsMap[c.id]?.total ?? 0,
                upcoming_count: statsMap[c.id]?.upcoming ?? 0,
            }));
            setClubs(mapped);

            // ── Institution-scoped aggregate stats ───────────────────────────
            const [deptsRes, facultyRes, studentsRes] = await Promise.all([
                supabase.from("departments").select("id", { count: "exact", head: true })
                    .eq("institution_id", institutionId),
                supabase.from("users").select("id", { count: "exact", head: true })
                    .eq("institution_id", institutionId).in("role", ["faculty", "hod"]),
                supabase.from("users").select("id", { count: "exact", head: true })
                    .eq("institution_id", institutionId).eq("role", "student"),
            ]);

            setStats({
                totalClubs: mapped.length,
                totalDepts: deptsRes.count ?? 0,
                totalFaculty: facultyRes.count ?? 0,
                totalStudents: studentsRes.count ?? 0,
            });
        } catch (err) {
            console.error("[AdminDirectory] load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user?.institution_id) {
            if (user !== null) { setLoading(false); } // no institution assigned
            return;
        }
        void loadDirectory(user.institution_id);
    }, [loadDirectory, user?.institution_id]);

    const filtered = clubs.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.department_name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    // ── Access guard ──────────────────────────────────────────────────────────
    if (!loading && !user?.institution_id) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <ShieldAlert size={36} className="mx-auto text-amber-400" />
                    <p className="text-white font-bold">No institution assigned to your account.</p>
                    <p className="text-zinc-500 text-sm">Contact the Founder to link your account to an institution.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Ambient glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none z-0"
                style={{ background: "radial-gradient(ellipse at center top, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />

            <div className="relative z-10">
                {/* ── Hero Header ── */}
                <div className="relative h-[36vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#3b82f620,transparent_60%)]" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 text-center space-y-3 px-6"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Sparkles size={14} className="text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">
                                Institutional Registry
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic">
                            Full Directory
                        </h1>
                        <p className="text-white/40 text-sm font-medium max-w-md mx-auto">
                            All clubs, departments, and units registered under your institution.
                        </p>
                    </motion.div>
                </div>

                {/* ── Stats Row ── */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="max-w-7xl mx-auto px-6 pt-8 grid grid-cols-2 md:grid-cols-4 gap-3"
                    >
                        <StatPill icon={LayoutGrid} label="Total Clubs" value={stats.totalClubs} color="text-blue-400 bg-blue-500/8 border-blue-500/15" />
                        <StatPill icon={Building2} label="Departments" value={stats.totalDepts} color="text-violet-400 bg-violet-500/8 border-violet-500/15" />
                        <StatPill icon={BookOpen} label="Faculty & HODs" value={stats.totalFaculty} color="text-emerald-400 bg-emerald-500/8 border-emerald-500/15" />
                        <StatPill icon={GraduationCap} label="Students" value={stats.totalStudents} color="text-amber-400 bg-amber-500/8 border-amber-500/15" />
                    </motion.div>
                )}

                {/* ── Toolbar ── */}
                <div className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-xl border-b border-white/5 px-6 py-5 mt-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search clubs or departments..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                                <Users size={14} className="text-white/40" />
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">
                                    {filtered.length} of {clubs.length}
                                </span>
                            </div>
                            <button
                                onClick={() => user?.institution_id && void loadDirectory(user.institution_id)}
                                disabled={loading}
                                className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-40"
                            >
                                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Grid ── */}
                <div className="max-w-7xl mx-auto px-6 py-12">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                Loading your institution's data...
                            </p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <AnimatePresence>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filtered.map((club, i) => (
                                    <ClubCard key={club.id} club={club} idx={i} />
                                ))}
                            </div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
