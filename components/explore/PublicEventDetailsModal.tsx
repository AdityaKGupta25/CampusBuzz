"use client";

import React, { useState, useEffect } from "react";
import {
    X, CheckCircle2, Trophy, Loader2, AlertCircle, CalendarDays, MapPin, Download, ChevronRight, FileText, Camera,
    Users, PlayCircle, Star, Circle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

interface PublicEventDetailsModalProps {
    event: any;
    onClose: () => void;
}

type TabType = "my_journey" | "event_story" | "the_lineup" | "perks_prizes";

export function PublicEventDetailsModal({ event: initialEvent, onClose }: PublicEventDetailsModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [event, setEvent] = useState<any>(null);
    const [rounds, setRounds] = useState<any[]>([]);
    const [prizes, setPrizes] = useState<any[]>([]);
    const [topWinners, setTopWinners] = useState<any[]>([]);
    const [deptMetrics, setDeptMetrics] = useState<any[]>([]);

    // Auth & Registration
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationData, setRegistrationData] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<TabType>("event_story");
    const { user: viewer } = useUser();
    const eventId = initialEvent?.id;

    useEffect(() => {
        if (!eventId || !viewer?.institution_id) return;
        const institutionId = viewer.institution_id;

        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Event
                const { data: eventData, error: eventErr } = await supabase
                    .from("events")
                    .select("*, venue:venues(name), club:clubs(name), creator:users!events_creator_id_fkey(full_name, email)")
                    .eq("id", eventId)
                    .eq("institution_id", institutionId)
                    .single();
                if (eventErr || !eventData) throw new Error("Event not found or access denied.");
                setEvent(eventData);

                // 2. Fetch Rounds
                const { data: roundsData } = await supabase
                    .from("event_rounds")
                    .select("*, event:events!inner(institution_id)")
                    .eq("event_id", eventId)
                    .eq("event.institution_id", institutionId)
                    .order("start_time", { ascending: true });
                setRounds(roundsData || []);

                // 3. Fetch Prizes & Winners
                const { data: prizesData } = await supabase
                    .from("event_prizes")
                    .select("*, event:events!inner(institution_id), winner:users!winner_id(full_name, department:departments(name))")
                    .eq("event_id", eventId)
                    .eq("event.institution_id", institutionId)
                    .order("position", { ascending: true });
                setPrizes(prizesData || []);

                // 3.5 Fetch Top Winners from Ledger
                const { data: ledgerData } = await supabase
                    .from("verified_ledger")
                    .select("*, event:events!inner(institution_id), student:users!student_id(id, full_name, role, department:departments(name))")
                    .eq("event_id", eventId)
                    .eq("event.institution_id", institutionId)
                    .order("issued_at", { ascending: true })
                    .limit(3);
                setTopWinners(ledgerData || []);

                // 4. Dept Breakdown representing Branch performance
                const { data: regs } = await supabase
                    .from("registrations")
                    .select("student:users(department:departments(name)), event:events!inner(institution_id)")
                    .eq("event_id", eventId)
                    .eq("event.institution_id", institutionId);

                if (regs) {
                    const counts: Record<string, number> = {};
                    regs.forEach((r: any) => {
                        const dName = r.student?.department?.name || "Independent";
                        counts[dName] = (counts[dName] || 0) + 1;
                    });
                    const total = regs.length || 1;
                    const metrics = Object.entries(counts).map(([name, count]) => ({
                        name, count, percentage: Math.round((count / total) * 100)
                    })).sort((a, b) => b.count - a.count);
                    setDeptMetrics(metrics);
                }

                // 5. Auth & Registration Status
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: userData } = await supabase.from('users').select('id, institution_id').eq('auth_uid', user.id).single();
                    if (userData && userData.institution_id === institutionId) {
                        setCurrentUser(userData);
                        const { data: regData } = await supabase
                            .from('registrations')
                            .select('*, team:teams(name)')
                            .eq('event_id', eventId)
                            .eq('student_id', userData.id)
                            .maybeSingle();

                        if (regData) {
                            setIsRegistered(true);
                            setRegistrationData(regData);
                            setActiveTab("my_journey");
                        } else {
                            setActiveTab("event_story");
                        }
                    } else {
                        setActiveTab("event_story");
                    }
                } else {
                    setActiveTab("event_story");
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [eventId]);

    if (loading) return <LoadingSkeleton />;
    if (error || !event) return <ErrorState message={error || "Event not found."} onClose={onClose} />;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden text-white font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative flex-1 flex flex-col overflow-hidden"
            >
                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">

                    {/* Hero Banner Section (Instagram-style Bold) */}
                    <div className="relative h-[40vh] min-h-[400px] rounded-b-[3rem] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)] bg-zinc-950">
                        {event.banner_url && (
                            <img
                                src={event.banner_url}
                                alt={event.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/80 to-transparent" />

                        {/* Top Nav Actions */}
                        <div className="absolute top-8 left-8 z-50">
                            <button
                                onClick={onClose}
                                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all shadow-xl"
                            >
                                <X className="text-white" size={24} />
                            </button>
                        </div>

                        {/* Event Tags & Title */}
                        <div className="absolute bottom-10 left-0 w-full">
                            <div className="max-w-4xl mx-auto px-8 md:px-12">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="px-4 py-1.5 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/30 flex items-center gap-2">
                                        <FileText size={12} className="text-rose-400" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Event Spotlight</span>
                                    </div>
                                    <Badge variant={event.status === 'live' ? 'live' : 'approved'} dot className="px-3 py-1 text-[10px] bg-white text-black border-none uppercase font-black tracking-widest">
                                        {event.status}
                                    </Badge>
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase drop-shadow-2xl">{event.title}</h1>
                                <div className="flex items-center gap-6 mt-4 opacity-80 text-sm font-bold tracking-widest uppercase">
                                    <div className="flex items-center gap-2"><CalendarDays size={16} /> {formatDate(event.start_time)}</div>
                                    <div className="flex items-center gap-2"><MapPin size={16} /> {event.venue?.name || "TBD"}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs (Glassmorphism & Rounded) */}
                    <div className="sticky top-4 z-40 max-w-4xl mx-auto px-8 my-6">
                        <div className="flex overflow-x-auto p-2 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2rem] gap-2 scrollbar-hide shadow-2xl">
                            {isRegistered && (
                                <TabButton id="my_journey" label="My Journey" active={activeTab === "my_journey"} onClick={() => setActiveTab("my_journey")} />
                            )}
                            <TabButton id="event_story" label="Event Story" active={activeTab === "event_story"} onClick={() => setActiveTab("event_story")} />
                            <TabButton id="the_lineup" label="The Lineup" active={activeTab === "the_lineup"} onClick={() => setActiveTab("the_lineup")} />
                            <TabButton id="perks_prizes" label="Perks & Prizes" active={activeTab === "perks_prizes"} onClick={() => setActiveTab("perks_prizes")} />
                        </div>
                    </div>

                    {/* Content Views */}
                    <div className="max-w-4xl mx-auto px-8 md:px-12 py-8">
                        <AnimatePresence mode="wait">

                            {/* MY JOURNEY TAB */}
                            {activeTab === "my_journey" && (
                                <motion.div key="my_journey" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                    <h3 className="text-3xl font-semibold tracking-wide uppercase text-white">Your Participation Record</h3>
                                    <div className="p-8 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 space-y-6 shadow-xl">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="px-5 py-2 rounded-full border border-zinc-800 bg-zinc-950/50 font-bold uppercase tracking-widest text-sm text-zinc-300">
                                                Entry: {registrationData?.team?.name || "Individual Entry"}
                                            </div>
                                            <div className={cn("px-5 py-2 rounded-full border font-black uppercase tracking-widest text-sm", registrationData?.status === 'checked_in' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/20 bg-white/5")}>
                                                {registrationData?.status === 'checked_in' ? "✓ Checked In" : "Pending Check-in"}
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Final Score</span>
                                            <span className="text-5xl font-light text-white">{registrationData?.score ?? "-"}</span>
                                        </div>
                                    </div>

                                    {event.status === 'completed' && (
                                        <button className="w-full flex items-center justify-center py-4 px-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 font-semibold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:bg-amber-500/20 hover:border-amber-500/50 transition-all">
                                            <Download className="mr-3" size={20} /> Download Certificate
                                        </button>
                                    )}
                                </motion.div>
                            )}

                            {/* EVENT STORY TAB */}
                            {activeTab === "event_story" && (
                                <motion.div key="event_story" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-16">

                                    {/* Wall of Fame */}
                                    <section>
                                        <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-8 text-amber-400 flex items-center gap-3"><Trophy size={36} /> Wall of Fame</h3>
                                        {topWinners.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                {topWinners.map((ledgerItem, i) => (
                                                    <div key={i} className="flex flex-col items-center bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 hover:border-amber-500/30 transition-colors shadow-2xl">
                                                        <div className="relative w-28 h-28 mb-6">
                                                            <div className="absolute inset-0 rounded-full bg-amber-500 blur-2xl opacity-30" />
                                                            <div className="w-full h-full rounded-full border-4 border-amber-500 overflow-hidden relative z-10 bg-zinc-900 flex items-center justify-center">
                                                                {ledgerItem.student?.id ? (
                                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ledgerItem.student.id}`} alt="Winner" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-zinc-800" />
                                                                )}
                                                            </div>
                                                            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-amber-500 text-black font-black flex flex-col items-center justify-center z-20 border-2 border-black italic shadow-lg">#{i + 1}</div>
                                                        </div>
                                                        <p className="font-black uppercase text-center text-lg leading-tight mb-2 tracking-tight">{ledgerItem.student?.full_name || "Verified Participant"}</p>
                                                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest text-center">{ledgerItem.student?.department?.name || 'Independent'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-white/40 italic flex items-center p-6 bg-white/5 rounded-3xl border border-white/10">Results pending</p>
                                        )}
                                    </section>

                                    {/* Highlights */}
                                    <section>
                                        <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-8 text-rose-400 flex items-center gap-3"><Camera size={36} /> Highlights</h3>
                                        {event.banner_url && (
                                            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
                                                <img src={event.banner_url} className="w-80 md:w-96 aspect-video rounded-[2.5rem] object-cover shrink-0 snap-center shadow-xl border border-white/10" alt="Highlight" />
                                            </div>
                                        )}
                                        <div className="mt-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-xl">
                                            <p className="text-xl font-bold leading-relaxed text-white/80 italic">
                                                "{event.description || 'The atmosphere was electric! Competitors brought their absolute A-game to the floor. Look back at the unforgettable moments.'}"
                                            </p>
                                        </div>
                                    </section>

                                    {/* Which Branch Won? */}
                                    <section>
                                        <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-8 text-indigo-400 flex items-center gap-3"><Users size={36} /> Which Branch Won?</h3>
                                        <div className="p-10 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 space-y-8 shadow-xl">
                                            {deptMetrics.length > 0 ? deptMetrics.map((dept, index) => (
                                                <div key={dept.name} className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black uppercase text-2xl italic tracking-tight">{dept.name}</span>
                                                        <span className="text-xs font-black uppercase text-white/50 bg-white/10 px-4 py-2 rounded-full tracking-widest">{dept.count} Medals / Part.</span>
                                                    </div>
                                                    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full" style={{ width: `${dept.percentage}%` }} />
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-white/40 italic">Institutional metrics are securely vaulting...</p>
                                            )}
                                        </div>
                                    </section>
                                </motion.div>
                            )}

                            {/* THE LINEUP TAB */}
                            {activeTab === "the_lineup" && (
                                <motion.div key="the_lineup" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8">
                                    <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-10 text-white">Event Playlist</h3>
                                    <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-8 before:w-1 before:bg-white/10">
                                        {rounds.length > 0 ? rounds.map((round, idx) => {
                                            const now = new Date();
                                            const start = new Date(round.start_time);
                                            const end = new Date(round.end_time || round.start_time);
                                            const isCompleted = now > end;
                                            const isLive = now >= start && now <= end;

                                            return (
                                                <div key={idx} className="relative flex items-center gap-8 p-6 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group shadow-lg">
                                                    <div className="relative z-10 w-4 h-4 rounded-full flex shrink-0 items-center justify-center">
                                                        {isLive ? (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]" />
                                                        ) : isCompleted ? (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full border-4 border-white/20 bg-black group-hover:border-white transition-colors" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className={cn("text-2xl font-black italic uppercase tracking-tighter", isLive ? "text-emerald-400 drop-shadow-md" : "text-white")}>{round.title}</h5>
                                                        <p className="text-sm font-bold text-white/50 uppercase tracking-widest">{formatDate(round.start_time)}</p>
                                                    </div>
                                                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-xl">
                                                        <PlayCircle size={28} className={isLive ? "text-emerald-400" : "text-white"} />
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <p className="text-white/40 italic ml-16 bg-white/5 p-8 rounded-[2rem]">Playlist is currently empty.</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* PERKS & PRIZES TAB */}
                            {activeTab === "perks_prizes" && (
                                <motion.div key="perks_prizes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-8 text-amber-500 drop-shadow-md">The Loot</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {prizes.length > 0 ? prizes.map((p, i) => (
                                            <div key={i} className="flex items-center p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] space-x-6 hover:scale-[1.03] transition-transform shadow-2xl">
                                                <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center shrink-0">
                                                    <Trophy size={48} className="text-amber-500 drop-shadow-xl" />
                                                </div>
                                                <div>
                                                    <p className="font-black italic uppercase tracking-tight text-3xl leading-none mb-2">{p.title}</p>
                                                    <p className="font-bold text-sm text-white/60 uppercase tracking-widest leading-snug">{p.reward || p.goodie || "Exclusive Reward Unlocks"}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="col-span-full text-white/40 italic bg-white/5 border border-white/10 rounded-[3rem] p-8">Loot drops are secret right now.</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Contextual Action Bar (Bottom Center/Right) */}
                {event.status !== 'completed' && (
                    <div className="absolute bottom-8 left-0 w-full px-8 flex justify-center z-50 pointer-events-none">
                        <div className="bg-zinc-900/90 backdrop-blur-3xl p-3 rounded-[3rem] border border-white/20 pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[340px]">
                            {(() => {
                                const status = event.status;
                                if (status === 'live') {
                                    return isRegistered ? (
                                        <button className="w-full bg-rose-600 text-white font-black uppercase tracking-widest text-lg py-5 px-10 rounded-full hover:bg-rose-500 transition-all shadow-[0_0_20px_rgba(225,29,72,0.6)]">JOIN LIVE 🔴</button>
                                    ) : (
                                        <button className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-lg py-5 px-10 rounded-full hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)]">⚡ REGISTER NOW</button>
                                    );
                                } else {
                                    if (isRegistered) {
                                        return <button className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-lg py-5 px-10 rounded-full hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)]">🎟️ VIEW TICKET</button>
                                    } else {
                                        return <button className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-lg py-5 px-10 rounded-full hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)]">⚡ REGISTER NOW</button>
                                    }
                                }
                            })()}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

function TabButton({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex-shrink-0 px-8 py-4 rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap",
                active ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"
            )}
        >
            {label}
        </button>
    );
}

function LoadingSkeleton() {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-white animate-spin mb-6" />
            <p className="text-sm font-black text-white uppercase tracking-[0.5em] animate-pulse">Loading Event Spotlight</p>
        </div>
    );
}

function ErrorState({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-10">
            <div className="max-w-md w-full p-10 rounded-[3rem] bg-white/5 border border-white/10 text-center space-y-6 backdrop-blur-xl">
                <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Spotlight Unavailable</h3>
                <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest leading-relaxed">
                    {message || "The requested event could not be found."}
                </p>
                <button
                    onClick={onClose}
                    className="w-full h-14 mt-4 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                    Return to Feed
                </button>
            </div>
        </div>
    );
}
