"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    Search,
    Building2,
    User,
    Calendar,
    Loader2,
    ArrowRight,
    Sparkles,
    LayoutGrid,
    Globe,
    CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

interface Club {
    id: string;
    name: string;
    description: string | null;
    faculty: {
        full_name: string;
    } | null;
    department: {
        name: string;
    } | null;
    event_count: number;
    upcoming_count: number;
    logo_url?: string;
    banner_url?: string;
}

interface ClubsDirectoryProps {
    rolePrefix?: string;
}

export function ClubsDirectory({ rolePrefix = "" }: ClubsDirectoryProps) {
    const { user } = useUser();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!user?.institution_id) {
            if (user !== null) setLoading(false);
            return;
        }

        async function fetchClubs() {
            setLoading(true);
            try {
                const institutionId = user!.institution_id!;

                // 1. Fetch active club stats (counts and upcoming) scoped to institution
                const { data: eventsData, error: eventsError } = await supabase
                    .from("events")
                    .select("club_id, start_time")
                    .not("club_id", "is", null)
                    .eq("institution_id", institutionId);

                if (eventsError) throw eventsError;

                const now = new Date().toISOString();
                const statsMap = (eventsData || []).reduce((acc: Record<string, { total: number, upcoming: number }>, curr: any) => {
                    if (!acc[curr.club_id]) acc[curr.club_id] = { total: 0, upcoming: 0 };
                    acc[curr.club_id].total++;
                    if (curr.start_time > now) acc[curr.club_id].upcoming++;
                    return acc;
                }, {});

                // 2. Fetch clubs with faculty and department, strictly scoped to institution
                const { data: clubsData, error: clubsError } = await supabase
                    .from("clubs")
                    .select(`
                        id,
                        name,
                        description,
                        logo_url,
                        banner_url,
                        faculty:users!faculty_in_charge_id(full_name),
                        department:departments(name)
                    `)
                    .eq("institution_id", institutionId)
                    .not("faculty_in_charge_id", "is", null)
                    .order("name", { ascending: true });

                if (clubsError) throw clubsError;

                const mappedClubs = (clubsData || []).map((c: any) => ({
                    ...c,
                    event_count: statsMap[c.id]?.total || 0,
                    upcoming_count: statsMap[c.id]?.upcoming || 0
                }));

                setClubs(mappedClubs);
            } catch (err) {
                console.error("Failed to fetch clubs directory:", err);
            } finally {
                setLoading(false);
            }
        }
        void fetchClubs();
    }, [user?.institution_id]);

    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans">
            {/* Header Section */}
            <div className="relative h-[40vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#3b82f633,transparent_60%)]" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 text-center space-y-4 px-6"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles size={16} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Institutional Registry</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic">Clubs Directory</h1>
                    <p className="text-white/40 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed">
                        Discover the vibrant heart of campus life. Explore institutional clubs, technical guilds, and cultural societies orchestrating excellence.
                    </p>
                </motion.div>
            </div>

            {/* Toolbar */}
            <div className="sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 transition-all">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search clubs or departments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                            <Users size={16} className="text-white/40" />
                            <span className="text-xs font-black text-white/40 uppercase tracking-widest">{clubs.length} Registered</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Synchronizing Registry...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredClubs.map((club, idx) => (
                            <ClubCard
                                key={club.id}
                                club={club}
                                delay={idx * 0.05}
                                href={`${rolePrefix}/clubs/${club.id}`}
                            />
                        ))}
                    </div>
                )}

                {!loading && filteredClubs.length === 0 && (
                    <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[3rem]">
                        <Globe size={40} className="mx-auto text-white/10 mb-4" />
                        <p className="text-lg font-bold text-white/40 italic">No clubs registered for your institution yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ClubCard({ club, delay, href }: { club: Club; delay: number; href: string }) {
    const [isFollowing, setIsFollowing] = useState(false);

    // Calculate a deterministic gradient based on club name
    const hash = club.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const bannerGradient = `linear-gradient(135deg, hsla(${hue}, 80%, 40%, 0.4), hsla(${(hue + 40) % 360}, 80%, 20%, 0.2))`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -6 }}
            className="group h-full"
        >
            <Link href={href} className="block h-full">
                <div className="relative h-full bg-[#0d0d1a] border border-white/10 rounded-[2rem] overflow-hidden transition-all group-hover:border-blue-500/40 group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)] flex flex-col">

                    {/* ── Banner Section (80px) ── */}
                    <div className="relative h-20 w-full shrink-0">
                        {club.banner_url ? (
                            <img src={club.banner_url} alt={`${club.name} Banner`} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0" style={{ background: bannerGradient }} />
                        )}

                        {/* Overlays */}
                        <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />

                        {/* Status Badges */}
                        <div className="absolute top-3 right-3 flex gap-2">
                            {club.upcoming_count > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-blue-500/80 text-white border border-blue-400/50 text-[9px] font-black uppercase tracking-widest shadow-md">
                                    {club.upcoming_count} Upcoming
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Body Section ── */}
                    <div className="px-6 pb-6 flex-1 flex flex-col">

                        {/* Header: Avatar overlap + Events Stats */}
                        <div className="flex justify-between items-end mb-4 relative -mt-6">
                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-2xl bg-[#131320] border-4 border-[#0d0d1a] flex items-center justify-center overflow-hidden shrink-0 shadow-xl relative z-10"
                                style={{ boxShadow: "0 8px 16px rgba(0,0,0,0.4)" }}
                            >
                                {club.logo_url ? (
                                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl font-black text-white/50">{club.name.charAt(0)}</span>
                                )}
                            </div>

                            <div className="pb-1 text-right z-10">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                                    {club.event_count} Events
                                </span>
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-black text-white italic tracking-tighter leading-tight group-hover:text-blue-300 transition-colors line-clamp-2 mb-2">
                            {club.name}
                        </h3>

                        <div className="flex items-center gap-2 text-white/40 mb-3">
                            <Building2 size={13} />
                            <span className="text-xs font-bold">{club.department?.name || "Independent"}</span>
                        </div>

                        <p className="text-sm text-white/50 line-clamp-2 min-h-[2.5rem] mb-6">
                            {club.description || "Institutional unit dedicated to student excellence."}
                        </p>

                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 gap-4 pb-6 mt-auto">
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Lead Faculty</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                        <User size={10} className="text-white/40" />
                                    </div>
                                    <span className="text-xs font-bold text-white/70 truncate">{club.faculty?.full_name || "—"}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Global Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Globe size={10} className="text-blue-400" />
                                    </div>
                                    <span className="text-xs font-bold text-blue-400 truncate">Recognized</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsFollowing(!isFollowing);
                                }}
                                className={cn(
                                    "flex-1 h-10 rounded-xl text-xs font-bold transition-all border active:scale-95 flex items-center justify-center gap-2",
                                    isFollowing
                                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                        : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                                )}
                            >
                                {isFollowing ? (
                                    <>
                                        <CheckCircle2 size={14} /> Following
                                    </>
                                ) : (
                                    <>
                                        <Users size={14} className="opacity-50" /> Follow
                                    </>
                                )}
                            </button>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white text-blue-400 transition-all">
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>

                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
