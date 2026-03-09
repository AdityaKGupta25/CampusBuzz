"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Globe,
    Flame,
    Sparkles,
    History,
    Loader2,
    ArrowRight,
    MapPin,
    Calendar,
    Users,
    LayoutGrid,
    Trophy,
    Award,
    Cpu,
    Dribbble,
    FilterX
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { mapDbEventToHodEvent, type HodEvent } from "@/lib/hod-utils";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { PublicEventDetailsModal } from "./PublicEventDetailsModal";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/context/UserContext";

type FilterType = "All" | "Mega Fests" | "Standalone" | "Workshops" | "Sports";

export function ExploreFeed() {
    const { user } = useUser();
    const [events, setEvents] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>("All");
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    useEffect(() => {
        if (!user?.institution_id) {
            if (user !== null) setLoading(false); // context loaded, no institution
            return;
        }
        const institutionId = user.institution_id;

        async function fetchInitialData() {
            setLoading(true);
            try {
                // 1. Fetch Events — scoped to this institution
                const { data: eventsData, error: eventsError } = await supabase
                    .from("events")
                    .select(`
                        id, title, description, status, start_time, end_time, event_type,
                        registered_count, banner_url, club_id,
                        venue:venues(name, capacity),
                        creator:users!events_creator_id_fkey(full_name),
                        department:departments(name),
                        club:clubs(name, logo_url),
                        event_rounds(id),
                        event_prizes(*),
                        sub_events:events!parent_event_id(id, title)
                    `)
                    .eq("institution_id", institutionId)        // ← tenant-scoped
                    .in("status", ["approved", "live", "completed"])
                    .neq("event_type", "sub_event")
                    .order("start_time", { ascending: true });

                if (eventsError) throw eventsError;

                if (eventsData) {
                    setEvents(eventsData.map((row: any) => ({
                        id: row.id,
                        title: row.title,
                        description: row.description ?? "",
                        status: row.status,
                        startDate: row.start_time,
                        endDate: row.end_time,
                        eventType: row.event_type,
                        bannerUrl: row.banner_url,
                        clubId: row.club_id,
                        roundsCount: row.event_rounds?.length || 0,
                        subEventCount: row.sub_events?.length || 0,
                        subEvents: row.sub_events || [],
                        venue: row.venue?.name ?? "TBD",
                        faculty: row.creator?.full_name ?? "Unknown",
                        department: row.department?.name ?? "—",
                        club: row.club?.name ?? "Independent",
                        clubLogo: row.club?.logo_url,
                        registeredCount: row.registered_count || 0,
                        capacity: row.venue?.capacity || 0,
                        prizes: row.event_prizes || []
                    })));
                }

                // 2. Fetch Clubs — scoped to this institution
                const { data: clubsData } = await supabase
                    .from("clubs")
                    .select("id, name, logo_url")
                    .eq("institution_id", institutionId)        // ← tenant-scoped
                    .order("name");
                setClubs(clubsData || []);

            } catch (err) {
                console.error("Explore Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        void fetchInitialData();
    }, [user?.institution_id]);

    const filteredBySearch = events.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.club.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.department.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClub = selectedClubId ? e.clubId === selectedClubId : true;

        return matchesSearch && matchesClub;
    });

    const filteredEvents = filteredBySearch.filter(e => {
        if (activeFilter === "All") return true;
        if (activeFilter === "Mega Fests") return e.eventType === "umbrella";
        if (activeFilter === "Standalone") return e.eventType === "standalone";
        if (activeFilter === "Workshops") return e.title.toLowerCase().includes("workshop");
        if (activeFilter === "Sports") return e.title.toLowerCase().includes("sports") || e.title.toLowerCase().includes("tournament");
        return true;
    });

    const liveEvents = filteredEvents.filter(e => e.status === "live");
    const upcomingEvents = filteredEvents.filter(e => e.status === "approved");
    const pastEvents = filteredEvents.filter(e => e.status === "completed").reverse();

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 bg-zinc-950">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] animate-pulse">Synchronizing Campus Pulse...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] selection:bg-indigo-500/30">
            {/* Header / Search / Filters */}
            <div className="px-10 pt-16 pb-8 space-y-10 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Campus Discovery Hub</h2>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">Explore Campus</h1>
                    </div>

                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search archive record..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all shadow-2xl"
                        />
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {(["All", "Mega Fests", "Standalone", "Workshops", "Sports"] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                activeFilter === f
                                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                    : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Feed */}
            <div className="flex-1 overflow-y-auto pb-32 space-y-20 scrollbar-hide">

                {/* Visual Section 1: Campus Units (Real Data) */}
                <section className="px-10 mt-10">
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Official Campus Units</span>
                        <div className="h-px flex-1 bg-white/5" />
                        {selectedClubId && (
                            <button
                                onClick={() => setSelectedClubId(null)}
                                className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
                            >
                                <FilterX size={12} /> Clear Filter
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-10 overflow-x-auto pb-6 scrollbar-hide">
                        {clubs.map((club) => {
                            const isSelected = selectedClubId === club.id;
                            const initials = club.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

                            return (
                                <button
                                    key={club.id}
                                    onClick={() => setSelectedClubId(isSelected ? null : club.id)}
                                    className="flex flex-col items-center gap-3 group transition-all"
                                >
                                    <div className={cn(
                                        "w-14 h-14 rounded-full border flex items-center justify-center overflow-hidden transition-all p-1 shadow-xl",
                                        isSelected
                                            ? "border-indigo-500 scale-110 ring-4 ring-indigo-500/20 bg-indigo-500/10"
                                            : "border-white/5 bg-zinc-900 group-hover:border-white/20"
                                    )}>
                                        {club.logo_url ? (
                                            <img src={club.logo_url} className="w-full h-full object-cover rounded-full" alt={club.name} />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
                                                <span className="text-xs font-black text-white/40">{initials}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest transition-colors max-w-[80px] truncate",
                                        isSelected ? "text-indigo-400" : "text-white/30 group-hover:text-white"
                                    )}>
                                        {club.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Section 2: 🔥 HAPPENING NOW (Live) */}
                {liveEvents.length > 0 && (
                    <EventSection
                        title="Happening Now"
                        icon={<Flame size={16} className="text-rose-500" />}
                        events={liveEvents}
                        onSelect={setSelectedEvent}
                    />
                )}

                {/* Section 3: 🗓️ UPCOMING OPPORTUNITIES (Approved) */}
                {upcomingEvents.length > 0 && (
                    <EventSection
                        title="Upcoming Opportunities"
                        icon={<Sparkles size={16} className="text-indigo-400" />}
                        events={upcomingEvents}
                        onSelect={setSelectedEvent}
                    />
                )}

                {/* Section 4: 🏛️ INSTITUTIONAL ARCHIVE (Completed) */}
                <section className="space-y-10">
                    <div className="px-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[1.2rem] bg-zinc-900 border border-white/5 flex items-center justify-center">
                                <History size={16} className="text-zinc-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white/40 tracking-tighter uppercase italic line-through decoration-indigo-500/50">Institutional Archive</h3>
                                <p className="text-[9px] font-bold text-white/10 uppercase tracking-[0.3em]">Historical Campus Records</p>
                            </div>
                        </div>
                        <div className="h-px flex-1 bg-white/5 ml-12" />
                    </div>

                    {pastEvents.length > 0 ? (
                        <div className="flex gap-8 overflow-x-auto px-10 pb-10 scrollbar-hide snap-x">
                            {pastEvents.map((event) => (
                                <ExploreCard
                                    key={event.id}
                                    event={event}
                                    variant="card"
                                    onClick={() => setSelectedEvent(event)}
                                    onClickSubEvent={(sub) => setSelectedEvent(sub)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mx-10 py-20 text-center border border-white/5 rounded-[3rem] bg-white/[0.01]">
                            <p className="text-sm font-bold text-white/20 italic tracking-widest uppercase">
                                "No archived records yet. History starts with your first completed event!"
                            </p>
                        </div>
                    )}
                </section>

                {/* Global Empty State */}
                {filteredEvents.length === 0 && !loading && (
                    <div className="mx-10 py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] bg-white/[0.01]">
                        <p className="text-sm font-bold text-white/20 italic tracking-widest uppercase">"No echoes found in the campus digital footprint..."</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedEvent && (
                    <PublicEventDetailsModal
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function EventSection({ title, icon, events, onSelect }: {
    title: string;
    icon: React.ReactNode;
    events: any[];
    onSelect: (e: any) => void
}) {
    // Determine variant based on title or event properties
    // Mega fests should be 'wide' cards
    const umbrellaEvents = events.filter(e => e.eventType === 'umbrella');
    const standaloneEvents = events.filter(e => e.eventType === 'standalone');

    return (
        <section className="space-y-10">
            <div className="px-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[1.2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg">
                        {icon}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">{title}</h3>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">Institutional Grade Activities</p>
                    </div>
                </div>
                <div className="h-px flex-1 bg-white/5 ml-12" />
            </div>

            <div className="flex flex-col gap-12 overflow-x-auto px-10 pb-10 scrollbar-hide snap-x">
                {/* First show Mega Fests in Wide format */}
                {umbrellaEvents.length > 0 && (
                    <div className="flex gap-8">
                        {umbrellaEvents.map((event) => (
                            <ExploreCard
                                key={event.id}
                                event={event}
                                variant="wide"
                                onClick={() => onSelect(event)}
                                onClickSubEvent={(sub) => onSelect(sub)}
                            />
                        ))}
                    </div>
                )}
                {/* Then show Standalone in Card format */}
                {standaloneEvents.length > 0 && (
                    <div className="flex gap-8">
                        {standaloneEvents.map((event) => (
                            <ExploreCard
                                key={event.id}
                                event={event}
                                variant="card"
                                onClick={() => onSelect(event)}
                                onClickSubEvent={(sub) => onSelect(sub)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function ExploreCard({ event, variant, onClick, onClickSubEvent }: { event: any; variant: "wide" | "card"; onClick: () => void; onClickSubEvent: (sub: any) => void }) {
    const isLive = event.status === "live";
    const isPast = event.status === "completed";
    const isWide = variant === "wide";
    const [isPeekOpen, setIsPeekOpen] = useState(false);

    return (
        <motion.div
            whileHover={{ y: -8 }}
            className={cn(
                "flex-shrink-0 snap-start group cursor-pointer",
                isWide ? "w-[480px] md:w-[680px]" : "w-[340px]"
            )}
        >
            <div
                onClick={onClick}
                className={cn(
                    "relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 group-hover:border-indigo-500/50 transition-all duration-500",
                    isWide ? "aspect-[16/9]" : "aspect-[4/5]",
                    isPast && "grayscale-[0.5] opacity-80"
                )}
            >
                {/* Image */}
                <img
                    src={event.bannerUrl || "https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?auto=format&fit=crop&q=80"}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                />

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Top Actions/Badges */}
                <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isLive ? (
                            <div className="px-4 py-1.5 rounded-full bg-rose-500 flex items-center gap-2 shadow-[0_0_30px_rgba(244,63,94,0.6)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Pulse</span>
                            </div>
                        ) : isPast ? (
                            <div className="px-4 py-1.5 rounded-full bg-indigo-500 flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                <Trophy size={12} className="text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">🏆 Results Out</span>
                            </div>
                        ) : (
                            <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center">
                                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{event.eventType.toUpperCase()} OPPORTUNITY</span>
                            </div>
                        )}
                        {event.eventType === 'umbrella' ? (
                            event.subEventCount > 0 && (
                                <div className="px-4 py-1.5 rounded-full bg-indigo-500 flex items-center gap-2">
                                    <LayoutGrid size={12} className="text-white" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Includes {event.subEventCount} Competitions</span>
                                </div>
                            )
                        ) : (
                            event.roundsCount > 0 && (
                                <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
                                    <LayoutGrid size={12} className="text-white/60" />
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{event.roundsCount} Phases</span>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="absolute bottom-10 left-10 right-10 flex flex-col justify-end gap-6 h-full pt-32">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">{event.club || event.department}</p>
                        </div>
                        <h4 className={cn(
                            "font-black text-white leading-[0.9] tracking-tighter uppercase italic group-hover:text-indigo-400 transition-colors drop-shadow-2xl",
                            isWide ? "text-5xl md:text-7xl" : "text-3xl"
                        )}>
                            {event.title}
                        </h4>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/10">
                        <div className="flex items-center gap-8">
                            {event.eventType === 'umbrella' && event.subEventCount > 0 ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsPeekOpen(!isPeekOpen);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <Search size={12} /> {isPeekOpen ? "Hide Lineup" : "Peek Lineup"}
                                </button>
                            ) : (
                                <div className="flex items-center gap-8">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] leading-none">{isPast ? "Archival Date" : "Schedule Lock"}</span>
                                        <div className="flex items-center gap-2 text-white/70">
                                            <Calendar size={12} className="text-indigo-500" />
                                            <span className="text-xs font-black italic">{formatDate(event.startDate)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] leading-none">Registry</span>
                                        <div className="flex items-center gap-2 text-white/70">
                                            <Users size={12} className="text-rose-500" />
                                            <span className="text-xs font-black italic">{event.registeredCount}+</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="w-12 h-12 rounded-[1.2rem] bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all">
                            <ArrowRight size={18} className="text-white/40 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Sub-event Peek Overlay */}
                <AnimatePresence>
                    {isPeekOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-x-8 bottom-36 p-6 rounded-[2rem] bg-zinc-950/90 backdrop-blur-xl border border-white/10 z-20 shadow-3xl"
                        >
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Fest Content Preview</p>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {event.subEvents.map((sub: any) => (
                                    <div
                                        key={sub.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClickSubEvent(sub);
                                        }}
                                        className="flex-shrink-0 px-4 py-3 rounded-xl bg-white/5 border border-white/5 space-y-1 max-w-[140px] cursor-pointer hover:scale-105 hover:bg-white/10 hover:border-purple-500/50 transition-all group/sub"
                                    >
                                        <p className="text-[10px] font-black text-white truncate group-hover/sub:text-purple-400 transition-colors">{sub.title}</p>
                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Competition</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
