"use client";

import React, { useState, useEffect, use, useRef } from "react";
import {
    MapPin, Clock, Calendar, Users, IndianRupee, ArrowLeft,
    Share2, CheckCircle2, Loader2, Trophy, Star, ShieldCheck,
    Timer, Users2, Medal, Award, ChevronRight, Check, Globe, User,
    Ticket, ScrollText, History, Sparkles, Layers, ArrowRight,
    MessageSquare, Handshake, Briefcase, Shirt, Gift, ChevronDown, ShoppingBag,
    Globe as GlobeIcon, ChevronRight as ChevronRightIcon, X, Eye,
    BarChart3, ExternalLink, FileText, Send as SendIcon, Lock as LockIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { SmartRegistrationForm } from "@/components/student/SmartRegistrationForm";
import { SubmissionWorkspace } from "@/components/student/SubmissionWorkspace";
import { useUser } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRound {
    id: string;
    title: string;
    description: string | null;
    type: string;
    phase?: string;
    start_time: string;
    end_time: string;
    round_number: number;
    requires_submission?: boolean;
}

interface EventPrize {
    id: string;
    title: string;
    value: number;
    reward: string | null;
    goodie: string | null;
    icon: string;
    position: number;
    winner_id?: string | null;
    winner_team_id?: string | null;
    winner?: { full_name: string; department: { name: string } | null } | null;
    winner_team?: { name: string } | null;
    rank?: string | null;
    category?: string | null;
    is_perk?: boolean;
}

interface DeptMetric {
    name: string;
    count: number;
    percentage: number;
}

interface EventDetail {
    id: string;
    title: string;
    description: string | null;
    rich_description: string | null;
    status: string;
    risk_level: "low" | "medium" | "high";
    budget_required: number;
    start_time: string;
    end_time: string;
    registered_count: number;
    banner_url: string | null;
    creator: { full_name: string; id: string } | null;
    department: { name: string } | null;
    venue: { name: string; capacity: number } | null;
    club: { name: string; logo_url: string | null } | null;
    faqs: any[];
    sponsors: any[];
    resource_links: { id: string; label: string; url: string; icon: string }[];
    is_umbrella: boolean;
    event_type: string;
    is_competition?: boolean;
    participation_tracks?: { id: string; name: string; is_team: boolean }[];
    registration_config?: {
        collect_resume?: boolean;
        collect_github?: boolean;
        collect_linkedin?: boolean;
        team_participation?: boolean;
        team_min_size?: number;
        team_max_size?: number;
    };
    rulebook_url?: string | null;
    parent_event_id?: string | null;
}

interface FestSubEvent {
    id: string;
    title: string;
    status: string;
    start_time: string;
    end_time: string;
    registered_count: number;
    fest_domain_id: string | null;
    fest_category: string | null;
}

interface FestDomain {
    id: string;
    name: string;
    description: string;
}

type RegStatus = "idle" | "loading" | "registered" | "confirmed" | "pending" | "waitlisted" | "cancelled" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDateLong = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric",
        });
    } catch { return iso; }
};

const fmtTime = (iso: string) => {
    try {
        return new Date(iso).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", hour12: true,
        });
    } catch { return ""; }
}

const TYPE_META: Record<string, { label: string; color: string }> = {
    online_test: { label: "Online Test", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
    submission: { label: "Submission", color: "text-amber-400  bg-amber-500/10  border-amber-500/20" },
    in_person: { label: "In-Person", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    virtual_meet: { label: "Virtual Meet", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function StudentEventView({ eventId, previewMode = false, onClosePreview }: { eventId: string; previewMode?: boolean; onClosePreview?: () => void }) {
    const id = eventId;
    const router = useRouter();

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [rounds, setRounds] = useState<EventRound[]>([]);
    const [prizes, setPrizes] = useState<EventPrize[]>([]);
    const [subEvents, setSubEvents] = useState<FestSubEvent[]>([]);
    const [festDomains, setFestDomains] = useState<FestDomain[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [regStatus, setRegStatus] = useState<RegStatus>("idle");
    const [studentId, setStudentId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState("about");
    const [activeDomain, setActiveDomain] = useState("all");
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [deptMetrics, setDeptMetrics] = useState<DeptMetric[]>([]);
    const [loadingMetrics, setLoadingMetrics] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [isCaptain, setIsCaptain] = useState(false);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [selectedRound, setSelectedRound] = useState<EventRound | null>(null);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const { user: authUser, loading: userLoading } = useUser();
    // Institutional Observer: faculty/HOD viewing someone else's event
    const [isObserver, setIsObserver] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);

    interface UserJourney {
        participated: boolean;
        teamName: string | null;
        isWinner: boolean;
        prizeTitle: string | null;
        certificateHash: string | null;
    }
    const [journey, setJourney] = useState<UserJourney | null>(null);
    const [activeCompletedTab, setActiveCompletedTab] = useState<"journey" | "recap">("journey");

    const sectionRefs = {
        about: useRef<HTMLElement>(null),
        matrix: useRef<HTMLElement>(null),
        activities: useRef<HTMLElement>(null),
        schedule: useRef<HTMLElement>(null),
        prizes: useRef<HTMLElement>(null),
        perks: useRef<HTMLElement>(null),
        faqs: useRef<HTMLElement>(null),
        sponsors: useRef<HTMLElement>(null),
        team: useRef<HTMLElement>(null),
    };

    // ── Data load ──────────────────────────────────────────────────────────────
    const loadData = async () => {
        if (!authUser?.institution_id) return;
        const institutionId = authUser.institution_id;
        setLoading(true);
        try {
            const [eventRes, roundsRes, prizesRes, subEventsRes, domainsRes] = await Promise.all([
                supabase
                    .from("events")
                    .select(`
                        id, title, description, rich_description, status, risk_level,
                        budget_required, start_time, end_time,
                        registered_count, banner_url, faqs, sponsors, resource_links,
                        is_umbrella, event_type, is_competition, parent_event_id,
                        participation_tracks, rulebook_url, institution_id,
                        creator:users!events_creator_id_fkey ( id, full_name ),
                        department:departments ( name ),
                        venue:venues ( name, capacity ),
                        club:clubs ( name, logo_url )
                    `)
                    .eq("id", id)
                    .eq("institution_id", institutionId)
                    .single(),
                supabase.from("event_rounds").select("*, event:events!inner(institution_id)").eq("event_id", id).eq("event.institution_id", institutionId).order("round_number"),
                supabase.from("event_prizes")
                    .select("*, winner:users!winner_id(full_name, department:departments(name)), winner_team:teams!winner_team_id(name), event:events!inner(institution_id)")
                    .eq("event_id", id)
                    .eq("event.institution_id", institutionId)
                    .order("position"),
                supabase.from("events").select("id, title, status, start_time, end_time, registered_count, fest_domain_id, fest_category, banner_url").eq("parent_event_id", id).eq("institution_id", institutionId).order("start_time"),
                supabase.from("fest_domains").select("*").eq("umbrella_event_id", id).order("created_at")
            ]);

            if (eventRes.error || !eventRes.data) { setNotFound(true); return; }
            const data = eventRes.data;

            let mergedSponsors = [...(data.sponsors || [])];
            if (data.parent_event_id) {
                const { data: parentSponsorsData } = await supabase
                    .from("events")
                    .select("sponsors")
                    .eq("id", data.parent_event_id)
                    .eq("institution_id", institutionId)
                    .single();
                if (parentSponsorsData?.sponsors) {
                    mergedSponsors = [...parentSponsorsData.sponsors, ...mergedSponsors];
                }
            }

            setEvent({
                ...data,
                faqs: data.faqs || [],
                sponsors: mergedSponsors,
                resource_links: data.resource_links || [],
            } as unknown as EventDetail);
            setRounds(roundsRes.data || []);
            setPrizes(prizesRes.data || []);
            setSubEvents(subEventsRes.data || []);
            setFestDomains(domainsRes.data || []);

            const tempJourney: UserJourney = {
                participated: false,
                teamName: null,
                isWinner: false,
                prizeTitle: null,
                certificateHash: null
            };

            if (authUser) {
                const { data: profile } = await supabase.from("users").select("*").eq("id", authUser.dbId).eq("institution_id", institutionId).single();
                if (profile) {
                    setUser(profile as any);
                    setStudentId((profile as any).id);
                    // Observer mode: faculty/HOD viewing another faculty's event
                    const role = (profile as any).role ?? "student";
                    const isFacultyOrHod = role === "faculty" || role === "hod" || role === "admin";
                    const isOwnEvent = (Array.isArray(data.creator) ? data.creator[0]?.id : (data.creator as any)?.id) === (profile as any).id;
                    if (isFacultyOrHod && !isOwnEvent) {
                        setIsObserver(true);
                    }

                    // Check if member of event staff
                    const { data: staffData } = await supabase
                        .from("event_staff")
                        .select("id")
                        .eq("event_id", id)
                        .eq("student_id", profile.id)
                        .maybeSingle();

                    if (staffData) {
                        setIsOrganizer(true);
                    }
                    const { data: existing } = await supabase
                        .from("registrations").select("id, status, team:teams(id, name, leader_id), team_id")
                        .eq("event_id", id).eq("student_id", profile.id).maybeSingle();

                    if (existing) {
                        setRegStatus(existing.status as RegStatus);
                        tempJourney.participated = true;
                        if (existing.team) {
                            const team = existing.team as any;
                            tempJourney.teamName = team.name;
                            setTeamId(team.id);
                            setIsCaptain(team.leader_id === profile.id);
                        } else if (existing.team_id === null) { // Individual
                            setIsCaptain(true);
                        }

                        // Fetch Round Submissions
                        const { data: subs } = await supabase
                            .from("submissions")
                            .select("*, event:events!inner(institution_id)")
                            .eq("event_id", id)
                            .eq("student_id", profile.id)
                            .eq("event.institution_id", institutionId);

                        setSubmissions(subs || []);
                    }

                    if (data.status === "completed") {
                        const { data: cert } = await supabase.from("verified_ledger").select("certificate_hash, event:events!inner(institution_id)").eq("event_id", id).eq("student_id", profile.id).eq("event.institution_id", institutionId).maybeSingle();
                        if (cert) tempJourney.certificateHash = cert.certificate_hash;
                        const myPrize = (prizesRes.data || []).find(p => p.winner_id === profile.id);
                        if (myPrize) {
                            tempJourney.isWinner = true;
                            tempJourney.prizeTitle = myPrize.title;
                        }
                    }
                }
            }
            setJourney(tempJourney);

            if (data.status === "completed") {
                setLoadingMetrics(true);
                const { data: regs } = await supabase.from("registrations").select("student:users(department:departments(name)), event:events!inner(institution_id)").eq("event_id", id).eq("event.institution_id", institutionId);
                if (regs) {
                    const counts: Record<string, number> = {};
                    regs.forEach((r: any) => {
                        const dName = r.student?.department?.name || "Independent";
                        counts[dName] = (counts[dName] || 0) + 1;
                    });
                    const total = regs.length || 1;
                    const metrics = Object.entries(counts).map(([name, count]) => ({
                        name,
                        count,
                        percentage: Math.round((count / total) * 100)
                    })).sort((a, b) => b.count - a.count);
                    setDeptMetrics(metrics);
                }
                setLoadingMetrics(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userLoading) void loadData();
    }, [id, previewMode, authUser?.institution_id, userLoading]);

    // ── Scroll spy ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 160;
            Object.entries(sectionRefs).forEach(([key, ref]: [string, any]) => {
                if (ref.current && scrollPos >= ref.current.offsetTop) {
                    setActiveSection(key);
                }
            });
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollTo = (key: string) => {
        const ref = (sectionRefs as any)[key];
        if (ref?.current) window.scrollTo({ top: ref.current.offsetTop - 120, behavior: "smooth" });
    };

    // ── Register Logic ────────────────────────────────────────────────────────
    async function handleRegister() {
        if (event?.status === "completed" || regStatus === "registered" || regStatus === "confirmed" || regStatus === "loading") return;
        setIsRegModalOpen(true);
    }

    const onRegistrationSuccess = (data: any) => {
        setIsRegModalOpen(false);
        void loadData();
    };

    const onSubmissionSuccess = (newSub: any) => {
        setSubmissions(prev => {
            const index = prev.findIndex(s => (s.id === newSub.id) || (s.round_id === newSub.round_id && s.event_id === newSub.event_id));
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = newSub;
                return updated;
            }
            return [...prev, newSub];
        });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Guards ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }
    if (notFound || !event) {
        return (
            <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <p className="text-2xl font-black">Event not found</p>
                    <button onClick={() => router.back()} className="text-indigo-400 text-sm hover:underline">← Go Back</button>
                </div>
            </div>
        );
    }

    const capacity = event.venue?.capacity ?? 1000;
    const registered = event.registered_count ?? 0;
    const isSoldOut = registered >= capacity;
    const fillPct = Math.min((registered / capacity) * 100, 100);
    const isComp = event.is_competition !== false;

    // If not a competition, all prizes are perks. If it is a competition, split them.
    const competitionPrizes = isComp ? prizes.filter(p => !p.is_perk) : [];
    const eventPerks = isComp ? prizes.filter(p => p.is_perk) : prizes;

    const NAV_ITEMS = [
        { id: "about", label: "About" },
        ...(subEvents.length > 0 ? [{ id: "activities", label: "Activities" }] : []),
        ...(isComp ? [
            { id: "schedule", label: "Schedule" },
            ...(competitionPrizes.length > 0 ? [{ id: "prizes", label: "Prizes" }] : [])
        ] : []),
        ...(eventPerks.length > 0 ? [{ id: "perks", label: "Perks" }] : []),
        ...(event.faqs?.length > 0 ? [{ id: "faqs", label: "FAQs" }] : []),
        ...(event.resource_links?.length > 0 ? [{ id: "community", label: "Community" }] : []),
        ...(event.sponsors?.length > 0 ? [{ id: "sponsors", label: "Sponsors" }] : []),
        { id: "team", label: "Team" },
    ];

    return (
        /* Fix 1: Full-bleed, no max-w, bg-[#09090b] covers everything */
        <div className="min-h-screen w-full bg-[#09090b] text-zinc-100 font-sans overflow-x-hidden relative">

            {/* Preview Banner */}
            {previewMode && (
                <div className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-black px-6 py-2 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest">
                        <span>👁️</span> PREVIEW MODE — This is how students will see your event.
                    </div>
                    {onClosePreview && (
                        <button onClick={onClosePreview} className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/10 hover:bg-black/20 transition-colors text-[10px] font-black uppercase tracking-widest">
                            <X size={14} /> Close Preview
                        </button>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                Fix 2: Full-Width Hero — banner image background with gradient
            ══════════════════════════════════════════════════════════════ */}
            <div className={cn("relative w-full h-[88vh] min-h-[580px] overflow-hidden", previewMode && "mt-8")}>
                {/* Banner image */}
                <div className="absolute inset-0">
                    <img
                        src={event.banner_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070"}
                        className="w-full h-full object-cover"
                        alt={event.title}
                    />
                    {/* Dark overlays */}
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#09090b]/60 to-transparent" />
                    {!isComp && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-rose-500/10 opacity-60" />}
                </div>

                {/* Back button — top left */}
                {!previewMode && (
                    <div className="absolute top-6 left-6 z-10">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2"
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                    </div>
                )}

                {/* Preview Mode Sticky Header */}
                {previewMode && (
                    <div className="fixed top-0 left-0 right-0 z-[1000] bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <Eye size={18} />
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">
                                Sub-Event Preview Mode
                            </span>
                        </div>
                        <button
                            onClick={onClosePreview}
                            className="h-10 px-6 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-2"
                        >
                            Close & Return to Matrix <X size={14} />
                        </button>
                    </div>
                )}

                {/* Hero text — bottom left, full width */}
                <div className={cn("absolute inset-x-0 bottom-0 px-6 md:px-16 pb-16 z-10", previewMode && "pt-24")}>
                    <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="space-y-8 max-w-5xl"
                    >
                        {/* Observer badge */}
                        {isObserver && (
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border-amber-500/30 text-amber-400 backdrop-blur-md">
                                <Eye size={12} /> Viewing as Institutional Observer
                            </div>
                        )}

                        {/* Category + Status */}
                        <div className="flex flex-wrap items-center gap-4">
                            <span className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md",
                                event.status === "live" || event.status === "approved"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : event.status === "completed"
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                            )}>
                                {event.status === "completed" ? "Successfully Concluded" : (isComp ? "Active Competition" : "Official Event")}
                            </span>
                            <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-800 bg-zinc-900 text-zinc-400 backdrop-blur-md">
                                <Users size={10} className="inline mr-1.5" />{registered > 0 ? `${registered} attendees` : "Registration Open"}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] text-white drop-shadow-2xl">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-4 pt-4">
                            {/* Parent Fest Badge */}
                            {event.parent_event_id && (
                                <div className="flex items-center gap-2.5 bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-xl px-5 py-3">
                                    <Sparkles size={16} className="text-indigo-400" />
                                    <span className="text-sm font-black text-indigo-100 uppercase tracking-widest">Part of {event.club?.name || "The Fest"}</span>
                                </div>
                            )}

                            {/* Points Badge */}
                            <div className="flex items-center gap-2.5 bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-xl px-5 py-3">
                                <Trophy size={16} className="text-amber-400" />
                                <span className="text-sm font-black text-amber-100 uppercase tracking-widest">🏆 Earn 500 Karma Points</span>
                            </div>

                            <div className="flex items-center gap-2.5 bg-zinc-900 backdrop-blur-xl border border-zinc-800 rounded-xl px-5 py-3 ml-auto hidden md:flex">
                                <Calendar size={16} className="text-zinc-500" />
                                <span className="text-sm font-bold text-zinc-200">{fmtDateLong(event.start_time)}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                Sticky Nav bar
            ══════════════════════════════════════════════════════════════ */}
            <nav className={cn("sticky z-[100] w-full bg-[#09090b]/85 backdrop-blur-xl border-b border-zinc-800", previewMode ? "top-8" : "top-0")}>
                <div className="w-full px-6 md:px-16 flex items-center justify-between h-14">
                    <div className="flex items-center gap-1">
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => scrollTo(item.id)}
                                className={cn(
                                    "relative px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeSection === item.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {item.label}
                                {activeSection === item.id && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-zinc-600">{registered} / {capacity} seats</span>
                        <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full" style={{ width: `${fillPct}%` }} />
                        </div>
                    </div>
                </div>
            </nav>

            {/* ══════════════════════════════════════════════════════════════
                Fix 3 & 4: Two-column Luma layout — Left scrollable, Right sticky
                No max-w on outer wrapper, full bleed padding
            ══════════════════════════════════════════════════════════════ */}
            {/* ══════════════════════════════════════════════════════════════
                Mega Fest Hub UI (Umbrella Event Page)
            ══════════════════════════════════════════════════════════════ */}
            {event.event_type === "umbrella" ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-12 pb-32">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                        {/* ── Left Column: Strict Sequence ── */}
                        <div className="lg:col-span-8 space-y-32 min-w-0">

                            {/* Section A: Overview (About) */}
                            <section ref={sectionRefs.about} className="space-y-12">
                                <SectionHeader icon={<Star size={16} />} eyebrow="Event Overview" title="About the Fest" color="text-indigo-400" />
                                <div
                                    className="text-xl text-zinc-400 font-medium leading-[1.8] prose prose-invert mx-auto max-w-none break-words"
                                    dangerouslySetInnerHTML={{ __html: event.rich_description || event.description || "Description coming soon." }}
                                />
                            </section>

                            {/* Section B: Fest Matrix (The Lineup) */}
                            <section ref={sectionRefs.matrix} className="space-y-16">
                                <div className="space-y-8">
                                    <SectionHeader icon={<Layers size={18} />} eyebrow="Curated Experiences" title="Fest Lineup & Competitions" color="text-cyan-400" />

                                    {/* Domain Filter Buttons */}
                                    <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                                        <DomainNavButton active={activeDomain === "all"} onClick={() => setActiveDomain("all")} label="All Access" />
                                        {festDomains.map(d => (
                                            <DomainNavButton
                                                key={d.id}
                                                active={activeDomain === d.id}
                                                onClick={() => setActiveDomain(d.id)}
                                                label={d.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {(() => {
                                    // 1. Filter sub-events based on the active domain tab
                                    const filteredEvents = activeDomain === "all"
                                        ? subEvents
                                        : subEvents.filter(e => e.fest_domain_id === activeDomain);

                                    // 2. Group by Category (fest_category) - Standardize casing to avoid duplicate rows
                                    const categoryGroups: Record<string, typeof subEvents> = {};
                                    filteredEvents.forEach(ev => {
                                        const categoryName = (ev.fest_category || "General Competition").trim().toUpperCase();
                                        if (!categoryGroups[categoryName]) categoryGroups[categoryName] = [];
                                        categoryGroups[categoryName].push(ev);
                                    });

                                    return Object.keys(categoryGroups).length > 0 ? (
                                        <div className="space-y-24">
                                            {Object.entries(categoryGroups).map(([category, events]) => (
                                                <div key={category} className="space-y-10 group/category">
                                                    {/* Category Header */}
                                                    <div className="flex items-center justify-between px-2 mb-2">
                                                        <div className="space-y-2">
                                                            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                                                            <h4 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic">{category}</h4>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{events.length} Tracks Available</span>
                                                        </div>
                                                    </div>

                                                    {/* Horizontal Scroll Row (Netflix Style) */}
                                                    <div className="flex gap-6 overflow-x-auto pb-10 scrollbar-hide px-2 snap-x">
                                                        {events.map((sub: any) => (
                                                            <div
                                                                key={sub.id}
                                                                onClick={() => window.location.href = `/student/event/${sub.id}`}
                                                                className="min-w-[280px] md:min-w-[320px] group cursor-pointer snap-start"
                                                            >
                                                                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 min-h-[420px] hover:border-indigo-500/30 transition-all duration-500 relative overflow-hidden group flex flex-col justify-between shadow-2xl">
                                                                    {/* Banner Background with Glassmorphic Overlay */}
                                                                    {sub.banner_url ? (
                                                                        <>
                                                                            <img
                                                                                src={sub.banner_url}
                                                                                alt={sub.title}
                                                                                className="absolute inset-0 w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 opacity-40 group-hover:opacity-60"
                                                                            />
                                                                            {/* Content Overlay */}
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-[2]" />
                                                                            <div className="absolute inset-0 bg-black/40 z-[1]" />
                                                                        </>
                                                                    ) : (
                                                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-zinc-900 to-zinc-950 z-0" />
                                                                    )}

                                                                    <div className="space-y-6 relative z-10">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest">
                                                                                {fmtDateLong(sub.start_time)}
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 backdrop-blur-md px-2.5 py-1.5 rounded-full">
                                                                                <Users size={12} className="text-indigo-400" />
                                                                                <span className="font-black">{sub.registered_count}</span>
                                                                            </div>
                                                                        </div>
                                                                        <h5 className="text-3xl font-black text-white tracking-tighter leading-[0.9] uppercase group-hover:text-indigo-400 transition-colors drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{sub.title}</h5>
                                                                    </div>

                                                                    <div className="pt-6 relative z-10">
                                                                        <div className="w-full h-12 rounded-xl bg-transparent border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-center text-zinc-500 group-hover:text-white transition-all flex items-center justify-center gap-2 hover:bg-zinc-800 shadow-xl">
                                                                            View Competition Track <ArrowRight size={12} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                                        </div>
                                                                    </div>

                                                                    {/* Subtle Background Elements */}
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                                                                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-24 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/50 flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-zinc-700">
                                                <Layers size={24} />
                                            </div>
                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">No tracks mapped to this domain yet</p>
                                        </div>
                                    );
                                })()}
                            </section>

                            {/* Section C: Global Perks & Prize Pool */}
                            <section ref={sectionRefs.prizes} className="space-y-16">
                                <SectionHeader icon={<Trophy size={18} />} eyebrow="Rewards & Incentives" title="Prizes & Perks" color="text-amber-400" />

                                <div className="space-y-12">
                                    {/* Massive Total Pool */}
                                    <div className="p-16 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10 border border-amber-500/20 rounded-xl text-center relative overflow-hidden group">
                                        <div className="relative z-10 space-y-4">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em]">Mega Prize Pool</p>
                                            <h3 className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                                                ₹{(event.budget_required || 0).toLocaleString("en-IN")}
                                            </h3>
                                            <div className="flex items-center justify-center gap-3">
                                                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500" />)}
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-zinc-950/20 pointer-events-none" />
                                    </div>

                                    {/* Perks Grid */}
                                    {prizes.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {prizes.map((perk, i) => (
                                                <div key={i} className="bg-zinc-900 border border-zinc-800 p-10 rounded-xl flex items-start gap-8 hover:border-amber-500/30 transition-all group">
                                                    <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                                                        {perk.icon === "briefcase" ? <Briefcase size={28} /> :
                                                            perk.icon === "shirt" ? <Shirt size={28} /> :
                                                                perk.icon === "gift" ? <Gift size={28} /> :
                                                                    <ScrollText size={28} />}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-xl font-black text-white tracking-tight uppercase italic">{perk.title}</h4>
                                                        <p className="text-sm font-bold text-zinc-500 leading-relaxed uppercase tracking-wider">{perk.reward || perk.goodie || "Exclusive Reward"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Section D: Sponsors & Partners */}
                            {event.sponsors?.length > 0 && (
                                <section ref={sectionRefs.sponsors} className="space-y-16">
                                    <SectionHeader icon={<Handshake size={20} />} eyebrow="Ecosystem Support" title="Our Sponsors" color="text-indigo-400" />

                                    <div className="space-y-16">
                                        {(() => {
                                            const tiers = ["Title Sponsor", "Powered By", "Associate Sponsor", "Media Partner", "Gold", "Silver"];
                                            const grouped = event.sponsors.reduce((acc: any, spo: any) => {
                                                const tier = spo.tier || "Associate Sponsor";
                                                if (!acc[tier]) acc[tier] = [];
                                                acc[tier].push(spo);
                                                return acc;
                                            }, {});

                                            return tiers.filter(t => grouped[t]).map(tier => (
                                                <div key={tier} className="space-y-8">
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] whitespace-nowrap">{tier}</span>
                                                        <div className="h-px flex-1 bg-zinc-800" />
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
                                                        {grouped[tier].map((spo: any, i: number) => (
                                                            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 aspect-square flex flex-col items-center justify-center gap-4 hover:border-zinc-700 transition-all grayscale opacity-60 hover:grayscale-0 hover:opacity-100">
                                                                {spo.logo_url ? (
                                                                    <img src={spo.logo_url} className="w-full h-full object-contain" alt={spo.name} />
                                                                ) : (
                                                                    <div className="w-full h-full bg-zinc-800 rounded-xl flex items-center justify-center">
                                                                        <Globe size={24} className="text-zinc-700" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </section>
                            )}

                            {/* Section E: FAQs */}
                            {event.faqs?.length > 0 && (
                                <section ref={sectionRefs.faqs} className="space-y-16">
                                    <SectionHeader icon={<MessageSquare size={18} />} eyebrow="Guidance" title="Frequently Asked Questions" color="text-emerald-400" />
                                    <div className="space-y-4">
                                        {event.faqs.map((faq: any, i: number) => (
                                            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                                <details className="group">
                                                    <summary className="flex items-center justify-between p-10 cursor-pointer list-none select-none">
                                                        <h4 className="text-lg font-black text-white tracking-tight uppercase italic">{faq.question}</h4>
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-500 group-open:rotate-180 group-open:text-emerald-400 transition-all duration-300">
                                                            <ChevronDown size={20} />
                                                        </div>
                                                    </summary>
                                                    <div className="px-10 pb-10 text-base text-zinc-400 font-medium leading-[1.8] border-t border-zinc-800 pt-8">
                                                        {faq.answer}
                                                    </div>
                                                </details>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* ── Right Column: Sticky Sidebar ── */}
                        <div className="lg:col-span-4 relative">
                            <div className="sticky top-32 space-y-8">

                                {/* Status Card */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 space-y-10 shadow-3xl">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Global Status</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-emerald-500 uppercase">Active Registrations</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total Registrations</p>
                                            <div className="flex items-end justify-between">
                                                <span className="text-4xl font-black text-white">{registered}</span>
                                                <span className="text-zinc-600 font-bold mb-1 text-sm"></span>
                                            </div>
                                            <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${Math.min((registered / (event.venue?.capacity ?? 500)) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 py-4 border-b border-zinc-800">
                                            <Calendar size={20} className="text-indigo-400" />
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Fest Dates</p>
                                                <p className="text-sm font-black text-white uppercase italic">{fmtDateLong(event.start_time)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 py-4 border-b border-zinc-800">
                                            <MapPin size={20} className="text-rose-400" />
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Venue</p>
                                                <p className="text-sm font-bold text-white">{event.venue?.name ?? "Campus Wide"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => scrollTo("matrix")}
                                        className="w-full h-16 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-100 transition-all shadow-xl active:scale-95"
                                    >
                                        Explore Competitions <ArrowRight size={16} />
                                    </button>

                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">
                                            Registration is handled per individual event track. Scroll down to browse the lineup.
                                        </p>
                                    </div>
                                </div>

                                {/* Organizational Info */}
                                <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-8 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                                            <Globe size={18} className="text-zinc-500" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Host Institution</p>
                                            <p className="text-xs font-black text-white uppercase">{event.department?.name || "Global Faculty"}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleShare}
                                        className="w-full py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={12} /> Share Fest Hub
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full px-6 md:px-16 py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start max-w-7xl mx-auto">
                        {/* ── Left Column: Content ── */}
                        <div className="lg:col-span-8 space-y-32 min-w-0">
                            {/* Completed Event Logic */}
                            {event.status === "completed" && (
                                <div className="space-y-12">
                                    {journey?.participated ? (
                                        <div className="flex items-center gap-6 border-b border-zinc-800 pb-2">
                                            <button
                                                onClick={() => setActiveCompletedTab("journey")}
                                                className={cn("text-lg font-black uppercase tracking-widest pb-4 -mb-[9px] transition-all", activeCompletedTab === "journey" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-zinc-600 hover:text-zinc-400")}
                                            >
                                                My Journey
                                            </button>
                                            <button
                                                onClick={() => setActiveCompletedTab("recap")}
                                                className={cn("text-lg font-black uppercase tracking-widest pb-4 -mb-[9px] transition-all", activeCompletedTab === "recap" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-zinc-600 hover:text-zinc-400")}
                                            >
                                                Recap
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-6 border-b border-zinc-800 pb-4">
                                            <h3 className="text-lg font-black uppercase tracking-widest text-indigo-400">Event Recap</h3>
                                        </div>
                                    )}

                                    {activeCompletedTab === "journey" && journey?.participated ? (
                                        <div className="bg-zinc-950 border border-zinc-800 p-8 md:p-12 rounded-xl shadow-2xl space-y-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                                                    <User size={32} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Your Presence</p>
                                                    <h3 className="text-3xl font-black text-white italic tracking-tighter">{journey.isWinner ? "Podium Finisher" : "Participant"}</h3>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {journey.teamName && (
                                                    <div className="bg-[#09090b] p-6 rounded-xl border border-zinc-800 space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Represented Team</p>
                                                        <h4 className="text-xl font-black text-white italic">{journey.teamName}</h4>
                                                    </div>
                                                )}
                                                {journey.isWinner && (
                                                    <div className="bg-amber-500/10 p-6 rounded-xl border border-amber-500/20 space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/70">Podium Finish</p>
                                                        <div className="flex items-center gap-2">
                                                            <Trophy size={18} className="text-amber-500" />
                                                            <h4 className="text-xl font-black text-amber-500">{journey.prizeTitle}</h4>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <WinnerGallery prizes={prizes} />
                                    )}
                                </div>
                            )}

                            <section ref={sectionRefs.about} id="about" className="space-y-8">
                                <SectionHeader icon={<Star size={16} />} eyebrow="The Experience" title="Overview" color="text-indigo-400" />
                                <div
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 md:p-12 text-base text-zinc-400 font-medium leading-[1.85] prose prose-invert mx-auto max-w-none break-words"
                                    dangerouslySetInnerHTML={{ __html: event.rich_description || event.description || "Description coming soon." }}
                                />

                                {/* Track Preview Cards */}
                                {event.participation_tracks && event.participation_tracks.length > 0 && (
                                    <div className="pt-8 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Available Participation Tracks</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {event.participation_tracks.map((track) => (
                                                <div key={track.id} className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between group/trk hover:border-indigo-500/30 transition-all">
                                                    <div className="space-y-1">
                                                        <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover/trk:text-indigo-400 transition-colors">{track.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                                                track.is_team ? "bg-cyan-500/10 text-cyan-400" : "bg-zinc-800 text-zinc-500"
                                                            )}>
                                                                {track.is_team ? "Team Required" : "Solo Entry"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover/trk:text-indigo-400 transition-all">
                                                        {track.is_team ? <Users2 size={14} /> : <User size={14} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Activities section (Umbrella events) */}
                            {
                                subEvents.length > 0 && (
                                    <section ref={sectionRefs.activities} id="activities" className="space-y-8 px-4">
                                        <SectionHeader icon={<Layers size={16} />} eyebrow="Fest Lineup" title="Activities & Domains" color="text-cyan-400" />

                                        {festDomains.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {festDomains.map(d => (
                                                    <span key={d.id} className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400" title={d.description}>
                                                        {d.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {subEvents.map((sub, i) => (
                                                <motion.div
                                                    key={sub.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl group hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
                                                    onClick={() => window.location.href = `/student/event/${sub.id}`}
                                                >
                                                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                        <ArrowRight size={20} className="text-indigo-400" />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black italic">
                                                                {i + 1}
                                                            </span>
                                                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                                                {festDomains.find(d => d.id === sub.fest_domain_id)?.name || "Competition"}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-indigo-400 transition-colors uppercase">{sub.title}</h3>
                                                            <p className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-widest">
                                                                {fmtDateLong(sub.start_time)} • Competition Track
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                )
                            }

                            {/* Schedule / Rounds */}
                            {
                                isComp && (
                                    <section ref={sectionRefs.schedule} id="schedule" className="space-y-8">
                                        <SectionHeader icon={<Clock size={16} />} eyebrow="Event Timeline" title="Schedule" color="text-rose-400" />
                                        {rounds.length > 0 ? (
                                            <div className="relative space-y-4">
                                                {/* Timeline line */}
                                                <div className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-indigo-500/40 via-white/5 to-transparent" />
                                                {rounds.map((round, idx) => {
                                                    const meta = TYPE_META[round.type] ?? TYPE_META.submission;
                                                    const now = new Date().getTime();
                                                    const start = new Date(round.start_time).getTime();
                                                    const end = new Date(round.end_time).getTime();

                                                    let statusBadge = { label: "Upcoming", color: "bg-zinc-800 text-zinc-500 border-zinc-800" };
                                                    let isLive = false;
                                                    let isClosed = false;

                                                    if (now > end) {
                                                        statusBadge = { label: "Closed", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
                                                        isClosed = true;
                                                    } else if (now >= start && now <= end) {
                                                        statusBadge = { label: "LIVE", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
                                                        isLive = true;
                                                    }

                                                    const roundSubmission = submissions.find(s => s.round_id === round.id);
                                                    // Check explicit requires_submission flag (set by faculty), fallback to type check
                                                    const submissionEnabled = round.requires_submission === true
                                                        || (round.requires_submission === undefined && (round.type === 'submission' || round.type === 'digital_submission'));
                                                    const canSubmit = submissionEnabled && isLive && (regStatus === "registered" || regStatus === "confirmed");

                                                    return (
                                                        <motion.div
                                                            key={round.id}
                                                            initial={{ opacity: 0, x: -12 }}
                                                            whileInView={{ opacity: 1, x: 0 }}
                                                            viewport={{ once: true }}
                                                            transition={{ delay: idx * 0.07 }}
                                                            className="flex gap-5 group"
                                                        >
                                                            {/* Number bubble with glowing line */}
                                                            <div className="relative flex flex-col items-center">
                                                                <div className={cn(
                                                                    "shrink-0 w-14 h-14 rounded-xl border flex items-center justify-center font-black text-xl z-20 transition-all duration-500",
                                                                    isLive ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" :
                                                                        isClosed ? "bg-zinc-900 text-zinc-600 border-zinc-800" :
                                                                            "bg-zinc-900 text-zinc-500 border-zinc-800"
                                                                )}>
                                                                    {idx + 1}
                                                                </div>
                                                                {idx !== rounds.length - 1 && (
                                                                    <div className={cn(
                                                                        "w-0.5 h-full -mt-2 mb-4 transition-all duration-1000",
                                                                        isLive ? "bg-gradient-to-b from-emerald-500 via-emerald-500/20 to-zinc-800" : "bg-zinc-800"
                                                                    )} />
                                                                )}
                                                            </div>

                                                            {/* Card */}
                                                            <div className={cn(
                                                                "flex-1 p-6 md:p-8 bg-zinc-900 border rounded-xl transition-all duration-500 group-hover:bg-zinc-800/50",
                                                                isLive ? "border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]" : "border-zinc-800"
                                                            )}>
                                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={cn(
                                                                                "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest leading-none",
                                                                                isLive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : statusBadge.color
                                                                            )}>
                                                                                {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />}
                                                                                {statusBadge.label}
                                                                            </span>
                                                                            <span className={cn("px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900 text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none")}>
                                                                                {meta.label}
                                                                            </span>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">{round.title}</h3>
                                                                            {round.description && (
                                                                                <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-xl">{round.description}</p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center gap-6 pt-2">
                                                                            <div className="flex flex-col">
                                                                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Window Start</p>
                                                                                <p className="text-xs font-bold text-zinc-300">{fmtDateLong(round.start_time)} • {fmtTime(round.start_time)}</p>
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Window End</p>
                                                                                <p className="text-xs font-bold text-zinc-300">{fmtDateLong(round.end_time)} • {fmtTime(round.end_time)}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-col items-start md:items-end justify-between">
                                                                        {canSubmit ? (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedRound(round);
                                                                                    setIsSubModalOpen(true);
                                                                                }}
                                                                                className={cn(
                                                                                    "px-8 py-5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-2",
                                                                                    roundSubmission
                                                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black"
                                                                                        : "bg-white text-black hover:bg-emerald-500 hover:text-white shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                                                                                )}
                                                                            >
                                                                                {roundSubmission ? (
                                                                                    <><Check size={14} /> View Submission</>
                                                                                ) : (
                                                                                    <><SendIcon size={14} /> Submit Solution</>
                                                                                )}
                                                                            </button>
                                                                        ) : roundSubmission ? (
                                                                            <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500/60 transition-all">
                                                                                <CheckCircle2 size={14} />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Entry Received</span>
                                                                            </div>
                                                                        ) : isClosed ? (
                                                                            <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-zinc-600">
                                                                                <LockIcon size={14} />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Registration Closed</span>
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="h-40 bg-zinc-900 border border-zinc-800 border-dashed rounded-xl flex items-center justify-center">
                                                <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Schedule not yet announced</p>
                                            </div>
                                        )}
                                    </section>
                                )
                            }

                            {/* Prizes */}
                            {
                                isComp && competitionPrizes.length > 0 && (
                                    <section ref={sectionRefs.prizes} id="prizes" className="space-y-8">
                                        <SectionHeader icon={<Trophy size={16} />} eyebrow="Rewards" title="Prizes" color="text-amber-400" />
                                        <DetailRow icon={<ShieldCheck size={12} />} label="Governance" value="Verified" color="text-emerald-400" />

                                        {/* Rulebook Link */}
                                        {event.rulebook_url && (
                                            <a
                                                href={event.rulebook_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex w-full items-center justify-between p-5 bg-gradient-to-r from-orange-500/10 to-transparent border border-zinc-800 rounded-xl group hover:border-orange-500/40 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-black transition-all">
                                                        <ScrollText size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-white uppercase tracking-widest">Official Rulebook</p>
                                                        <p className="text-[9px] font-medium text-orange-500/60 mt-0.5 uppercase tracking-tighter">View legal constraints & rules</p>
                                                    </div>
                                                </div>
                                                <ArrowRight size={14} className="text-orange-500/50 group-hover:translate-x-1 group-hover:text-orange-400 transition-all" />
                                            </a>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {competitionPrizes.map((prize, idx) => {
                                                const rankStyle = [
                                                    { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400", watermark: "text-amber-500/5" },
                                                    { bg: "bg-zinc-400/10", border: "border-zinc-400/20", text: "text-zinc-300", watermark: "text-zinc-400/5" },
                                                    { bg: "bg-orange-700/10", border: "border-orange-700/20", text: "text-orange-600", watermark: "text-orange-700/5" },
                                                ][idx] ?? { bg: "bg-zinc-900", border: "border-zinc-800", text: "text-zinc-500", watermark: "text-white/5" };
                                                return (
                                                    <motion.div
                                                        key={prize.id}
                                                        initial={{ opacity: 0, y: 16 }}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        viewport={{ once: true }}
                                                        transition={{ delay: idx * 0.07 }}
                                                        className={cn("relative p-8 border rounded-xl overflow-hidden group", rankStyle.bg, rankStyle.border)}
                                                    >
                                                        <div className="flex gap-5 relative z-10">
                                                            <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0", rankStyle.bg, rankStyle.border, rankStyle.text)}>
                                                                {prize.icon === "trophy" && <Trophy size={20} />}
                                                                {prize.icon === "medal" && <Medal size={20} />}
                                                                {prize.icon === "certificate" && <ScrollText size={20} />}
                                                                {prize.icon === "award" && <Trophy size={20} />}
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className={cn("text-[9px] font-black uppercase tracking-widest", rankStyle.text)}>
                                                                    {prize.rank || (idx === 0 ? "1st Place" : idx === 1 ? "2nd Place" : idx === 2 ? "3rd Place" : `${idx + 1}th Place`)}
                                                                </div>
                                                                <h4 className="text-base font-black text-white tracking-tight">{prize.title}</h4>
                                                                <p className="text-sm font-bold text-zinc-300">
                                                                    {prize.reward || (prize.value ? `₹${Number(prize.value).toLocaleString("en-IN")}` : "—")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={cn("absolute -bottom-4 -right-2 text-[80px] font-black italic select-none pointer-events-none", rankStyle.watermark)}>
                                                            {idx + 1}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )
                            }

                            {/* Giveaways & Perks */}
                            {
                                eventPerks.length > 0 && (
                                    <section ref={sectionRefs.perks} id="perks" className="space-y-8">
                                        <SectionHeader icon={<Sparkles size={16} />} eyebrow="Attendee Benefits" title="Giveaways & Perks" color="text-indigo-400" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {eventPerks.map((perk, idx) => (
                                                <motion.div
                                                    key={perk.id}
                                                    initial={{ opacity: 0, y: 16 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: idx * 0.07 }}
                                                    className="relative p-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-indigo-500/30 transition-all"
                                                >
                                                    <div className="flex gap-5 relative z-10">
                                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                                            {perk.icon === "swag" || perk.icon === "goodie" ? <ShoppingBag size={20} /> : <Gift size={20} />}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500/60">
                                                                {perk.category || "Event Perk"}
                                                            </div>
                                                            <h4 className="text-base font-black text-white tracking-tight">{perk.title}</h4>
                                                            {perk.reward && (
                                                                <p className="text-sm font-bold text-zinc-300">{perk.reward}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Gift size={100} className="absolute -bottom-8 -right-8 text-white/[0.02] -rotate-12" />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                )
                            }

                            {/* FAQs */}
                            {
                                event.faqs?.length > 0 && (
                                    <section ref={sectionRefs.faqs} id="faqs" className="space-y-8">
                                        <SectionHeader icon={<MessageSquare size={16} />} eyebrow="Have Questions?" title="FAQs" color="text-emerald-400" />
                                        <div className="space-y-4">
                                            {event.faqs.map((faq: any, i: number) => (
                                                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                                    <details className="group">
                                                        <summary className="flex items-center justify-between p-8 cursor-pointer list-none">
                                                            <h4 className="text-base font-black text-white tracking-tight">{faq.question}</h4>
                                                            <ChevronRight size={20} className="text-zinc-500 group-open:rotate-90 transition-transform" />
                                                        </summary>
                                                        <div className="px-8 pb-8 text-sm text-zinc-400 font-medium leading-relaxed border-t border-zinc-800 pt-6">
                                                            {faq.answer}
                                                        </div>
                                                    </details>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )
                            }

                            {/* Sponsors */}
                            {
                                event.sponsors?.length > 0 && (
                                    <section ref={sectionRefs.sponsors} id="sponsors" className="space-y-8">
                                        <SectionHeader icon={<Handshake size={20} />} eyebrow="Our Partners" title="Sponsors" color="text-indigo-400" />
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                            {event.sponsors.map((spo: any, i: number) => (
                                                <div key={i} className="group relative bg-zinc-950 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-500/30 transition-all aspect-square">
                                                    {spo.logo_url ? (
                                                        <img src={spo.logo_url} className="w-20 h-20 object-contain grayscale group-hover:grayscale-0 transition-all" alt={spo.name} />
                                                    ) : (
                                                        <GlobeIcon className="w-12 h-12 text-zinc-800" />
                                                    )}
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter mb-0.5">{spo.name}</p>
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500/60">{spo.tier || "Partner"}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )
                            }

                            {/* Team */}
                            <section ref={sectionRefs.team} id="team" className="space-y-8">
                                <SectionHeader icon={<Users2 size={16} />} eyebrow="Organizers" title="Team" color="text-cyan-400" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {event.club && (
                                        <div className="p-7 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-5 hover:border-zinc-700 transition-all">
                                            <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0">
                                                {event.club.logo_url
                                                    ? <img src={event.club.logo_url} className="w-full h-full object-cover" alt={event.club.name} />
                                                    : <Globe size={28} className="text-indigo-400" />}
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Organizing Club</p>
                                                <h3 className="text-base font-black text-white">{event.club.name}</h3>
                                            </div>
                                        </div>
                                    )}
                                    {event.creator && (
                                        <div className="p-7 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-5 hover:border-zinc-700 transition-all">
                                            <div className="w-16 h-16 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-2xl font-black text-rose-400">{event.creator.full_name?.charAt(0) || "F"}</span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Event Coordinator</p>
                                                <h3 className="text-base font-black text-white">{event.creator.full_name}</h3>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Verified Faculty</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div >

                        {/* ── Right Column: Sticky registration card ── */}
                        < aside className="lg:col-span-4 relative order-first lg:order-last" >

                            <div className="sticky top-20 space-y-5">

                                {/* Primary Registration Card */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                                    {/* Event mini-banner thumbnail */}
                                    {event.banner_url && (
                                        <div className="relative h-36 overflow-hidden">
                                            <img src={event.banner_url} className="w-full h-full object-cover brightness-50" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                                        </div>
                                    )}

                                    <div className="p-7 space-y-6">
                                        {/* Price + seats */}
                                        <div className="space-y-1">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Registration Fee</p>
                                                    <p className="text-3xl font-black text-white mt-0.5 tracking-tighter italic">Free</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Seats</p>
                                                    <p className="text-base font-black text-white">{registered}<span className="text-zinc-600 font-medium text-sm"> / {capacity}</span></p>
                                                </div>
                                            </div>
                                            {/* Capacity bar */}
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-3">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${fillPct}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                    className={cn("h-full rounded-full", fillPct > 80 ? "bg-rose-500" : "bg-indigo-500")}
                                                />
                                            </div>
                                        </div>

                                        {/* Date/Time info */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
                                                <Calendar size={15} className="text-indigo-400 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Date</p>
                                                    <p className="text-xs font-bold text-zinc-200">{fmtDateLong(event.start_time)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
                                                <Clock size={15} className="text-rose-400 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Time</p>
                                                    <p className="text-xs font-bold text-zinc-200">{fmtTime(event.start_time)} — {fmtTime(event.end_time)}</p>
                                                </div>
                                            </div>
                                            {event.venue?.name && (
                                                <div className="flex items-center gap-3 py-3">
                                                    <MapPin size={15} className="text-amber-400 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Venue</p>
                                                        <p className="text-xs font-bold text-zinc-200">{event.venue.name}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons: Rulebook & Register */}
                                        <div className="space-y-3">
                                            {event.rulebook_url && (
                                                <a
                                                    href={event.rulebook_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-white transition-all group"
                                                >
                                                    <ScrollText size={14} /> Read Rulebook
                                                </a>
                                            )}

                                            {/* Observer sees read-only badge instead of register button */}
                                            {isObserver ? (
                                                <div className="w-full h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                    <Eye size={14} /> Institutional Observer
                                                </div>
                                            ) : isOrganizer ? (
                                                <div className="w-full p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-loose">
                                                        Organizers are not eligible to participate in their own events
                                                    </p>
                                                </div>
                                            ) : event.status !== "completed" && (
                                                <button
                                                    onClick={handleRegister}
                                                    disabled={regStatus === "registered" || regStatus === "confirmed" || isSoldOut || regStatus === "loading" || previewMode}
                                                    className={cn(
                                                        "w-full min-h-[52px] py-3.5 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                                                        previewMode
                                                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800"
                                                            : (regStatus === "registered" || regStatus === "confirmed")
                                                                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 cursor-default"
                                                                : (regStatus === "pending" || regStatus === "waitlisted")
                                                                    ? "bg-amber-500 text-black"
                                                                    : regStatus === "cancelled"
                                                                        ? "bg-zinc-800 text-zinc-500"
                                                                        : regStatus === "error"
                                                                            ? "bg-rose-500 text-white"
                                                                            : isSoldOut
                                                                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                                                : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-xl shadow-indigo-500/25 active:scale-[0.98]"
                                                    )}
                                                >
                                                    {previewMode && <><ShieldCheck size={14} /> Preview Mode</>}
                                                    {!previewMode && regStatus === "loading" && <><Loader2 size={14} className="animate-spin" /> Loading...</>}
                                                    {!previewMode && (regStatus === "registered" || regStatus === "confirmed") && <><CheckCircle2 size={14} /> Registered</>}
                                                    {!previewMode && regStatus === "pending" && "Pending Approval"}
                                                    {!previewMode && regStatus === "waitlisted" && "Waitlisted"}
                                                    {!previewMode && regStatus === "cancelled" && "Cancelled"}
                                                    {!previewMode && regStatus === "error" && "Retry"}
                                                    {!previewMode && regStatus === "idle" && !isSoldOut && (
                                                        <><Ticket size={14} />{isComp ? "Register Now" : "Claim Pass"}</>
                                                    )}
                                                    {!previewMode && regStatus === "idle" && isSoldOut && "Sold Out"}
                                                    {!previewMode && !["idle", "loading", "registered", "confirmed", "pending", "waitlisted", "cancelled", "error"].includes(regStatus) && (
                                                        <span className="capitalize">{regStatus}</span>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Resource & Community Links */}
                                        {event.resource_links && event.resource_links.length > 0 && (
                                            <div className="pt-6 border-t border-zinc-800 space-y-3">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Resources & Links</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {event.resource_links.map((link: any, idx: number) => {
                                                        const label = link.label.toLowerCase();
                                                        const isWhatsApp = label.includes('whatsapp');
                                                        const isDiscord = label.includes('discord');
                                                        const isPDF = label.includes('pdf') || label.includes('rulebook');

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => window.open(link.url, '_blank')}
                                                                className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all group"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "p-2 rounded-lg bg-zinc-950 flex items-center justify-center transition-colors shadow-inner",
                                                                        isWhatsApp ? "text-emerald-500" : isDiscord ? "text-indigo-400" : isPDF ? "text-rose-500" : "text-zinc-400"
                                                                    )}>
                                                                        {isWhatsApp || isDiscord ? <MessageSquare size={14} /> : isPDF ? <FileText size={14} /> : <ExternalLink size={14} />}
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-white uppercase tracking-tight">{link.label}</span>
                                                                </div>
                                                                <ChevronRight size={14} className="text-zinc-700 group-hover:text-white transition-colors" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Share */}
                                        <button
                                            onClick={handleShare}
                                            className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                                            {copied ? "Link Copied!" : "Share Event"}
                                        </button>
                                    </div>
                                </div>

                                {/* Quick details card */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Event Details</p>
                                    {([] as { icon: React.ReactNode; label: string; value: string; color: string }[])
                                        .concat([
                                            { icon: <Users size={13} />, label: "Format", value: "Individual", color: "text-cyan-400" },
                                            {
                                                icon: <IndianRupee size={13} />, label: "Prize Pool", value: prizes.reduce((a, p) => a + (Number(p.value) || 0), 0) > 0
                                                    ? `₹${prizes.reduce((a, p) => a + (Number(p.value) || 0), 0).toLocaleString("en-IN")}`
                                                    : "—", color: "text-amber-400"
                                            },
                                            ...(event.venue?.name ? [{ icon: <MapPin size={13} />, label: "Venue", value: event.venue.name, color: "text-rose-400" }] as any[] : []),
                                        ]).map((row, i) => (
                                            <DetailRow key={i} icon={row.icon} label={row.label} value={row.value || ""} color={row.color} />
                                        ))}
                                </div>
                            </div>
                        </aside >
                    </div >
                </div >
            )}

            {/* Sticky mobile action bar */}
            {
                !previewMode && !isObserver && !isOrganizer && event.status !== "completed" && (
                    <div className="fixed bottom-0 inset-x-0 z-[90] lg:hidden px-4 pb-6 pt-4"
                        style={{ background: "linear-gradient(to top, rgba(9,9,11,0.98) 60%, transparent)", backdropFilter: "blur(16px)" }}>
                        <button
                            onClick={handleRegister}
                            disabled={regStatus === "registered" || regStatus === "confirmed" || isSoldOut || regStatus === "loading"}
                            className={cn(
                                "w-full h-14 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                                (regStatus === "registered" || regStatus === "confirmed")
                                    ? "bg-emerald-500 text-black"
                                    : isSoldOut
                                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        : "bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 hover:bg-indigo-400"
                            )}
                        >
                            {regStatus === "loading" && <Loader2 size={16} className="animate-spin" />}
                            {(regStatus === "registered" || regStatus === "confirmed") && <><CheckCircle2 size={16} /> Registered</>}
                            {regStatus === "idle" && !isSoldOut && <><Ticket size={16} />{isComp ? "Register Now" : "Get Pass"}</>}
                            {regStatus === "idle" && isSoldOut && "Sold Out"}
                            {regStatus === "pending" && "Pending Approval"}
                            {regStatus === "waitlisted" && "You're Waitlisted"}
                        </button>
                    </div>
                )
            }

            {/* Global styles for prose content */}
            <style jsx global>{`
                .prose h1, .prose h2, .prose h3 {
                    color: white !important;
                    font-weight: 700 !important;
                    margin-bottom: 1rem;
                }
                .prose p { color: #a1a1aa !important; margin-bottom: 1rem; }
                .prose ul { padding-left: 1.25rem !important; margin-bottom: 1.5rem; }
                .prose ul li { color: #a1a1aa !important; margin-bottom: 0.5rem; }
                .prose strong { color: #818cf8 !important; font-weight: 700 !important; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #09090b; }
                ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
            `}</style>

            <AnimatePresence>
                {isRegModalOpen && event && user && (
                    <SmartRegistrationForm
                        isOpen={isRegModalOpen}
                        onClose={() => setIsRegModalOpen(false)}
                        event={event as any}
                        user={user}
                        onSuccess={onRegistrationSuccess}
                    />
                )}
            </AnimatePresence>

            {/* Section D: Round Submission Modal */}
            <AnimatePresence>
                {isSubModalOpen && selectedRound && event && studentId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => setIsSubModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-8 border-b border-zinc-800 bg-zinc-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Layers size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{selectedRound.title}</h3>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Digital Submission Workspace</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSubModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-8 md:p-12">
                                <SubmissionWorkspace
                                    event={event as any}
                                    round={selectedRound}
                                    studentId={studentId}
                                    teamId={teamId}
                                    isCaptain={isCaptain}
                                    onSuccess={onSubmissionSuccess}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}


// ── Winner Gallery — Podium Layout ───────────────────────────────────────────

function WinnerGallery({ prizes }: { prizes: EventPrize[] }) {
    const winners = prizes
        .filter(p => p.winner_id || p.winner_team_id)
        .sort((a, b) => a.position - b.position);

    if (winners.length === 0) return null;

    const podiumOrder = [winners[1], winners[0], winners[2]].filter(Boolean); // 2nd, 1st, 3rd
    const rest = winners.slice(3);

    const podiumStyle = (pos: number) => ({
        1: { bar: "h-28", bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", icon: <Trophy size={20} />, label: "1st Place" },
        2: { bar: "h-20", bg: "bg-zinc-400/10", border: "border-zinc-400/20", text: "text-zinc-300", icon: <Medal size={18} />, label: "2nd Place" },
        3: { bar: "h-14", bg: "bg-orange-700/10", border: "border-orange-700/20", text: "text-orange-500", icon: <Award size={16} />, label: "3rd Place" },
    }[pos] ?? { bar: "h-10", bg: "bg-zinc-900", border: "border-zinc-800", text: "text-zinc-500", icon: null, label: `${pos}th Place` });

    return (
        <section className="space-y-8">
            <div className="flex items-center gap-2.5 text-amber-400">
                <Trophy size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Champions</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Wall of Fame</h2>

            {/* Podium */}
            <div className="flex items-end justify-center gap-3">
                {podiumOrder.map((prize) => {
                    if (!prize) return null;
                    const s = podiumStyle(prize.position);
                    const name = prize.winner?.full_name || prize.winner_team?.name || "Winner";
                    const dept = prize.winner?.department?.name;
                    return (
                        <motion.div
                            key={prize.id}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: prize.position * 0.08 }}
                            className={cn(
                                "flex-1 max-w-[180px] rounded-xl border overflow-hidden",
                                s.bg, s.border
                            )}
                        >
                            {/* Podium bar */}
                            <div className={cn("w-full flex flex-col items-center justify-end px-3 pb-3 pt-3", s.bar)}>
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-1", s.bg, s.border, s.text)}>
                                    {s.icon}
                                </div>
                            </div>
                            {/* Name plate */}
                            <div className="px-3 pb-4 text-center space-y-0.5">
                                <p className={cn("text-[9px] font-black uppercase tracking-widest", s.text)}>{s.label}</p>
                                <p className="text-sm font-bold text-white leading-snug line-clamp-2">{name}</p>
                                {dept && <p className="text-[9px] text-zinc-600 font-medium">{dept}</p>}
                                {prize.reward && <p className="text-[9px] font-bold text-zinc-400">{prize.reward}</p>}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Remaining positions */}
            {rest.length > 0 && (
                <div className="space-y-2">
                    {rest.map((prize, idx) => (
                        <div key={prize.id} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                            <span className="text-sm font-black text-zinc-600 w-6 text-center">{prize.position}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {prize.winner?.full_name || prize.winner_team?.name || "Winner"}
                                </p>
                                {prize.winner?.department?.name && (
                                    <p className="text-xs text-zinc-600">{prize.winner.department.name}</p>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 shrink-0">{prize.title}</p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

// ── Deprecated: Basic Winners Section ─────────────────────────────────────────

function WinnersSection({ prizes }: { prizes: EventPrize[] }) {
    return null; // Replaced by WinnerGallery
}

// ── Generic Detail Row ────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-zinc-800/30 last:border-0 hover:bg-zinc-900 transition-colors rounded-xl px-2 -mx-2">
            <div className="flex items-center gap-3">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950 border border-zinc-800", color)}>
                    {icon}
                </div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-tight italic">{value}</span>
        </div>
    );
}

// ── Section Header Component ──────────────────────────────────────────────────

function SectionHeader({ icon, eyebrow, title, color }: { icon: React.ReactNode; eyebrow: string; title: string; color: string }) {
    return (
        <header className="space-y-2">
            <div className={cn("flex items-center gap-2", color)}>
                {icon}
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{eyebrow}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title}</h2>
        </header>
    );
}

function DomainNavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative h-10 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                active
                    ? "bg-white text-black shadow-lg shadow-white/10 scale-105"
                    : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            )}
        >
            {label}
        </button>
    );
}

function TrackSelectionModal({ isOpen, onClose, tracks, eventId, onComplete, rulebookUrl }: {
    isOpen: boolean;
    onClose: () => void;
    tracks: any[];
    eventId: string;
    onComplete: (track: any) => void;
    rulebookUrl?: string | null;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-3xl bg-[#09090b]/80">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-3xl overflow-hidden"
            >
                <div className="p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                                Select Entry Track
                                <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                            </h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Select your specific competition category</p>
                        </div>
                        <button onClick={onClose} className="p-3 rounded-xl hover:bg-zinc-900 text-zinc-600 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Rulebook Warning */}
                    <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <ScrollText size={18} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">Action Required</p>
                            <p className="text-[10px] font-medium text-zinc-400 leading-relaxed">
                                ⚠️ Please ensure you have read the {" "}
                                {rulebookUrl ? (
                                    <a
                                        href={rulebookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-500 underline font-bold hover:text-amber-400 transition-colors"
                                    >
                                        Official Rulebook
                                    </a>
                                ) : (
                                    <span className="text-amber-500 font-bold">Rulebook</span>
                                )}
                                {" "} before selecting a track for this competition.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {tracks.map((track) => (
                            <button
                                key={track.id}
                                onClick={() => setSelectedId(track.id)}
                                className={cn(
                                    "p-6 rounded-xl border text-left transition-all relative overflow-hidden group/item",
                                    selectedId === track.id
                                        ? "bg-indigo-500 border-indigo-500 shadow-xl shadow-indigo-500/10"
                                        : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                                )}
                            >
                                <div className="flex items-center justify-between relative z-10 font-black">
                                    <div className="space-y-1">
                                        <p className={cn("text-base tracking-tight uppercase italic transition-colors", selectedId === track.id ? "text-white" : "text-zinc-500 group-hover/item:text-zinc-300")}>{track.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md",
                                                selectedId === track.id ? "bg-white/20 text-white" : "bg-black/40 text-zinc-600"
                                            )}>
                                                {track.is_team ? "Team Required" : "Individual Entry"}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedId === track.id ? (
                                        <div className="w-10 h-10 rounded-xl bg-white text-indigo-500 flex items-center justify-center shadow-xl">
                                            <Check size={20} strokeWidth={4} />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-800">
                                            <ArrowRight size={20} />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        disabled={!selectedId}
                        onClick={() => {
                            const track = tracks.find(t => t.id === selectedId);
                            if (track) onComplete(track);
                        }}
                        className="w-full h-16 rounded-[1.5rem] bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-500 hover:text-white transition-all shadow-xl disabled:opacity-30 disabled:grayscale active:scale-95"
                    >
                        Confirm Entry Track <CheckCircle2 size={16} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <StudentEventView eventId={id} />;
}
