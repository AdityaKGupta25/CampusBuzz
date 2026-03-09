"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Calendar,
    ShieldCheck,
    Eye,
    ChevronRight,
    ChevronLeft,
    MapPin,
    Clock,
    DollarSign,
    CheckCircle2,
    Send,
    Loader2,
    Users,
    Zap,
    Shield,
    AlertCircle,
    Building,
    ArrowRight,
    Sparkles,
    LayoutPanelTop,
    Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { supabase, insertEvent, getCurrentUserProfile } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Club {
    id: string;
    name: string;
}

interface Venue {
    id: string;
    name: string;
    capacity: number;
    is_active: boolean;
    venue_type: string;
}

interface VenueAvailability {
    [venueId: string]: {
        isBooked: boolean;
        eventName?: string;
    };
}

interface ConflictStatus {
    type: 'HARD' | 'SOFT' | 'NONE';
    message: string;
    conflictingEvent?: string;
    venueName?: string;
}

interface FormData {
    title: string;
    tagline: string;
    description: string;
    clubId: string;
    isUmbrella: boolean;
    eventType: "standalone" | "umbrella" | "sub_event";
    parentEventId: string;
    startTime: string;
    endTime: string;
    venueId: string;
    riskLevel: "low" | "medium" | "high";
    budgetRequired: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: "The Basics", icon: FileText },
    { id: 2, label: "Time & Place", icon: Calendar },
    { id: 3, label: "Governance", icon: ShieldCheck },
    { id: 4, label: "Review", icon: Eye },
];

const RISK_CARDS = [
    {
        id: "low",
        label: "Low Risk",
        desc: "Standard academic or department meetings. Fast approval.",
        icon: CheckCircle2,
        color: "text-emerald-400",
        bgColor: "bg-emerald-400/10",
        borderColor: "border-emerald-400/20"
    },
    {
        id: "medium",
        label: "Medium Risk",
        desc: "External speakers or multi-department events. Dual approval.",
        icon: Zap,
        color: "text-amber-400",
        bgColor: "bg-amber-400/10",
        borderColor: "border-amber-400/20"
    },
    {
        id: "high",
        label: "High Risk",
        desc: "Large scale, ticketed, or high-profile events. Full governance.",
        icon: Shield,
        color: "text-rose-400",
        bgColor: "bg-rose-400/10",
        borderColor: "border-rose-400/20"
    }
] as const;

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 20 : -20,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 20 : -20,
        opacity: 0,
    })
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CreateEventWizard() {
    const router = useRouter();
    const { user } = useUser();

    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

    const [clubs, setClubs] = useState<Club[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [umbrellaEvents, setUmbrellaEvents] = useState<{ id: string, title: string }[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [formData, setFormData] = useState<FormData>({
        title: "",
        tagline: "",
        description: "",
        clubId: "",
        isUmbrella: false,
        eventType: "standalone",
        parentEventId: "",
        startTime: "",
        endTime: "",
        venueId: "",
        riskLevel: "low",
        budgetRequired: "",
    });

    const [venueAvailability, setVenueAvailability] = useState<VenueAvailability>({});
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [conflictStatus, setConflictStatus] = useState<ConflictStatus>({ type: 'NONE', message: '' });
    const [checkingConflict, setCheckingConflict] = useState(false);

    useEffect(() => {
        async function loadWizardData() {
            try {
                const { userId, institutionId } = await getCurrentUserProfile();

                const [clubsRes, venuesRes, umbrellaRes] = await Promise.all([
                    supabase.from("clubs").select("id, name")
                        .eq("faculty_in_charge_id", userId)
                        .eq("institution_id", institutionId)
                        .order("name"),
                    supabase.from("venues").select("id, name, capacity, is_active, venue_type")
                        .eq("institution_id", institutionId)
                        .order("name"),
                    supabase.from("events")
                        .select("id, title")
                        .eq("event_type", "umbrella")
                        .eq("status", "approved")
                        .eq("institution_id", institutionId)
                        .order("title")
                ]);

                if (clubsRes.data) setClubs(clubsRes.data);
                if (venuesRes.data) setVenues(venuesRes.data);
                if (umbrellaRes.data) setUmbrellaEvents(umbrellaRes.data);
            } catch (err) {
                console.error("Failed to load wizard data:", err);
            } finally {
                setLoadingData(false);
            }
        }
        loadWizardData();
    }, []);

    const check_smart_conflict = useCallback(async () => {
        const { startTime, endTime, venueId } = formData;
        if (!startTime || !endTime) return;

        setCheckingAvailability(true);
        setCheckingConflict(true);
        try {
            const startISO = new Date(startTime).toISOString();
            const endISO = new Date(endTime).toISOString();

            // Fetch ALL overlapping events at this institution to determine availability & conflicts
            const { data: overlapping, error } = await supabase
                .from("events")
                .select("id, title, venue_id, start_time, end_time")
                .eq("institution_id", user?.institution_id)
                .in("status", ["approved", "live"])
                .or(`and(start_time.lte.${endISO},end_time.gte.${startISO})`);

            if (error) throw error;

            // 1. Update Venue Availability (for the dropdown list)
            const availability: VenueAvailability = {};
            overlapping?.forEach(event => {
                if (event.venue_id) {
                    availability[event.venue_id] = {
                        isBooked: true,
                        eventName: event.title
                    };
                }
            });
            setVenueAvailability(availability);

            // 2. Determine Conflict Status (for the current selection)
            if (!venueId) {
                setConflictStatus({ type: 'NONE', message: '' });
                return;
            }

            const hardConflict = overlapping?.find(e => e.venue_id === venueId);
            if (hardConflict) {
                const venueName = venues.find(v => v.id === venueId)?.name || "selected venue";
                setConflictStatus({
                    type: 'HARD',
                    message: `🚫 VENUE OCCUPIED: ${hardConflict.title} is already happening in ${venueName}.`,
                    conflictingEvent: hardConflict.title,
                    venueName: venueName
                });
                return;
            }

            const softConflict = overlapping?.find(e => e.venue_id !== venueId);
            if (softConflict) {
                setConflictStatus({
                    type: 'SOFT',
                    message: `⚠️ CROWD ALERT: ${softConflict.title} is also happening on campus at this time. Your event's attendance might be affected.`,
                    conflictingEvent: softConflict.title
                });
                return;
            }

            setConflictStatus({ type: 'NONE', message: '✅ Schedule is clear.' });
        } catch (err) {
            console.error("Smart conflict check failed:", err);
        } finally {
            setCheckingAvailability(false);
            setCheckingConflict(false);
        }
    }, [formData.startTime, formData.endTime, formData.venueId, user?.institution_id, venues]);

    useEffect(() => {
        if (formData.startTime && formData.endTime && step === 2) {
            void check_smart_conflict();
        }
    }, [formData.startTime, formData.endTime, formData.venueId, step, check_smart_conflict]);

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        const keys = Object.keys(updates) as (keyof FormData)[];
        if (keys.length > 0) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[keys[0]];
                return next;
            });
        }
    };

    const validateStep = (currentStep: number) => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (currentStep === 1) {
            if (!formData.title.trim()) newErrors.title = "Title is required.";
            if (!formData.description.trim()) newErrors.description = "Description is required.";
            if (!formData.clubId) newErrors.clubId = "Please select a club.";
        }
        if (currentStep === 2) {
            if (!formData.startTime) newErrors.startTime = "Start time is required.";
            if (!formData.endTime) newErrors.endTime = "End time is required.";
            if (formData.startTime && formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
                newErrors.endTime = "End time must be after start time.";
            }
            if (!formData.venueId) newErrors.venueId = "Select a venue.";
            if (formData.venueId && conflictStatus.type === 'HARD') {
                newErrors.venueId = "HARD CONFLICT: Selected venue is currently occupied.";
            }
            const selectedVenue = venues.find(v => v.id === formData.venueId);
            if (selectedVenue && !selectedVenue.is_active) {
                newErrors.venueId = "HARD CONFLICT: Venue is under maintenance.";
            }
        }
        if (currentStep === 3) {
            if (!formData.budgetRequired || Number(formData.budgetRequired) < 0) {
                newErrors.budgetRequired = "Enter a valid budget.";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setDirection(1);
            setStep(s => Math.min(s + 1, 4));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        setDirection(-1);
        setStep(s => Math.max(s - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const { userId, departmentId, institutionId } = await getCurrentUserProfile();

            if (!institutionId) {
                alert("Security Error: Your account is not linked to any institution. Please contact support.");
                setIsSubmitting(false);
                return;
            }

            const { data, error } = await supabase
                .from("events")
                .insert({
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    creator_id: userId,
                    department_id: departmentId,
                    institution_id: institutionId,
                    status: "draft", // Ensure it starts as draft
                    risk_level: formData.riskLevel,
                    budget_required: Number(formData.budgetRequired),
                    start_time: new Date(formData.startTime).toISOString(),
                    end_time: new Date(formData.endTime).toISOString(),
                    venue_id: formData.venueId === "tbd-placeholder" ? null : formData.venueId,
                    club_id: (formData.clubId === "none" || !formData.clubId) ? null : formData.clubId,
                    is_umbrella: formData.isUmbrella,
                    parent_event_id: formData.parentEventId || null,
                    event_type: formData.parentEventId ? "sub_event" : formData.eventType
                })
                .select("id")
                .single();

            if (error) throw error;
            router.push(`/faculty/event/${data.id}/manage`);
        } catch (err: any) {
            console.error("Submission error:", err);
            alert(err.message || "Failed to create event.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                    <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-cyan-500/30 font-sans">
            {/* 1. Header Navigation */}
            <div className="max-w-3xl mx-auto px-6 pt-10 pb-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
                            <Sparkles className="text-cyan-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500/80">Step {step} of 4</h1>
                            <p className="text-lg font-bold text-white tracking-tight">{STEPS[step - 1].label}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {STEPS.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                "h-1 rounded-full bg-zinc-800 transition-all duration-500",
                                step >= s.id ? "flex-1 bg-cyan-500" : "flex-1"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* 2. Structured Form Content */}
            <main className="max-w-3xl mx-auto px-6 pb-40 pt-4">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-3xl shadow-3xl backdrop-blur-xl"
                    >
                        {step === 1 && (
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Event Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter event title..."
                                        value={formData.title}
                                        onChange={e => updateFormData({ title: e.target.value })}
                                        className={cn(
                                            "w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-base font-medium transition-all focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] placeholder:text-zinc-700",
                                            errors.title && "border-rose-500/50"
                                        )}
                                    />
                                    {errors.title && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Tagline</label>
                                    <input
                                        type="text"
                                        placeholder="A short punchy catchphrase..."
                                        value={formData.tagline}
                                        onChange={e => updateFormData({ tagline: e.target.value })}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-base font-medium transition-all focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] placeholder:text-zinc-700"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Event Description</label>
                                    <textarea
                                        placeholder="Describe the event goals and details..."
                                        rows={4}
                                        value={formData.description}
                                        onChange={e => updateFormData({ description: e.target.value })}
                                        className={cn(
                                            "w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-base font-medium transition-all focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] placeholder:text-zinc-700 resize-none",
                                            errors.description && "border-rose-500/50"
                                        )}
                                    />
                                    {errors.description && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.description}</p>}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Organizing Club</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {/* "None" Option for Department Level Events */}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData({ clubId: "none" })}
                                            className={cn(
                                                "p-4 rounded-2xl border text-left transition-all relative flex items-center gap-3",
                                                formData.clubId === "none"
                                                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                                    : "bg-white/5 border-white/5 text-zinc-500 hover:border-zinc-700 hover:bg-white/[0.02]"
                                            )}
                                        >
                                            <Building size={14} />
                                            <span className="text-xs font-bold truncate">None / Department Level</span>
                                            {formData.clubId === "none" && <CheckCircle2 size={14} className="ml-auto" />}
                                        </button>

                                        {clubs.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => updateFormData({ clubId: c.id })}
                                                className={cn(
                                                    "p-4 rounded-2xl border text-left transition-all relative flex items-center gap-3",
                                                    formData.clubId === c.id
                                                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                                        : "bg-white/5 border-white/5 text-zinc-500 hover:border-zinc-700 hover:bg-white/[0.02]"
                                                )}
                                            >
                                                <Users size={14} />
                                                <span className="text-xs font-bold truncate">{c.name}</span>
                                                {formData.clubId === c.id && <CheckCircle2 size={14} className="ml-auto" />}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.clubId && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.clubId}</p>}
                                </div>

                                <div className="space-y-4">
                                    <div className="p-5 rounded-2xl bg-zinc-950/50 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <LayoutPanelTop size={16} className="text-cyan-400" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Umbrella Event (Fest)</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">This is a major fest containing multiple events</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextIsUmbrella = !formData.isUmbrella;
                                                updateFormData({
                                                    isUmbrella: nextIsUmbrella,
                                                    eventType: nextIsUmbrella ? "umbrella" : "standalone",
                                                    parentEventId: ""
                                                });
                                            }}
                                            className={cn(
                                                "w-11 h-6 rounded-full transition-colors relative",
                                                formData.isUmbrella ? "bg-cyan-500" : "bg-zinc-800"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                                                formData.isUmbrella ? "left-6" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {/* Parent Fest Selection (Only if NOT an umbrella itself) */}
                                    {!formData.isUmbrella && umbrellaEvents.length > 0 && (
                                        <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles size={14} className="text-blue-400" />
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Part of a Larger Fest?</p>
                                            </div>
                                            <select
                                                value={formData.parentEventId}
                                                onChange={e => updateFormData({ parentEventId: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-zinc-900">Standalone Event (No Parent)</option>
                                                {umbrellaEvents.map(fest => (
                                                    <option key={fest.id} value={fest.id} className="bg-zinc-900">
                                                        {fest.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[9px] text-zinc-600 font-medium italic">Selecting a parent fest allows this event to be categorized under the fest dashboard.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.startTime}
                                            onChange={e => updateFormData({ startTime: e.target.value })}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-500 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">End Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.endTime}
                                            onChange={e => updateFormData({ endTime: e.target.value })}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-cyan-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-center block">Venue Selection</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {venues.length > 0 ? (
                                            venues.map((v) => {
                                                const availability = venueAvailability[v.id];
                                                const isBooked = availability?.isBooked;
                                                const isMaintenance = !v.is_active;
                                                const isSelected = formData.venueId === v.id;

                                                return (
                                                    <button
                                                        key={v.id}
                                                        type="button"
                                                        disabled={isBooked || isMaintenance}
                                                        onClick={() => updateFormData({ venueId: v.id })}
                                                        className={cn(
                                                            "p-5 rounded-2xl border text-left transition-all relative",
                                                            isSelected
                                                                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                                                : "bg-white/5 border-white/5 text-zinc-500 hover:border-zinc-700",
                                                            (isBooked || isMaintenance) && "opacity-50 cursor-not-allowed bg-zinc-900/50"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <MapPin size={14} className={isSelected ? "text-cyan-400" : "text-zinc-600"} />
                                                            <h3 className="font-bold text-sm text-white truncate">{v.name}</h3>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <p className="text-[10px] font-bold text-zinc-600">Cap: {v.capacity}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                {isMaintenance ? (
                                                                    <>
                                                                        <Wrench size={10} className="text-amber-500" />
                                                                        <span className="text-[9px] font-black uppercase text-amber-500">Maintenance</span>
                                                                    </>
                                                                ) : isBooked ? (
                                                                    <>
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                                                        <span className="text-[9px] font-black uppercase text-rose-500 truncate max-w-[80px]">Booked: {availability.eventName}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                                        <span className="text-[9px] font-black uppercase text-emerald-500">Available</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-1 md:col-span-2 space-y-3">
                                                <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center space-y-4">
                                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                                                        <MapPin size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">No active venues found</p>
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Registry is currently empty</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormData({ venueId: "tbd-placeholder" })}
                                                        className={cn(
                                                            "px-6 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all",
                                                            formData.venueId === "tbd-placeholder"
                                                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                                                                : "bg-white/5 border-white/5 text-zinc-500 hover:border-zinc-700"
                                                        )}
                                                    >
                                                        Use "To Be Decided"
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {errors.venueId && <p className="text-rose-500 text-[10px] font-bold text-center mt-2">{errors.venueId}</p>}

                                    {/* Smart Conflict Alert System */}
                                    {(conflictStatus.type !== 'NONE' || checkingConflict) && (
                                        <div className={cn(
                                            "mt-8 p-6 rounded-[2rem] border flex items-center gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4",
                                            checkingConflict ? "bg-zinc-900/50 border-white/5 text-zinc-500" :
                                                conflictStatus.type === 'HARD' ? "bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]" :
                                                    "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                        )}>
                                            <div className={cn(
                                                "p-3 rounded-2xl",
                                                checkingConflict ? "bg-zinc-800" :
                                                    conflictStatus.type === 'HARD' ? "bg-rose-500/20" : "bg-amber-500/20"
                                            )}>
                                                {checkingConflict ? <Loader2 size={20} className="animate-spin" /> :
                                                    conflictStatus.type === 'HARD' ? <AlertCircle size={20} /> : <Zap size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">
                                                    {checkingConflict ? "Verifying Schedule..." :
                                                        conflictStatus.type === 'HARD' ? "Critical Conflict" : "Operational Advisory"}
                                                </h4>
                                                <p className="text-[11px] font-bold uppercase tracking-tight leading-relaxed">
                                                    {checkingConflict ? "Checking campus events for potential clashes..." : conflictStatus.message}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {conflictStatus.type === 'NONE' && formData.venueId && !checkingConflict && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 flex items-center justify-center gap-2 text-emerald-500 py-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10"
                                        >
                                            <CheckCircle2 size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">✅ Schedule is clear.</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-center block">Risk Evaluation</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {RISK_CARDS.map((card) => (
                                            <button
                                                key={card.id}
                                                type="button"
                                                onClick={() => updateFormData({ riskLevel: card.id })}
                                                className={cn(
                                                    "flex items-center gap-4 p-5 rounded-2xl border transition-all",
                                                    formData.riskLevel === card.id
                                                        ? `${card.borderColor} ${card.bgColor} text-white`
                                                        : "bg-white/5 border-white/5 text-zinc-500"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                    formData.riskLevel === card.id ? "bg-white text-black" : "bg-zinc-800 text-zinc-600"
                                                )}>
                                                    <card.icon size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-bold text-sm leading-tight">{card.label}</h3>
                                                    <p className="text-[10px] font-medium text-zinc-500 mt-0.5">{card.desc}</p>
                                                </div>
                                                {formData.riskLevel === card.id && <CheckCircle2 size={16} className="ml-auto text-cyan-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Projected Budget (INR)</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-zinc-700">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={formData.budgetRequired}
                                            onChange={e => updateFormData({ budgetRequired: e.target.value })}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xl font-bold focus:outline-none focus:border-cyan-500 transition-all placeholder:text-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <ReviewField label="Event Title" value={formData.title} tagline={formData.tagline} fullWidth />
                                    <ReviewField
                                        label="Organizing Body"
                                        value={formData.clubId === "none" ? "Department Level" : (clubs.find(c => c.id === formData.clubId)?.name || "—")}
                                        icon={formData.clubId === "none" ? <Building size={12} /> : <Users size={12} />}
                                    />
                                    <ReviewField
                                        label="Staging Venue"
                                        value={formData.venueId === "tbd-placeholder" ? "To Be Decided" : (venues.find(v => v.id === formData.venueId)?.name || "—")}
                                        icon={<MapPin size={12} />}
                                    />
                                    <ReviewField label="Commencement" value={formatDateTime(formData.startTime)} icon={<Clock size={12} />} />
                                    <ReviewField label="Conclusion" value={formatDateTime(formData.endTime)} icon={<Clock size={12} />} />
                                    <ReviewField label="Risk Tier" value={formData.riskLevel.toUpperCase()} icon={<ShieldCheck size={12} />} />
                                    <ReviewField label="Funds (Gross)" value={formatCurrency(Number(formData.budgetRequired))} icon={<DollarSign size={12} />} />
                                </div>

                                <div className="p-6 rounded-3xl bg-indigo-600 text-white shadow-xl relative overflow-hidden flex items-center gap-5">
                                    <div className="p-3 bg-white/10 rounded-2xl">
                                        <Send size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">Governance Ready</h4>
                                        <p className="text-white/60 text-[11px] font-medium leading-relaxed">
                                            Request will be evaluated within 48 hours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* 3. Refined Footer Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-zinc-950/70 backdrop-blur-2xl border border-white/5 rounded-3xl p-3 flex items-center justify-between shadow-2xl">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={step === 1 || isSubmitting}
                            className={cn(
                                "flex items-center gap-2 text-zinc-500 hover:text-white transition-all px-4",
                                step === 1 && "opacity-0 pointer-events-none"
                            )}
                        >
                            <ChevronLeft size={16} />
                            <span className="uppercase tracking-widest text-[9px] font-black">Back</span>
                        </Button>

                        <div className="hidden sm:block">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800">CampusBuzz Network</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={step < 4 ? handleNext : handleSubmit}
                                disabled={isSubmitting || (step === 2 && conflictStatus.type === 'HARD')}
                                className={cn(
                                    "h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale",
                                    step === 2 && conflictStatus.type === 'HARD' ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-white text-black hover:bg-cyan-400"
                                )}
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> :
                                    step < 4 ? <>Next Step <ArrowRight size={14} /></> : <>Dispatch <ArrowRight size={14} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReviewField({
    label,
    value,
    tagline,
    icon,
    fullWidth = false
}: {
    label: string;
    value: string;
    tagline?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div className={cn(
            "p-5 bg-zinc-900 border border-white/5 rounded-2xl flex flex-col justify-center space-y-2",
            fullWidth && "md:col-span-2"
        )}>
            <div className="flex items-center gap-2">
                <div className="text-cyan-500/50">{icon}</div>
                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest leading-none">{label}</p>
            </div>
            <div className="space-y-1">
                <p className={cn("font-bold text-white leading-tight", fullWidth ? "text-lg" : "text-sm")}>{value}</p>
                {tagline && <p className="text-[10px] text-cyan-500/60 font-medium italic leading-none">"{tagline}"</p>}
            </div>
        </div>
    );
}
