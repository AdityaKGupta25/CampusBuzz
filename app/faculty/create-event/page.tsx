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
    Timer,
    IndianRupee,
    Target,
    Layers,
    Trophy,
    Split,
    Info,
    User,
    Trash2,
    Plus,
    Search,
    Rocket,
    ShieldAlert
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
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
    eventSubtype: "standalone" | "hub" | "fest" | "tracks" | null;
    hasTracks: boolean;
    parentEventId: string;
    startTime: string;
    endTime: string;
    venueId: string;
    riskLevel: "low" | "medium" | "high";
    budgetRequired: string;
    regStartTime: string;
    regEndTime: string;
    institutionId: string;
    institutionName: string;
    participationTracks: { id: string; name: string; is_team: boolean }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: "The Basics", icon: FileText },
    { id: 2, label: "Core Team", icon: Users },
    { id: 3, label: "Time & Place", icon: Calendar },
    { id: 4, label: "Governance", icon: ShieldCheck },
    { id: 5, label: "Review", icon: Eye },
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

const ARCH_CARDS = [
    {
        id: "standalone",
        subtype: null,
        label: "Standalone Mission",
        desc: "For single-session events like Hacktons,Guest Lectures or Workshops.",
        icon: Target,
        features: ["Single Registration", "Direct Feedback", "Fast Approval"],
        type: "standalone"
    },
    {
        id: "hub",
        subtype: "hub",
        label: "Multi-Activity Hub",
        desc: "A series of events managed together (e.g., Tech Week). Not a Fest.",
        icon: Layers,
        features: ["Multi-Event Management", "Shared Analytics", "Unified Branding"],
        type: "umbrella"
    },
    {
        id: "fest",
        subtype: "fest",
        label: "Institutional Mega Fest",
        desc: "Large-scale cultural or tech festivals with multiple domains.",
        icon: Trophy,
        features: ["Full Nesting Support", "Domain Partitioning", "Prize Pools"],
        type: "umbrella"
    },
    {
        id: "tracks",
        subtype: "tracks",
        label: "Specialized Track Event",
        desc: "Single event with multiple participation modes (e.g., Solo vs Group).",
        icon: Split,
        features: ["Participation Tracks", "Custom Registration Forms", "Track Specific Rules"],
        type: "standalone"
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

    // Step 2: Core Team state
    const [coreTeamSearch, setCoreTeamSearch] = useState("");
    const [coreTeamResults, setCoreTeamResults] = useState<{ id: string; full_name: string; email: string; department?: string }[]>([]);
    const [coreTeamSearching, setCoreTeamSearching] = useState(false);
    const [assignedStaff, setAssignedStaff] = useState<{
        id: string;
        full_name: string;
        email: string;
        roleTitle: string;
        grantEditAccess: boolean;
        department?: string;
    }[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(null);
    const [coreTeamSkipped, setCoreTeamSkipped] = useState(false);

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
        eventSubtype: null,
        hasTracks: false,
        parentEventId: "",
        startTime: "",
        endTime: "",
        venueId: "",
        riskLevel: "low",
        budgetRequired: "",
        regStartTime: "",
        regEndTime: "",
        institutionId: "",
        institutionName: "",
        participationTracks: []
    });

    const [venueAvailability, setVenueAvailability] = useState<VenueAvailability>({});
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [conflictStatus, setConflictStatus] = useState<ConflictStatus>({ type: 'NONE', message: '' });
    const [checkingConflict, setCheckingConflict] = useState(false);

    useEffect(() => {
        async function loadWizardData() {
            try {
                const { userId, institutionId } = await getCurrentUserProfile();

                // Fetch Institution Name for UI
                const { data: instData } = await supabase
                    .from("institutions")
                    .select("name")
                    .eq("id", institutionId)
                    .single();

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

                updateFormData({
                    institutionId: institutionId || "",
                    institutionName: instData?.name || "Unknown Institution"
                });
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

    // ── Core Team Search ──
    const searchStudents = async (query: string) => {
        if (!query.trim() || query.trim().length < 2) { setCoreTeamResults([]); return; }
        setCoreTeamSearching(true);
        try {
            const { data, error } = await supabase
                .from("users")
                .select("id, full_name, email, departments(name)")
                .eq("institution_id", formData.institutionId)
                .eq("role", "student")
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(8);
            if (!error && data) {
                setCoreTeamResults(data.map((u: any) => ({ id: u.id, full_name: u.full_name, email: u.email, department: u.departments?.name })));
            }
        } catch (e) { console.error(e); }
        finally { setCoreTeamSearching(false); }
    };

    useEffect(() => {
        const debounce = setTimeout(() => searchStudents(coreTeamSearch), 350);
        return () => clearTimeout(debounce);
    }, [coreTeamSearch]);

    useEffect(() => {
        if (formData.startTime && formData.endTime && step === 3) {
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
        // Step 2 (Core Team) has no required validation — skip is allowed
        if (currentStep === 3) {
            const now = new Date();
            if (!formData.startTime) {
                newErrors.startTime = "Start time is required.";
            } else if (new Date(formData.startTime) < now) {
                newErrors.startTime = "Start time cannot be in the past.";
            }

            if (!formData.endTime) {
                newErrors.endTime = "End time is required.";
            } else if (formData.startTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
                newErrors.endTime = "End time must be after event start time.";
            }

            if (!formData.regStartTime) {
                newErrors.regStartTime = "Registration start is required.";
            }

            if (!formData.regEndTime) {
                newErrors.regEndTime = "Registration end is required.";
            } else {
                if (formData.regStartTime && new Date(formData.regEndTime) <= new Date(formData.regStartTime)) {
                    newErrors.regEndTime = "Registration must end after it starts.";
                }
                if (formData.startTime && new Date(formData.regEndTime) > new Date(formData.startTime)) {
                    newErrors.regEndTime = "Registration must close before the event starts.";
                }
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
        if (currentStep === 4) {
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
            setStep(s => Math.min(s + 1, 5));
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
                    status: "draft",
                    risk_level: formData.riskLevel,
                    budget_required: Number(formData.budgetRequired),
                    start_time: new Date(formData.startTime).toISOString(),
                    end_time: new Date(formData.endTime).toISOString(),
                    venue_id: formData.venueId === "tbd-placeholder" ? null : formData.venueId,
                    club_id: (formData.clubId === "none" || !formData.clubId) ? null : formData.clubId,
                    is_umbrella: formData.isUmbrella,
                    parent_event_id: formData.parentEventId || null,
                    event_type: formData.parentEventId ? "sub_event" : formData.eventType,
                    event_subtype: formData.eventSubtype,
                    has_tracks: formData.hasTracks,
                    reg_start_time: formData.regStartTime ? new Date(formData.regStartTime).toISOString() : null,
                    reg_end_time: formData.regEndTime ? new Date(formData.regEndTime).toISOString() : null,
                    participation_tracks: formData.participationTracks
                })
                .select("id")
                .single();

            if (error) throw error;

            // If staff were assigned in Step 2, add them to event_staff
            if (assignedStaff.length > 0 && data?.id) {
                const staffToInsert = assignedStaff.map(s => ({
                    event_id: data.id,
                    student_id: s.id,
                    institution_id: institutionId,
                    role: s.roleTitle,
                    role_name: s.roleTitle,
                    grant_edit_access: s.grantEditAccess,
                    assigned_at: new Date().toISOString()
                }));

                await supabase.from("event_staff").insert(staffToInsert);

                // Send in-app notifications
                const notifications = assignedStaff.map(s => ({
                    user_id: s.id,
                    title: s.grantEditAccess ? "🎯 Mission Assigned: Complete the Blueprint" : "🛡️ Core Team Assigned",
                    message: s.grantEditAccess 
                        ? `You've been assigned as ${s.roleTitle} for "${formData.title}". Open the Event Dashboard to fill in details.`
                        : `You've been assigned as ${s.roleTitle} for "${formData.title}".`,
                    type: "event_assigned",
                    related_event_id: data!.id,
                    is_read: false
                }));
                await supabase.from("notifications").insert(notifications);
            }

            router.push(`/faculty/event/${data.id}/manage`);
        } catch (err: any) {
            console.error("Submission error:", err);
            alert(err.message || "Failed to create event.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDispatch = async () => {
        setIsSubmitting(true);
        try {
            const { userId, departmentId, institutionId } = await getCurrentUserProfile();

            if (!institutionId) throw new Error("Institution security violation.");

            const { data, error } = await supabase
                .from("events")
                .insert({
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    creator_id: userId,
                    department_id: departmentId,
                    institution_id: institutionId,
                    status: "draft",
                    governance_note: "DISPATCHED_TO_CORE_TEAM",
                    risk_level: formData.riskLevel,
                    budget_required: Number(formData.budgetRequired) || 0,
                    start_time: formData.startTime ? new Date(formData.startTime).toISOString() : new Date(Date.now() + 86400000).toISOString(), // Default: Tomorrow
                    end_time: formData.endTime ? new Date(formData.endTime).toISOString() : new Date(Date.now() + 86400000 + 7200000).toISOString(), // Default: Tomorrow + 2h
                    venue_id: (formData.venueId && formData.venueId !== "tbd-placeholder") ? formData.venueId : null,
                    club_id: (formData.clubId === "none" || !formData.clubId) ? null : formData.clubId,
                    is_umbrella: formData.isUmbrella,
                    parent_event_id: formData.parentEventId || null,
                    event_type: formData.parentEventId ? "sub_event" : formData.eventType,
                    event_subtype: formData.eventSubtype,
                    has_tracks: formData.hasTracks,
                    reg_start_time: formData.regStartTime ? new Date(formData.regStartTime).toISOString() : new Date(Date.now() + 43200000).toISOString(), // Default: 12h from now
                    reg_end_time: formData.regEndTime ? new Date(formData.regEndTime).toISOString() : new Date(Date.now() + 86400000).toISOString(), // Default: Tomorrow
                    participation_tracks: formData.participationTracks
                })
                .select("id")
                .single();

            if (error) throw error;

            if (assignedStaff.length > 0) {
                const staffToInsert = assignedStaff.map(s => ({
                    event_id: data.id,
                    student_id: s.id,
                    institution_id: institutionId,
                    role: s.roleTitle,
                    role_name: s.roleTitle,
                    grant_edit_access: s.grantEditAccess,
                    assigned_at: new Date().toISOString()
                }));

                await supabase.from("event_staff").insert(staffToInsert);

                const notifications = assignedStaff.map(s => ({
                    user_id: s.id,
                    title: "🎯 Mission Assigned: Complete the Blueprint",
                    message: `You've been assigned as ${s.roleTitle} for "${formData.title}". Open the Event Dashboard to fill in details.`,
                    type: "event_assigned",
                    related_event_id: data.id,
                    is_read: false
                }));
                await supabase.from("notifications").insert(notifications);
            }

            setNewlyCreatedEventId(data.id);
            setShowSuccess(true);
        } catch (err: any) {
            alert(err.message);
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
        <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-[#09090b] text-white selection:bg-cyan-500/30 font-sans flex flex-col">
            {/* 1. Header Navigation */}
            <div className="max-w-3xl mx-auto px-6 pt-10 pb-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
                            <Sparkles className="text-cyan-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500/80">Step {step} of 5</h1>
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
            <main className="max-w-3xl mx-auto px-6 pb-20 pt-4 flex-1 w-full">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-xl shadow-2xl backdrop-blur-xl"
                    >
                        {step === 1 && (
                            <div className="space-y-8">
                                {/* Institutional Guardrail Badge */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/80">Institution Linked</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building size={12} className="text-zinc-500" />
                                        <span className="text-xs font-bold text-zinc-300">{formData.institutionName}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Event Name</label>
                                    <Input
                                        placeholder="Give your event a bold name..."
                                        value={formData.title}
                                        onChange={e => updateFormData({ title: e.target.value })}
                                        error={errors.title}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Tagline</label>
                                    <Input
                                        type="text"
                                        placeholder="A short punchy catchphrase..."
                                        value={formData.tagline}
                                        onChange={e => updateFormData({ tagline: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Event Description</label>
                                    <Textarea
                                        placeholder="Describe the event goals and details..."
                                        rows={4}
                                        value={formData.description}
                                        onChange={e => updateFormData({ description: e.target.value })}
                                        error={errors.description}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Organizing Club</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {/* "None" Option for Department Level Events */}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData({ clubId: "none" })}
                                            className={cn(
                                                "p-4 rounded-xl border text-left transition-all relative flex items-center gap-3",
                                                formData.clubId === "none"
                                                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-950/80"
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
                                                    "p-4 rounded-xl border text-left transition-all relative flex items-center gap-3",
                                                    formData.clubId === c.id
                                                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-950/80"
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
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Event Architecture</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {ARCH_CARDS.map((card) => {
                                            const actuallySelected = card.id === 'standalone' 
                                                ? (formData.eventType === 'standalone' && formData.eventSubtype === null && !formData.hasTracks)
                                                : card.id === 'tracks'
                                                ? (formData.eventType === 'standalone' && formData.eventSubtype === 'tracks')
                                                : (formData.eventType === card.type && formData.eventSubtype === card.subtype);

                                            return (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    onClick={() => {
                                                        updateFormData({
                                                            eventType: card.type as any,
                                                            eventSubtype: card.subtype as any,
                                                            isUmbrella: card.type === "umbrella",
                                                            hasTracks: card.id === "tracks",
                                                            participationTracks: card.id === "tracks" ? [{ id: crypto.randomUUID(), name: "Main Track", is_team: false }] : []
                                                        });
                                                    }}
                                                    className={cn(
                                                        "p-5 rounded-xl border text-left transition-all relative group flex flex-col gap-4",
                                                        actuallySelected
                                                            ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500"
                                                            : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900/50"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                                            actuallySelected ? "bg-cyan-500 text-black" : "bg-zinc-900 text-zinc-400 group-hover:text-zinc-200"
                                                        )}>
                                                            <card.icon size={24} />
                                                        </div>
                                                        {actuallySelected && (
                                                            <div className="bg-cyan-500 rounded-full p-1">
                                                                <CheckCircle2 size={12} className="text-black" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div>
                                                        <h3 className={cn(
                                                            "font-bold text-sm mb-1",
                                                            actuallySelected ? "text-white" : "text-zinc-300"
                                                        )}>{card.label}</h3>
                                                        <p className="text-[10px] leading-relaxed text-zinc-500">{card.desc}</p>
                                                    </div>

                                                    {actuallySelected && (
                                                        <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-500/80">What you get:</p>
                                                            <ul className="space-y-1">
                                                                {card.features.map((f, i) => (
                                                                    <li key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                                                                        <span className="w-1 h-1 rounded-full bg-cyan-500" />
                                                                        {f}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Parent Fest Selection (Only if standalone/tracks and umbrella events exist) */}
                                    {formData.eventType === "standalone" && umbrellaEvents.length > 0 && (
                                        <div className="p-6 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles size={14} className="text-blue-400" />
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Part of a Larger Fest?</p>
                                            </div>
                                            <Select
                                                value={formData.parentEventId}
                                                onChange={e => updateFormData({ parentEventId: e.target.value })}
                                                options={[
                                                    { value: "", label: "Standalone Event (No Parent)" },
                                                    ...umbrellaEvents.map(fest => ({ value: fest.id, label: fest.title }))
                                                ]}
                                            />
                                            <p className="text-[9px] text-zinc-600 font-medium italic">Selecting a parent fest allows this event to be categorized under the fest dashboard.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="text-center space-y-2 pb-4 border-b border-white/5">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                                        <Users size={28} />
                                    </div>
                                    <h2 className="text-lg font-black text-white tracking-tight">Assign Core Team</h2>
                                    <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                                        Delegate the event blueprint to a trusted student. They'll get full editing rights and a notification to complete the mission details.
                                    </p>
                                </div>

                                {assignedStaff.length > 0 && (
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Selected Delegates ({assignedStaff.length})</p>
                                        </div>
                                        <div className="space-y-3">
                                            {assignedStaff.map((staff) => (
                                                <motion.div
                                                    key={staff.id}
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-4 relative group/card"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-black shrink-0 shadow-inner">
                                                            {staff.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{staff.full_name}</p>
                                                            <p className="text-[10px] text-zinc-500 truncate">{staff.email}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssignedStaff(prev => prev.filter(s => s.id !== staff.id))}
                                                            className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all shadow-sm"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Role Title</label>
                                                            <input
                                                                type="text"
                                                                value={staff.roleTitle}
                                                                onChange={(e) => {
                                                                    setAssignedStaff(prev => prev.map(s => s.id === staff.id ? { ...s, roleTitle: e.target.value } : s));
                                                                }}
                                                                placeholder="e.g. Organizer, Lead"
                                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500/40 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Edit Access</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAssignedStaff(prev => prev.map(s => s.id === staff.id ? { ...s, grantEditAccess: !s.grantEditAccess } : s));
                                                                }}
                                                                className={cn(
                                                                    "w-full h-[38px] rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                                    staff.grantEditAccess 
                                                                        ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                                                                        : "bg-zinc-950 border-zinc-800 text-zinc-600"
                                                                )}
                                                            >
                                                                {staff.grantEditAccess ? <ShieldCheck size={11} /> : <Shield size={11} />}
                                                                {staff.grantEditAccess ? "Editor Rights" : "View Only"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                                            {coreTeamSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search and add students..."
                                            value={coreTeamSearch}
                                            onChange={e => setCoreTeamSearch(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                                        />
                                    </div>

                                    {/* Search Results */}
                                    <AnimatePresence>
                                        {coreTeamResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="space-y-2 mt-2"
                                            >
                                                {coreTeamResults
                                                    .filter(r => !assignedStaff.some(s => s.id === r.id))
                                                    .map((student) => (
                                                    <motion.button
                                                        key={student.id}
                                                        type="button"
                                                        layout
                                                        onClick={() => {
                                                            setAssignedStaff(prev => [...prev, { 
                                                                ...student, 
                                                                roleTitle: "Overall Host", 
                                                                grantEditAccess: true 
                                                            }]);
                                                            setCoreTeamSearch("");
                                                            setCoreTeamResults([]);
                                                            setCoreTeamSkipped(false);
                                                        }}
                                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left group shadow-lg"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-black group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-all shrink-0">
                                                            {student.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{student.full_name}</p>
                                                            <p className="text-[10px] text-zinc-500 truncate">{student.email}</p>
                                                            {student.department && <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">{student.department}</p>}
                                                        </div>
                                                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest">
                                                                <Plus size={10} /> Add to Team
                                                            </div>
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {coreTeamSearch.length > 1 && coreTeamResults.length === 0 && !coreTeamSearching && (
                                        <p className="text-center text-[11px] text-zinc-600 font-medium py-4">No students found. Try a different name or email.</p>
                                    )}
                                </div>

                                {/* What happens note */}
                                {assignedStaff.length === 0 && (
                                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3">
                                        <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                                            Assigned students will receive an immediate notification to <span className="text-indigo-400 font-bold">"Complete the Mission Blueprint"</span> and will have editing access to fill in event details.
                                        </p>
                                    </div>
                                )}

                                {/* Skip Option */}
                                {assignedStaff.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={() => { setCoreTeamSkipped(true); handleNext(); }}
                                        className={cn(
                                            "w-full py-3.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all",
                                            coreTeamSkipped
                                                ? "bg-zinc-900 border-zinc-700 text-zinc-400"
                                                : "bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                                        )}
                                    >
                                        I will fill in the details myself →
                                    </button>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Start Time</label>
                                        <Input
                                            type="datetime-local"
                                            value={formData.startTime}
                                            onChange={e => updateFormData({ startTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">End Time</label>
                                        <Input
                                            type="datetime-local"
                                            value={formData.endTime}
                                            onChange={e => updateFormData({ endTime: e.target.value })}
                                            error={errors.endTime}
                                        />
                                    </div>
                                </div>

                                {/* Registration Window Section */}
                                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Timer size={14} className="text-cyan-400" />
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Registration Window</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Registration Opens</label>
                                            <Input
                                                type="datetime-local"
                                                value={formData.regStartTime}
                                                onChange={e => updateFormData({ regStartTime: e.target.value })}
                                                error={errors.regStartTime}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Registration Closes</label>
                                            <Input
                                                type="datetime-local"
                                                value={formData.regEndTime}
                                                onChange={e => updateFormData({ regEndTime: e.target.value })}
                                                error={errors.regEndTime}
                                            />
                                            <p className="text-[9px] text-zinc-600 font-medium italic ml-1">Must be before event start time</p>
                                        </div>
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
                                                            "p-5 rounded-xl border text-left transition-all relative",
                                                            isSelected
                                                                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                                                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700",
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
                                                <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950/50 text-center space-y-4">
                                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                                                        <MapPin size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">No campus venues found</p>
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Please contact Admin to add venues.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormData({ venueId: "tbd-placeholder" })}
                                                        className={cn(
                                                            "px-6 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all",
                                                            formData.venueId === "tbd-placeholder"
                                                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                                                                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                                        )}
                                                    >
                                                        Online / Remote Platform
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {errors.venueId && <p className="text-rose-500 text-[10px] font-bold text-center mt-2">{errors.venueId}</p>}

                                    {/* Smart Conflict Alert System */}
                                    {(conflictStatus.type !== 'NONE' || checkingConflict) && (
                                        <div className={cn(
                                            "mt-8 p-6 rounded-xl border flex items-center gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4",
                                            checkingConflict ? "bg-zinc-950 border-zinc-800 text-zinc-500" :
                                                conflictStatus.type === 'HARD' ? "bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]" :
                                                    "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                        )}>
                                            <div className={cn(
                                                "p-3 rounded-xl",
                                                checkingConflict ? "bg-zinc-900" :
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
                                            className="mt-6 flex items-center justify-center gap-2 text-emerald-500 py-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10"
                                        >
                                            <CheckCircle2 size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">✅ Schedule is clear.</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 4 && (
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
                                                    "flex items-center gap-4 p-5 rounded-xl border transition-all",
                                                    formData.riskLevel === card.id
                                                        ? `${card.borderColor} ${card.bgColor} text-white`
                                                        : "bg-zinc-950 border-zinc-800 text-zinc-500"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
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
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.budgetRequired}
                                        onChange={e => updateFormData({ budgetRequired: e.target.value })}
                                        leftIcon={<span className="text-xl font-bold text-zinc-700">₹</span>}
                                        className="text-xl font-bold h-16"
                                    />
                                </div>

                                {formData.hasTracks && (
                                    <div className="pt-8 border-t border-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Layers size={14} className="text-cyan-400" />
                                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">Participation Tracks</p>
                                            </div>
                                            <div className="group relative">
                                                <Info size={14} className="text-zinc-500 cursor-help hover:text-cyan-400" />
                                                <div className="absolute right-0 bottom-full mb-3 w-64 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 transform translate-y-2 group-hover:translate-y-0">
                                                    <p className="text-[10px] font-bold text-white leading-relaxed">
                                                        Students will choose <span className="text-cyan-400">ONE</span> of these tracks during registration. Use this for events like Dance (Solo vs Group).
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Presets */}
                                        <div className="flex items-center gap-2">
                                            {[
                                                { label: "Solo", icon: User, team: false, color: "hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-400" },
                                                { label: "Team", icon: Users, team: true, color: "hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400" },
                                                { label: "Duet", icon: Users, team: true, color: "hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-400" }
                                            ].map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        const newTracks = [...formData.participationTracks, { id: crypto.randomUUID(), name: `${preset.label} Track`, is_team: preset.team }];
                                                        updateFormData({ participationTracks: newTracks });
                                                    }}
                                                    className={cn(
                                                        "flex-1 py-3 rounded-xl bg-zinc-950 border border-zinc-900 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-all flex items-center justify-center gap-2",
                                                        preset.color
                                                    )}
                                                >
                                                    <preset.icon size={12} /> Add {preset.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {formData.participationTracks.map((track, idx) => (
                                                <div key={track.id} className="p-4 bg-zinc-950 border border-white/5 rounded-2xl group/track transition-all hover:border-white/10 relative">
                                                    <div className="flex items-start justify-between gap-4 mb-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                                                            track.is_team ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
                                                        )}>
                                                            {track.is_team ? <Users size={18} /> : <User size={18} />}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTracks = formData.participationTracks.filter((_, i) => i !== idx);
                                                                updateFormData({ participationTracks: newTracks });
                                                            }}
                                                            className="w-8 h-8 rounded-lg bg-rose-500/5 flex items-center justify-center text-rose-500 opacity-0 group-hover/track:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        <input
                                                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                                                            value={track.name}
                                                            onChange={(e) => {
                                                                const newTracks = [...formData.participationTracks];
                                                                newTracks[idx] = { ...newTracks[idx], name: e.target.value };
                                                                updateFormData({ participationTracks: newTracks });
                                                            }}
                                                            placeholder="Track Name..."
                                                        />
                                                        <div className="flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newTracks = [...formData.participationTracks];
                                                                    newTracks[idx] = { ...newTracks[idx], is_team: !newTracks[idx].is_team };
                                                                    updateFormData({ participationTracks: newTracks });
                                                                }}
                                                                className={cn(
                                                                    "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all shadow-sm",
                                                                    track.is_team ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                                                                )}
                                                            >
                                                                {track.is_team ? "Team Required" : "Solo Entry"}
                                                            </button>
                                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">Track #{idx + 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newTracks = [...formData.participationTracks, { id: crypto.randomUUID(), name: "", is_team: false }];
                                                updateFormData({ participationTracks: newTracks });
                                            }}
                                            className="w-full h-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
                                        >
                                            <Plus size={14} /> New Custom Track
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <ReviewField 
                                        label="Architecture" 
                                        value={ARCH_CARDS.find(c => 
                                            c.id === (formData.hasTracks ? "tracks" : 
                                                     (formData.eventType === "umbrella" ? (formData.eventSubtype || "hub") : "standalone"))
                                        )?.label || "Standalone Mission"} 
                                        icon={<Layers size={12} />}
                                    />
                                    <ReviewField label="Event Title" value={formData.title} tagline={formData.tagline} />
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
                                    <ReviewField label="Reg. Window" value={`${formatDateTime(formData.regStartTime)} — ${formatDateTime(formData.regEndTime)}`} icon={<Timer size={12} />} fullWidth />
                                    <ReviewField label="Risk Tier" value={formData.riskLevel.toUpperCase()} icon={<ShieldCheck size={12} />} />
                                    <ReviewField label="Funds (Gross)" value={formatCurrency(Number(formData.budgetRequired))} icon={<IndianRupee size={12} />} />
                                </div>

                                <div className="p-6 rounded-xl bg-indigo-600 text-white shadow-xl relative overflow-hidden flex items-center gap-5">
                                    <div className="p-3 bg-white/10 rounded-lg">
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

            {/* 3. Refined Footer Bar (Flow integrated) */}
            <div className="max-w-3xl mx-auto px-6 pb-20 w-full mt-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-2xl">
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
                        {step === 2 && assignedStaff.some(s => s.grantEditAccess) ? (
                            <button
                                onClick={handleDispatch}
                                disabled={isSubmitting}
                                className="h-12 px-10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                                🚀 Dispatch to Core Team
                            </button>
                        ) : (
                            <button
                                onClick={step < 5 ? handleNext : handleSubmit}
                                disabled={isSubmitting || (step === 3 && conflictStatus.type === 'HARD')}
                                className={cn(
                                    "h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale",
                                    step === 3 && conflictStatus.type === 'HARD' ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-white text-black hover:bg-cyan-400"
                                )}
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> :
                                    step < 5 ? <>Next Step <ArrowRight size={14} /></> : <>Publish Event <ArrowRight size={14} /></>}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[3rem] p-12 text-center space-y-8 shadow-3xl overflow-hidden relative"
                        >
                            <div className="relative z-10">
                                <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-8 relative">
                                    <Rocket size={40} />
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl"
                                    />
                                </div>
                                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Mission Dispatched</h2>
                                <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-xs mx-auto mt-4">
                                    The event blueprint has been successfully delegated to your core team. They have been notified to finalize the tactical details.
                                </p>
                                <div className="pt-10 flex flex-col gap-3">
                                    <button
                                        onClick={() => router.push(`/faculty/event/${newlyCreatedEventId}/manage`)}
                                        className="h-14 px-8 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-xl"
                                    >
                                        Go to Management Dashboard
                                    </button>
                                    <button
                                        onClick={() => router.push('/faculty/dashboard')}
                                        className="h-14 px-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all underline underline-offset-4 decoration-zinc-800"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            </div>
                            
                            <div className="absolute top-0 right-0 opacity-[0.03] text-indigo-500 -translate-y-1/2 translate-x-1/4 pointer-events-none">
                                <Rocket size={400} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
            "p-5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col justify-center space-y-2",
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
