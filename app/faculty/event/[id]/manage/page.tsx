"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

import {
    LayoutDashboard,
    Layers,
    ClipboardCheck,
    Trophy,
    Settings,
    ChevronLeft,
    Save,
    Plus,
    Clock,
    Trash2,
    Shield,
    DollarSign,
    Zap,
    CheckCircle2,
    Send,
    Loader2,
    Image as ImageIcon,
    FileText as FileIcon,
    Github as GithubIcon,
    Linkedin as LinkedinIcon,
    ScrollText,
    User,
    Type,
    Eye,
    ArrowRight,
    MapPin,
    Users,
    Calendar,
    AlertCircle,
    X,
    GripVertical,
    Check,
    Edit3,
    MoreVertical,
    Link as LinkIcon,
    Medal,
    Award,
    IndianRupee,
    HelpCircle,
    Handshake,
    ExternalLink,
    ChevronDown,
    Globe,
    Star,
    ChevronUp,
    FileText,
    MessageSquare,
    MessageCircle,
    Github,
    Sparkles,
    Briefcase,
    Search,
    ShieldCheck,
    Ticket,
    Shirt,
    Gift,
    UploadCloud,
    Monitor,
    Timer,
    Upload,
    Cloud,
    Mic,
    Video,
    AlertTriangle,
    Box,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { SubmissionsTab, type Submission } from "@/components/faculty/SubmissionsTab";
import { ReportsTab } from "@/components/faculty/ReportsTab";
import { ResultsTab } from "@/components/faculty/ResultsTab";
import { FileBarChart, CheckSquare } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { StudentEventView } from "@/app/student/event/[id]/page";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

// ─── Types ──────────────────────────────────────────────────────────────────

interface Round {
    id: string;
    event_id: string;
    title: string;
    type: string;
    phase?: string; // Screening, Audition, Qualifier, Semi-Final, Finale, Other
    start_time: string;
    end_time: string;
    description: string;
    round_number: number;
    requires_submission?: boolean;
}

interface Prize {
    id?: string;
    event_id: string;
    title: string;
    value: number;
    reward: string;
    goodie?: string;
    icon: string;
    position: number;
    winner_id?: string | null;
    winner_team_id?: string | null;
    rank?: string;
    category?: string;
    is_perk?: boolean;
}

interface RegistrationField {
    id: string;
    label: string;
    type: "text" | "number" | "select";
    required: boolean;
    options?: string[];
}

interface PrizeConfig {
    id: string;
    rank: number;
    label: string;
    reward: string;
}

interface RegistrationConfig {
    collect_resume: boolean;
    collect_github: boolean;
    collect_linkedin: boolean;
    team_participation: boolean;
    team_min_size: number;
    team_max_size: number;
}

interface FAQ {
    id: string;
    question: string;
    answer: string;
}

interface Sponsor {
    id: string;
    name: string;
    logo_url: string;
    tier: string;
    website_url?: string;
}

interface ResourceLink {
    id: string;
    label: string;
    url: string;
    icon: "link" | "discord" | "whatsapp" | "github" | "telegram";
}

interface EventData {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    rich_description: string;
    banner_url: string | null;
    budget_required: number;
    risk_level: string;
    status: string;
    start_time: string;
    end_time: string;
    venue_id: string | null;
    club_id: string | null;
    registration_schema: RegistrationField[];
    prizes_config: PrizeConfig[];
    registration_config: RegistrationConfig;
    faqs: FAQ[];
    sponsors: Sponsor[];
    resource_links: ResourceLink[];
    is_competition?: boolean;
    is_public?: boolean;
    is_umbrella: boolean;
    event_type: string;
    parent_event_id: string | null;
    participation_tracks?: { id: string; name: string; is_team: boolean }[];
    rulebook_url?: string | null;
    governance_note?: string | null;
    rejection_reason?: string | null;
    reg_start_time?: string | null;
    reg_end_time?: string | null;
}

interface ConflictStatus {
    type: 'HARD' | 'SOFT' | 'NONE';
    message: string;
    conflictingEvent?: string;
    venueName?: string;
}

interface VenueAvailability {
    [key: string]: {
        isBooked: boolean;
        eventName?: string;
    };
}

interface FestDomain {
    id: string;
    name: string;
    description: string;
}

interface Venue {
    id: string;
    name: string;
    capacity: number;
}

interface Club {
    id: string;
    name: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

function EventManageDashboardInner() {
    const { user } = useUser();
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") || "overview";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingRulebook, setUploadingRulebook] = useState(false);
    const [event, setEvent] = useState<EventData | null>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [subEventsState, setSubEventsState] = useState<any[]>([]);
    const [festDomains, setFestDomains] = useState<FestDomain[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [selectedSubmissionRoundId, setSelectedSubmissionRoundId] = useState<string | null>(null);
    const [eventStaff, setEventStaff] = useState<any[]>([]);
    const [isStaffStudent, setIsStaffStudent] = useState(false);
    const [canStudentEdit, setCanStudentEdit] = useState(false);


    // Smart Conflict States
    const [conflictStatus, setConflictStatus] = useState<ConflictStatus>({ type: 'NONE', message: '' });
    const [checkingConflict, setCheckingConflict] = useState(false);
    const [venueAvailability, setVenueAvailability] = useState<VenueAvailability>({});

    const isArchived = event?.status === "archived";
    const isLocked = event?.status === "completed" || isArchived;
    const isReadOnly = isLocked || (isStaffStudent && ['review_pending', 'pending', 'approved', 'live', 'completed', 'archived'].includes(event?.status || ''));

    // ── Staff Access Guard ──
    const [userStaffRecord, setUserStaffRecord] = useState<any>(null);
    useEffect(() => {
        if (eventStaff && user) {
            const currentUserId = (user as any)?.dbId || (user as any)?.id;
            const staffRec = eventStaff.find((s: any) => s.student?.id === currentUserId);
            setUserStaffRecord(staffRec);
        }
    }, [eventStaff, user]);

    // Round Modal State
    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
    const [editingRound, setEditingRound] = useState<Round | null>(null);

    // Prize Modal State
    const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
    const [editingPrize, setEditingPrize] = useState<Prize | null>(null);

    // Publish state
    const [publishing, setPublishing] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionFeedback, setRevisionFeedback] = useState("");
    const [parentSponsors, setParentSponsors] = useState<Sponsor[]>([]);

    // Wire up the publish modal to custom events (for SettingsTab access)
    useEffect(() => {
        const handleTrigger = () => setShowPublishConfirm(true);
        window.addEventListener('trigger-publish-modal', handleTrigger);
        return () => window.removeEventListener('trigger-publish-modal', handleTrigger);
    }, []);

    // ── Data Fetching ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.institution_id) {
            if (user !== null) setLoading(false);
            return;
        }
        const institutionId = user.institution_id;

        async function fetchData() {
            setLoading(true);
            try {
                // Phase 1: Fetch event itself — strictly scoped
                const { data: eventData, error: eventErr } = await supabase
                    .from("events")
                    .select("*, governance_note, rejection_reason")
                    .eq("id", eventId)
                    .eq("institution_id", institutionId)
                    .single();
                if (eventErr || !eventData) throw eventErr || new Error("Event not found in your institution context.");

                const isUmbrella = eventData.event_type === "umbrella";

                // Phase 2: If umbrella, get sub-event IDs — strictly scoped
                let subEventIds: string[] = [];
                if (isUmbrella) {
                    const { data: subData } = await supabase
                        .from("events")
                        .select("id")
                        .eq("parent_event_id", eventId)
                        .eq("institution_id", institutionId);
                    subEventIds = subData?.map(s => s.id) || [];
                }

                const allRelevantIds = [eventId, ...subEventIds];

                // Phase 3: Parallel fetch everything else — all strictly joins or scoped
                const [roundsRes, prizesRes, venuesRes, clubsRes, regsRes, subEventsRes, festDomainsRes, staffRes] = await Promise.all([
                    supabase.from("event_rounds").select("*, event:events!inner(institution_id)").eq("event_id", eventId).eq("event.institution_id", institutionId).order("round_number"),
                    supabase.from("event_prizes").select("*, event:events!inner(institution_id)").eq("event_id", eventId).eq("event.institution_id", institutionId).order("position"),
                    supabase.from("venues").select("id, name, capacity").eq("is_active", true),
                    supabase.from("clubs").select("id, name").eq("institution_id", institutionId),
                    supabase.from("registrations").select("*, student:users(full_name, email, department:departments(name)), event:events!inner(institution_id)").in("event_id", allRelevantIds).eq("event.institution_id", institutionId),
                    supabase.from("events").select("id, title, status, start_time, end_time, registered_count, attended_count, fest_domain_id, fest_category, club_id").eq("parent_event_id", eventId).eq("institution_id", institutionId).order("start_time"),
                    supabase.from("fest_domains").select("*").eq("umbrella_event_id", eventId).order("created_at"),
                    supabase.from("event_staff").select("*, student:student_id(id, full_name, email, role, department:departments(name))").eq("event_id", eventId).order("assigned_at", { ascending: false })
                ]);

                // Phase 4: State updates
                const currentUserId = (user as any)?.dbId || (user as any)?.id;
                const userStaffRecord = staffRes.data?.find(s => 
                    s.student_id === currentUserId || 
                    s.student?.id === currentUserId
                );
                
                const isStudent = user?.role === 'student';
                const isCreator = eventData.creator_id === currentUserId;

                // Students must be either the creator or staff with edit access
                if (isStudent && !isCreator && !userStaffRecord?.grant_edit_access) {
                    throw new Error("Access Denied: You do not have delegate editing credentials for this mission. Please contact the Faculty In-Charge.");
                }

                setIsStaffStudent(isStudent);
                setCanStudentEdit(isCreator || !!userStaffRecord?.grant_edit_access);

                setEvent({
                    ...eventData,
                    registration_schema: eventData.registration_schema || [],
                    prizes_config: eventData.prizes_config || [],
                    registration_config: eventData.registration_config || {
                        collect_resume: false,
                        collect_github: false,
                        collect_linkedin: false,
                        team_participation: false,
                        team_min_size: 1,
                        team_max_size: 4,
                    },
                    faqs: eventData.faqs || [],
                    sponsors: eventData.sponsors || [],
                    resource_links: eventData.resource_links || [],
                });

                let firstDigitalId: string | null = null;
                if (roundsRes.data) {
                    setRounds(roundsRes.data as any[]);
                    const firstDigital = roundsRes.data.find(r => r.type === "DIGITAL_SUBMISSION" || r.type === "submission");
                    if (firstDigital) {
                        firstDigitalId = firstDigital.id;
                        setSelectedSubmissionRoundId(firstDigitalId);
                    }
                }
                if (prizesRes.data) setPrizes(prizesRes.data as any[]);
                if (venuesRes.data) setVenues(venuesRes.data);
                if (clubsRes.data) setClubs(clubsRes.data);
                if (regsRes.data) setRegistrations(regsRes.data);
                if (subEventsRes.data) setSubEventsState(subEventsRes.data);
                if (festDomainsRes.data) setFestDomains(festDomainsRes.data);
                if (staffRes.data) setEventStaff(staffRes.data);

                // Initial submissions fetch if no round is selected (fallback)
                if (!firstDigitalId) {
                    const { data: allSubs } = await supabase
                        .from("submissions")
                        .select("id, event_id, student_id, round_id, team_id, project_link, title, description, file_url, submission_time, score, feedback, status, student:users!student_id(full_name, email), team:teams!team_id(name), event:events!inner(institution_id)")
                        .in("event_id", allRelevantIds)
                        .eq("event.institution_id", institutionId)
                        .order("submission_time", { ascending: false });
                    if (allSubs) setSubmissions(allSubs as any);
                }

                // Phase 5: Fetch parent sponsors if sub-event
                if (eventData.parent_event_id) {
                    const { data: parentData } = await supabase.from("events").select("sponsors").eq("id", eventData.parent_event_id).eq("institution_id", institutionId).single();
                    if (parentData?.sponsors) {
                        setParentSponsors(parentData.sponsors);
                    }
                }
            } catch (err: any) {
                console.error("Fetch error:", err);
                showMessage(err.message || "Failed to load event cluster data", "error");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [eventId, user?.institution_id]);

    // Refetch submissions when round changes
    useEffect(() => {
        if (!selectedSubmissionRoundId || !user?.institution_id) return;

        async function fetchRoundSubmissions() {
            setSaving(true);
            const { data } = await supabase
                .from("submissions")
                .select("id, event_id, student_id, round_id, team_id, project_link, title, description, file_url, submission_time, score, feedback, status, student:users!student_id(full_name, email), team:teams!team_id(name), event:events!inner(institution_id)")
                .eq("round_id", selectedSubmissionRoundId)
                .eq("event.institution_id", user?.institution_id || "")
                .order("submission_time", { ascending: false });

            if (data) setSubmissions(data as any);
            setSaving(false);
        }

        fetchRoundSubmissions();
    }, [selectedSubmissionRoundId, user?.institution_id]);

    // ── Smart Conflict Detection ─────────────────────────────────────────────
    const check_smart_conflict = React.useCallback(async () => {
        if (!event?.start_time || !event?.end_time || !user?.institution_id) return;

        setCheckingConflict(true);
        try {
            const startISO = new Date(event.start_time).toISOString();
            const endISO = new Date(event.end_time).toISOString();

            // Fetch ALL overlapping events at this institution to determine availability & conflicts
            const { data: overlapping, error } = await supabase
                .from("events")
                .select("id, title, venue_id, start_time, end_time")
                .eq("institution_id", user.institution_id)
                .in("status", ["approved", "live"])
                .neq("id", eventId) // CRITICAL: Exclude self
                .or(`and(start_time.lte.${endISO},end_time.gte.${startISO})`);

            if (error) throw error;

            // 1. Update Venue Availability
            const availability: VenueAvailability = {};
            overlapping?.forEach(ov => {
                if (ov.venue_id) {
                    availability[ov.venue_id] = {
                        isBooked: true,
                        eventName: ov.title
                    };
                }
            });
            setVenueAvailability(availability);

            // 2. Determine Conflict Status for CURRENT Selection
            if (!event.venue_id) {
                // If there's ANY event on campus but not in the same venue, it's a soft conflict
                if (overlapping && overlapping.length > 0) {
                    const firstOther = overlapping[0];
                    setConflictStatus({
                        type: 'SOFT',
                        message: `⚠️ CROWD ALERT: ${firstOther.title} is also happening on campus. Attendance might be affected.`,
                        conflictingEvent: firstOther.title
                    });
                } else {
                    setConflictStatus({ type: 'NONE', message: '✅ Schedule is clear.' });
                }
                return;
            }

            const hardConflict = overlapping?.find(ov => ov.venue_id === event.venue_id);
            if (hardConflict) {
                const venueName = venues.find(v => v.id === event.venue_id)?.name || "selected venue";
                setConflictStatus({
                    type: 'HARD',
                    message: `🚫 VENUE UNAVAILABLE: This hall is already booked for ${hardConflict.title}.`,
                    conflictingEvent: hardConflict.title,
                    venueName: venueName
                });
                return;
            }

            const softConflict = overlapping?.find(ov => ov.venue_id !== event.venue_id);
            if (softConflict) {
                setConflictStatus({
                    type: 'SOFT',
                    message: `⚠️ CROWD ALERT: ${softConflict.title} is also happening on campus. Attendance might be affected.`,
                    conflictingEvent: softConflict.title
                });
                return;
            }

            setConflictStatus({ type: 'NONE', message: '✅ Schedule is clear.' });
        } catch (err) {
            console.error("Smart conflict check failed:", err);
        } finally {
            setCheckingConflict(false);
        }
    }, [event?.start_time, event?.end_time, event?.venue_id, user?.institution_id, venues, eventId]);

    useEffect(() => {
        if (activeTab === "settings" && event?.start_time && event?.end_time) {
            void check_smart_conflict();
        }
    }, [event?.start_time, event?.end_time, event?.venue_id, activeTab, check_smart_conflict]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const showMessage = (msg: string, type: "success" | "error" = "success") => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSaveAll = async () => {
        if (!event) return;
        if (conflictStatus.type === 'HARD') {
            showMessage("Action Blocked: Venue conflict detected. Resolve the schedule clash before saving.", "error");
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase
                .from("events")
                .update({
                    title: event.title,
                    description: event.description,
                    rich_description: event.rich_description,
                    banner_url: event.banner_url,
                    budget_required: event.budget_required,
                    risk_level: event.risk_level,
                    start_time: event.start_time,
                    end_time: event.end_time,
                    venue_id: event.venue_id === "tbd-placeholder" ? null : event.venue_id,
                    club_id: (event.club_id === "none" || !event.club_id) ? null : event.club_id,
                    registration_schema: event.registration_schema,
                    prizes_config: event.prizes_config,
                    registration_config: event.registration_config,
                    faqs: event.faqs,
                    sponsors: event.sponsors,
                    resource_links: event.resource_links,
                    participation_tracks: event.participation_tracks || [],
                    rulebook_url: event.rulebook_url || null,
                    is_competition: event.is_competition !== false,
                    collect_resume: !!event.registration_config?.collect_resume,
                    collect_github: !!event.registration_config?.collect_github,
                    collect_linkedin: !!event.registration_config?.collect_linkedin,
                    is_team_event: !!event.registration_config?.team_participation,
                    min_team_size: event.registration_config?.team_min_size ?? 1,
                    max_team_size: event.registration_config?.team_max_size ?? 4,
                    is_public: !!event.is_public,
                    reg_start_time: event.reg_start_time || null,
                    reg_end_time: event.reg_end_time || null,
                })
                .eq("id", eventId)
                .eq("institution_id", user?.institution_id || "");
            if (error) throw error;

            showMessage("Operation successful! Unit data synchronized to campus ledger.");
            setEvent({ ...event });
        } catch (err: any) {
            console.error("Critical Save Failure:", err);
            showMessage("Save failed: " + (err.message || "Unknown institutional protocol error (Schema mismatch suspected)"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!event) return;

        // 1. Institutional Validation Guards
        if (!event.description || event.description.length < 15) {
            showMessage("Action Blocked: A concise 'Short Description' (min 15 chars) is required for the card view.", "error");
            return;
        }

        if (!event.rich_description || event.rich_description.length < 50) {
            showMessage("Action Blocked: A 'Detailed Description' (min 50 chars) is required for approval.", "error");
            return;
        }

        // Initialized publishing sequence

        setPublishing(true);
        setShowPublishConfirm(false);

        try {
            // Determine next status based on current lifecycle stage
            const nextStatus = isStaffStudent
                ? "review_pending"
                : (event.status === "approved" ? "live" : "pending");

            // Save latest details then flip status
            const { error } = await supabase
                .from("events")
                .update({
                    title: event.title,
                    description: event.description,
                    rich_description: event.rich_description,
                    banner_url: event.banner_url,
                    budget_required: event.budget_required,
                    risk_level: event.risk_level,
                    start_time: event.start_time,
                    end_time: event.end_time,
                    venue_id: event.venue_id === "tbd-placeholder" ? null : event.venue_id,
                    club_id: (event.club_id === "none" || !event.club_id) ? null : event.club_id,
                    registration_config: event.registration_config,
                    is_public: !!event.is_public,
                    status: nextStatus,
                    reg_start_time: event.reg_start_time || null,
                    reg_end_time: event.reg_end_time || null,
                })
                .eq("id", eventId)
                .eq("institution_id", user?.institution_id || "");

            if (error) throw error;

            // Trigger Notifications based on workflow
            if (isStaffStudent && nextStatus === "review_pending") {
                await supabase.from("notifications").insert({
                    user_id: event.creator_id, // Notify the Faculty In-Charge
                    title: "💎 Blueprint Ready for Audit",
                    message: `Student Host [${user?.full_name}] has completed the event blueprint for [${event.title}]. It is now ready for your final audit and HOD submission.`,
                    type: "info",
                    link: `/faculty/event/${eventId}/manage`
                });
            }

            setEvent(prev => prev ? { ...prev, status: nextStatus } : null);

            if (isStaffStudent) {
                showMessage("Success! Your mission blueprint has been sent to the Faculty In-Charge for review. 🚀");
            } else if (nextStatus === "live") {
                showMessage("Success! Mission is now LIVE on the student marketplace. 🚀");
            } else {
                showMessage("Success! Mission escalated for HOD authorization. 📤");
            }
        } catch (err: any) {
            showMessage("Workflow error: " + err.message, "error");
        } finally {
            setPublishing(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!event || !revisionFeedback) return;
        setPublishing(true);
        setShowRevisionModal(false);
        try {
            const nextStatus = "revision_required";
            const { error } = await supabase
                .from("events")
                .update({
                    status: nextStatus,
                    governance_note: revisionFeedback
                })
                .eq("id", eventId);
            if (error) throw error;

            // Notify Student Staff
            const { data: staff } = await supabase
                .from("event_staff")
                .select("student_id")
                .eq("event_id", eventId)
                .eq("grant_edit_access", true);

            if (staff && staff.length > 0) {
                const notifications = staff.map(s => ({
                    user_id: s.student_id,
                    title: "Action Required: Blueprint Revision",
                    message: `The Faculty In-Charge has requested changes to the blueprint for [${event.title}]. Feedback: ${revisionFeedback}`,
                    type: "alert",
                    link: `/faculty/event/${eventId}/manage`
                }));
                await supabase.from("notifications").insert(notifications);
            }

            setEvent({ ...event, status: nextStatus, governance_note: revisionFeedback });
            showMessage("Instructional feedback dispatched to student blueprint team. 🕊️");
        } catch (err: any) {
            showMessage("Revision request failed: " + err.message, "error");
        } finally {
            setPublishing(false);
        }
    };

    const handleSaveRegistrationConfig = async (config: RegistrationConfig) => {
        if (!event) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("events")
                .update({
                    registration_config: config,
                    collect_resume: config.collect_resume,
                    collect_github: config.collect_github,
                    collect_linkedin: config.collect_linkedin,
                    is_team_event: config.team_participation,
                    min_team_size: config.team_min_size,
                    max_team_size: config.team_max_size,
                    rulebook_url: event.rulebook_url,
                    participation_tracks: event.participation_tracks || []
                })
                .eq("id", eventId)
                .eq("institution_id", user?.institution_id || "");
            if (error) throw error;
            updateEvent({ registration_config: config });
            showMessage("Registration settings saved! ✅");
        } catch (err: any) {
            showMessage("Save failed: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRound = async (roundData: Partial<Round>) => {
        setSaving(true);
        try {
            if (editingRound?.id) {
                const { error } = await supabase
                    .from("event_rounds")
                    .update(roundData)
                    .eq("id", editingRound.id);
                if (error) throw error;
                setRounds(prev => prev.map(r => r.id === editingRound.id ? { ...r, ...roundData } : r));
                showMessage("Stage updated! ⚡");
            } else {
                const newRound = {
                    ...roundData,
                    event_id: eventId,
                    round_number: rounds.length + 1
                };
                const { data, error } = await supabase.from("event_rounds").insert(newRound).select().single();
                if (error) throw error;
                setRounds([...rounds, data]);
                showMessage("New stage initialized! ➕");
            }
            setIsRoundModalOpen(false);
            setEditingRound(null);
        } catch (err: any) {
            showMessage("Failed to save stage: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRound = async (roundId: string) => {
        if (!confirm("Remove this stage from the competition permanently?")) return;
        try {
            const { error, count } = await supabase
                .from("event_rounds")
                .delete({ count: 'exact' })
                .eq("id", roundId);

            if (error) throw error;
            // RLS will block if it's not the user's institution event.
            // We check matching institution_id on the event itself in the policy.

            setRounds(prev => prev.filter(r => r.id !== roundId));
            showMessage("Stage decommissioned. 🗑️");
        } catch (err: any) {
            showMessage("Security Error: " + err.message, "error");
        }
    };

    const handleSavePrize = async (prizeData: Partial<Prize>) => {
        setSaving(true);
        try {
            if (editingPrize?.id) {
                const { error } = await supabase
                    .from("event_prizes")
                    .update(prizeData)
                    .eq("id", editingPrize.id);
                if (error) throw error;
                setPrizes(prev => prev.map(p => p.id === editingPrize.id ? { ...p, ...prizeData } : p));
                showMessage("Reward entry updated! 🏆");
            } else {
                const newPrize = {
                    ...prizeData,
                    event_id: eventId,
                    position: prizes.length + 1
                };
                const { data, error } = await supabase.from("event_prizes").insert(newPrize).select().single();
                if (error) throw error;
                setPrizes([...prizes, data]);
                showMessage("Reward tier initialized! 🥇");
            }
            setIsPrizeModalOpen(false);
            setEditingPrize(null);
        } catch (err: any) {
            showMessage("Reward sync failed: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePrize = async (prizeId: string) => {
        if (!confirm("Remove this reward tier from the merit roadmap?")) return;
        try {
            const { error } = await supabase
                .from("event_prizes")
                .delete()
                .eq("id", prizeId);

            if (error) throw error;
            setPrizes(prev => prev.filter(p => p.id !== prizeId));
            showMessage("Reward tier removed. 🗑️");
        } catch (err: any) {
            showMessage("Security Error: " + err.message, "error");
        }
    };

    const handleBannerUpload = async (file: File) => {
        // 1. File Restrictions
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showMessage("Please upload a JPEG, PNG or WebP image.", "error");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showMessage("File size exceeds 2MB limit. Optimize your event assets.", "error");
            return;
        }

        // 2. Aspect Ratio Validation (16:9)
        setUploadingBanner(true);
        try {
            const validateRatio = (f: File): Promise<boolean> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = URL.createObjectURL(f);
                    img.onload = () => {
                        const ratio = img.width / img.height;
                        const target = 16 / 9;
                        // Roughly 16:9 with 0.1 tolerance
                        resolve(Math.abs(ratio - target) < 0.2);
                    };
                    img.onerror = () => resolve(false);
                });
            };

            const isLandscape = await validateRatio(file);
            if (!isLandscape) {
                showMessage("Please upload a landscape image (16:9 ratio) for best display.", "error");
                setUploadingBanner(false);
                return;
            }

            const ext = file.name.split('.').pop();
            const path = `banners/${eventId}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("event-banners")
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from("event-banners").getPublicUrl(path);
            updateEvent({ banner_url: publicUrl });
            showMessage("Banner synchronized! 🎆");
        } catch (err: any) {
            console.error(err);
            showMessage("Uplink failed: " + err.message, "error");
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleRulebookUpload = async (file: File) => {
        if (file.type !== 'application/pdf') {
            showMessage("Please upload a PDF document for the rulebook.", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showMessage("Rulebook size exceeds 5MB limit.", "error");
            return;
        }

        setUploadingRulebook(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `rulebooks/${eventId}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("event-rulebooks")
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from("event-rulebooks").getPublicUrl(path);
            updateEvent({ rulebook_url: publicUrl });
            showMessage("Rulebook synchronized! 📑");
        } catch (err: any) {
            console.error(err);
            showMessage("Rulebook upload failed: " + err.message, "error");
        } finally {
            setUploadingRulebook(false);
        }
    };

    const handleSaveScore = async (submissionId: string, score: number, feedback: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("submissions")
                .update({ score, feedback, status: "graded" })
                .eq("id", submissionId);

            if (error) throw error;

            setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, score, feedback, status: "graded" } : s));
            showMessage("Score saved and graded! 🎯");
        } catch (err: any) {
            console.error("Scoring error:", err);
            showMessage("Failed to save score: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAssignWinner = async (prizeId: string, winnerId: string | null, type: "individual" | "team") => {
        setSaving(true);
        try {
            const updates = {
                winner_id: type === "individual" ? winnerId : null,
                winner_team_id: type === "team" ? winnerId : null
            };

            const { error } = await supabase
                .from("event_prizes")
                .update(updates)
                .eq("id", prizeId);

            if (error) throw error;

            setPrizes(prev => prev.map(p => p.id === prizeId ? { ...p, ...updates } : p));
            showMessage("Winner assigned successfully! 🏆");
        } catch (err: any) {
            console.error("Winner assignment error:", err);
            showMessage("Failed to assign winner: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteEvent = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("events")
                .update({ status: "completed" })
                .eq("id", eventId)
                .eq("institution_id", user?.institution_id || "");

            if (error) throw error;

            setEvent(prev => prev ? { ...prev, status: "completed" } : null);
            showMessage("Event completed and locked for governance. 🔒");
            setActiveTab("results"); // Refresh view
        } catch (err: any) {
            console.error("Completion error:", err);
            showMessage("Failed to complete event: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const updateEvent = (updates: Partial<EventData>) => {
        setEvent(prev => prev ? { ...prev, ...updates } : null);
    };

    if (!event && !loading) return <div>Connectivity interrupted. Re-authenticating...</div>;

    const handleArchiveEvent = async () => {
        if (!confirm("Are you sure you want to archive this event? It will be hidden from the active dashboard but kept for audit records.")) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("events")
                .update({ status: 'archived' })
                .eq("id", eventId)
                .eq("institution_id", user?.institution_id || "");
            if (error) throw error;
            showMessage("Event archived successfully. 📦");
            router.push("/faculty/my-events");
        } catch (err: any) {
            showMessage("Archival failed: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSubEvent = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This will also remove all its rounds, prizes, and configurations. This cannot be undone.`)) return;

        // Optimistic UI
        const prevSubEvents = [...subEventsState];
        setSubEventsState(prev => prev.filter(ev => ev.id !== id));
        setSaving(true);

        try {
            // 1. Check for blocking relations (like issued certificates)
            const { count: certCount } = await supabase
                .from("verified_ledger")
                .select("*, event:events!inner(institution_id)", { count: 'exact', head: true })
                .eq("event_id", id)
                .eq("event.institution_id", user?.institution_id || "");

            if (certCount && certCount > 0) {
                throw new Error("Cannot delete this event because certificates have already been issued to participants. Void those records first.");
            }

            // 2. Clear known dependents with ON DELETE CASCADE or RESTRICT issues
            await Promise.all([
                supabase.from("event_rounds").delete().eq("event_id", id),
                supabase.from("event_prizes").delete().eq("event_id", id),
                supabase.from("registrations").delete().eq("event_id", id),
                supabase.from("submissions").delete().eq("event_id", id)
            ]);

            // 3. Delete the event itself with COUNT verification & institution scoping
            const { error: deleteError, count } = await supabase
                .from("events")
                .delete({ count: 'exact' })
                .eq("id", id)
                .eq("institution_id", user?.institution_id || "");

            if (deleteError) throw deleteError;

            // If count is 0, it means RLS blocked it without a hard error
            if (count === 0) {
                throw new Error("Security Error: You do not have authority to purge this event row from this institution.");
            }

            showMessage(`"${title}" deleted successfully. 🗑️`);

            // Definitive refresh
            const { data: verifiedSubEvents } = await supabase
                .from("events")
                .select("id, title, status, start_time, end_time, registered_count, attended_count, fest_domain_id, fest_category, club_id")
                .eq("parent_event_id", eventId)
                .eq("institution_id", user?.institution_id || "")
                .order("start_time");

            if (verifiedSubEvents) setSubEventsState(verifiedSubEvents);
        } catch (err: any) {
            console.error("Critical Delete Error:", {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code
            });
            setSubEventsState(prevSubEvents); // Rollback
            showMessage(err.message || "Uplink rejection: Database RLS or constraint violation", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDomain = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the domain "${name}"? This will only work if no activities are linked to it.`)) return;

        // Optimistic UI
        const prevDomains = [...festDomains];
        setFestDomains(prev => prev.filter(d => d.id !== id));
        setSaving(true);

        try {
            const { error, count } = await supabase
                .from("fest_domains")
                .delete({ count: 'exact' })
                .eq("id", id)
                .eq("institution_id", user?.institution_id || "");

            if (error) {
                if (error.code === '23503') {
                    throw new Error("Cannot delete domain because activities are already registered under it. Reassign or delete those activities first.");
                }
                throw error;
            }

            if (count === 0) {
                throw new Error("Permission Denied: You do not have authority to delete this domain registry row.");
            }

            // Refresh domains to be definitive
            const { data: verifiedDomains } = await supabase
                .from("fest_domains")
                .select("*")
                .eq("umbrella_event_id", eventId)
                .order("created_at");

            if (verifiedDomains) setFestDomains(verifiedDomains);

            showMessage(`Domain "${name}" removed successfully. 🗑️`);
        } catch (err: any) {
            console.error("Domain delete error:", err);
            setFestDomains(prevDomains); // Rollback
            showMessage(err.message || "Failed to remove domain: Database lock or policy violation", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white flex overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className={cn(
                            "fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 border backdrop-blur-xl",
                            toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}
                    >
                        {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. Sidebar */}
            <aside className={cn(
                "bg-zinc-950 border-r border-white/5 flex flex-col z-50 transition-all",
                isStaffStudent ? "w-72" : "w-64"
            )}>
                <style jsx global>{`
                    @keyframes shimmer {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    .mission-bg {
                        background: linear-gradient(-45deg, #09090b, #0c0c14, #09090b, #11111d);
                        background-size: 400% 400%;
                        animation: shimmer 15s ease infinite;
                    }
                `}</style>

                <div className="p-8">
                    {!isStaffStudent && (
                        <button
                            onClick={() => {
                                if (event?.parent_event_id) {
                                    router.push(`/faculty/event/${event.parent_event_id}/manage?tab=sub-events`);
                                } else {
                                    router.push(isArchived || searchParams.get("archived") === "true" ? "/faculty/my-events?archived=true" : "/faculty/my-events");
                                }
                            }}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-[0.2em] mb-12 group"
                        >
                            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            {event?.parent_event_id ? "Back to Fest Hub" : "Back to Dashboard"}
                        </button>
                    )}

                    {isStaffStudent && (
                        <div className="mb-12 mt-4">
                            <button
                                onClick={() => router.push("/student/feed")}
                                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-[0.2em] mb-8 group"
                            >
                                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                Exit Editor
                            </button>
                            <div className="flex items-center gap-3 px-2 mb-8">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Zap size={14} className="text-indigo-400" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Editor Mode</span>
                            </div>
                        </div>
                    )}

                    {/* Event Identity Header */}
                    {!loading && event && (
                        <div className="mb-10 space-y-3 px-1">
                            <h2 className="text-[11px] font-black text-white tracking-tight uppercase line-clamp-2 leading-tight italic opacity-90">{event.title}</h2>
                            <div className="flex items-center">
                                {event.event_type === 'umbrella' && <Badge icon={<Zap size={10} />} label="Mega Fest" variant="amber" />}
                                {event.event_type === 'sub_event' && <Badge icon={<Layers size={10} />} label="Sub-Event" variant="cyan" />}
                            </div>
                        </div>
                    )}

                    <nav className="space-y-2">
                        {loading ? (
                            <div className="space-y-4 pt-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Context-Aware Navigation */}
                                {(() => {
                                    const type = event?.event_type;
                                    const isComp = event?.is_competition !== false; // Active by default
                                    return (
                                        <>
                                            <NavButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<LayoutDashboard size={18} />} label="Overview" />

                                            {type === 'umbrella' && (
                                                <>
                                                    {!isStaffStudent && <NavButton active={activeTab === "domains"} onClick={() => setActiveTab("domains")} icon={<Globe size={18} />} label="Domains & Verticals" />}
                                                    <NavButton active={activeTab === "sub-events"} onClick={() => setActiveTab("sub-events")} icon={<Layers size={18} />} label="Sub-Events" />
                                                </>
                                            )}

                                            {type !== 'umbrella' && (
                                                <>
                                                    {isComp && <NavButton active={activeTab === "rounds"} onClick={() => setActiveTab("rounds")} icon={<Layers size={18} />} label="Rounds & Schedule" />}
                                                    <NavButton
                                                        active={activeTab === "registration"}
                                                        onClick={() => setActiveTab("registration")}
                                                        icon={<ClipboardCheck size={18} />}
                                                        label={isComp ? "Registration Form" : "Ticketing / RSVP"}
                                                    />
                                                    {isComp && <NavButton active={activeTab === "submissions"} onClick={() => setActiveTab("submissions")} icon={<FileText size={18} />} label="Submissions & Scoring" />}
                                                </>
                                            )}

                                            <NavButton
                                                active={activeTab === "prizes"}
                                                onClick={() => setActiveTab("prizes")}
                                                icon={<Trophy size={18} />}
                                                label={
                                                    type === 'umbrella'
                                                        ? "Prizes (Global)"
                                                        : isComp
                                                            ? "Prizes & Rewards"
                                                            : "Giveaways & Perks"
                                                }
                                            />

                                            <NavButton active={activeTab === "faqs"} onClick={() => setActiveTab("faqs")} icon={<HelpCircle size={18} />} label="FAQs" />

                                            <NavButton active={activeTab === "sponsors"} onClick={() => setActiveTab("sponsors")} icon={<Handshake size={18} />} label="Sponsors & Partners" />

                                            {!isStaffStudent && (
                                                <NavButton
                                                    active={activeTab === "reports"}
                                                    onClick={() => setActiveTab("reports")}
                                                    icon={<FileBarChart size={18} />}
                                                    label={type === 'umbrella' ? "Reports & Analytics (Global)" : "Reports & Analytics"}
                                                />
                                            )}

                                            {type !== 'umbrella' && isComp && (
                                                <NavButton active={activeTab === "results"} onClick={() => setActiveTab("results")} icon={<CheckSquare size={18} />} label="Results & Closure" />
                                            )}

                                            <NavButton active={activeTab === "organizers"} onClick={() => setActiveTab("organizers")} icon={<Users size={18} />} label="Manage Organizers" />
                                            {!isStaffStudent && <NavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<Settings size={18} />} label="Settings (Governance)" />}
                                        </>
                                    );
                                })()}
                            </>
                        )}
                    </nav>
                </div>

                {/* Status + Publish */}
                <div className="mt-auto p-8 space-y-3">
                    {loading || !event ? (
                        <div className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />
                    ) : (
                        <>
                            {/* Status Pill */}
                            <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Event Status</p>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        event.status === "draft" && "bg-zinc-500",
                                        event.status === "review_pending" && "bg-cyan-400 animate-pulse",
                                        event.status === "pending" && "bg-amber-400 animate-pulse",
                                        (event.status === "revision_required" || event.status === "changes_requested") && "bg-amber-500",
                                        event.status === "approved" && "bg-emerald-400",
                                        event.status === "live" && "bg-emerald-400 animate-pulse",
                                        event.status === "rejected" && "bg-rose-500",
                                        event.status === "completed" && "bg-zinc-400",
                                    )} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 capitalize">
                                        {event.status === "revision_required" || event.status === "changes_requested"
                                            ? "In Revision"
                                            : event.status === "review_pending"
                                                ? "Review Pending"
                                                : event.status}
                                    </span>
                                    {event.is_public && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest ml-auto">
                                            <Globe size={10} />
                                            Marketplace
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Dynamic Sidebar CTA Logic ── */}
                            {(() => {
                                const status = event.status;

                                // 1. Draft/Revision Phase
                                if (status === "draft" || status === "revision_required" || status === "changes_requested") {
                                    return (
                                        <button
                                            id="main-publish-cta"
                                            onClick={() => setShowPublishConfirm(true)}
                                            disabled={publishing}
                                            className={cn(
                                                "w-full h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50",
                                                isStaffStudent
                                                    ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/20"
                                                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20"
                                            )}
                                        >
                                            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            {isStaffStudent
                                                ? (status === "draft" ? "Notify Faculty for Review" : "Send Revision to Faculty")
                                                : "Submit for HOD Approval"
                                            }
                                        </button>
                                    );
                                }

                                // 2. Review Phase (Faculty Audit)
                                if (status === "review_pending") {
                                    if (isStaffStudent) {
                                        return (
                                            <div className="w-full h-11 border border-cyan-500/20 bg-cyan-500/5 rounded-2xl flex items-center justify-center gap-2">
                                                <Loader2 size={12} className="text-cyan-400 animate-spin" />
                                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Awaiting Faculty Review</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex flex-col gap-2 w-full">
                                            <button
                                                onClick={() => setShowPublishConfirm(true)}
                                                disabled={publishing}
                                                className="w-full h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20"
                                            >
                                                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                Audit & Submit to HOD
                                            </button>
                                            <button
                                                onClick={() => setShowRevisionModal(true)}
                                                className="w-full h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-white/5 border border-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                                            >
                                                <Edit3 size={14} />
                                                Request Revision
                                            </button>
                                        </div>
                                    );
                                }

                                // 3. Approval Phase (HOD Review)
                                if (status === "pending") {
                                    return (
                                        <div className="w-full h-11 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-center justify-center gap-2">
                                            <Loader2 size={12} className="text-amber-400 animate-spin" />
                                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Awaiting HOD Approval</span>
                                        </div>
                                    );
                                }

                                // 4. Ready to Go Live (Post-HOD Approval)
                                if (status === "approved") {
                                    return (
                                        <button
                                            onClick={() => setShowPublishConfirm(true)}
                                            disabled={publishing}
                                            className="w-full h-11 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                            Push to Campus Feed
                                        </button>
                                    );
                                }

                                // 5. Live/Completed State
                                if (status === "live") {
                                    return (
                                        <div className="w-full h-11 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Marketplace</span>
                                        </div>
                                    );
                                }

                                // 6. Rejection/Archived (Fallbacks)
                                if (status === "rejected") {
                                    return (
                                        <button
                                            onClick={() => setShowPublishConfirm(true)}
                                            disabled={publishing}
                                            className="w-full h-11 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all"
                                        >
                                            <Send size={14} /> Resubmit for Approval
                                        </button>
                                    );
                                }

                                return null;
                            })()}
                        </>
                    )}
                </div>
            </aside>

            {/* 2. Main Content Area */}
            <main className={cn(
                "flex-1 flex flex-col relative overflow-hidden",
                isStaffStudent ? "mission-bg bg-zinc-950" : "bg-zinc-950"
            )}>
                {/* Archived Lockdown Banner */}
                {isArchived && (
                    <div className="bg-rose-950/90 border-b border-rose-500/30 px-10 py-5 flex items-center justify-center gap-5 sticky top-0 z-[100] backdrop-blur-xl group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 relative shadow-2xl shadow-rose-500/20">
                            <Box size={24} className="group-hover:rotate-12 transition-transform" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-rose-500 flex items-center gap-2">
                                <ShieldCheck size={12} /> Institutional Registry Archive
                            </p>
                            <p className="text-sm font-bold text-rose-100/90 mt-1 max-w-2xl leading-relaxed">
                                This event is locked for institutional audit and is in read-only mode. All governance data is now immutable.
                            </p>
                        </div>
                    </div>
                )}

                {/* Read-Only Indicator */}
                {isReadOnly && !isArchived && (
                    <div className={cn(
                        "bg-amber-500/10 border-b border-amber-500/20 px-10 py-3 flex items-center justify-center gap-3 relative z-[60] overflow-hidden group",
                        isLocked && "bg-rose-500/10 border-rose-500/20"
                    )}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                        <Shield size={14} className={cn("animate-pulse", isLocked ? "text-rose-500" : "text-amber-500")} />
                        <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isLocked ? "text-rose-500" : "text-amber-500")}>
                            {isLocked
                                ? "🔒 EVENT COMPLETED. This event is locked for governance and audit purposes. Records are immutable."
                                : "🔒 ACCESS READ-ONLY. Mission blueprint is currently under institutional review or live."
                            }
                        </p>
                    </div>
                )}

                {/* Mission Header (Student Only) */}
                {isStaffStudent && (
                    <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-zinc-950/20 backdrop-blur-xl z-50">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => router.push('/student/feed')}
                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 backdrop-blur-md text-zinc-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                            >
                                <ChevronLeft size={14} />
                                Back to Feed
                            </button>
                            <div className="h-8 w-px bg-white/5" />
                            <div className="flex flex-col">
                                <h1 className="text-xs font-black tracking-tight text-white/90 uppercase italic">
                                    {event?.title} <span className="text-zinc-600 ml-1.5">— Mission Blueprint</span>
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={cn(
                                        "w-1 h-1 rounded-full animate-pulse",
                                        event?.status === 'revision_required' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-cyan-500 shadow-[0_0_8px_#06b6d4]"
                                    )} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                        Stage: {event?.status?.replace('_', ' ')}
                                    </span>
                                    {event && (event.status === 'approved' || event.status === 'live') && (
                                        (() => {
                                            const now = new Date();
                                            const start = new Date(event.start_time);
                                            const end = new Date(event.end_time);
                                            const regStart = event.reg_start_time ? new Date(event.reg_start_time) : null;
                                            const regEnd = event.reg_end_time ? new Date(event.reg_end_time) : null;

                                            if (now >= start && now <= end) {
                                                return <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 ml-2">● LIVE NOW</span>;
                                            }
                                            if (regStart && regEnd) {
                                                if (now >= regStart && now <= regEnd) {
                                                    return <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 ml-2">● REGISTRATION OPEN</span>;
                                                } else if (now < regStart) {
                                                    return <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 ml-2">● UPCOMING</span>;
                                                } else if (now > regEnd && now < start) {
                                                    return <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 ml-2">● REGISTRATION CLOSED</span>;
                                                }
                                            }
                                            return null;
                                        })()
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="text-zinc-400 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest h-11 px-6 rounded-2xl transition-all border border-white/5 hover:bg-white/10 hover:border-white/10 backdrop-blur-md"
                                >
                                    <Eye size={15} /> Preview
                                </button>

                            <button
                                disabled={saving || isReadOnly || conflictStatus.type === 'HARD'}
                                onClick={handleSaveAll}
                                className={cn(
                                    "h-11 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl relative overflow-hidden group",
                                    (isReadOnly || conflictStatus.type === 'HARD')
                                        ? "bg-zinc-900 border border-white/5 text-zinc-600 cursor-not-allowed"
                                        : "bg-white text-black hover:bg-zinc-200 active:scale-95"
                                )}
                            >
                                {saving ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                                        <Save size={14} />
                                        Save Mission Data
                                    </>
                                )}
                            </button>

                            <div className="h-10 w-px bg-white/5 mx-2" />

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-white/60 tracking-widest uppercase italic leading-tight">Student Command</p>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-tight mt-0.5">Elite Organizer Access</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-xs shadow-lg shadow-indigo-500/10">
                                    {user?.full_name?.charAt(0)}
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* Standard Header (Non-Student) */}
                {!isStaffStudent && (
                    <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-zinc-950/50 backdrop-blur-md z-40">
                        <div className="flex items-center gap-4">
                            <h1 className="text-sm font-bold tracking-tight text-white">{event?.title || "Untitled Event"}</h1>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-zinc-500 uppercase">ID: {eventId.slice(0, 8)}</span>
                        </div>

                        <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="text-zinc-400 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest h-10 px-4 rounded-xl transition-all border border-white/5 hover:bg-white/5"
                                >
                                    <Eye size={16} /> Preview
                                </button>
                            <button
                                disabled={saving || isReadOnly || conflictStatus.type === 'HARD'}
                                onClick={handleSaveAll}
                                className={cn(
                                    "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg",
                                    (isLocked || conflictStatus.type === 'HARD')
                                        ? "bg-zinc-900 border border-white/5 text-zinc-600 cursor-not-allowed"
                                        : "bg-white text-black hover:bg-zinc-200"
                                )}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : (isReadOnly ? <Shield size={14} /> : (conflictStatus.type === 'HARD' ? <AlertCircle size={14} /> : <Save size={14} />))}
                                {isReadOnly ? "Governance Locked" : (conflictStatus.type === 'HARD' ? "Conflict Blocked" : "Save Changes")}
                            </button>
                        </div>
                    </header>
                )}

                <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                            <p className="text-zinc-600 font-black text-xs uppercase tracking-[0.3em]">Mapping Core Metrics</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-4xl mx-auto"
                            >
                                {activeTab === "overview" && event && (
                                    <OverviewTab
                                        event={event}
                                        updateEvent={updateEvent}
                                        clubs={clubs}
                                        handleBannerUpload={handleBannerUpload}
                                        onSave={handleSaveAll}
                                        saving={saving}
                                        uploadingBanner={uploadingBanner}
                                        onPublish={() => setShowPublishConfirm(true)}
                                        publishing={publishing}
                                        readOnly={isReadOnly}
                                        isStaffStudent={isStaffStudent}
                                    />
                                )}
                                {activeTab === "sub-events" && event?.event_type === "umbrella" && (
                                    <SubEventsTab
                                        parentId={eventId}
                                        subEvents={subEventsState}
                                        festDomains={festDomains}
                                        onDeleteSubEvent={handleDeleteSubEvent}
                                        onPreview={setPreviewId}
                                        onRefresh={async () => {
                                            const { data } = await supabase.from("events").select("id, title, status, start_time, end_time, registered_count, fest_domain_id, fest_category, club_id").eq("parent_event_id", eventId).order("start_time");
                                            if (data) setSubEventsState(data);
                                        }}
                                        readOnly={isReadOnly}
                                    />
                                )}
                                {activeTab === "domains" && event?.event_type === "umbrella" && (
                                    <DomainsTab
                                        eventId={eventId}
                                        domains={festDomains}
                                        onDeleteDomain={handleDeleteDomain}
                                        onRefresh={async () => {
                                            const { data } = await supabase.from("fest_domains").select("*").eq("umbrella_event_id", eventId).order("created_at");
                                            if (data) setFestDomains(data);
                                        }}
                                        readOnly={isReadOnly}
                                    />
                                )}
                                {activeTab === "rounds" && (
                                    <RoundsTab
                                        rounds={rounds}
                                        onAdd={() => { setEditingRound(null); setIsRoundModalOpen(true); }}
                                        onEdit={(r) => { setEditingRound(r); setIsRoundModalOpen(true); }}
                                        onDelete={handleDeleteRound}
                                        readOnly={isReadOnly}
                                    />
                                )}
                                {activeTab === "registration" && event && (
                                    <RegistrationTab
                                        event={event}
                                        onSave={handleSaveRegistrationConfig}
                                        saving={saving}
                                        readOnly={isReadOnly}
                                        updateEvent={updateEvent}
                                        handleRulebookUpload={handleRulebookUpload}
                                        uploadingRulebook={uploadingRulebook}
                                    />
                                )}
                                {activeTab === "submissions" && (
                                    <SubmissionsTab
                                        submissions={submissions}
                                        rounds={rounds}
                                        selectedRoundId={selectedSubmissionRoundId}
                                        onRoundSelect={setSelectedSubmissionRoundId}
                                        onSaveScore={handleSaveScore}
                                        saving={saving}
                                        readOnly={isReadOnly}
                                    />
                                )}
                                {activeTab === "prizes" && (
                                    <PrizesTab
                                        prizes={prizes}
                                        onAdd={() => { setEditingPrize(null); setIsPrizeModalOpen(true); }}
                                        onEdit={(p) => { setEditingPrize(p); setIsPrizeModalOpen(true); }}
                                        onDelete={handleDeletePrize}
                                        readOnly={isReadOnly}
                                        event={event}
                                        updateEvent={updateEvent}
                                    />
                                )}
                                {activeTab === "faqs" && event && (
                                    <FaqsTab
                                        faqs={event.faqs}
                                        onChange={(faqs: any) => updateEvent({ faqs })}
                                        onSave={handleSaveAll}
                                        saving={saving}
                                        readOnly={isReadOnly}
                                    />
                                )}
                                {activeTab === "sponsors" && event && (
                                    <SponsorsTab
                                        sponsors={event?.sponsors || []}
                                        parentSponsors={parentSponsors}
                                        onChange={(sponsors) => updateEvent({ sponsors })}
                                        onSave={handleSaveAll}
                                        saving={saving}
                                        readOnly={isReadOnly}
                                    />
                                )}
                                {activeTab === "reports" && (
                                    <ReportsTab
                                        event={event}
                                        registrations={registrations}
                                        submissions={submissions}
                                        prizes={prizes}
                                        subEvents={subEventsState}
                                        festDomains={festDomains}
                                        loading={loading}
                                    />
                                )}
                                {activeTab === "results" && event && (
                                    <ResultsTab
                                        event={event}
                                        registrations={registrations}
                                        prizes={prizes}
                                        onAssignWinner={handleAssignWinner}
                                        onCompleteEvent={handleCompleteEvent}
                                        saving={saving}
                                    />
                                )}
                                {activeTab === "settings" && event && !isStaffStudent && (
                                    <SettingsTab
                                        event={event}
                                        updateEvent={updateEvent}
                                        venues={venues}
                                        readOnly={isLocked}
                                        onArchive={handleArchiveEvent}
                                        onSave={handleSaveAll}
                                        saving={saving}
                                        conflictStatus={conflictStatus}
                                        checkingConflict={checkingConflict}
                                        venueAvailability={venueAvailability}
                                        isStaffStudent={isStaffStudent}
                                    />
                                )}
                                {activeTab === "organizers" && event && (
                                    <StaffTab
                                        eventId={eventId}
                                        eventTitle={event.title}
                                        staff={eventStaff}
                                        onRefresh={async () => {
                                            const { data, error } = await supabase.from("event_staff")
                                                .select("*, student:student_id(id, full_name, email, role, department:departments(name))")
                                                .eq("event_id", eventId)
                                                .order("assigned_at", { ascending: false });
                                            if (error) alert("Sync Error: " + error.message);
                                            if (data) setEventStaff(data);
                                        }}
                                        readOnly={isReadOnly}
                                        institutionId={user?.institution_id}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </main>

            {/* Modals & Overlays */}
            <RoundModal
                isOpen={isRoundModalOpen}
                onClose={() => { setIsRoundModalOpen(false); setEditingRound(null); }}
                onSave={handleSaveRound}
                initialData={editingRound}
                saving={saving}
            />

            <PrizeModal
                isOpen={isPrizeModalOpen}
                onClose={() => { setIsPrizeModalOpen(false); setEditingPrize(null); }}
                onSave={handleSavePrize}
                initialData={editingPrize}
                saving={saving}
                readOnly={isLocked}
                isPerkMode={event?.event_type === 'umbrella' || event?.is_competition === false}
            />

            <PreviewOverlay
                isOpen={showPreview || !!previewId}
                onClose={() => { setShowPreview(false); setPreviewId(null); }}
                eventId={previewId || eventId}
            />

            {/* ── Publish Confirmation Dialog ── */}
            {showPublishConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/70">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-sm bg-zinc-950 border border-white/8 rounded-[2rem] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                                <Send size={24} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-base font-black text-white tracking-tight">
                                    {isStaffStudent
                                        ? "Submit for Faculty Review?"
                                        : (event?.status === "revision_required" || event?.status === "changes_requested")
                                            ? "Resubmit for Approval"
                                            : "Publish to Students?"}
                                </h3>
                                <p className="text-xs text-zinc-500 leading-relaxed px-2">
                                    {isStaffStudent
                                        ? "This will lock your editing access and notify your Faculty In-Charge to review the event details."
                                        : (event?.status === "revision_required" || event?.status === "changes_requested"
                                            ? "You have addressed the HOD's feedback. Click below to send the event back for review."
                                            : <>
                                                This will submit <span className="text-white font-bold">{event?.title}</span> for HOD approval.
                                                {event?.is_public
                                                    ? " Once approved, it will be published to the National Marketplace."
                                                    : " Once approved, it will be visible to students in your college."
                                                }
                                            </>)
                                    }
                                </p>
                            </div>
                            <div className="pt-2 space-y-2">
                                <div className="flex items-start gap-2 text-[10px] text-zinc-500">
                                    <CheckCircle2 size={12} className="mt-0.5 text-emerald-500 shrink-0" />
                                    Event details & metrics will be re-validated by HOD
                                </div>
                                <div className="flex items-start gap-2 text-[10px] text-zinc-500">
                                    <CheckCircle2 size={12} className="mt-0.5 text-emerald-500 shrink-0" />
                                    Wait for "Authorized" status to go live
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 px-8 pb-8">
                            <button
                                onClick={() => setShowPublishConfirm(false)}
                                className="flex-1 h-11 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                className={cn(
                                    "flex-[2] h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20",
                                    isStaffStudent
                                        ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400"
                                )}
                            >
                                {isStaffStudent ? "🚀 Send to Faculty" : (
                                    <>
                                        <Send size={13} /> {(event?.status === "revision_required" || event?.status === "changes_requested") ? "🚀 Resubmit to HOD" : "Confirm & Publish"}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Revision Feedback Modal — for Faculty Review Loop */}
            <AnimatePresence>
                {showRevisionModal && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl"
                        >
                            <div className="space-y-8 relative z-10">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-amber-500">
                                        <MessageSquare size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Feedback</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white uppercase italic leading-none tracking-tighter">
                                        Request Blueprint Revision
                                    </h3>
                                    <p className="text-zinc-500 text-xs font-medium leading-relaxed max-w-sm">
                                        Specify what the student host needs to change. This will reopen editing access for them and send a notification immediately.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Feedback & Required Changes</label>
                                    <textarea
                                        value={revisionFeedback}
                                        onChange={(e) => setRevisionFeedback(e.target.value)}
                                        placeholder="e.g., Description is too vague, please add exact venue requirements and update the prize pool details."
                                        className="w-full h-40 bg-zinc-900 border border-white/5 rounded-3xl px-6 py-5 text-sm font-medium focus:outline-none focus:border-amber-500/50 transition-all resize-none shadow-inner"
                                    />
                                </div>

                                <div className="flex items-center gap-4 pt-4">
                                    <button
                                        onClick={() => setShowRevisionModal(false)}
                                        className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={!revisionFeedback || publishing}
                                        onClick={handleRequestRevision}
                                        className="flex-1 h-14 bg-amber-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
                                    >
                                        {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        Dispatch Instructions to Host
                                    </button>
                                </div>
                            </div>

                            {/* Decorative Icon */}
                            <div className="absolute right-0 top-0 opacity-[0.03] text-amber-500 -translate-y-1/3 translate-x-1/4 pointer-events-none">
                                <Edit3 size={400} />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function EventManageDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                    <p className="text-zinc-600 font-black text-xs uppercase tracking-[0.3em]">Calibrating Neural Interface</p>
                </div>
            </div>
        }>
            <EventManageDashboardInner />
        </Suspense>
    );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function NavButton({ active, onClick, icon, label, loading }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; loading?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest group relative",
                active
                    ? "bg-white/5 text-white shadow-sm border border-white/10"
                    : "text-zinc-600 hover:text-zinc-400"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn("transition-colors", active ? "text-cyan-400" : "group-hover:text-zinc-400")}>{icon}</div>
                {label}
            </div>
            {active && <motion.div layoutId="nav-dot" className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />}
        </button>
    );
}

function OverviewTab({ event, updateEvent, clubs, handleBannerUpload, onSave, saving, readOnly, uploadingBanner, onPublish, publishing, isStaffStudent }: any) {
    const [dragActive, setDragActive] = useState(false);
    const [compliance, setCompliance] = useState({ feedbackRead: false, detailsChecked: false });

    // Basic validity check for mandatory fields
    const isMandatoryFilled = event.title && event.description && event.start_time && event.end_time && (event.venue_id && event.venue_id !== "tbd-placeholder");
    const canResubmit = compliance.feedbackRead && compliance.detailsChecked && isMandatoryFilled;

    const handleDrag = (e: React.DragEvent) => {
        // ... (rest of drag logic)
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleBannerUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-12">
            {/* ── Governance / Audit Feedback Floating Alert ── */}
            {(event.status === "revision_required" || event.status === "changes_requested" || event.status === "rejected") && (
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={cn(
                        "relative overflow-hidden rounded-[2rem] p-8 mb-12 shadow-2xl transition-all",
                        event.status === "rejected"
                            ? "bg-rose-500/10 border border-rose-500/20 shadow-rose-500/5"
                            : "bg-amber-500/5 border border-amber-500/20 shadow-amber-500/5"
                    )}
                >
                    {/* Background Glow */}
                    <div className={cn(
                        "absolute -top-24 -right-24 w-64 h-64 blur-[80px] opacity-20 transition-colors",
                        event.status === "rejected" ? "bg-rose-500" : "bg-amber-500"
                    )} />

                    <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center justify-between">
                        <div className="flex-1 space-y-5">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                                    event.status === "rejected" ? "bg-rose-500 text-black" : "bg-amber-500 text-black"
                                )}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className={cn("text-[11px] font-black uppercase tracking-[0.3em]", event.status === "rejected" ? "text-rose-400" : "text-amber-400")}>
                                        {event.status === "rejected"
                                            ? "HOD REJECTION"
                                            : (event.status === "revision_required" ? "FACULTY REVISION REQUESTED" : "HOD REVISION REQUESTED")}
                                    </h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">
                                        Mission Status: Needs Calibration
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/5 relative group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 rounded-full" />
                                <p className="text-sm font-medium text-white/90 italic leading-relaxed pl-4">
                                    "{event.governance_note || event.rejection_reason || "No feedback provided."}"
                                </p>
                            </div>
                        </div>

                        {((event.status === "revision_required" && isStaffStudent) || (event.status === "changes_requested")) && (
                            <div className="lg:w-80 w-full space-y-6 bg-zinc-950/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between group cursor-pointer p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 transition-all">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-100 group-hover:text-white transition-colors">Acknowledge Feedback</span>
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Feedback read & understood</span>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={compliance.feedbackRead}
                                                onChange={e => setCompliance(prev => ({ ...prev, feedbackRead: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white"></div>
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between group cursor-pointer p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 transition-all">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-100 group-hover:text-white transition-colors">Verify Accuracy</span>
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Blueprint is ready</span>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={compliance.detailsChecked}
                                                onChange={e => setCompliance(prev => ({ ...prev, detailsChecked: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white"></div>
                                        </div>
                                    </label>
                                </div>

                                <button
                                    id="resubmit-btn"
                                    onClick={onPublish}
                                    disabled={!canResubmit || publishing}
                                    className="w-full h-12 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-30"
                                >
                                    {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    {isStaffStudent ? "Send to Faculty" : "Resubmit to HOD"}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2">Event Title</label>
                    <input
                        type="text"
                        disabled={readOnly}
                        value={event.title}
                        onChange={e => updateEvent({ title: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner placeholder:opacity-20 disabled:opacity-50"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2">Organizing Club</label>
                    <select
                        disabled={readOnly}
                        value={event.club_id || "none"}
                        onChange={e => updateEvent({ club_id: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold appearance-none focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                    >
                        <option value="none">DEPARTMENTAL CORE / NONE</option>
                        {clubs.map((c: any) => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* Event Mode Selection */}
            {event.event_type !== 'umbrella' && (
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2">Event Architecture / Mode</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => updateEvent({ is_competition: true })}
                            className={cn(
                                "p-6 rounded-3xl border text-left transition-all space-y-4 relative overflow-hidden group/card",
                                event.is_competition !== false
                                    ? "bg-cyan-500/5 border-cyan-500/30 ring-1 ring-cyan-500/20"
                                    : "bg-zinc-950 border-white/5 opacity-40 hover:opacity-80 disabled:opacity-30"
                            )}
                        >
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg", event.is_competition !== false ? "bg-cyan-500 text-black" : "bg-white/5 text-zinc-600")}>
                                <Trophy size={24} />
                            </div>
                            <div>
                                <h4 className={cn("text-sm font-black uppercase tracking-tight mb-1", event.is_competition !== false ? "text-white" : "text-zinc-500")}>Competition Mode</h4>
                                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-wider">Use for Hackathons, Dance Competitions, Debates (Has judges, rounds, and winners).</p>
                            </div>
                            {event.is_competition !== false && <div className="absolute top-4 right-4 text-cyan-500"><CheckCircle2 size={20} /></div>}
                        </button>

                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => updateEvent({ is_competition: false })}
                            className={cn(
                                "p-6 rounded-3xl border text-left transition-all space-y-4 relative overflow-hidden group/card",
                                event.is_competition === false
                                    ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20"
                                    : "bg-zinc-950 border-white/5 opacity-40 hover:opacity-80 disabled:opacity-30"
                            )}
                        >
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg", event.is_competition === false ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-600")}>
                                <Ticket size={24} />
                            </div>
                            <div>
                                <h4 className={cn("text-sm font-black uppercase tracking-tight mb-1", event.is_competition === false ? "text-white" : "text-zinc-500")}>Experience Mode</h4>
                                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-wider">Use for Concerts, Guest Lectures, Exhibitions (Ticketing & RSVP only. No judging).</p>
                            </div>
                            {event.is_competition === false && <div className="absolute top-4 right-4 text-amber-500"><CheckCircle2 size={20} /></div>}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                    Short Description <span className="text-rose-500 normal-case font-medium">(Required for Approval)</span>
                </label>
                <input
                    type="text"
                    disabled={readOnly}
                    value={event.description}
                    onChange={e => updateEvent({ description: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-5 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner disabled:opacity-50"
                />
            </div>

            <section className="space-y-4">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] block ml-2">Event Banner</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        onDragEnter={!readOnly ? handleDrag : undefined}
                        onDragLeave={!readOnly ? handleDrag : undefined}
                        onDragOver={!readOnly ? handleDrag : undefined}
                        onDrop={!readOnly ? handleDrop : undefined}
                        onClick={() => !readOnly && !uploadingBanner && document.getElementById('banner-file')?.click()}
                        className={cn(
                            "md:col-span-2 aspect-video border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-4 group transition-all overflow-hidden relative shadow-2xl bg-zinc-950",
                            dragActive ? "border-indigo-500 bg-indigo-500/5" : "hover:border-white/10",
                            (readOnly || uploadingBanner) ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        )}
                    >
                        {uploadingBanner ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 size={32} className="animate-spin text-indigo-500" />
                                <p className="text-[10px] font-black font-sans text-zinc-500 uppercase tracking-[0.3em]">Processing Visuals...</p>
                            </div>
                        ) : event.banner_url ? (
                            <img src={event.banner_url} className="w-full h-full object-cover rounded-xl" alt="Banner Preview" />
                        ) : (
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-zinc-700 group-hover:text-indigo-500 transition-all mx-auto mb-4 border border-white/5 shadow-inner">
                                    <ImageIcon size={32} />
                                </div>
                                <p className="text-[10px] font-black font-sans text-zinc-500 uppercase tracking-[0.3em]">
                                    {readOnly ? "No Banner Set" : "Upload Event Banner (16:9)"}
                                </p>
                            </div>
                        )}
                        {!readOnly && !uploadingBanner && <input id="banner-file" type="file" className="hidden" accept="image/*" onChange={e => {
                            if (e.target.files?.[0]) handleBannerUpload(e.target.files[0]);
                        }} />}
                    </div>
                    <div className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center gap-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-zinc-500">
                                <LinkIcon size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Image URL</span>
                            </div>
                            <input
                                type="text"
                                disabled={readOnly}
                                placeholder="https://..."
                                value={event.banner_url || ""}
                                onChange={e => updateEvent({ banner_url: e.target.value })}
                                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-zinc-400 focus:outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] block ml-2">
                    Detailed Description <span className="text-rose-500 normal-case font-medium ml-2">(Required for Approval)</span>
                </label>
                <div className={cn("bg-zinc-950 border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl transition-all", !readOnly && "focus-within:border-cyan-500/20", readOnly && "opacity-50 pointer-events-none")}>
                    <div className="quill-container">
                        <ReactQuill
                            theme="snow"
                            readOnly={readOnly}
                            value={event.rich_description || ""}
                            onChange={(content) => updateEvent({ rich_description: content })}
                            className="text-white font-sans"
                            placeholder="Detail parameters, event goals, and evaluation criteria..."
                            modules={{
                                toolbar: readOnly ? false : [
                                    [{ 'header': [1, 2, false] }],
                                    ['bold', 'italic', 'underline'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['clean']
                                ]
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* ── Community & Support Links ── */}
            <section className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-400 mb-1">
                            <MessageSquare size={14} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Community & Support Links</span>
                        </div>
                        <p className="text-xs text-zinc-600">Add links to join WhatsApp groups, Discord servers, or external websites.</p>
                    </div>
                    {!readOnly && (
                        <button
                            onClick={() => {
                                const links = event.resource_links || [];
                                if (links.length >= 8) return;
                                updateEvent({
                                    resource_links: [...links, { id: crypto.randomUUID(), label: "", url: "", icon: "link" }]
                                });
                            }}
                            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                        >
                            <Plus size={13} /> Add Link
                        </button>
                    )}
                </div>

                {(event.resource_links || []).length === 0 ? (
                    <div className="border-2 border-dashed border-white/5 rounded-2xl h-24 flex items-center justify-center text-zinc-700 text-xs font-bold">
                        No resource links yet
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(event.resource_links || []).map((link: ResourceLink, idx: number) => (
                            <div key={link.id} className="flex items-center gap-3 bg-zinc-950 border border-white/5 rounded-2xl px-4 py-3">
                                <select
                                    value={link.icon}
                                    onChange={e => {
                                        const updated = [...(event.resource_links || [])];
                                        updated[idx] = { ...updated[idx], icon: e.target.value as ResourceLink["icon"] };
                                        updateEvent({ resource_links: updated });
                                    }}
                                    className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-400 focus:outline-none shrink-0"
                                >
                                    <option value="whatsapp">📱 WhatsApp</option>
                                    <option value="discord">💬 Discord</option>
                                    <option value="telegram">✈️ Telegram</option>
                                    <option value="link">🌐 Website</option>
                                    <option value="github">🐙 GitHub</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Label (e.g. WhatsApp Group)"
                                    value={link.label}
                                    onChange={e => {
                                        const updated = [...(event.resource_links || [])];
                                        updated[idx] = { ...updated[idx], label: e.target.value };
                                        updateEvent({ resource_links: updated });
                                    }}
                                    className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none placeholder:text-zinc-700 min-w-0"
                                />
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={link.url}
                                    onChange={e => {
                                        const updated = [...(event.resource_links || [])];
                                        updated[idx] = { ...updated[idx], url: e.target.value };
                                        updateEvent({ resource_links: updated });
                                    }}
                                    className="flex-[2] bg-transparent text-xs text-zinc-400 focus:outline-none placeholder:text-zinc-700 min-w-0"
                                />
                                <button
                                    onClick={() => {
                                        const updated = (event.resource_links || []).filter((_: any, i: number) => i !== idx);
                                        updateEvent({ resource_links: updated });
                                    }}
                                    className="shrink-0 w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600 hover:text-rose-400 transition-all"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {!readOnly && (
                <div className="flex justify-end pt-10 border-t border-white/5">
                    <button
                        disabled={saving}
                        onClick={onSave}
                        className="bg-white text-black h-14 px-12 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            )}

            <style jsx global>{`
                .quill-container .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    background: rgba(255,255,255,0.02);
                    padding: 20px 40px;
                }
                .quill-container .ql-container.ql-snow {
                    border: none;
                    min-height: 400px;
                    font-size: 15px;
                    padding: 20px 24px;
                }
                .quill-container .ql-editor {
                    padding: 40px;
                    line-height: 1.8;
                    color: #a1a1aa;
                }
                .quill-container .ql-editor.ql-blank::before {
                    color: #3f3f46;
                    font-style: normal;
                    left: 40px;
                }
                .quill-container .ql-snow .ql-stroke { stroke: #52525b; }
                .quill-container .ql-snow .ql-fill { fill: #52525b; }
                .quill-container .ql-snow .ql-picker { color: #52525b; }
                .quill-container .ql-editor h1 { font-weight: 900; color: white; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 20px; }
            `}</style>
        </div>
    );
}

function RoundsTab({ rounds, onAdd, onEdit, onDelete, readOnly }: {
    rounds: Round[];
    onAdd: () => void;
    onEdit: (r: Round) => void;
    onDelete: (id: string) => void;
    readOnly?: boolean;
}) {
    const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
        online_test: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" },
        digital_submission: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
        live_in_person: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
        virtual_meet: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
        other: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30", dot: "bg-zinc-400" },
    };

    const TYPE_LABELS: Record<string, string> = {
        online_test: "Online Test",
        digital_submission: "Digital Submission",
        live_in_person: "Live / In-Person",
        virtual_meet: "Virtual Meet",
        other: "Other"
    };

    const fmt = (iso: string) => {
        try { return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
        catch { return iso; }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <header className="flex items-center justify-between p-8 bg-zinc-950 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Rounds & Schedule</h3>
                        <p className="text-[10px] text-zinc-500 mt-1 font-medium">{rounds.length} round{rounds.length !== 1 ? "s" : ""} configured</p>
                    </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
            </header>

            {/* Timeline */}
            {rounds.length > 0 && (
                <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[27px] top-10 bottom-10 w-px bg-gradient-to-b from-indigo-500/40 via-white/5 to-transparent" />

                    <div className="space-y-4">
                        {rounds.map((round, idx) => {
                            const colors = TYPE_COLORS[round.type] ?? TYPE_COLORS.submission;
                            return (
                                <motion.div
                                    key={round.id ?? idx}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="flex gap-5 group"
                                >
                                    {/* Round number bubble */}
                                    <div className="relative shrink-0">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl border flex flex-col items-center justify-center font-black text-xl leading-none z-10 relative transition-colors",
                                            colors.bg, colors.border, colors.text
                                        )}>
                                            {idx + 1}
                                        </div>
                                    </div>

                                    {/* Card */}
                                    <div className={cn(
                                        "flex-1 p-6 bg-zinc-950 border rounded-[1.75rem] transition-all shadow-lg hover:shadow-xl relative overflow-hidden",
                                        `${colors.border} hover:shadow-${colors.dot.replace('bg-', '')}/5`
                                    )}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                {/* Type badge + title */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest",
                                                        colors.bg, colors.border, colors.text
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
                                                        {TYPE_LABELS[round.type] ?? round.type}
                                                    </span>
                                                    {round.phase && (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                            PHASE: {round.phase}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-base font-black text-white tracking-tight leading-tight">{round.title}</h4>
                                                {round.description && (
                                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed line-clamp-2">{round.description}</p>
                                                )}
                                                {/* Time range */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                                        <Calendar size={11} className="text-zinc-600" />
                                                        {fmt(round.start_time)}
                                                    </div>
                                                    {round.end_time && (
                                                        <>
                                                            <span className="text-zinc-700">→</span>
                                                            <span className="text-[10px] font-bold text-zinc-500">{fmt(round.end_time)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions — visible on hover */}
                                            <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => onEdit(round)}
                                                    className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => round.id && onDelete(round.id)}
                                                    className="w-9 h-9 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Big dashed Add Round button */}
            {!readOnly && (
                <button
                    onClick={onAdd}
                    className="w-full h-24 border-2 border-dashed border-white/10 rounded-[2rem] flex items-center justify-center gap-4 text-zinc-500 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-indigo-500/10 border border-white/10 group-hover:border-indigo-500/30 flex items-center justify-center transition-all">
                        <Plus size={18} className="group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">
                        {rounds.length === 0 ? "Add Your First Round" : "Add Round"}
                    </span>
                </button>
            )}
        </div>
    );
}

function Badge({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: "cyan" | "amber" | "rose" }) {
    const colors = {
        cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
        amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
        rose: "bg-rose-500/10 border-rose-500/20 text-rose-500"
    };
    return (
        <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.1em] shadow-sm", colors[variant])}>
            {icon}
            {label}
        </span>
    );
}

function RoundModal({ isOpen, onClose, onSave, initialData, saving, readOnly }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (d: Partial<Round>) => void;
    initialData: Round | null;
    saving: boolean;
    readOnly?: boolean;
}) {
    const TYPES = [
        { value: "online_test", label: "ONLINE TEST", description: "MCQs, Quizzes, or Screening Tests.", icon: <Monitor size={16} /> },
        { value: "digital_submission", label: "DIGITAL SUBMISSION", description: "Upload Code, PPTs, or Audition Videos.", icon: <Upload size={16} /> },
        { value: "live_in_person", label: "LIVE / IN-PERSON", description: "Stage performances, Offline pitches, or physical tasks.", icon: <Mic size={16} /> },
        { value: "virtual_meet", label: "VIRTUAL MEET", description: "Zoom interviews or online live auditions.", icon: <Video size={16} /> },
        { value: "other", label: "OTHER", description: "Miscellaneous tasks or check-ins.", icon: <Sparkles size={16} /> },
    ];

    const PHASES = ["Screening", "Audition", "Qualifier", "Semi-Final", "Finale", "Other"];

    const defaultData = {
        title: "",
        type: "submission",
        phase: "Qualifier",
        description: "",
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        requires_submission: false,
    };

    const [formData, setFormData] = useState<Partial<Round>>(defaultData);
    const [submissionOverridden, setSubmissionOverridden] = useState(false);

    // Auto-set requires_submission based on type (unless manually overridden)
    useEffect(() => {
        if (!submissionOverridden) {
            const isDigital = formData.type === "digital_submission";
            setFormData(prev => ({ ...prev, requires_submission: isDigital }));
        }
    }, [formData.type]);

    useEffect(() => {
        setSubmissionOverridden(false);
        setFormData(
            initialData
                ? {
                    ...initialData,
                    start_time: initialData.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : defaultData.start_time,
                    end_time: initialData.end_time ? new Date(initialData.end_time).toISOString().slice(0, 16) : defaultData.end_time,
                }
                : defaultData
        );
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const isValid = (formData.title?.trim().length ?? 0) > 0;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/70 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg bg-zinc-950 border border-white/8 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/5 flex-shrink-0">
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">Rounds & Schedule</p>
                        <h3 className="text-lg font-black text-white tracking-tight">
                            {initialData ? "Edit Round" : "Add Round"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Phase Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Phase / Label</label>
                        <div className="relative">
                            <select
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white appearance-none focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                                value={formData.phase ?? ""}
                                onChange={e => setFormData({ ...formData, phase: e.target.value })}
                            >
                                {PHASES.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Round Title */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Round Title</label>
                        <input
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                            value={formData.title ?? ""}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Stage 1: The First Step"
                        />
                    </div>

                    {/* Type Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Mechanism</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {TYPES.map(({ value, label, description, icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: value })}
                                    className={cn(
                                        "flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                                        formData.type === value
                                            ? "bg-indigo-500 border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                                            : "bg-zinc-900 border-white/5 hover:border-zinc-700"
                                    )}
                                >
                                    <div className="flex items-center justify-between relative z-10 w-full">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                            formData.type === value ? "bg-white text-indigo-500 shadow-xl" : "bg-white/5 text-zinc-500 group-hover:bg-white/10"
                                        )}>
                                            {icon}
                                        </div>
                                        {formData.type === value && (
                                            <div className="w-5 h-5 rounded-full bg-white text-indigo-500 flex items-center justify-center p-0.5">
                                                <CheckCircle2 size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative z-10">
                                        <span className={cn(
                                            "text-[10px] font-black tracking-widest block",
                                            formData.type === value ? "text-white" : "text-zinc-400"
                                        )}>{label}</span>
                                        <span className={cn(
                                            "text-[9px] font-medium leading-tight line-clamp-2 mt-0.5",
                                            formData.type === value ? "text-white/80" : "text-zinc-600"
                                        )}>{description}</span>
                                    </div>

                                    {/* Subtle background glow */}
                                    {formData.type === value && (
                                        <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/20 blur-2xl rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Enable Digital Submission Toggle */}
                    <div className="rounded-2xl border p-5 transition-all" style={{
                        background: formData.requires_submission ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
                        borderColor: formData.requires_submission ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
                    }}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-black text-white">
                                    Enable Digital Submission?
                                </p>
                                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                                    Turn this on if students need to upload files or links for this specific round.
                                </p>
                            </div>
                            <ToggleSwitch
                                enabled={!!formData.requires_submission}
                                disabled={readOnly}
                                onChange={(val) => {
                                    setSubmissionOverridden(true);
                                    setFormData({ ...formData, requires_submission: val });
                                }}
                            />
                        </div>

                        {!formData.requires_submission && (
                            <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5">
                                <div className="w-4 h-4 rounded-full bg-zinc-700/60 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-[8px] text-zinc-400 font-black">i</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                                    Students will only see the round details and no &ldquo;Submit&rdquo; button.
                                </p>
                            </div>
                        )}
                        {formData.requires_submission && (
                            <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-[8px] text-indigo-400 font-black">✓</span>
                                </div>
                                <p className="text-[10px] text-indigo-400 font-medium leading-relaxed">
                                    A &ldquo;Submit Now&rdquo; button will appear for students during the active window.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Start Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                value={formData.start_time ?? ""}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">End Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                value={formData.end_time ?? ""}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Description <span className="text-zinc-700 normal-case font-medium">(optional)</span></label>
                        <textarea
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-all min-h-[100px] resize-none placeholder:text-zinc-700"
                            value={formData.description ?? ""}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the format, rules, or evaluation criteria for this round..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-8 pb-8 pt-4 border-t border-white/5 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-white/5 hover:text-white transition-all shadow-lg"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={saving || !isValid}
                        onClick={() => onSave(formData)}
                        className="flex-[2] h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {initialData ? "Save Changes" : "Add Round"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({ enabled, onChange, disabled }: { enabled: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!enabled)}
            className={cn(
                "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus:outline-none shrink-0",
                enabled ? "bg-indigo-500" : "bg-zinc-700",
                disabled && "opacity-50 cursor-not-allowed grayscale-[0.5]"
            )}
        >
            <span
                className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
                    enabled ? "translate-x-6" : "translate-x-1"
                )}
            />
        </button>
    );
}

// ─── Registration Toggle Row ──────────────────────────────────────────────────
function ToggleRow({
    icon,
    label,
    description,
    enabled,
    onChange,
    children,
    readOnly,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    enabled: boolean;
    onChange: (val: boolean) => void;
    children?: React.ReactNode;
    readOnly?: boolean;
}) {
    return (
        <motion.div
            layout
            className={cn(
                "p-7 bg-zinc-950 border rounded-[2rem] transition-colors duration-200",
                enabled ? "border-indigo-500/30 shadow-lg shadow-indigo-500/5" : "border-white/5"
            )}
        >
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200",
                        enabled ? "bg-indigo-500/15 text-indigo-400" : "bg-white/5 text-zinc-600"
                    )}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{label}</p>
                        <p className="text-[10px] font-medium text-zinc-500 mt-0.5">{description}</p>
                    </div>
                </div>
                <ToggleSwitch enabled={enabled} onChange={onChange} disabled={readOnly} />
            </div>
            {enabled && children && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t border-white/5"
                >
                    {children}
                </motion.div>
            )}
        </motion.div>
    );
}

// ─── Registration Tab ─────────────────────────────────────────────────────────
function RegistrationTab({
    event,
    onSave,
    saving,
    readOnly,
    updateEvent,
    handleRulebookUpload,
    uploadingRulebook
}: {
    event: EventData;
    onSave: (config: RegistrationConfig) => Promise<void>;
    saving: boolean;
    readOnly?: boolean;
    updateEvent: (patch: Partial<EventData>) => void;
    handleRulebookUpload: (file: File) => Promise<void>;
    uploadingRulebook: boolean;
}) {
    const defaultConfig: RegistrationConfig = {
        collect_resume: false,
        collect_github: false,
        collect_linkedin: false,
        team_participation: false,
        team_min_size: 1,
        team_max_size: 4,
    };

    const [config, setConfig] = useState<RegistrationConfig>(
        event.registration_config ?? defaultConfig
    );

    // Stay in sync if parent re-fetches
    useEffect(() => {
        if (event.registration_config) setConfig(event.registration_config);
    }, [event.registration_config]);

    const update = (patch: Partial<RegistrationConfig>) =>
        setConfig((prev) => ({ ...prev, ...patch }));

    const hasChanges =
        JSON.stringify(config) !== JSON.stringify(event.registration_config ?? defaultConfig);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <header className="flex items-start justify-between p-8 bg-zinc-950 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Registration Form</h3>
                        <p className="text-[10px] text-zinc-500 mt-1 font-medium">Configure what information students provide when they register.</p>
                    </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
            </header>

            {/* Standard Fields Note */}
            <div className="px-2">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-4 ml-1">Always Collected</p>
                <div className="grid grid-cols-3 gap-3">
                    {["Full Name", "Email Address", "Phone Number"].map((field) => (
                        <div key={field} className="flex items-center gap-3 px-5 py-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                            <Check size={14} className="text-emerald-500 shrink-0" />
                            <span className="text-xs font-semibold text-zinc-400">{field}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] ml-1">Optional Fields</p>

                <ToggleRow
                    icon={<FileIcon size={18} />}
                    label="Collect Resume"
                    description="Ask students to upload a PDF resume during registration."
                    enabled={config.collect_resume}
                    onChange={(v) => update({ collect_resume: v })}
                    readOnly={readOnly}
                />

                <ToggleRow
                    icon={<GithubIcon size={18} />}
                    label="Collect GitHub Profile"
                    description="Require a link to the student\'s GitHub portfolio."
                    enabled={config.collect_github}
                    onChange={(v) => update({ collect_github: v })}
                    readOnly={readOnly}
                />

                <ToggleRow
                    icon={<LinkedinIcon size={18} />}
                    label="Collect LinkedIn Profile"
                    description="Require a link to the student's LinkedIn profile."
                    enabled={config.collect_linkedin}
                    onChange={(v) => update({ collect_linkedin: v })}
                    readOnly={readOnly}
                />

                <ToggleRow
                    icon={<Users size={18} />}
                    label="Team Participation"
                    description="Allow or require students to register as a team."
                    enabled={config.team_participation}
                    onChange={(v) => update({ team_participation: v })}
                    readOnly={readOnly}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Min Team Size</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => update({ team_min_size: Math.max(1, config.team_min_size - 1) })}
                                    className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all font-bold text-lg"
                                >−</button>
                                <span className="text-xl font-black text-white w-8 text-center">{config.team_min_size}</span>
                                <button
                                    onClick={() => update({ team_min_size: Math.min(config.team_max_size, config.team_min_size + 1) })}
                                    className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all font-bold text-lg"
                                >+</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Max Team Size</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => update({ team_max_size: Math.max(config.team_min_size, config.team_max_size - 1) })}
                                    className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all font-bold text-lg"
                                >−</button>
                                <span className="text-xl font-black text-white w-8 text-center">{config.team_max_size}</span>
                                <button
                                    onClick={() => update({ team_max_size: config.team_max_size + 1 })}
                                    className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all font-bold text-lg"
                                >+</button>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-600 mt-4">
                        Teams must have between <span className="text-white font-bold">{config.team_min_size}</span> and <span className="text-white font-bold">{config.team_max_size}</span> members.
                    </p>
                </ToggleRow>
            </div>

            {/* Participation Tracks */}
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] ml-1 pt-4">Event Architecture</p>
            <ToggleRow
                icon={<Layers size={18} />}
                label="Participation Tracks / Categories"
                description="Allow students to choose from specific tracks (e.g. Solo vs Group, Different Instruments)."
                enabled={(event.participation_tracks?.length ?? 0) > 0}
                onChange={(enabled) => {
                    updateEvent({ participation_tracks: enabled ? [{ id: crypto.randomUUID(), name: "Main Track", is_team: false }] : [] });
                }}
            >
                <div className="space-y-4">
                    <div className="space-y-3">
                        {event.participation_tracks?.map((track, idx) => (
                            <div key={track.id} className="flex items-center gap-3 group/track animate-in fade-in slide-in-from-left-2 transition-all">
                                <div className="flex-1 relative">
                                    <input
                                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                        value={track.name}
                                        onChange={(e) => {
                                            const newTracks = [...(event.participation_tracks || [])];
                                            newTracks[idx] = { ...newTracks[idx], name: e.target.value };
                                            updateEvent({ participation_tracks: newTracks });
                                        }}
                                        placeholder="Track Name (e.g. Solo Western Dance)"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const newTracks = [...(event.participation_tracks || [])];
                                        newTracks[idx] = { ...newTracks[idx], is_team: !newTracks[idx].is_team };
                                        updateEvent({ participation_tracks: newTracks });
                                    }}
                                    className={cn(
                                        "h-10 px-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        track.is_team ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10"
                                    )}
                                >
                                    {track.is_team ? <Users size={12} /> : <User size={12} />}
                                    {track.is_team ? "Team Required" : "Individual"}
                                </button>
                                <button
                                    onClick={() => {
                                        const newTracks = (event.participation_tracks || []).filter((_, i) => i !== idx);
                                        updateEvent({ participation_tracks: newTracks });
                                    }}
                                    className="w-10 h-10 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500 opacity-0 group-hover/track:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            updateEvent({
                                participation_tracks: [
                                    ...(event.participation_tracks || []),
                                    { id: crypto.randomUUID(), name: "", is_team: false }
                                ]
                            });
                        }}
                        className="w-full h-10 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                    >
                        <Plus size={14} /> Add Pattern / Track
                    </button>
                </div>
            </ToggleRow>

            {/* Rulebook Upload */}
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] ml-1 pt-4">Governance Documents</p>
            <div className="p-7 bg-zinc-950 border border-white/5 rounded-[2rem]">
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                            <ScrollText size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Official Rulebook (PDF)</p>
                            <p className="text-[10px] font-medium text-zinc-500 mt-0.5">Upload the detailed rulebook, scoring criteria, and guidelines.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {event.rulebook_url && (
                            <div className="flex items-center gap-2">
                                <a
                                    href={event.rulebook_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-10 px-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5"
                                >
                                    <Eye size={14} /> View Current
                                </a>
                                <button
                                    onClick={() => {
                                        if (confirm("Remove rulebook from mission?")) {
                                            updateEvent({ rulebook_url: null });
                                        }
                                    }}
                                    className="h-10 w-10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all bg-rose-500/5 rounded-xl border border-rose-500/10"
                                    title="Remove Rulebook"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <label className={cn(
                            "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg",
                            uploadingRulebook ? "bg-zinc-800 text-zinc-500" : "bg-white text-black hover:bg-zinc-200"
                        )}>
                            {uploadingRulebook ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                            {uploadingRulebook ? "Uploading..." : event.rulebook_url ? "Update PDF" : "Upload Rulebook"}
                            <input
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) => e.target.files?.[0] && handleRulebookUpload(e.target.files[0])}
                                disabled={uploadingRulebook}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <p className="text-[10px] font-medium text-zinc-600">
                    {hasChanges || (JSON.stringify(event.participation_tracks) !== JSON.stringify(event.participation_tracks || [])) ? (
                        <span className="text-amber-400 font-bold">● Unsaved changes</span>
                    ) : (
                        <span className="text-emerald-500 font-bold">✓ Settings are up to date</span>
                    )}
                </p>
                <button
                    disabled={saving || (!hasChanges && JSON.stringify(event.participation_tracks) === JSON.stringify(event.participation_tracks || []))}
                    onClick={() => onSave(config)}
                    className="bg-indigo-500 text-white h-12 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Save Registration Settings
                </button>
            </div>
        </div>
    );
}

function PrizesTab({ prizes, onAdd, onEdit, onDelete, readOnly, event, updateEvent }: {
    prizes: Prize[];
    onAdd: () => void;
    onEdit: (p: Prize) => void;
    onDelete: (id: string) => void;
    readOnly?: boolean;
    event?: any;
    updateEvent?: (patch: any) => void;
}) {
    const isUmbrella = event?.event_type === 'umbrella';
    const totalCash = prizes.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

    const rankColors: Record<number, { bg: string; text: string; border: string; glow: string }> = {
        0: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/10" },
        1: { bg: "bg-zinc-400/10", text: "text-zinc-300", border: "border-zinc-400/20", glow: "shadow-zinc-400/5" },
        2: { bg: "bg-orange-700/10", text: "text-orange-600", border: "border-orange-700/20", glow: "shadow-orange-700/5" },
    };

    const iconMap: Record<string, React.ReactNode> = {
        trophy: <Trophy size={22} />,
        medal: <Medal size={22} />,
        certificate: <ScrollText size={22} />,
        briefcase: <Briefcase size={22} />,
        shirt: <Shirt size={22} />,
        gift: <Gift size={22} />,
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header banner */}
            <header className="flex flex-col gap-8 p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Trophy size={32} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                                {isUmbrella
                                    ? "Global Perks & Prize Pool"
                                    : event?.is_competition === false
                                        ? "Event Giveaways & Perks"
                                        : "Prizes & Rewards"
                                }
                            </h3>
                            <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                                {isUmbrella
                                    ? "Consolidated benefits and grand financial pool across all activities."
                                    : event?.is_competition === false
                                        ? "Add lucky draws, free merchandise, or certificates for attendees."
                                        : "Define the prizes that winners will receive for this competition."
                                }
                            </p>
                        </div>
                    </div>

                    {!readOnly && (
                        <button
                            onClick={onAdd}
                            className="flex items-center gap-2 bg-amber-500 text-black h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                        >
                            <Plus size={16} /> {isUmbrella ? "Add Benefit/Perk" : event?.is_competition === false ? "Add Giveaway" : "Add Prize"}
                        </button>
                    )}
                </div>

                {isUmbrella && (
                    <div className="relative z-10 pt-8 border-t border-white/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-4 max-w-sm">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] block ml-1">Overall Prize Pool Value</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-zinc-700">₹</span>
                                    <input
                                        type="number"
                                        disabled={readOnly}
                                        value={event?.budget_required || 0}
                                        onChange={e => updateEvent?.({ budget_required: Number(e.target.value) })}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-6 py-5 text-xl font-black text-white focus:outline-none focus:border-amber-500/30 transition-all"
                                        placeholder="5,00,000"
                                    />
                                </div>
                                <p className="text-[9px] text-zinc-600 ml-1 italic leading-relaxed">This total amount will be highlighted prominently on the main Fest Hub discovery page to drive registrations.</p>
                            </div>

                            {totalCash > 0 && (
                                <div className="p-6 bg-white/5 border border-white/5 rounded-3xl text-right">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Calculated Item Total</p>
                                    <p className="text-3xl font-black text-white tracking-tight">₹{totalCash.toLocaleString('en-IN')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!isUmbrella && totalCash > 0 && (
                    <div className="p-6 bg-white/5 border border-white/5 rounded-3xl absolute top-8 right-10">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Total Prize Pool</p>
                        <p className="text-2xl font-black text-white tracking-tight">₹{totalCash.toLocaleString('en-IN')}</p>
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
            </header>

            {/* Prize Grid */}
            {prizes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {prizes.map((prize, idx) => {
                        const rank = isUmbrella ? { bg: "bg-white/5", text: "text-zinc-500", border: "border-white/5", glow: "" } : (rankColors[idx] ?? { bg: "bg-white/5", text: "text-zinc-500", border: "border-white/5", glow: "" });
                        const ico = iconMap[prize.icon] ?? iconMap.trophy;
                        return (
                            <motion.div
                                key={prize.id ?? idx}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.07 }}
                                className={cn(
                                    "group relative bg-zinc-950 border rounded-[2.5rem] p-8 flex flex-col gap-6 overflow-hidden transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 duration-500",
                                    `${rank.border} hover:${isUmbrella ? "border-amber-500/20" : rank.border} shadow-${rank.glow}`
                                )}
                            >
                                {/* Position badge / Icon area */}
                                <div className="flex items-start justify-between">
                                    {!isUmbrella ? (
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner", rank.bg, rank.text)}>
                                            {idx + 1}
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:text-amber-400 group-hover:scale-110 transition-all shadow-inner">
                                            {ico}
                                        </div>
                                    )}
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                                        <button onClick={() => onEdit(prize)} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                                            {readOnly ? <Eye size={15} /> : <Edit3 size={15} />}
                                        </button>
                                        {!readOnly && (
                                            <button onClick={() => prize.id && onDelete(prize.id)} className="w-10 h-10 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Title & Context */}
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black text-white tracking-tight">{prize.title}</h4>
                                    {!isUmbrella && (
                                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-0.5 capitalize", rank.text)}>
                                            {event?.is_competition === false
                                                ? (prize.category ? prize.category.replace('_', ' ') : "Perk Tier")
                                                : (prize.rank ? prize.rank : (idx === 0 ? "Champions" : idx === 1 ? "1st Runner-Up" : idx === 2 ? "2nd Runner-Up" : `${idx + 1}th Position`))
                                            }
                                        </p>
                                    )}
                                </div>

                                {/* Reward Description */}
                                <div className="space-y-2 py-4 px-5 bg-zinc-900/50 rounded-2xl border border-white/[0.03]">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                        {(isUmbrella || event?.is_competition === false) ? "Perk Description" : "Reward Details"}
                                    </p>
                                    <p className="text-xs font-bold text-zinc-200 leading-relaxed">
                                        {prize.reward || (prize.value ? `₹${Number(prize.value).toLocaleString('en-IN')}` : "—")}
                                    </p>
                                    {isUmbrella && prize.value > 0 && (
                                        <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-zinc-700 uppercase">Estimated Value</span>
                                            <span className="text-xs font-black text-amber-500/60">₹{Number(prize.value).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Icons for standalone/subevents */}
                                {!isUmbrella && (
                                    <div className="absolute top-8 right-8 text-zinc-800/10 -rotate-12">
                                        {ico}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="h-80 bg-zinc-950 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-900">
                        <Trophy size={40} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">No {isUmbrella ? "Perks" : event?.is_competition === false ? "Giveaways" : "Prizes"} Registry</p>
                        <p className="text-[10px] text-zinc-700 max-w-xs mx-auto leading-relaxed">
                            {isUmbrella ? "Add internships, e-certificates, or swag to motivate students across the entire fest spectrum." : "Define reward tiers to incentivize competition and excellence."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function PrizeModal({ isOpen, onClose, onSave, initialData, saving, readOnly, isPerkMode }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (d: Partial<Prize>) => void;
    initialData: Prize | null;
    saving: boolean;
    readOnly?: boolean;
    isPerkMode?: boolean;
}) {
    const ICONS = [
        { key: "trophy", label: "Trophy", node: <Trophy size={18} /> },
        { key: "medal", label: "Medal", node: <Medal size={18} /> },
        { key: "certificate", label: "Cert", node: <ScrollText size={18} /> },
        { key: "briefcase", label: "Career", node: <Briefcase size={18} /> },
        { key: "shirt", label: "Swag", node: <Shirt size={18} /> },
        { key: "gift", label: "Goodie", node: <Gift size={18} /> },
    ];

    const COMP_RANKS = [
        { key: "1st", label: "1st Rank", icon: "trophy" },
        { key: "2nd", label: "2nd Rank", icon: "medal" },
        { key: "3rd", label: "3rd Rank", icon: "medal" },
        { key: "consolation", label: "Consolation / Special", icon: "certificate" },
    ];

    const EXP_CATEGORIES = [
        { key: "lucky_draw", label: "Lucky Draw", icon: "gift" },
        { key: "early_bird", label: "Early Bird", icon: "gift" },
        { key: "all_attendees", label: "For All Attendees", icon: "shirt" },
        { key: "top_x", label: "Top X Participants", icon: "briefcase" },
    ];

    const [formData, setFormData] = useState<Partial<Prize>>({
        title: "",
        value: 0,
        reward: "",
        icon: "trophy",
        rank: "1st",
        category: "lucky_draw",
        is_perk: isPerkMode
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({ ...initialData, is_perk: isPerkMode });
            } else {
                setFormData({
                    title: "",
                    value: 0,
                    reward: "",
                    icon: isPerkMode ? "gift" : "trophy",
                    rank: "1st",
                    category: "lucky_draw",
                    is_perk: isPerkMode
                });
            }
        }
    }, [initialData, isOpen, isPerkMode]);

    if (!isOpen) return null;

    const isValid = (formData.title?.trim().length ?? 0) > 0 && (formData.reward?.trim().length ?? 0) > 0;

    const handleQuickSelect = (key: string, type: "rank" | "category") => {
        const list = type === "rank" ? COMP_RANKS : EXP_CATEGORIES;
        const selected = list.find(item => item.key === key);
        if (selected) {
            setFormData(prev => ({
                ...prev,
                [type]: key,
                title: prev.title === "" || list.some(i => i.label === prev.title) ? selected.label : prev.title,
                icon: selected.icon
            }));
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-10 pt-10 pb-8 border-b border-white/5 bg-white/[0.01]">
                    <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-2">
                            {isPerkMode ? "Event Perk/Giveaway" : "Competition Prize"}
                        </p>
                        <h3 className="text-2xl font-black text-white tracking-tighter">
                            {initialData ? "Refine Reward" : (isPerkMode ? "Add Giveaway" : "Define Award")}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all shadow-inner"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Mode Specific Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                            {isPerkMode ? "Benefit Category" : "Designated Rank"}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(isPerkMode ? EXP_CATEGORIES : COMP_RANKS).map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => handleQuickSelect(key, isPerkMode ? "category" : "rank")}
                                    className={cn(
                                        "px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                        (isPerkMode ? formData.category === key : formData.rank === key)
                                            ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/10"
                                            : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Icon Selector */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Visualization / Icon</label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            {ICONS.map(({ key, label, node }) => (
                                <button
                                    key={key}
                                    onClick={() => setFormData({ ...formData, icon: key })}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all text-[8px] font-black uppercase tracking-widest",
                                        formData.icon === key
                                            ? "bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-lg shadow-amber-500/10 scale-105"
                                            : "bg-zinc-900/50 border-white/5 text-zinc-600 hover:border-zinc-700"
                                    )}
                                >
                                    {node}
                                    <span className="opacity-60">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Title */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                {isPerkMode ? "Perk/Benefit Title" : "Award Title"}
                            </label>
                            <input
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-5 text-base font-bold text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700 shadow-inner"
                                value={formData.title ?? ""}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={isPerkMode ? "e.g. Free Spotify Premium" : "e.g. Winner, Best Solo Artist"}
                            />
                        </div>

                        {/* Reward */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                {isPerkMode ? "Benefit Quantity/Details" : "Prize Details"}
                            </label>
                            <textarea
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-medium text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700 min-h-[100px] resize-none shadow-inner"
                                value={formData.reward ?? ""}
                                onChange={e => setFormData({ ...formData, reward: e.target.value })}
                                placeholder={isPerkMode ? "e.g. 50 T-shirts for first 50 check-ins" : "e.g. ₹20,000 + Trophy"}
                            />
                        </div>

                        {/* Financial Value */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                Estimated Cash Component (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-zinc-700">₹</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-6 py-5 text-base font-black text-white focus:outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                    value={formData.value ?? 0}
                                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                />
                            </div>
                            <p className="text-[9px] text-zinc-600 ml-1 italic leading-relaxed">Financial value for auditing and prize pool calculations.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-4 px-10 pb-10 pt-6 bg-white/[0.01]">
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-500 border border-white/5 hover:text-white hover:bg-zinc-800 transition-all"
                    >
                        Dismiss
                    </button>
                    {!readOnly && (
                        <button
                            disabled={saving || !isValid}
                            onClick={() => onSave(formData)}
                            className="flex-[2] h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed scale-100 active:scale-95"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {initialData ? "Sync Entry" : (isPerkMode ? "Deploy Perk" : "Initiate Tier")}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function SettingsTab({
    event,
    updateEvent,
    venues,
    readOnly,
    onArchive,
    onSave,
    saving,
    conflictStatus,
    checkingConflict,
    venueAvailability,
    isStaffStudent
}: any) {
    const isArchived = event.status === "archived";
    const selectedVenue = venues.find((v: any) => v.id === event.venue_id);

    // Helper to format ISO strings to local YYYY-MM-DDTHH:mm for input
    const toLocalISO = (iso?: string) => {
        if (!iso) return "";
        try {
            const date = new Date(iso);
            if (isNaN(date.getTime())) return "";
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().slice(0, 16);
        } catch (e) {
            return "";
        }
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Checking Conflict Status Message */}
            {checkingConflict && (
                <div className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl animate-pulse">
                    <Loader2 size={14} className="animate-spin text-cyan-400" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Checking for campus conflicts...</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Date & Time Section */}
                <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Date & Time</h3>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Event lifecycle bounds</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Start Date & Time (Event Happens)</label>
                            <div className="relative">
                                <input
                                    disabled={readOnly}
                                    type="datetime-local"
                                    value={toLocalISO(event.start_time)}
                                    onChange={e => updateEvent({ start_time: new Date(e.target.value).toISOString() })}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/40 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">End Date & Time (Event Over)</label>
                            <div className="relative">
                                <input
                                    disabled={readOnly}
                                    type="datetime-local"
                                    value={toLocalISO(event.end_time)}
                                    onChange={e => updateEvent({ end_time: new Date(e.target.value).toISOString() })}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/40 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Registration Window Section */}
                <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <Timer size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Registration Window</h3>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Control enrollment bounds</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Registration Opens (Students apply)</label>
                            <div className="relative">
                                <input
                                    disabled={readOnly}
                                    type="datetime-local"
                                    value={toLocalISO(event.reg_start_time)}
                                    onChange={e => updateEvent({ reg_start_time: new Date(e.target.value).toISOString() })}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-cyan-500/40 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Registration Closes (Deadline)</label>
                            <div className="relative">
                                <input
                                    disabled={readOnly}
                                    type="datetime-local"
                                    value={toLocalISO(event.reg_end_time)}
                                    onChange={e => updateEvent({ reg_end_time: new Date(e.target.value).toISOString() })}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-cyan-500/40 transition-all disabled:opacity-50"
                                />
                                <p className="text-[8px] text-zinc-600 font-bold mt-2 italic ml-1 uppercase tracking-widest">Enrollment must end before the event starts.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Venue Section */}
                <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Event Venue</h3>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Physical or Digital location</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="relative group/select">
                            <select
                                disabled={readOnly}
                                value={event.venue_id || ""}
                                onChange={e => updateEvent({ venue_id: e.target.value === "" ? null : e.target.value })}
                                className={cn(
                                    "w-full bg-zinc-900 border rounded-2xl px-6 py-5 text-sm font-bold text-white appearance-none focus:outline-none transition-all disabled:opacity-50 pr-12",
                                    conflictStatus.type === 'HARD' ? "border-rose-500/50" : "border-white/5 focus:border-rose-500/40"
                                )}
                            >
                                <option value="">Online / Remote Platform</option>
                                {venues.map((v: any) => {
                                    const availability = venueAvailability[v.id];
                                    return (
                                        <option key={v.id} value={v.id} disabled={availability?.isBooked}>
                                            {v.name.toUpperCase()} (Cap: {v.capacity})
                                            {availability?.isBooked ? ` — 🚫 BOOKED: ${availability.eventName}` : ' — ✅ AVAILABLE'}
                                        </option>
                                    );
                                })}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-focus-within/select:rotate-180 transition-transform">
                                <ChevronDown size={18} />
                            </div>
                        </div>

                        {/* Conflict Alerts */}
                        <AnimatePresence mode="wait">
                            {conflictStatus.type === 'HARD' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-4 text-rose-400"
                                >
                                    <AlertCircle size={18} className="shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest">🚫 VENUE UNAVAILABLE</p>
                                        <p className="text-[11px] font-medium leading-relaxed uppercase">{conflictStatus.message}</p>
                                    </div>
                                </motion.div>
                            )}
                            {conflictStatus.type === 'SOFT' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 text-amber-400"
                                >
                                    <AlertTriangle size={18} className="shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest">⚠️ OPERATIONAL ADVISORY</p>
                                        <p className="text-[11px] font-medium leading-relaxed uppercase">{conflictStatus.message}</p>
                                    </div>
                                </motion.div>
                            )}
                            {conflictStatus.type === 'NONE' && conflictStatus.message && !checkingConflict && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 px-2"
                                >
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                    <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">{conflictStatus.message}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {selectedVenue && conflictStatus.type !== 'HARD' && (
                            <div className="flex items-center gap-3 px-5 py-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400">
                                <Users size={14} className="shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                    Institutional Capacity: <span className="text-white ml-1">{selectedVenue.capacity} Seats</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Marketplace & Visibility Section */}
                <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Globe size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Marketplace & Visibility</h3>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Global Reach settings</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className={cn(
                            "rounded-2xl border p-6 transition-all",
                            event.is_public ? "bg-indigo-500/5 border-indigo-500/20" : "bg-zinc-900/40 border-white/5"
                        )}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-white">Publish to National Marketplace</p>
                                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                                        If ON, students from all colleges in India can see and register for this event.
                                        If OFF, only your college students can see it.
                                    </p>
                                </div>
                                <ToggleSwitch
                                    enabled={!!event.is_public}
                                    onChange={(val: boolean) => updateEvent({ is_public: val })}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        {event.is_public && (
                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3 text-amber-500">
                                <Zap size={14} className="shrink-0 mt-0.5" />
                                <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                                    Strategic Impact: Publishing globally increases visibility by 12x but requires HOD verification of national compliance.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><IndianRupee size={18} className="text-emerald-500" /> Professional Budget</h3>
                    <div className="relative group">
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-800 group-focus-within:text-emerald-500 transition-colors">₹</span>
                        <input
                            disabled={readOnly}
                            type="number"
                            className="w-full bg-zinc-900 border border-white/10 rounded-[2rem] pl-16 pr-8 py-6 text-2xl font-black text-white focus:outline-none focus:border-emerald-500/30 transition-all disabled:opacity-50"
                            value={event.budget_required}
                            onChange={e => updateEvent({ budget_required: Number(e.target.value) })}
                        />
                    </div>
                </div>
                <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Shield size={18} className="text-amber-400" /> Risk Assessment</h3>
                    <div className="flex gap-4">
                        {["low", "medium", "high"].map(lvl => (
                            <button
                                key={lvl}
                                disabled={readOnly}
                                onClick={() => updateEvent({ risk_level: lvl })}
                                className={cn(
                                    "flex-1 py-5 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
                                    event.risk_level === lvl
                                        ? "bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20"
                                        : "bg-zinc-900 border-white/5 text-zinc-600 hover:border-white/10",
                                    readOnly && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sync Button Container */}
            <div className="flex items-center justify-between pt-10 border-t border-white/5">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest italic ml-2">
                    {readOnly ? "Mission parameters are immutable" : "Changes effect student event views immediately"}
                </p>
                {!readOnly && (
                    <button
                        disabled={saving || conflictStatus.type === 'HARD'}
                        onClick={onSave}
                        className={cn(
                            "h-14 px-12 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 transition-all shadow-2xl disabled:opacity-50 active:scale-95",
                            conflictStatus.type === 'HARD' ? "bg-zinc-900 border border-white/5 text-zinc-600" : "bg-white text-black hover:bg-zinc-200"
                        )}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : (conflictStatus.type === 'HARD' ? <AlertCircle size={16} /> : <Save size={16} />)}
                        {conflictStatus.type === 'HARD' ? "Conflict Blocked" : "Save Governance Settings"}
                    </button>
                )}
            </div>

            {/* Final Review & HOD Submission Card */}
            {!isStaffStudent && (event.status === "draft" || event.status === "review_pending" || event.status === "revision_required" || event.status === "changes_requested") && (
                <div className="p-12 border-2 border-indigo-500/10 rounded-[4rem] bg-indigo-500/[0.02] flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative">
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <ShieldCheck size={18} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Verification</span>
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase italic leading-none tracking-tighter">
                            Final Review & HOD Submission
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium max-w-sm leading-relaxed">
                            Confirm mission parameters, venue availability, and budget allocation. Once submitted, the HOD will review this blueprint for official authorization.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            onSave().then(() => {
                                window.dispatchEvent(new CustomEvent('trigger-publish-modal'));
                            });
                        }}
                        className="h-16 px-12 rounded-[2rem] bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black uppercase tracking-widest hover:from-amber-400 hover:to-orange-400 transition-all shadow-2xl shadow-amber-500/20 z-10 flex items-center gap-3 active:scale-95"
                    >
                        <Send size={18} />
                        🚀 Submit to HOD
                    </button>
                    <div className="absolute right-0 top-0 opacity-[0.03] text-indigo-500 -translate-y-1/2 translate-x-1/4 pointer-events-none">
                        <Send size={320} />
                    </div>
                </div>
            )}

            {/* Lifecycle Area */}
            {!isArchived && (
                <div className="p-12 border-2 border-rose-500/10 rounded-[4rem] bg-rose-500/[0.02] flex items-center justify-between gap-10 overflow-hidden relative">
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3 text-rose-500">
                            <Trash2 size={18} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Lifecycle Governance</span>
                        </div>
                        <h4 className="text-2xl font-black text-rose-100 uppercase italic leading-none tracking-tighter">
                            {readOnly ? "Archive Records" : "Permanent Deletion"}
                        </h4>
                        <p className="text-xs text-rose-500/50 font-medium max-w-sm leading-relaxed">
                            {readOnly
                                ? "Move this completed mission to the historical archives. Data will be preserved for institutional audit logs."
                                : "Proceed with caution. Removing this entry will purge all associated rounds, prizes, and registrations from the ledger."
                            }
                        </p>
                    </div>
                    <button
                        onClick={onArchive}
                        className="h-16 px-12 rounded-[2rem] border-2 border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-2xl shadow-rose-500/10 whitespace-nowrap z-10"
                    >
                        {readOnly ? "Move to Archive" : "Destroy Event Profile"}
                    </button>
                    <div className="absolute right-0 top-0 opacity-[0.03] text-rose-500 -translate-y-1/2 translate-x-1/4 pointer-events-none">
                        <Trash2 size={320} />
                    </div>
                </div>
            )}
        </div>
    );
}


// ─── FAQs Tab ────────────────────────────────────────────────────────────────

function FaqsTab({ faqs, onChange, onSave, saving, readOnly }: {
    faqs: FAQ[];
    onChange: (faqs: FAQ[]) => void;
    onSave: () => void;
    saving: boolean;
    readOnly?: boolean;
}) {
    const [expanded, setExpanded] = useState<string | null>(null);

    const addFaq = () => {
        const newFaq: FAQ = { id: crypto.randomUUID(), question: "", answer: "" };
        onChange([...faqs, newFaq]);
        setExpanded(newFaq.id);
    };

    const updateFaq = (id: string, field: "question" | "answer", value: string) => {
        onChange(faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const deleteFaq = (id: string) => {
        onChange(faqs.filter(f => f.id !== id));
        if (expanded === id) setExpanded(null);
    };

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-violet-400 mb-1">
                        <HelpCircle size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Frequently Asked Questions</span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">FAQs</h2>
                    <p className="text-xs text-zinc-600 mt-1">Answer common questions students will ask. Shown on the event page.</p>
                </div>
                {!readOnly && (
                    <button
                        onClick={addFaq}
                        className="flex items-center gap-2 h-11 px-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest hover:bg-violet-500/20 transition-all"
                    >
                        <Plus size={14} /> Add Question
                    </button>
                )}
            </div>

            {/* FAQ List */}
            {faqs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-5 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <div className="w-16 h-16 rounded-[2rem] bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <HelpCircle size={28} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-zinc-400">No FAQs yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Add questions students typically ask about your event.</p>
                    </div>
                    <button
                        onClick={addFaq}
                        className="mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-dashed border-violet-500/30 text-violet-400 text-[10px] font-black uppercase tracking-widest hover:border-violet-500/60 transition-all"
                    >
                        <Plus size={14} /> Add Your First FAQ
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                        <div
                            key={faq.id}
                            className={cn(
                                "rounded-[1.75rem] border overflow-hidden transition-all",
                                expanded === faq.id
                                    ? "border-violet-500/30 bg-violet-500/5"
                                    : "border-white/5 bg-zinc-950 hover:border-white/10"
                            )}
                        >
                            {/* Accordion Header */}
                            <div
                                className="flex items-center gap-4 px-6 py-5 cursor-pointer"
                                onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                            >
                                <div className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-black text-[10px] shrink-0">
                                    {idx + 1}
                                </div>
                                {expanded === faq.id ? (
                                    <input
                                        type="text"
                                        placeholder="e.g. Is there a participation fee?"
                                        value={faq.question}
                                        onChange={e => { e.stopPropagation(); updateFaq(faq.id, "question", e.target.value); }}
                                        onClick={e => e.stopPropagation()}
                                        className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none placeholder:text-zinc-700"
                                        autoFocus
                                    />
                                ) : (
                                    <span className={cn("flex-1 text-sm font-bold truncate", faq.question ? "text-white" : "text-zinc-700 italic")}>
                                        {faq.question || "Untitled question…"}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 shrink-0">
                                    {!readOnly && (
                                        <button
                                            onClick={e => { e.stopPropagation(); deleteFaq(faq.id); }}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                    {expanded === faq.id
                                        ? <ChevronUp size={16} className="text-violet-400" />
                                        : <ChevronDown size={16} className="text-zinc-600" />
                                    }
                                </div>
                            </div>

                            {/* Accordion Body */}
                            {expanded === faq.id && (
                                <div className="px-6 pb-5 border-t border-violet-500/10">
                                    <div className="mt-4 space-y-1">
                                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Answer</label>
                                        <textarea
                                            rows={4}
                                            placeholder="e.g. No, participation is completely free for all registered students."
                                            value={faq.answer}
                                            onChange={e => updateFaq(faq.id, "answer", e.target.value)}
                                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm text-zinc-300 font-medium leading-relaxed focus:outline-none focus:border-violet-500/30 resize-none placeholder:text-zinc-700 transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Tips */}
            {faqs.length > 0 && (
                <div className="p-5 bg-zinc-900/40 rounded-[1.5rem] border border-white/5 flex gap-4">
                    <div className="w-8 h-8 shrink-0 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                        <Zap size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pro Tips</p>
                        <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                            Add 5–8 FAQs to reduce support messages. Cover: fees, eligibility, team size, submission format, and results timeline.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-6 border-t border-white/5">
                <button
                    disabled={saving}
                    onClick={onSave}
                    className="bg-white text-black h-12 px-10 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save FAQs
                </button>
            </div>
        </div>
    );
}

// ─── Sponsors & Partners Tab ─────────────────────────────────────────────────
const STANDARD_TIERS = [
    { value: "Title Sponsor", label: "Title Sponsor", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" },
    { value: "Powered By", label: "Powered By", color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/10" },
    { value: "Associate Sponsor", label: "Associate Sponsor", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
    { value: "Media Partner", label: "Media Partner", color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" },
    { value: "Gold", label: "Gold", color: "text-amber-300", border: "border-amber-400/20", bg: "bg-amber-400/5" },
    { value: "Silver", label: "Silver", color: "text-zinc-300", border: "border-zinc-400/20", bg: "bg-zinc-400/5" },
];

function SponsorsTab({ sponsors, parentSponsors = [], onChange, onSave, saving, readOnly }: {
    sponsors: Sponsor[];
    parentSponsors?: Sponsor[];
    onChange: (sponsors: Sponsor[]) => void;
    onSave: () => void;
    saving: boolean;
    readOnly?: boolean;
}) {
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    // Merge local and inherited sponsors for display logic
    const mergedSponsors = [
        ...parentSponsors.map(s => ({ ...s, isGlobal: true })),
        ...sponsors.map(s => ({ ...s, isGlobal: false }))
    ];

    const addSponsor = (tier: string = "Gold") => {
        onChange([...sponsors, { id: crypto.randomUUID(), name: "", logo_url: "", tier, website_url: "" }]);
    };

    const updateSponsor = (id: string, updates: Partial<Sponsor>) => {
        onChange(sponsors.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteSponsor = (id: string) => {
        onChange(sponsors.filter(s => s.id !== id));
    };

    const handleFileUpload = async (id: string, file: File) => {
        if (!file) return;
        setUploadingId(id);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${id}_${Date.now()}.${ext}`;
            const path = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("sponsor-logos")
                .upload(path, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("sponsor-logos")
                .getPublicUrl(path);

            updateSponsor(id, { logo_url: publicUrl });
        } catch (err: any) {
            console.error("Logo upload failed:", err);
            alert("Upload failed: " + err.message);
        } finally {
            setUploadingId(null);
        }
    };

    // Group sponsors by their actual tier names from the merged list
    const tiersInUse = Array.from(new Set(mergedSponsors.map(s => s.tier)));

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                        <Handshake size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Alliances & Branding</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-white tracking-tight">Sponsors</h2>
                        {parentSponsors.length > 0 && (
                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest shadow-lg italic">
                                {parentSponsors.length} Inherited from Fest Hub
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">Manage event partners and their visibility tiers.</p>
                </div>
                {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                        {STANDARD_TIERS.slice(0, 4).map(t => (
                            <button
                                key={t.value}
                                onClick={() => addSponsor(t.value)}
                                className={cn(
                                    "flex items-center gap-2 h-10 px-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95",
                                    t.border, t.bg, t.color
                                )}
                            >
                                <Plus size={12} /> {t.label}
                            </button>
                        ))}
                        <button
                            onClick={() => addSponsor("Custom Partner")}
                            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10"
                        >
                            <Plus size={12} /> Custom Ally
                        </button>
                    </div>
                )}
            </div>

            {mergedSponsors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-950/20">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/10">
                        <Handshake size={32} />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-base font-black text-zinc-400 uppercase tracking-widest">No Active Alliances</p>
                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Select a tier above to initiate a partner profile</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-12">
                    {tiersInUse.map(tierName => {
                        const list = mergedSponsors.filter(s => s.tier === tierName);
                        const tierConfig = STANDARD_TIERS.find(t => t.value === tierName) || {
                            color: "text-zinc-400",
                            border: "border-white/10",
                            bg: "bg-white/5"
                        };

                        return (
                            <div key={tierName} className="space-y-6">
                                {/* Tier Title with Inline Edit */}
                                <div className="flex items-center gap-4 group">
                                    <div className={cn("w-2 h-8 rounded-full bg-current", tierConfig.color)} />
                                    <h3 className={cn("text-xl font-black uppercase tracking-[0.2em]", tierConfig.color)}>
                                        {tierName}
                                    </h3>
                                    <div className="flex-1 h-px bg-white/5" />
                                    <span className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.2em] italic">{list.length} Partner{list.length !== 1 ? 's' : ''}</span>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {list.map(sponsor => (
                                        <div
                                            key={sponsor.id}
                                            className={cn(
                                                "rounded-[2.5rem] border p-6 space-y-6 transition-all bg-zinc-950/40 relative group overflow-hidden",
                                                tierConfig.border,
                                                sponsor.isGlobal && "ring-1 ring-indigo-500/20 bg-indigo-500/[0.02]"
                                            )}
                                        >
                                            {/* GLOBAL Badge */}
                                            {sponsor.isGlobal && (
                                                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500 text-white text-[8px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20">
                                                    <Globe size={10} className="animate-pulse" />
                                                    GLOBAL PARTNER
                                                </div>
                                            )}

                                            <div className="flex gap-6">
                                                {/* Logo Upload Dropzone */}
                                                <div className="relative group/logo shrink-0">
                                                    <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden group-hover:border-white/20 transition-all shadow-inner">
                                                        {uploadingId === sponsor.id ? (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <Loader2 size={24} className="animate-spin text-amber-500" />
                                                            </div>
                                                        ) : sponsor.logo_url ? (
                                                            <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-full object-contain p-3" />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2 text-zinc-800">
                                                                <Handshake size={24} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!readOnly && !sponsor.isGlobal && (
                                                        <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 transition-opacity bg-black/60 rounded-3xl flex items-center justify-center">
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(sponsor.id, e.target.files[0])}
                                                            />
                                                            <Plus size={20} className="text-white" />
                                                        </label>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-4 pt-1 min-w-0">
                                                    <div>
                                                        <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ml-1">Company / Brand Name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Red Bull"
                                                            value={sponsor.name}
                                                            disabled={readOnly || sponsor.isGlobal}
                                                            onChange={e => updateSponsor(sponsor.id, { name: e.target.value })}
                                                            className="w-full bg-transparent text-lg font-black text-white focus:outline-none placeholder:text-zinc-800 truncate"
                                                        />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ml-1">Official Website</label>
                                                            <div className="flex items-center gap-3 bg-zinc-900/50 rounded-2xl px-4 py-3 border border-white/5 group-hover:border-white/10 transition-all">
                                                                <Globe size={14} className="text-zinc-600 shrink-0" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="https://brand.com"
                                                                    value={sponsor.website_url || ""}
                                                                    disabled={readOnly || sponsor.isGlobal}
                                                                    onChange={e => updateSponsor(sponsor.id, { website_url: e.target.value })}
                                                                    className="flex-1 bg-transparent text-xs text-zinc-400 focus:outline-none placeholder:text-zinc-700 truncate"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions or Attribution */}
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                {sponsor.isGlobal ? (
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck size={12} className="text-indigo-500" />
                                                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider italic">
                                                            Inherited from Institutional Tier — Read Only
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest border-r border-white/10 pr-3 mr-1">Change Tier</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {STANDARD_TIERS.map(t => (
                                                                <button
                                                                    key={t.value}
                                                                    onClick={() => updateSponsor(sponsor.id, { tier: t.value })}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                                                                        sponsor.tier === t.value
                                                                            ? cn(t.color, t.border, t.bg)
                                                                            : "border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-400"
                                                                    )}
                                                                >
                                                                    {t.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {!readOnly && !sponsor.isGlobal && (
                                                    <button
                                                        onClick={() => deleteSponsor(sponsor.id)}
                                                        className="w-10 h-10 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Live Visualization Preview */}
            {mergedSponsors.length > 0 && (
                <div className="p-8 bg-zinc-900/20 border border-white/5 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3">
                        <Eye size={14} className="text-zinc-600" />
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] font-mono">Live Visualizer — Public Matrix Preview</p>
                    </div>
                    <div className="flex flex-wrap gap-12">
                        {tiersInUse.map(tierName => {
                            const list = mergedSponsors.filter(s => s.tier === tierName);
                            const tierConfig = STANDARD_TIERS.find(t => t.value === tierName) || { color: "text-zinc-500" };
                            return (
                                <div key={tierName} className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1 h-3 rounded-full bg-current", tierConfig.color)} />
                                        <p className={cn("text-[8px] font-black uppercase tracking-[0.2em]", tierConfig.color)}>{tierName}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {list.map(s => (
                                            <div key={s.id} className="flex flex-col items-center gap-3 bg-zinc-950 border border-white/5 rounded-[1.75rem] p-4 min-w-[124px] group/item hover:border-indigo-500/30 transition-all shadow-xl">
                                                <div className="w-12 h-12 flex items-center justify-center relative">
                                                    {s.logo_url ? (
                                                        <img src={s.logo_url} alt={s.name} className="max-h-full max-w-full object-contain grayscale group-hover/item:grayscale-0 transition-all duration-700" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">
                                                            <Handshake size={14} className="text-zinc-800" />
                                                        </div>
                                                    )}
                                                    {s.isGlobal && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                                                </div>
                                                <div className="text-center w-full">
                                                    <span className="text-[9px] font-bold text-zinc-500 group-hover/item:text-white transition-colors truncate block">{s.name || "Untitled Ally"}</span>
                                                    {s.isGlobal && <span className="text-[7px] font-black text-indigo-500/60 uppercase tracking-widest italic">Global</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-8 border-t border-white/5">
                {!readOnly && (
                    <button
                        disabled={saving}
                        onClick={onSave}
                        className="bg-white text-black h-14 px-12 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-amber-400 transition-all shadow-2xl disabled:opacity-50 active:scale-95"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Partners Spectrum
                    </button>
                )}
            </div>
        </div>
    );
}

function PreviewOverlay({ isOpen, onClose, eventId }: { isOpen: boolean; onClose: () => void; eventId: string }) {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[500] bg-[#09090b] overflow-y-auto overflow-x-hidden font-sans"
        >
            <StudentEventView eventId={eventId} previewMode={true} onClosePreview={onClose} />
        </motion.div>
    );
}

// ─── Sub-Events Tab ───
function SubEventsTab({ parentId, subEvents, festDomains, onRefresh, onDeleteSubEvent, onPreview, readOnly }: {
    parentId: string;
    subEvents: any[];
    festDomains: FestDomain[];
    onRefresh: () => void;
    onDeleteSubEvent: (id: string, title: string) => void;
    onPreview: (id: string) => void;
    readOnly: boolean;
}) {
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSubEvent, setEditingSubEvent] = useState<any>(null);

    const handleEditSubEvent = (ev: any) => {
        setEditingSubEvent(ev);
        setIsCreateModalOpen(true);
    };

    // High-Precision Grouping Logic: Level 1 (Domain Name) -> Level 2 (Category Row)
    const groupedData = subEvents.reduce((acc: any, event) => {
        // Level 1: Find Domain Name or use fallback
        const domainName = festDomains.find(d => d.id === event.fest_domain_id)?.name || "General Domain";

        const rawCategory = (event.fest_category || "Standard").trim();
        const categoryKey = rawCategory.toUpperCase();

        if (!acc[domainName]) acc[domainName] = {};
        if (!acc[domainName][categoryKey]) {
            acc[domainName][categoryKey] = { displayName: rawCategory, events: [] };
        }

        acc[domainName][categoryKey].events.push(event);
        return acc;
    }, {});

    return (
        <div className="space-y-12 pb-20">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                        Fest Matrix
                        <div className="h-1 w-12 bg-cyan-500 rounded-full" />
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">Operational grid of all deployed activities</p>
                </div>
                {!readOnly && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-12 px-8 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-cyan-400 transition-all shadow-xl active:scale-95"
                    >
                        <Plus size={14} /> Initialize Sub-Event
                    </button>
                )}
            </div>

            <div className="space-y-16">
                {Object.keys(groupedData).length > 0 ? (
                    <div className="space-y-16">
                        {Object.entries(groupedData).map(([domainName, categories]: [string, any]) => (
                            <div key={domainName} className="space-y-8">
                                {/* Domain Level 1 Header */}
                                <div className="flex items-center gap-6">
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.5em] px-6 py-2.5 bg-white/5 rounded-full border border-white/10 shrink-0 italic">
                                        {domainName}
                                    </h3>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>

                                <div className="space-y-12 pl-6 md:pl-10 border-l border-white/5 ml-4">
                                    {Object.entries(categories).map(([categoryKey, group]: [string, any]) => (
                                        <div key={categoryKey} className="space-y-8">
                                            {/* Category Level 2 Title (The Row) */}
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-6 bg-cyan-500 rounded-full" />
                                                <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">
                                                    {group.displayName.toUpperCase().replace(/\sROW$/, "")} Row
                                                </h4>
                                            </div>

                                            {/* Sub-Event Cards */}
                                            <div className="grid grid-cols-1 gap-4">
                                                {group.events.map((ev: any) => (
                                                    <div key={ev.id} className="p-6 md:p-8 rounded-[2.5rem] bg-zinc-900/30 border border-white/[0.03] group hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all duration-500">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center border border-white/5 text-zinc-600 group-hover:text-cyan-400 transition-all group-hover:scale-110 shadow-inner shrink-0">
                                                                    <Zap size={20} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <h3 className="font-black text-base text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{ev.title}</h3>
                                                                        <div className={cn(
                                                                            "px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm",
                                                                            ev.status === 'approved' || ev.status === 'live' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                                                ev.status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                                                                    "bg-white/5 border-white/10 text-zinc-500"
                                                                        )}>
                                                                            {ev.status}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-5 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.1em]">
                                                                        <span className="flex items-center gap-2"><Calendar size={11} className="text-zinc-700" /> {new Date(ev.start_time).toLocaleDateString()}</span>
                                                                        <span className="flex items-center gap-2"><Users size={11} className="text-zinc-700" /> {ev.registered_count} Registrations</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4 justify-end">
                                                                <div className="flex items-center gap-2 mr-2">
                                                                    <button
                                                                        onClick={() => handleEditSubEvent(ev)}
                                                                        className="w-10 h-10 rounded-2xl bg-zinc-950/50 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                                                                        title="Edit Sub-Event"
                                                                    >
                                                                        <Edit3 size={15} />
                                                                    </button>
                                                                    {!readOnly && (
                                                                        <button
                                                                            onClick={() => onDeleteSubEvent(ev.id, ev.title)}
                                                                            className="w-10 h-10 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
                                                                            title="Delete Sub-Event"
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <button
                                                                        onClick={() => onPreview(ev.id)}
                                                                        className="text-[9px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 group/link"
                                                                    >
                                                                        Public <Eye size={12} className="group-hover/link:text-cyan-400" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => router.push(`/faculty/event/${ev.id}/manage`)}
                                                                        className="h-11 px-6 rounded-2xl bg-zinc-900 border border-white/5 text-white hover:bg-white hover:text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 translate-y-0 hover:-translate-y-1"
                                                                    >
                                                                        Manage <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center space-y-6 bg-zinc-900/20 rounded-[4rem] border border-dashed border-white/5">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center mx-auto text-zinc-800 border border-white/5 shadow-2xl">
                            <Layers size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] italic">Operational Registry Empty</p>
                            <p className="text-xs text-zinc-700 max-w-xs mx-auto font-medium leading-relaxed">
                                Deploy competitions, bootcamps, or events to initialize the fest's mission roadmap.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-10 px-6 rounded-xl bg-white/5 border border-white/5 text-zinc-500 hover:text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            Create First Activity
                        </button>
                    </div>
                )}
            </div>

            <SubEventModal
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setEditingSubEvent(null); }}
                parentId={parentId}
                festDomains={festDomains}
                onSuccess={onRefresh}
                initialData={editingSubEvent}
            />
        </div>
    );
}

function SubEventModal({ isOpen, onClose, parentId, festDomains, onSuccess, initialData }: {
    isOpen: boolean;
    onClose: () => void;
    parentId: string;
    festDomains: FestDomain[];
    onSuccess: () => void;
    initialData?: any;
}) {
    const [title, setTitle] = useState("");
    const [domainId, setDomainId] = useState("");
    const [category, setCategory] = useState("");
    const [isCompetition, setIsCompetition] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || "");
            setDomainId(initialData.fest_domain_id || "");
            setCategory(initialData.fest_category || "");
            setIsCompetition(initialData.is_competition !== false);
        } else {
            setTitle("");
            setDomainId("");
            setCategory("");
        }
    }, [initialData, isOpen]);

    const handleAction = async () => {
        if (!title.trim() || !domainId) return;
        setLoading(true);
        try {
            if (initialData) {
                // Update
                const { error } = await supabase
                    .from("events")
                    .update({
                        title: title.trim(),
                        fest_domain_id: domainId,
                        fest_category: category.trim() || "General",
                        is_competition: isCompetition
                    })
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                // Create
                const { data: parent } = await supabase.from("events").select("*").eq("id", parentId).single();
                if (!parent) throw new Error("Parent fest not found");

                const { error } = await supabase
                    .from("events")
                    .insert({
                        title: title.trim(),
                        description: `Part of ${parent.title}`,
                        creator_id: parent.creator_id,
                        department_id: parent.department_id,
                        status: "draft",
                        risk_level: "low",
                        budget_required: 0,
                        start_time: parent.start_time,
                        end_time: parent.end_time,
                        venue_id: parent.venue_id,
                        club_id: parent.club_id,
                        parent_event_id: parentId,
                        event_type: "sub_event",
                        fest_domain_id: domainId,
                        fest_category: category.trim() || "General",
                        is_competition: isCompetition,
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
                                    <h3 className="text-xl font-black text-white tracking-tight italic">
                                        {initialData ? "UPDATE_SUBSIDIARY" : "DEPLOY_SUBSIDIARY"}
                                    </h3>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                                        {initialData ? "Modifying Operational Parameters" : "Integrating Activity into Fest Matrix"}
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/5 text-zinc-600 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Activity Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. RoboWars, Capture The Flag"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/40 transition-all placeholder:text-zinc-800"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Fest Domain</label>
                                        <select
                                            value={domainId}
                                            onChange={e => setDomainId(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-[11px] font-bold focus:outline-none focus:border-cyan-500/40 transition-all appearance-none"
                                        >
                                            <option value="">Select Domain</option>
                                            {festDomains.map(d => (
                                                <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Category Row</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Robotics, Gaming"
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-[11px] font-bold focus:outline-none focus:border-cyan-500/40 transition-all placeholder:text-zinc-800"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Event Mode</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsCompetition(true)}
                                            className={cn(
                                                "p-6 rounded-3xl border text-left transition-all space-y-3",
                                                isCompetition
                                                    ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20"
                                                    : "bg-zinc-900/50 border-white/5 opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", isCompetition ? "bg-indigo-500 text-white" : "bg-white/5 text-zinc-500")}>
                                                <Trophy size={20} />
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-black uppercase tracking-tight leading-none mb-1", isCompetition ? "text-indigo-400" : "text-zinc-500")}>Competition Mode</p>
                                                <p className="text-[9px] font-medium text-zinc-500 leading-tight">Use for Hackathons, Dance Competitions, Debates (Has judges, rounds, and winners).</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsCompetition(false)}
                                            className={cn(
                                                "p-6 rounded-3xl border text-left transition-all space-y-3",
                                                !isCompetition
                                                    ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20"
                                                    : "bg-zinc-900/50 border-white/5 opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", !isCompetition ? "bg-amber-500 text-white" : "bg-white/5 text-zinc-500")}>
                                                <Ticket size={20} />
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-black uppercase tracking-tight leading-none mb-1", !isCompetition ? "text-amber-400" : "text-zinc-500")}>Experience Mode</p>
                                                <p className="text-[9px] font-medium text-zinc-500 leading-tight">Use for Concerts, Guest Lectures, Exhibitions (Ticketing & RSVP only. No judging).</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex gap-4 text-cyan-400">
                                    <Zap size={16} className="shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold leading-relaxed uppercase tracking-[0.1em]">
                                        Automated inheritance active. This module will synchronize with the parent fest's timeline and compliance parameters by default.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 h-14 rounded-2xl bg-zinc-950 border border-white/5 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-zinc-400 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={loading || !title.trim() || !domainId}
                                    className="flex-[2] h-14 rounded-2xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-30 disabled:grayscale"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    {initialData ? "Update Matrix Entry" : "Initialize Subsidiary"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// ─── Domains Tab ───
function DomainsTab({ eventId, domains, onRefresh, onDeleteDomain, readOnly }: {
    eventId: string;
    domains: FestDomain[];
    onRefresh: () => void;
    onDeleteDomain: (id: string, name: string) => void;
    readOnly: boolean;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingDomain, setEditingDomain] = useState<FestDomain | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });

    useEffect(() => {
        if (editingDomain) {
            setFormData({ name: editingDomain.name, description: editingDomain.description || "" });
        } else {
            setFormData({ name: "", description: "" });
        }
    }, [editingDomain, isModalOpen]);

    const handleAction = async () => {
        if (!formData.name.trim()) return;
        setSaving(true);
        try {
            if (editingDomain) {
                // Update with verification
                const { error, count } = await supabase
                    .from("fest_domains")
                    .update({
                        name: formData.name.trim(),
                        description: formData.description.trim()
                    }, { count: 'exact' })
                    .eq("id", editingDomain.id);

                if (error) throw error;
                if (count === 0) throw new Error("Permission Denied: Update rejected. Check RLS policies for fest_domains.");
            } else {
                // Create
                const { error } = await supabase
                    .from("fest_domains")
                    .insert({
                        umbrella_event_id: eventId,
                        name: formData.name.trim(),
                        description: formData.description.trim()
                    });
                if (error) throw error;
            }

            onRefresh();
            setIsModalOpen(false);
            setEditingDomain(null);
            setFormData({ name: "", description: "" });
        } catch (err: any) {
            console.error("Domain Action Error:", err);
            alert(err.message || "Failed to synchronize domain changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Domains & Verticals</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Categorize your fest mission types</p>
                </div>
                {!readOnly && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-11 px-6 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={14} /> Add Domain
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {domains.map((domain, i) => (
                    <motion.div
                        key={domain.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-indigo-500/30 transition-all"
                    >
                        {!readOnly && (
                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                <button
                                    onClick={() => { setEditingDomain(domain); setIsModalOpen(true); }}
                                    className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white transition-all"
                                    title="Edit Domain"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => onDeleteDomain(domain.id, domain.name)}
                                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all"
                                    title="Delete Domain"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                            <Layers size={20} />
                        </div>
                        <h3 className="text-xl font-black tracking-tighter mb-2 uppercase">{domain.name}</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{domain.description || "No description provided."}</p>
                    </motion.div>
                ))}

                {domains.length === 0 && (
                    <div className="md:col-span-3 py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-700">
                            <Layers size={24} />
                        </div>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No Domains defined yet</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden"
                        >
                            <div className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-white tracking-tighter capitalize">
                                        {editingDomain ? "Update Domain" : "Add Domain"}
                                    </h2>
                                    <button onClick={() => { setIsModalOpen(false); setEditingDomain(null); }} className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Domain Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Technical Events"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Description</label>
                                        <textarea
                                            placeholder="Details of this vertical category..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full h-32 bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => { setIsModalOpen(false); setEditingDomain(null); }} className="flex-1 h-12 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={handleAction} disabled={saving || !formData.name.trim()} className="flex-[2] h-12 bg-indigo-500 rounded-2xl text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                                        {editingDomain ? "Update Entry" : "Save Domain"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StaffTab({ eventId, staff, onRefresh, readOnly, institutionId, eventTitle }: any) {
    const router = useRouter();
    const [facultySearch, setFacultySearch] = useState("");
    const [facultyResults, setFacultyResults] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [studentResults, setStudentResults] = useState<any[]>([]);
    const [assigning, setAssigning] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [editRole, setEditRole] = useState("");
    const [editGrant, setEditGrant] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [selectedRoleForNewMember, setSelectedRoleForNewMember] = useState("Volunteer");

    const studentRoles = ["Organizer", "Overall Coordinator", "Co-Organizer", "Student Host", "Volunteer", "Lead Volunteer", "Tech Lead", "Creative Lead"];
    
    const facultyStaff = staff.filter((s: any) => s.student?.role === 'faculty' || s.student?.role === 'hod');
    const studentStaff = staff.filter((s: any) => s.student?.role === 'student');

    const handleUserSearch = async (query: string, type: 'faculty' | 'student') => {
        if (type === 'faculty') setFacultySearch(query); else setStudentSearch(query);
        if (query.length < 2) {
            if (type === 'faculty') setFacultyResults([]); else setStudentResults([]);
            return;
        }

        const roles = type === 'faculty' ? ['faculty', 'hod'] : ['student'];
        const { data, error } = await supabase.from("users")
            .select("id, full_name, email, role, department:departments(name)")
            .in('role', roles)
            .eq('institution_id', institutionId)
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(5);
            
        if (!error && data) {
            if (type === 'faculty') setFacultyResults(data); else setStudentResults(data);
            if (type === 'student') setSelectedRoleForNewMember("Volunteer");
        }
    };

    const handleAssign = async (user: any, role: string, editAccess: boolean) => {
        setAssigning(true);
        try {
            const { error } = await supabase.rpc('assign_event_staff', {
                p_event_id: eventId,
                p_student_id: user.id,
                p_role: role,
                p_edit_access: editAccess,
                p_notif_title: editAccess ? "💎 Mission Authorization: Blueprint Editor" : "Authorized Access: Hub Deployment",
                p_notif_message: editAccess 
                    ? `You have been authorized as ${role} for tactical deployment: ${eventTitle}. Access the blueprint mission now.`
                    : `You have been authorized as ${role} for tactical deployment: ${eventTitle}.`
            });
            if (error) throw error;
            onRefresh();
            setFacultySearch("");
            setStudentSearch("");
            setFacultyResults([]);
            setStudentResults([]);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleUpdateStaff = async () => {
        if (!editingStaff) return;
        setUpdating(true);
        try {
            const { error: updateError } = await supabase.from("event_staff").update({
                role_name: editRole,
                role: editRole, // Update legacy column too
                grant_edit_access: editGrant
            }).eq("id", editingStaff.id);
            if (updateError) throw updateError;

            // 2. Automatic Notification
            await supabase.from("notifications").insert({
                user_id: editingStaff.student_id,
                title: "💎 Mission Role Reconfigured",
                message: editGrant 
                    ? `You have been granted Event Creation rights for ${eventTitle}. Access the blueprint now.`
                    : `Your role for ${eventTitle} has been updated to ${editRole}.`,
                type: editGrant ? "mission" : "info",
                link: `/faculty/event/${eventId}/manage`
            });

            // 3. Instant Refresh
            await onRefresh();
            router.refresh(); 
            setEditingStaff(null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-20 pb-20">
            {/* TIER 1: FACULTY LEADERSHIP */}
            <section className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                            Faculty Co-Hosts
                            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">Strategic Oversight & Shared Institutional Control</p>
                    </div>
                </div>

                {!readOnly && (
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative p-8 rounded-[2.5rem] bg-zinc-950 border border-indigo-500/30 flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 space-y-2 w-full">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Search Faculty / HOD</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={facultySearch}
                                        onChange={(e) => handleUserSearch(e.target.value, 'faculty')}
                                        placeholder="Enter name or institutional email..."
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-indigo-500/40 outline-none transition-all"
                                    />
                                    {facultyResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-zinc-950 border border-white/10 rounded-3xl shadow-3xl overflow-hidden z-50">
                                            {facultyResults.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => handleAssign(u, "Faculty Host", true)}
                                                    className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group/item"
                                                >
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-3">
                                                            {u.full_name}
                                                            <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-white/5">{u.department?.name || "No Dept"}</span>
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500 font-medium">{u.email}</p>
                                                    </div>
                                                    <div className="h-8 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/item:opacity-100 transition-all flex items-center gap-2">
                                                        <Plus size={12} /> Add as Host
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-14 px-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <div className="text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest">Default Access</p>
                                    <p className="text-[11px] font-black text-white">EDIT_RIGHTS</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {facultyStaff.map((s: any) => (
                        <div key={s.id} className="p-6 rounded-[2rem] bg-zinc-900/30 border border-white/5 flex items-center justify-between group hover:bg-zinc-900/50 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">
                                    {s.student?.full_name?.charAt(0)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{s.student?.full_name}</p>
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                            {s.student?.department?.name || 'GEN'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{s.role_name || 'Faculty Host'}</p>
                                    </div>
                                </div>
                            </div>
                            {!readOnly && (
                                <button
                                    onClick={async () => {
                                        if (!confirm("Remove this faculty host?")) return;
                                        await supabase.from("event_staff").delete().eq("id", s.id);
                                        onRefresh();
                                    }}
                                    className="p-3 rounded-xl hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    {facultyStaff.length === 0 && (
                        <div className="col-span-full py-12 text-center rounded-[2rem] border border-dashed border-white/5 bg-white/[0.01]">
                            <Users size={20} className="mx-auto text-zinc-800 mb-3" />
                            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">No Faculty Co-Hosts Assigned</p>
                        </div>
                    )}
                </div>
            </section>

            {/* TIER 2: STUDENT WORKFORCE */}
            <section className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                            Student Workforce
                            <div className="h-1 w-12 bg-zinc-700 rounded-full" />
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">Task-Force & Operational Execution</p>
                    </div>
                </div>

                {!readOnly && (
                    <div className="p-8 rounded-[2.5rem] bg-zinc-900/30 border border-white/5 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        <div className="md:col-span-12 space-y-2 relative">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Member Deployment</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    value={studentSearch}
                                    onChange={(e) => handleUserSearch(e.target.value, 'student')}
                                    placeholder="Search student by name..."
                                    className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-cyan-500/40 outline-none transition-all"
                                />
                                {studentResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-zinc-950 border border-white/10 rounded-3xl shadow-3xl overflow-hidden z-50">
                                        {studentResults.map(u => (
                                            <div
                                                key={u.id}
                                                className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group/item"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">
                                                        {u.full_name} <span className="text-zinc-500 ml-2">— [{u.department?.name || 'N/A'}]</span>
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{u.email}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <select 
                                                        value={selectedRoleForNewMember}
                                                        onChange={(e) => setSelectedRoleForNewMember(e.target.value)}
                                                        className="h-9 bg-zinc-900 border border-white/10 rounded-xl px-3 text-[9px] font-black uppercase tracking-widest focus:border-cyan-500 outline-none"
                                                    >
                                                        {studentRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                    <button
                                                        onClick={() => { handleAssign(u, selectedRoleForNewMember, false); setStudentResults([]); setStudentSearch(""); }}
                                                        className="h-9 px-4 rounded-xl bg-cyan-500 text-black text-[9px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-2"
                                                    >
                                                        <Plus size={12} /> Deploy
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                    {studentStaff.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-zinc-900/20 border border-white/[0.03] group hover:border-white/10 transition-all">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center border border-white/5 text-zinc-600 font-black tracking-tighter text-sm uppercase group-hover:bg-zinc-900 transition-colors">
                                    {s.student?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        {s.student?.full_name}
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{s.student?.department?.name || 'GEN'}</span>
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.role_name || s.role || 'Volunteer'}</p>
                                        </div>
                                        {s.grant_edit_access ? (
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                <ShieldCheck size={10} /> Full Edit Access
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-zinc-600 text-[8px] font-black uppercase tracking-widest">
                                                <Eye size={10} /> View Only
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                {!readOnly && (
                                    <>
                                        <button 
                                            onClick={() => { 
                                                setEditingStaff(s); 
                                                const initialRole = s.role_name || s.role || "Volunteer";
                                                setEditRole(initialRole); 
                                                setEditGrant(!!s.grant_edit_access); 
                                            }}
                                            className="w-11 h-11 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-cyan-400 transition-all"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={async () => { if(confirm("Revoke student assignment?")) { await supabase.from("event_staff").delete().eq("id", s.id); onRefresh(); } }}
                                            className="w-11 h-11 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {studentStaff.length === 0 && (
                        <div className="py-20 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.01]">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-950 flex items-center justify-center mx-auto text-zinc-800 mb-6 border border-white/5 shadow-inner">
                                <Users size={24} />
                            </div>
                            <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] italic leading-relaxed">Workforce Matrix Pending Installation</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Global Staff Edit Modal */}
            <AnimatePresence>
                {editingStaff && (
                    <div className="fixed inset-0 z-[350] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                            className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden shadow-cyan-500/10"
                        >
                            <div className="p-12 space-y-10">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] italic mb-2">RECONFIGURE_MEMBER</p>
                                    <h3 className="text-2xl font-black text-white italic truncate">{editingStaff.student?.full_name}</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Assigned Operational Role</label>
                                        <select 
                                            value={editRole} 
                                            onChange={(e) => setEditRole(e.target.value)} 
                                            className="w-full h-14 bg-zinc-900 border border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-cyan-500/40 outline-none transition-all appearance-none"
                                        >
                                            {editingStaff.student?.role === 'student' 
                                                ? studentRoles.map(r => <option key={r} value={r}>{r}</option>)
                                                : <option value="Faculty Host">Faculty Host</option>
                                            }
                                        </select>
                                    </div>

                                    {editingStaff.student?.role === 'student' && (
                                        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black text-white uppercase tracking-widest">Edit Privileges</p>
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Grant modification authority</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only" checked={editGrant} onChange={(e) => setEditGrant(e.target.checked)} />
                                                <div className={cn("w-12 h-6 rounded-full transition-colors", editGrant ? "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-zinc-800")} />
                                                <div className={cn("absolute top-1 left-1.5 w-4 h-4 bg-white rounded-full transition-transform", editGrant ? "translate-x-6" : "")} />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setEditingStaff(null)} className="flex-1 h-14 bg-zinc-950 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-zinc-600 hover:text-white transition-all">Cancel</button>
                                    <button 
                                        onClick={handleUpdateStaff} 
                                        disabled={updating} 
                                        className="flex-[2] h-14 bg-white rounded-2xl text-[10px] font-black uppercase text-black shadow-2xl hover:bg-cyan-400 transition-all active:scale-95"
                                    >
                                        {updating ? <Loader2 size={18} className="animate-spin mx-auto text-black" /> : "Commit Transformation"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
