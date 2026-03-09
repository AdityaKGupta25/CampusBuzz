"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    Calendar,
    MapPin,
    Trophy,
    ArrowLeft,
    Loader2,
    Building2,
    User,
    Sparkles,
    ChevronRight,
    Megaphone,
    History,
    PieChart,
    BarChart3,
    Award,
    Edit3,
    Layers,
    LayoutGrid,
    Search,
    Filter,
    CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PublicEventDetailsModal } from "@/components/explore/PublicEventDetailsModal";
import { type HodEvent } from "@/lib/hod-utils";

interface ClubDetails {
    id: string;
    name: string;
    description: string | null;
    faculty: { full_name: string } | null;
    department: { name: string } | null;
}

interface ClubEvent {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time?: string;
    venue: { name: string; capacity?: number } | null;
    status: string;
    banner_url: string | null;
    registered_count: number;
    event_type: string;
    parent_event_id: string | null;
    rounds?: any[];
    prizes?: any[];
    impactStats?: any;
    // For nesting
    children?: ClubEvent[];
}

interface ClubStats {
    totalParticipants: number;
    departmentsReached: number;
    certificatesIssued: number;
}

interface EventWinner {
    prize_title: string;
    winner_name: string;
    department: string;
}

interface DeptParticipation {
    name: string;
    count: number;
    percentage: number;
}

interface ClubProfileProps {
    id: string;
    rolePrefix?: string; // e.g. "/faculty" or "/student"
}

export function ClubProfile({ id, rolePrefix = "" }: ClubProfileProps) {
    const router = useRouter();

    const [club, setClub] = useState<ClubDetails | null>(null);
    const [stats, setStats] = useState<ClubStats>({ totalParticipants: 0, departmentsReached: 0, certificatesIssued: 0 });
    const [upcoming, setUpcoming] = useState<ClubEvent[]>([]);
    const [past, setPast] = useState<ClubEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>(rolePrefix === "/student" ? "explore_lineup" : "upcoming");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedEventResults, setSelectedEventResults] = useState<string | null>(null);
    const [eventResults, setEventResults] = useState<{ winners: EventWinner[], depts: DeptParticipation[] } | null>(null);
    const [loadingResults, setLoadingResults] = useState(false);
    const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);

    // Modal State
    const [selectedEventForModal, setSelectedEventForModal] = useState<ClubEvent | null>(null);

    useEffect(() => {
        async function fetchClubData() {
            setLoading(true);
            try {
                // Fetch current user
                let finalUserId: string | null = null;
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: userData } = await supabase
                        .from("users")
                        .select("id, role")
                        .eq("auth_uid", user.id)
                        .single();
                    setCurrentUser(userData);
                    finalUserId = userData?.id;
                }

                // Fetch Club
                const { data: clubData, error: clubError } = await supabase
                    .from("clubs")
                    .select("id, name, description, faculty:users!faculty_in_charge_id(full_name), department:departments(name)")
                    .eq("id", id)
                    .single();

                if (clubError) throw clubError;
                setClub(clubData as any);

                // Fetch Events with full metadata
                const { data: eventsData, error: eventsError } = await supabase
                    .from("events")
                    .select(`
                        id, 
                        title, 
                        description, 
                        start_time, 
                        end_time,
                        status, 
                        banner_url, 
                        registered_count, 
                        event_type,
                        parent_event_id,
                        venue:venues(name, capacity),
                        event_rounds(*),
                        event_prizes(*, winner:users(full_name, department:departments(name)), winner_team:teams(name))
                    `)
                    .eq("club_id", id)
                    .order("start_time", { ascending: true });

                if (eventsError) throw eventsError;

                const rawEvents: ClubEvent[] = (eventsData || []).map((e: any) => ({
                    ...e,
                    startDate: e.start_time, // compatibility with modal
                    club: (clubData as any)?.name || "Independent",
                    department: (clubData as any)?.department?.name || "—"
                }));

                // Grouping Logic: Nest children under parents
                const parents = rawEvents.filter(e => !e.parent_event_id);
                const children = rawEvents.filter(e => e.parent_event_id);

                const mappedEvents: ClubEvent[] = parents.map(parent => ({
                    ...parent,
                    children: children.filter(child => child.parent_event_id === parent.id)
                }));

                if (finalUserId && rolePrefix === "/student") {
                    const { data: regs } = await supabase
                        .from("registrations")
                        .select("event_id")
                        .eq("student_id", finalUserId)
                        .in("event_id", mappedEvents.map(e => e.id));
                    setRegisteredEventIds((regs || []).map(r => r.event_id));
                }

                setUpcoming(mappedEvents.filter(e => e.status === 'approved' || e.status === 'live'));
                setPast(mappedEvents.filter(e => (e.status === 'completed' || e.status === 'live') && new Date(e.start_time) < new Date()).reverse());

                // Calculate Stats
                const totalParticipants = mappedEvents.reduce((acc, curr) => acc + (curr.registered_count || 0), 0);

                // Departments Reached (requires fetching registrations for these events)
                const eventIds = mappedEvents.map(e => e.id);
                const { data: regDepts } = await supabase
                    .from("registrations")
                    .select("student_id, student:users(department_id)")
                    .in("event_id", eventIds);

                const uniqueDeptIds = new Set((regDepts || []).map((r: any) => r.student?.department_id).filter(Boolean));

                // Certificates Issued
                const { count: certCount } = await supabase
                    .from("verified_ledger")
                    .select("*", { count: 'exact', head: true })
                    .in("event_id", eventIds);

                setStats({
                    totalParticipants,
                    departmentsReached: uniqueDeptIds.size,
                    certificatesIssued: certCount || 0
                });

            } catch (err) {
                console.error("Failed to fetch club profile:", err);
            } finally {
                setLoading(false);
            }
        }
        void fetchClubData();
    }, [id]);

    const fetchEventResults = async (eventId: string) => {
        setLoadingResults(true);
        setSelectedEventResults(eventId);
        try {
            // Fetch Winners
            const { data: winnersData } = await supabase
                .from("event_prizes")
                .select("title, winner_id, winner:users(full_name, department:departments(name))")
                .eq("event_id", eventId)
                .not("winner_id", "is", null);

            const mappedWinners: EventWinner[] = (winnersData || []).map((w: any) => ({
                prize_title: w.title,
                winner_name: w.winner?.full_name || "Unknown",
                department: w.winner?.department?.name || "Independent"
            }));

            // Fetch Registration Distribution
            const { data: registrations } = await supabase
                .from("registrations")
                .select("student:users(department:departments(name))")
                .eq("event_id", eventId);

            const deptCounts: Record<string, number> = {};
            (registrations || []).forEach((r: any) => {
                const deptName = r.student?.department?.name || "Independent";
                deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
            });

            const total = (registrations || []).length || 1;
            const mappedDepts: DeptParticipation[] = Object.entries(deptCounts).map(([name, count]) => ({
                name,
                count,
                percentage: Math.round((count / total) * 100)
            })).sort((a, b) => b.count - a.count);

            setEventResults({ winners: mappedWinners, depts: mappedDepts });
        } catch (err) {
            console.error("Failed to fetch event results:", err);
        } finally {
            setLoadingResults(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Decoding Club Identity...</p>
            </div>
        );
    }

    if (!club) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <Users size={32} className="text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white italic">Club Not Found</h2>
                    <p className="text-white/40 text-sm max-w-xs">The institutional record for this entity could not be retrieved from the vault.</p>
                </div>
                <button
                    onClick={() => router.push(`${rolePrefix}/clubs`)}
                    className="h-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all"
                >
                    Back to Directory
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans overflow-x-hidden">
            {/* Hero Section */}
            <div className="relative h-[50vh] min-h-[400px]">
                {/* Background Banner */}
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80"
                        className="w-full h-full object-cover opacity-30 grayscale"
                        alt="Banner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
                </div>

                {/* Back Button */}
                <Link
                    href={`${rolePrefix}/clubs`}
                    className="absolute top-8 left-8 z-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
                >
                    <ArrowLeft size={14} /> Back to Registry
                </Link>

                {/* Profile Meta */}
                <div className="absolute bottom-16 left-0 right-0 px-8 md:px-20">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row items-end gap-8"
                        >
                            <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center shadow-2xl border-4 border-[#09090b] flex-shrink-0">
                                <Users size={56} className="text-white" />
                            </div>
                            <div className="space-y-4 mb-2">
                                <div className="flex items-center gap-3">
                                    <Badge variant="live" dot>ACTIVE GUILD</Badge>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic leading-none">{club.name}</h1>
                                {currentUser?.role === 'faculty' && (
                                    <button
                                        onClick={() => router.push(`/faculty/clubs/${id}/edit`)}
                                        className="mt-4 flex items-center gap-2 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white/60 hover:text-white"
                                    >
                                        <Edit3 size={14} /> Edit Club Profile
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Club Impact Stats - Only for Faculty/HOD */}
            {rolePrefix !== "/student" && (
                <div className="max-w-7xl mx-auto px-8 md:px-20 -mt-8 relative z-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 space-y-2 group hover:border-blue-500/30 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-blue-400">Total Participants Managed</p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-4xl font-black tracking-tighter italic">{stats.totalParticipants.toLocaleString()}</h4>
                                <Users size={18} className="text-blue-500/40" />
                            </div>
                        </div>
                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 space-y-2 group hover:border-indigo-500/30 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-indigo-400">Departments Reached</p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-4xl font-black tracking-tighter italic">{stats.departmentsReached}</h4>
                                <Building2 size={18} className="text-indigo-500/40" />
                            </div>
                        </div>
                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 space-y-2 group hover:border-amber-500/30 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-amber-400">Certificates Issued</p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-4xl font-black tracking-tighter italic">{stats.certificatesIssued}</h4>
                                <Award size={18} className="text-amber-500/40" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-8 md:px-20 py-16 grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-16">

                {/* Left: About + Events */}
                <div className="space-y-16">
                    {/* Bio */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Sparkles size={16} className="text-white/20" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">About the Club</h3>
                        </div>
                        <p className="text-xl md:text-2xl text-white/70 leading-relaxed font-medium italic">
                            "{club.description || "The mission of this institutional club remains classified within the campus governance archives. Expected impact: Excellence."}"
                        </p>
                    </section>

                    {/* Events Tabs */}
                    <section className="space-y-10">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex flex-wrap gap-8 border-b-2 border-transparent">
                                {rolePrefix === "/student" ? (
                                    <>
                                        <button
                                            onClick={() => setActiveTab("active_missions")}
                                            className={cn(
                                                "text-sm font-black uppercase tracking-widest transition-all pb-4 -mb-[17px]",
                                                activeTab === 'active_missions' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-white/30 hover:text-white"
                                            )}
                                        >
                                            Your Active Missions
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("explore_lineup")}
                                            className={cn(
                                                "text-sm font-black uppercase tracking-widest transition-all pb-4 -mb-[17px]",
                                                activeTab === 'explore_lineup' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-white/30 hover:text-white"
                                            )}
                                        >
                                            Explore Lineup
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("past_legends")}
                                            className={cn(
                                                "text-sm font-black uppercase tracking-widest transition-all pb-4 -mb-[17px]",
                                                activeTab === 'past_legends' ? "text-amber-400 border-b-2 border-amber-400" : "text-white/30 hover:text-white"
                                            )}
                                        >
                                            Past Legends
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setActiveTab("upcoming")}
                                            className={cn(
                                                "text-sm font-black uppercase tracking-widest transition-all pb-4 -mb-[17px]",
                                                activeTab === 'upcoming' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-white/30 hover:text-white"
                                            )}
                                        >
                                            Current & Upcoming Events
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("past")}
                                            className={cn(
                                                "text-sm font-black uppercase tracking-widest transition-all pb-4 -mb-[17px]",
                                                activeTab === 'past' ? "text-amber-400 border-b-2 border-amber-400" : "text-white/30 hover:text-white"
                                            )}
                                        >
                                            Hall of Fame
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest mt-4 md:mt-0">
                                <Megaphone size={12} />
                                {(() => {
                                    if (rolePrefix === "/student") {
                                        if (activeTab === "active_missions") return upcoming.filter(e => registeredEventIds.includes(e.id)).length;
                                        if (activeTab === "explore_lineup") return upcoming.filter(e => !registeredEventIds.includes(e.id)).length;
                                        if (activeTab === "past_legends") return past.length;
                                    }
                                    return activeTab === 'upcoming' ? upcoming.length : past.length;
                                })()} Records
                            </div>
                        </div>

                        <div className="space-y-20">
                            <AnimatePresence mode="wait">
                                {activeTab === 'active_missions' && (
                                    <motion.div key="active_missions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-20">
                                        {upcoming.filter(e => registeredEventIds.includes(e.id)).length > 0 ? (
                                            <div className="space-y-10">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Your Active Registrations</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {upcoming.filter(e => registeredEventIds.includes(e.id)).map(event => (
                                                        <StandaloneEventCard
                                                            key={event.id}
                                                            event={event}
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                                <Calendar size={32} className="mx-auto text-white/10 mb-4" />
                                                <p className="text-sm font-black text-white/20 uppercase tracking-widest">No Active Missions Found</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'explore_lineup' && (
                                    <motion.div key="explore_lineup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-20">
                                        {upcoming.filter(e => e.event_type === "umbrella" && !registeredEventIds.includes(e.id)).length > 0 && (
                                            <div className="space-y-10">
                                                <div className="flex items-center gap-3">
                                                    <Layers size={18} className="text-indigo-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Special Collections</h4>
                                                </div>
                                                <div className="space-y-12">
                                                    {upcoming.filter(e => e.event_type === "umbrella" && !registeredEventIds.includes(e.id)).map(event => (
                                                        <UmbrellaCollectionCard
                                                            key={event.id}
                                                            event={event}
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {upcoming.filter(e => e.event_type !== "umbrella" && !registeredEventIds.includes(e.id)).length > 0 && (
                                            <div className="space-y-10">
                                                <div className="flex items-center gap-3">
                                                    <LayoutGrid size={18} className="text-cyan-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Explore Activities</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {upcoming.filter(e => e.event_type !== "umbrella" && !registeredEventIds.includes(e.id)).map(event => (
                                                        <StandaloneEventCard
                                                            key={event.id}
                                                            event={event}
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {upcoming.filter(e => !registeredEventIds.includes(e.id)).length === 0 && (
                                            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                                <Calendar size={32} className="mx-auto text-white/10 mb-4" />
                                                <p className="text-sm font-black text-white/20 uppercase tracking-widest">No Lineup Available</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'upcoming' && (
                                    <motion.div
                                        key="upcoming"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-20"
                                    >
                                        {/* Umbrella Collections */}
                                        {upcoming.filter(e => e.event_type === "umbrella").length > 0 && (
                                            <div className="space-y-10">
                                                <div className="flex items-center gap-3">
                                                    <Layers size={18} className="text-indigo-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Special Collections</h4>
                                                </div>
                                                <div className="space-y-12">
                                                    {upcoming.filter(e => e.event_type === "umbrella").map(event => (
                                                        <UmbrellaCollectionCard
                                                            key={event.id}
                                                            event={event}
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Standalone Activities */}
                                        {upcoming.filter(e => e.event_type !== "umbrella").length > 0 && (
                                            <div className="space-y-10">
                                                <div className="flex items-center gap-3">
                                                    <LayoutGrid size={18} className="text-cyan-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Institutional Activities</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {upcoming.filter(e => e.event_type !== "umbrella").map(event => (
                                                        <StandaloneEventCard
                                                            key={event.id}
                                                            event={event}
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {upcoming.length === 0 && (
                                            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                                <Calendar size={32} className="mx-auto text-white/10 mb-4" />
                                                <p className="text-sm font-black text-white/20 uppercase tracking-widest">No Active Events Scheduled</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                                {(activeTab === 'past' || activeTab === 'past_legends') && (
                                    <motion.div
                                        key="past"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-20"
                                    >
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {past.map(event => (
                                                <div key={event.id} className={cn("space-y-4", event.event_type === "umbrella" ? "lg:col-span-2" : "")}>
                                                    {event.event_type === "umbrella" ? (
                                                        <UmbrellaCollectionCard
                                                            event={event}
                                                            isPast
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    ) : (
                                                        <StandaloneEventCard
                                                            event={event}
                                                            isPast
                                                            onOpenModal={setSelectedEventForModal}
                                                        />
                                                    )}
                                                    <div className={event.event_type === "umbrella" ? "px-10" : ""}>
                                                        <button
                                                            onClick={() => fetchEventResults(event.id)}
                                                            className={cn(
                                                                event.event_type === "umbrella"
                                                                    ? "h-10 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                                                                    : "w-full h-10 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                                                                selectedEventResults === event.id ? "bg-zinc-100 text-zinc-900 shadow-md" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                                            )}
                                                        >
                                                            <Trophy size={14} /> Analytics & Results
                                                        </button>
                                                    </div>
                                                    <ResultsDrilldown eventId={event.id} selectedEventResults={selectedEventResults} loadingResults={loadingResults} eventResults={eventResults} />
                                                </div>
                                            ))}
                                        </div>

                                        {past.length === 0 && (
                                            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                                <History size={32} className="mx-auto text-white/10 mb-4" />
                                                <p className="text-sm font-black text-white/20 uppercase tracking-widest">Historical Vault is Empty</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>
                </div>

                {/* Right: Sidebar Stats/Oversight */}
                <div className="space-y-8">
                    {/* Faculty Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <User size={16} className="text-indigo-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30">{rolePrefix === "/student" ? "Club Stars" : "Oversight"}</h3>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-white italic tracking-tighter">
                                {club.faculty?.full_name || "Institutional Board"}
                            </p>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Faculty In-Charge</p>
                        </div>
                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <Trophy size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-white">{past.length}</p>
                                    <dt className="text-[8px] font-black text-white/20 uppercase tracking-widest">Events Delivered</dt>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <Calendar size={18} className="text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-white">{upcoming.length}</p>
                                    <dt className="text-[8px] font-black text-white/20 uppercase tracking-widest">Ongoing Activities</dt>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department Context */}
                    <div className="p-8 border-2 border-blue-500/10 rounded-[2rem] space-y-4 italic">
                        <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-blue-400" />
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{rolePrefix === "/student" ? "Your Stats" : "Jurisdiction"}</span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">
                            This club operates under the strategic oversight of the <span className="text-white font-bold">{club.department?.name || "Global Campus Council"}</span>.
                        </p>
                    </div>
                </div>
            </div >

            {/* Institutional Discovery Modal */}
            <AnimatePresence>
                {
                    selectedEventForModal && (
                        <PublicEventDetailsModal
                            event={selectedEventForModal}
                            onClose={() => setSelectedEventForModal(null)}
                        />
                    )
                }
            </AnimatePresence >
        </div >
    );
}

function UmbrellaCollectionCard({ event, isPast, onOpenModal }: { event: ClubEvent; isPast?: boolean; onOpenModal: (e: any) => void }) {
    return (
        <div className="space-y-10 group/collection">
            {/* Massive Umbrella Card */}
            <div
                onClick={() => onOpenModal(event)}
                className="relative h-[24rem] rounded-[3.5rem] overflow-hidden border border-white/10 shadow-3xl bg-zinc-950 cursor-pointer"
            >
                <div className="absolute inset-0 bg-zinc-950">
                    {event.banner_url && (
                        <img
                            src={event.banner_url}
                            className="w-full h-full object-cover opacity-60 group-hover/collection:scale-110 transition-transform duration-[2000ms]"
                            alt=""
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/40 to-transparent" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-12 flex flex-col justify-end space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-indigo-500 text-white border-none px-4 py-1 text-[10px] font-black italic tracking-widest">MEGA FEST</Badge>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Institutional Collection</span>
                        </div>
                        <h4 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-[0.8]">{event.title}</h4>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/10">
                        <div className="flex items-center gap-8">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none">Temporal Window</p>
                                <p className="text-sm font-black text-white leading-none">{formatDate(event.start_time)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none">Domain Presence</p>
                                <p className="text-sm font-black text-indigo-400 leading-none">{event.children?.length || 0} Competitions</p>
                            </div>
                        </div>
                        <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover/collection:bg-indigo-500 transition-all">
                            <ChevronRight size={24} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Netflix Row for Sub-events */}
            {event.children && event.children.length > 0 && (
                <div className="space-y-6 pl-12">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20 whitespace-nowrap">Explore Competitions</span>
                        <div className="h-px w-20 bg-white/5" />
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x">
                        {event.children.map(child => (
                            <div
                                key={child.id}
                                onClick={() => onOpenModal(child)}
                                className="flex-shrink-0 w-80 snap-start cursor-pointer group/child"
                            >
                                <div className="aspect-[16/10] rounded-[2rem] bg-zinc-950 border border-white/5 p-8 flex flex-col justify-between hover:border-white/10 transition-all relative overflow-hidden group-hover/child:bg-zinc-900">
                                    {child.banner_url ? (
                                        <>
                                            <img src={child.banner_url} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover/child:opacity-60 transition-opacity group-hover/child:scale-105 duration-500" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                                        </>
                                    ) : (
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
                                    )}

                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-white/5 group-hover/child:scale-110 transition-transform">
                                            {isPast ? <Trophy size={16} className="text-amber-500" /> : <Sparkles size={16} className="text-indigo-400" />}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover/child:opacity-100 transition-opacity">
                                            <ChevronRight size={14} className="text-white/40" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 relative z-10">
                                        <h5 className="text-lg font-black text-white italic tracking-tight uppercase leading-none group-hover/child:text-indigo-400 transition-colors truncate">{child.title}</h5>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{formatDate(child.start_time)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StandaloneEventCard({ event, isPast, onOpenModal }: { event: ClubEvent; isPast?: boolean; onOpenModal: (e: any) => void }) {
    return (
        <div
            onClick={() => onOpenModal(event)}
            className="group bg-white/5 border border-white/5 rounded-3xl p-6 flex items-center gap-6 transition-all hover:bg-white/[0.08] hover:border-white/10 cursor-pointer"
        >
            <div className="w-16 h-16 rounded-2xl bg-zinc-950 overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform border border-white/5">
                {event.banner_url ? (
                    <img src={event.banner_url} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center", isPast ? "bg-amber-500/20" : "bg-cyan-500/20")}>
                        {isPast ? <History size={20} className="text-amber-400" /> : <Calendar size={20} className="text-cyan-400" />}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-white truncate uppercase italic tracking-tight group-hover:text-cyan-400 transition-colors">{event.title}</h4>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{formatDate(event.start_time)}</p>
            </div>
            <ChevronRight size={16} className="text-white/10 group-hover:text-white transition-colors" />
        </div>
    );
}

function ResultsDrilldown({ eventId, selectedEventResults, loadingResults, eventResults }: any) {
    return (
        <AnimatePresence>
            {selectedEventResults === eventId && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="mx-10 p-10 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] space-y-12 mt-4 relative">
                        <div className="absolute inset-0 bg-amber-500/[0.02] pointer-events-none" />

                        {loadingResults ? (
                            <div className="flex items-center gap-4 text-white/20 py-8 justify-center">
                                <Loader2 size={24} className="animate-spin text-amber-500" />
                                <span className="text-xs font-black uppercase tracking-[0.3em] italic">Retaking Archival Data...</span>
                            </div>
                        ) : eventResults && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
                                {/* Winners Column */}
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                        <Award size={14} /> Top Performers
                                    </h5>
                                    <div className="space-y-3">
                                        {eventResults.winners.length > 0 ? eventResults.winners.slice(0, 5).map((winner: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{winner.prize_title || "Distinction"}</p>
                                                    <p className="text-sm font-semibold text-zinc-100">{winner.winner_name}</p>
                                                </div>
                                                <span className="text-[10px] font-medium text-zinc-400 uppercase bg-zinc-900 px-3 py-1 rounded-md">{winner.department}</span>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-zinc-500 font-medium">No performers recorded for this event.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Distribution Column */}
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                        <BarChart3 size={14} /> Past Event Statistics
                                    </h5>
                                    <div className="space-y-5">
                                        {eventResults.depts.map((dept: any, idx: number) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-xs font-medium text-zinc-300 tracking-wide">{dept.name}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400">{dept.percentage}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-zinc-900 rounded-sm overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${dept.percentage}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-zinc-200 rounded-sm"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
