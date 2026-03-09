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
    Globe
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
}

export default function GlobalClubsDirectoryPage() {
    const { user } = useUser();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!user?.institution_id) {
            if (user !== null) setLoading(false);
            return;
        }
        const institutionId = user.institution_id;

        async function fetchClubs() {
            setLoading(true);
            try {
                // Clubs scoped to this institution
                const { data: clubsData, error: clubsError } = await supabase
                    .from("clubs")
                    .select(`
                        id,
                        name,
                        description,
                        faculty:users!faculty_in_charge_id(full_name),
                        department:departments(name)
                    `)
                    .eq("institution_id", institutionId)     // ← tenant-scoped
                    .order("name", { ascending: true });

                if (clubsError) throw clubsError;

                // Event counts scoped to this institution
                const { data: eventCounts, error: countsError } = await supabase
                    .from("events")
                    .select("club_id")
                    .eq("institution_id", institutionId);    // ← tenant-scoped

                if (countsError) throw countsError;

                const countMap = (eventCounts || []).reduce((acc: any, curr: any) => {
                    if (curr.club_id) {
                        acc[curr.club_id] = (acc[curr.club_id] || 0) + 1;
                    }
                    return acc;
                }, {});

                const mappedClubs = (clubsData || []).map((c: any) => ({
                    ...c,
                    event_count: countMap[c.id] || 0
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
        <main className="min-h-screen bg-[#09090b] text-white font-sans">
            {/* Header Section */}
            <div className="relative h-[40vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#3b82f644,transparent_50%)]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

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
                            <ClubCard key={club.id} club={club} delay={idx * 0.05} />
                        ))}
                    </div>
                )}

                {!loading && filteredClubs.length === 0 && (
                    <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[3rem]">
                        <Globe size={40} className="mx-auto text-white/10 mb-4" />
                        <p className="text-lg font-bold text-white/40 italic">
                            No clubs registered for your institution yet.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}

function ClubCard({ club, delay }: { club: Club; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -8 }}
            className="group"
        >
            <Link href={`/clubs/${club.id}`}>
                <div className="relative h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden transition-all group-hover:bg-white/[0.08] group-hover:border-blue-500/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-blue-500/10" />

                    <div className="relative space-y-6">
                        {/* Avatar / Icon Placeholder */}
                        <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users size={28} className="text-blue-400" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-blue-300 transition-colors italic">
                                {club.name}
                            </h3>
                            <div className="flex items-center gap-2 text-white/40">
                                <Building2 size={14} />
                                <span className="text-xs font-bold">{club.department?.name || "Independent"}</span>
                            </div>
                        </div>

                        <p className="text-sm text-white/40 line-clamp-2 min-h-[2.5rem]">
                            {club.description || "No description provided for this institutional club."}
                        </p>

                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Lead Faculty</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                        <User size={10} className="text-white/40" />
                                    </div>
                                    <span className="text-xs font-bold text-white/70 truncate">{club.faculty?.full_name || "—"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Activity</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <Calendar size={10} className="text-blue-400" />
                                    </div>
                                    <span className="text-xs font-black text-blue-400">{club.event_count} Events</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">
                                View Profile
                            </span>
                            <ArrowRight size={16} className="text-white/20 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all text-blue-400" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
