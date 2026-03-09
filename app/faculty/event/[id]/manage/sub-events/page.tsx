"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    Layers,
    Plus,
    X,
    Trash2,
    Loader2,
    Calendar,
    Users,
    ArrowRight,
    Sparkles,
    AlertCircle,
    LayoutDashboard,
    Clock,
    Search,
    Hash,
    Trophy,
    Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Domain {
    id: string;
    name: string;
}

interface Club {
    id: string;
    name: string;
}

interface SubEvent {
    id: string;
    title: string;
    status: string;
    start_time: string;
    end_time: string;
    registered_count: number;
    fest_domain_id: string | null;
    club_id: string | null;
}

export default function SubEventsManagementPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [eventName, setEventName] = useState("");
    const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUmbrella, setIsUmbrella] = useState(false);

    useEffect(() => {
        if (eventId) fetchData();
    }, [eventId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error("Not authenticated");

            const { data: profile } = await supabase
                .from("users")
                .select("institution_id")
                .eq("auth_uid", authUser.id)
                .single();

            if (!profile?.institution_id) throw new Error("Institution not found");
            const institutionId = profile.institution_id;

            const [eventRes, subEventsRes, domainsRes] = await Promise.all([
                supabase.from("events").select("title, event_type").eq("id", eventId).eq("institution_id", institutionId).single(),
                supabase
                    .from("events")
                    .select("id, title, status, start_time, end_time, registered_count, fest_domain_id, club_id")
                    .eq("parent_event_id", eventId)
                    .eq("institution_id", institutionId)
                    .order("start_time"),
                supabase.from("fest_domains").select("id, name").eq("umbrella_event_id", eventId)
            ]);

            if (eventRes.error) throw new Error("Event not found or access denied.");

            if (eventRes.data) {
                setEventName(eventRes.data.title);
                setIsUmbrella(eventRes.data.event_type === "umbrella");
            }
            if (subEventsRes.data) setSubEvents(subEventsRes.data as SubEvent[]);
            if (domainsRes.data) setDomains(domainsRes.data);
        } catch (err: any) {
            console.error("Fetch error:", err);
            alert("Security Error: " + err.message);
            router.push("/faculty/my-events");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubEvent = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from("users").select("institution_id").eq("auth_uid", authUser?.id).single();

            if (!profile?.institution_id) throw new Error("Unauthorized");

            const { error, count } = await supabase
                .from("events")
                .delete({ count: 'exact' })
                .eq("id", id)
                .eq("institution_id", profile.institution_id);

            if (error) throw error;
            if (count === 0) throw new Error("Permission Denied: Event not found in your institution.");

            fetchData();
        } catch (err: any) {
            alert("Security Error: " + err.message);
        }
    };

    const [editingSubEvent, setEditingSubEvent] = useState<SubEvent | null>(null);

    const handleEditSubEvent = (ev: SubEvent) => {
        setEditingSubEvent(ev);
        setIsCreateModalOpen(true);
    };

    // Grouping Logic
    const groupedSubEvents = subEvents.reduce((acc, event) => {
        const domainId = event.fest_domain_id || "unassigned";
        if (!acc[domainId]) acc[domainId] = [];
        acc[domainId].push(event);
        return acc;
    }, {} as Record<string, SubEvent[]>);

    const getDomainName = (id: string) => {
        if (id === "unassigned") return "Core / Unassigned Activities";
        return domains.find(d => d.id === id)?.name || "Unknown Domain";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
            </div>
        );
    }

    if (!isUmbrella) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-8 text-center space-y-6">
                <AlertCircle size={48} className="text-amber-500" />
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Umbrella Registry Required</h2>
                    <p className="text-zinc-500 text-sm max-w-md">Sub-events and Domain-management are only accessible for institutional Mega Fests.</p>
                </div>
                <button onClick={() => router.back()} className="text-indigo-400 font-bold hover:underline">Return to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-8 md:p-12">
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            <ChevronLeft size={14} />
                            Back to Manage
                        </button>
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black tracking-tighter">{eventName}</h1>
                            <div className="flex items-center gap-2 text-cyan-400">
                                <Layers size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sub-Event Orchestra</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-12 px-8 rounded-2xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus size={16} /> Add Sub-Event
                    </button>
                </header>

                <div className="space-y-16">
                    {Object.keys(groupedSubEvents).length > 0 ? (
                        Object.entries(groupedSubEvents).map(([domainId, events]) => (
                            <section key={domainId} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-px bg-zinc-800 flex-1" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-600 border border-white/5">
                                            <Hash size={14} />
                                        </div>
                                        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">{getDomainName(domainId)}</h2>
                                    </div>
                                    <div className="h-px bg-zinc-800 flex-1" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                                    {events.map((ev) => (
                                        <motion.div
                                            key={ev.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-6 rounded-[2rem] bg-zinc-900/30 border border-white/5 flex items-center justify-between group hover:border-cyan-500/30 transition-all"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center border border-white/5 relative">
                                                    <Sparkles className="text-cyan-500" size={20} />
                                                    {ev.status === 'live' && (
                                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-pulse border-2 border-zinc-950" />
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-base text-white">{ev.title}</h3>
                                                    <div className="flex items-center gap-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-zinc-600" /> {new Date(ev.start_time).toLocaleDateString()}</span>
                                                        <span className="flex items-center gap-1.5"><Clock size={12} className="text-zinc-600" /> {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="flex items-center gap-1.5"><Users size={12} className="text-zinc-600" /> {ev.registered_count} Registrations</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className={cn(
                                                    "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm",
                                                    ev.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                        ev.status === 'live' ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                                                            "bg-zinc-500/10 border-white/10 text-zinc-400"
                                                )}>
                                                    {ev.status}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditSubEvent(ev)}
                                                        className="p-3 rounded-2xl bg-zinc-950/50 border border-white/5 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Edit Activity"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSubEvent(ev.id, ev.title)}
                                                        className="p-3 rounded-2xl bg-zinc-950/50 border border-white/5 text-zinc-500 hover:text-rose-500 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete Activity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(`/faculty/event/${ev.id}/manage`, '_blank')}
                                                        className="h-11 px-6 rounded-2xl bg-white/5 border border-white/5 text-zinc-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black hover:border-cyan-500"
                                                    >
                                                        Manage <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="py-32 text-center space-y-6 bg-zinc-900/20 rounded-[4rem] border-2 border-dashed border-white/5">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center mx-auto text-zinc-700">
                                <Layers size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">No nested activities deployed</p>
                                <p className="text-xs text-zinc-700 max-w-sm mx-auto font-medium">Link workshops, competitions, or seminars to this umbrella fest registry.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-11 px-6 rounded-xl bg-zinc-900 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                            >
                                Deploy First Activity
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <SubEventModal
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setEditingSubEvent(null); }}
                parentId={eventId}
                onSuccess={fetchData}
                domains={domains}
                initialData={editingSubEvent}
            />
        </div>
    );
}

function SubEventModal({ isOpen, onClose, parentId, onSuccess, domains, initialData }: {
    isOpen: boolean;
    onClose: () => void;
    parentId: string;
    onSuccess: () => void;
    domains: Domain[];
    initialData?: SubEvent | null;
}) {
    const [formData, setFormData] = useState({
        title: "",
        domainId: "",
        clubId: "",
        date: "",
        startTime: "10:00",
        endTime: "17:00",
        isCompetition: true,
    });
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                title: initialData.title,
                domainId: initialData.fest_domain_id || "",
                clubId: initialData.club_id || "",
                date: initialData.start_time.split('T')[0],
                startTime: initialData.start_time.split('T')[1].substring(0, 5),
                endTime: initialData.end_time.split('T')[1].substring(0, 5),
                isCompetition: (initialData as any).is_competition !== false,
            });
        } else if (isOpen) {
            setFormData({ title: "", domainId: "", clubId: "", date: "", startTime: "10:00", endTime: "17:00", isCompetition: true });
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (isOpen) {
            fetchClubs();
        }
    }, [isOpen]);

    const fetchClubs = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data: profile } = await supabase
                .from("users")
                .select("institution_id")
                .eq("auth_uid", authUser.id)
                .single();

            if (!profile?.institution_id) return;

            const { data } = await supabase
                .from("clubs")
                .select("id, name")
                .eq("institution_id", profile.institution_id)
                .order("name");

            if (data) setClubs(data);
        } catch (err) {
            console.error("Scale error:", err);
        }
    };

    const handleAction = async () => {
        if (!formData.title.trim()) return;
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from("users").select("institution_id").eq("auth_uid", authUser?.id).single();
            if (!profile?.institution_id) throw new Error("Security Error: Session expired");

            const { data: parent } = await supabase
                .from("events")
                .select("*")
                .eq("id", parentId)
                .eq("institution_id", profile.institution_id)
                .single();

            if (!parent) throw new Error("Security Error: Parent fest not found or access denied");

            // Construct ISO timestamps
            const startStr = `${formData.date || parent.start_time.split('T')[0]}T${formData.startTime}:00`;
            const endStr = `${formData.date || parent.end_time.split('T')[0]}T${formData.endTime}:00`;

            if (initialData) {
                // Update existing sub-event
                const { error, count } = await supabase
                    .from("events")
                    .update({
                        title: formData.title.trim(),
                        start_time: startStr,
                        end_time: endStr,
                        club_id: formData.clubId || parent.club_id,
                        fest_domain_id: formData.domainId || null,
                        is_competition: formData.isCompetition
                    })
                    .eq("id", initialData.id)
                    .eq("institution_id", profile.institution_id)
                    .select("id");

                if (error) throw error;
                // Note: count check on update requires .select() or custom logic, 
                // but .eq("institution_id") is already enforcing it at the DB level.
            } else {
                // Create new sub-event
                const { error } = await supabase
                    .from("events")
                    .insert({
                        title: formData.title.trim(),
                        description: `Part of ${parent.title}`,
                        creator_id: parent.creator_id,
                        department_id: parent.department_id,
                        status: "draft",
                        risk_level: "low",
                        budget_required: 0,
                        start_time: startStr,
                        end_time: endStr,
                        venue_id: parent.venue_id,
                        club_id: formData.clubId || parent.club_id,
                        fest_domain_id: formData.domainId || null,
                        parent_event_id: parentId,
                        event_type: "sub_event",
                        is_competition: formData.isCompetition,
                        institution_id: parent.institution_id
                    });
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden"
                    >
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-white tracking-tight">
                                        {initialData ? "Update Activity" : "Deploy Nested Activity"}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                        {initialData ? "Adjusting operational parameters" : "Architecting sub-events for the Mega Fest"}
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/5 text-zinc-500 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Type Selection Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, isCompetition: true })}
                                    className={cn(
                                        "p-6 rounded-[2rem] border transition-all text-left space-y-4 group/card relative overflow-hidden",
                                        formData.isCompetition
                                            ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                                            : "bg-zinc-900/50 border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                        formData.isCompetition ? "bg-indigo-500 text-black scale-110" : "bg-zinc-800 text-zinc-500"
                                    )}>
                                        <Trophy size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className={cn("text-sm font-black uppercase tracking-widest", formData.isCompetition ? "text-white" : "text-zinc-500")}>Competition</h4>
                                        <p className="text-[9px] font-medium text-zinc-600 leading-relaxed uppercase">Hackathons, Dance Offs, Quiz.</p>
                                    </div>
                                    {formData.isCompetition && <motion.div layoutId="sub-type-glow" className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-[40px] rounded-full" />}
                                </button>

                                <button
                                    onClick={() => setFormData({ ...formData, isCompetition: false })}
                                    className={cn(
                                        "p-6 rounded-[2rem] border transition-all text-left space-y-4 group/card relative overflow-hidden",
                                        !formData.isCompetition
                                            ? "bg-amber-500/10 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.15)]"
                                            : "bg-zinc-900/50 border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                        !formData.isCompetition ? "bg-amber-500 text-black scale-110" : "bg-zinc-800 text-zinc-500"
                                    )}>
                                        <Ticket size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className={cn("text-sm font-black uppercase tracking-widest", !formData.isCompetition ? "text-white" : "text-zinc-500")}>Experience</h4>
                                        <p className="text-[9px] font-medium text-zinc-600 leading-relaxed uppercase">Concerts, Talks, Guest Shows.</p>
                                    </div>
                                    {!formData.isCompetition && <motion.div layoutId="sub-type-glow" className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-[40px] rounded-full" />}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Activity Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. RoboWars, Hackathon Track A..."
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Domain / Vertical</label>
                                    <select
                                        value={formData.domainId}
                                        onChange={e => setFormData({ ...formData, domainId: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold appearance-none focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="">CORE ACTIVITY</option>
                                        {domains.map(d => (
                                            <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Organizing Club</label>
                                    <select
                                        value={formData.clubId}
                                        onChange={e => setFormData({ ...formData, clubId: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold appearance-none focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="">FEST COMMITTEE (DEFAULT)</option>
                                        {clubs.map(c => (
                                            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Event Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Start</label>
                                        <input
                                            type="time"
                                            value={formData.startTime}
                                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">End</label>
                                        <input
                                            type="time"
                                            value={formData.endTime}
                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 h-12 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-md"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={loading || !formData.title.trim()}
                                    className="flex-[2] h-12 rounded-2xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
                                    {initialData ? "Update Activity" : "Deploy Activity"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
