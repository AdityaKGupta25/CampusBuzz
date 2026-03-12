"use client";

import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import {
    Ticket,
    Calendar,
    Clock,
    MapPin,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Sparkles,
    ChevronRight,
    Radio,
    Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyTicket {
    id: string;           // registration id — the QR code value
    status: "confirmed";
    created_at: string;
    event: {
        id: string;
        title: string;
        start_time: string;
        end_time: string;
        status: string;                  // 'live' | 'approved' | 'completed' …
        banner_url: string | null;
        department: { name: string } | null;
        venue: { name: string } | null;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
}
function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

/** Returns true when the event's start_time falls on today's calendar date */
function isToday(iso: string): boolean {
    const today = new Date();
    const d = new Date(iso);
    return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    );
}

// Deterministic accent per registration id so each ticket looks unique
const PALETTES = [
    { accent: "#a78bfa", gradFrom: "#4c1d95", gradTo: "#1e1b4b", border: "rgba(167,139,250,0.35)" },
    { accent: "#fb7185", gradFrom: "#881337", gradTo: "#1a0a10", border: "rgba(251,113,133,0.35)" },
    { accent: "#fbbf24", gradFrom: "#78350f", gradTo: "#1c1107", border: "rgba(251,191,36,0.35)" },
    { accent: "#34d399", gradFrom: "#064e3b", gradTo: "#041f17", border: "rgba(52,211,153,0.35)" },
    { accent: "#38bdf8", gradFrom: "#0c4a6e", gradTo: "#051220", border: "rgba(56,189,248,0.35)" },
] as const;

function paletteFor(id: string) {
    const idx = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTES.length;
    return PALETTES[idx];
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function TicketBanner({ url, title, accent }: { url: string | null; title: string; accent: string }) {
    const [err, setErr] = useState(false);

    if (!url || err) {
        return (
            <div
                className="h-28 w-full flex flex-col items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}06 100%)` }}
            >
                <ImageIcon size={24} style={{ color: `${accent}55` }} />
                <span className="text-[10px] font-semibold truncate max-w-[80%] text-center"
                    style={{ color: `${accent}88` }}>
                    {title}
                </span>
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt={title}
            onError={() => setErr(true)}
            className="h-28 w-full object-cover"
        />
    );
}

// ─── Live Badge ───────────────────────────────────────────────────────────────

function LiveBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.45)", color: "#fca5a5" }}>
            <Radio size={9} className="animate-pulse text-red-400" />
            TODAY · LIVE
        </span>
    );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, isFlipped, onFlip }: { ticket: MyTicket; isFlipped: boolean; onFlip: () => void }) {
    const pal = paletteFor(ticket.id);
    const today = isToday(ticket.event.start_time);
    const isLiveEv = ticket.event.status === "live";
    const showLive = today || isLiveEv;

    return (
        <div className="relative mx-auto w-full max-w-[320px] h-[560px] group perspective-[1500px]">
            <motion.div
                className="w-full h-full relative cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                onClick={onFlip}
            >
                {/* ── Front Face ── */}
                <article
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] transition-transform duration-300 shadow-2xl group-hover:-translate-y-1"
                    style={{
                        background: "#0d0d1a",
                        border: `1px solid ${pal.border}`,
                        boxShadow: `0 15px 35px -10px ${pal.accent}20`,
                        backfaceVisibility: "hidden"
                    }}
                >
                    {/* ── Banner ── */}
                    <div className="relative h-24 shrink-0 bg-white/5">
                        <TicketBanner url={ticket.event.banner_url} title={ticket.event.title} accent={pal.accent} />
                        <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: "linear-gradient(to bottom, transparent, #0d0d1a)" }} />
                        <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: `linear-gradient(90deg, ${pal.accent}, ${pal.accent}44)` }} />
                        {showLive && (
                            <div className="absolute top-4 left-4"><LiveBadge /></div>
                        )}
                        <div className="absolute top-4 right-4">
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
                                style={{ background: `${pal.accent}15`, border: `1px solid ${pal.accent}40`, color: pal.accent, backdropFilter: "blur(8px)" }}>
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: pal.accent }} /> Pass
                            </span>
                        </div>
                    </div>

                    {/* ── Body: Title & Details ── */}
                    <div className="px-6 pt-6 pb-2 shrink-0">
                        <h3 className="text-white font-extrabold text-xl leading-tight line-clamp-2">
                            {ticket.event.title}
                        </h3>
                        <p className="text-white/40 text-[10px] font-black tracking-widest uppercase mt-2">
                            {ticket.event.department?.name ?? "Campus Event"}
                        </p>
                    </div>

                    {/* ── Info ── */}
                    <div className="px-6 py-4 space-y-3.5 shrink-0">
                        <InfoRow icon={Calendar} label="Date" value={fmtDate(ticket.event.start_time)} accent={pal.accent} />
                        <InfoRow icon={Clock} label="Time" value={`${fmtTime(ticket.event.start_time)} – ${fmtTime(ticket.event.end_time)}`} accent={pal.accent} />
                        <InfoRow icon={MapPin} label="Venue" value={ticket.event.venue?.name ?? "TBA"} accent={pal.accent} />
                    </div>

                    {/* ── Perforation divider (Punch-hole effect) ── */}
                    <div className="relative flex items-center shrink-0 h-10 w-full overflow-hidden my-2">
                        <div className="absolute -left-4 w-8 h-8 rounded-full bg-[#09090f]" style={{ border: `1px solid ${pal.border}` }} />
                        <div className="absolute -right-4 w-8 h-8 rounded-full bg-[#09090f]" style={{ border: `1px solid ${pal.border}` }} />
                        <div className="flex-1 mx-5 border-t-[2.5px] border-dashed" style={{ borderColor: `${pal.accent}40` }} />
                    </div>

                    {/* ── Lower section: QR Code ── */}
                    <div className="px-6 flex-1 flex flex-col items-center justify-center relative pb-12">
                        <div className="relative">
                            <div className="absolute inset-0 blur-2xl opacity-20" style={{ background: pal.accent }} />
                            <div className="p-3 rounded-2xl relative bg-white" style={{ boxShadow: `0 0 0 4px ${pal.accent}15, 0 8px 30px ${pal.accent}25` }}>
                                <QRCode value={ticket.id} size={120} bgColor="#ffffff" fgColor="#000000" style={{ display: "block" }} />
                            </div>
                        </div>

                        {/* Footer text pinned inside the card with balanced horizontal margins */}
                        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
                            <p className="text-[10px] font-mono font-black tracking-[0.25em]" style={{ color: `${pal.accent}90` }}>
                                TKT-{ticket.id.slice(0, 6).toUpperCase()}
                            </p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                                Tap to flip
                            </span>
                        </div>
                    </div>
                </article>

                {/* ── Back Face (Venue / Rules inside Flip) ── */}
                <article
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] shadow-2xl p-6"
                    style={{
                        background: "#0d0d1a",
                        border: `1px solid ${pal.border}`,
                        boxShadow: `0 15px 35px -10px ${pal.accent}20`,
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)"
                    }}
                >
                    <div className="flex-1 flex flex-col relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: pal.accent }}>Backend</span>
                                <h3 className="text-white font-extrabold text-lg">Event Rules</h3>
                            </div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${pal.accent}15` }}>
                                <AlertCircle size={16} style={{ color: pal.accent }} />
                            </div>
                        </div>

                        <div className="flex-1 text-white/60 text-[11px] leading-relaxed overflow-y-auto">
                            <p className="mb-2"><strong>1. Entry:</strong> Present your barcode at the security desk upon arrival.</p>
                            <p className="mb-2"><strong>2. Identity:</strong> Valid university ID must be carried at all times.</p>
                            <p className="mb-2"><strong>3. Transfer:</strong> Passes are strictly non-transferable and mapped to your registration ID.</p>

                            <h4 className="text-xs font-bold text-white mt-5 mb-2 uppercase tracking-widest">Venue Map</h4>
                            <div className="w-full h-24 rounded-2xl flex items-center justify-center flex-col gap-2"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <MapPin size={24} className="text-white/20" />
                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Map Unavailable</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center pt-4 border-t border-white/10 shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 truncate max-w-[80%]">
                            {ticket.event.title}
                        </span>
                        <ChevronRight size={14} className="text-white/30 rotate-180 flex-shrink-0" />
                    </div>
                </article>
            </motion.div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, accent }: {
    icon: React.ElementType;
    label: string;
    value: string;
    accent: string;
}) {
    return (
        <div className="flex items-center gap-3.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                <Icon size={13} style={{ color: accent }} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: `${accent}80` }}>{label}</p>
                <p className="text-white text-[13px] font-semibold leading-snug truncate mt-0.5">{value}</p>
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center gap-5 py-32 px-8 text-center">
            <div className="relative">
                <div
                    className="w-24 h-24 rounded-3xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <Ticket size={36} className="text-white/20" />
                </div>
                <div className="absolute inset-0 blur-2xl rounded-3xl opacity-25"
                    style={{ background: "rgba(99,102,241,0.5)" }} />
            </div>
            <div>
                <h2 className="text-white text-xl font-extrabold">No Tickets Yet</h2>
                <p className="text-white/40 text-sm mt-3 leading-relaxed max-w-[260px] mx-auto">
                    You haven&apos;t confirmed any registrations yet. Explore the campus and grab a pass!
                </p>
            </div>
            <button
                onClick={() => { window.location.href = "/student/feed"; }}
                className="flex items-center gap-2 mt-4 px-6 py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105"
                style={{ background: "#4f46e5", boxShadow: "0 10px 30px rgba(79,70,229,0.3)" }}
            >
                <Sparkles size={16} className="text-indigo-200" />
                Explore Events
            </button>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TicketSkeleton() {
    return (
        <div className="rounded-[2rem] overflow-hidden animate-pulse w-full max-w-[320px] h-[560px] mx-auto flex flex-col"
            style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="h-24 bg-white/5" />
            <div className="p-6 space-y-4 pt-4">
                <div className="h-6 bg-white/10 rounded-xl w-3/4 mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                            <div className="space-y-1.5 flex-1 pt-1">
                                <div className="h-2 bg-white/5 rounded-full w-1/4" />
                                <div className="h-3 bg-white/10 rounded-full w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative flex items-center shrink-0 h-8 w-full overflow-hidden my-1">
                <div className="absolute -left-4 w-8 h-8 rounded-full bg-[#09090f]" />
                <div className="absolute -right-4 w-8 h-8 rounded-full bg-[#09090f]" />
                <div className="flex-1 mx-5 border-t-[2.5px] border-dashed border-white/5" />
            </div>

            <div className="px-6 pb-6 pt-2 flex flex-col items-center">
                <div className="w-[110px] h-[110px] bg-white/10 rounded-2xl mb-4" />
                <div className="flex w-full justify-between mt-auto">
                    <div className="w-16 h-3 bg-white/5 rounded-full" />
                    <div className="w-16 h-3 bg-white/5 rounded-full" />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTicketsPage() {
    const { user: authUser, loading: userLoading } = useUser();
    const [tickets, setTickets] = useState<MyTicket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flippedTicketId, setFlippedTicketId] = useState<string | null>(null);

    async function loadTickets() {
        if (!authUser?.institution_id) return;
        const institutionId = authUser.institution_id;
        setLoading(true);
        setError(null);
        try {
            // 1. Auth
            const { data: { session } } = await supabase.auth.getSession();
            let authUid = session?.user?.id;

            if (!authUid) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { window.location.href = "/login"; return; }
                authUid = user.id;
            }

            // 2. Profile
            const { data: profile, error: profErr } = await supabase
                .from("users")
                .select("id")
                .eq("auth_uid", authUid)
                .eq("institution_id", institutionId)
                .single();

            if (profErr || !profile) {
                setError("Could not load your profile. Please try logging in again.");
                return;
            }

            // 3. Fetch
            const { data, error: regErr } = await supabase
                .from("registrations")
                .select(`
                    id,
                    status,
                    created_at,
                    event:events!inner (
                        id,
                        title,
                        start_time,
                        end_time,
                        status,
                        banner_url,
                        institution_id,
                        department:departments ( name ),
                        venue:venues ( name )
                    )
                `)
                .eq("student_id", profile.id)
                .eq("status", "confirmed")
                .eq("event.institution_id", institutionId)
                .order("created_at", { ascending: false });

            if (regErr) throw regErr;

            const valid = (data ?? []).filter((r) => r.event !== null) as unknown as MyTicket[];
            setTickets(valid);
        } catch (err: unknown) {
            console.error("[My Tickets]", err);
            setError(err instanceof Error ? err.message : "Failed to load tickets.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { if (!userLoading) void loadTickets(); }, [authUser?.institution_id, userLoading]);

    const todayCount = tickets.filter((t) => isToday(t.event.start_time)).length;

    return (
        <div className="min-h-screen font-sans pb-12" style={{ background: "#09090f", color: "white" }}>

            {/* ── Header ── */}
            <header
                className="sticky top-0 z-30 px-5 lg:px-10 pt-12 pb-5"
                style={{
                    background: "rgba(9,9,15,0.94)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(20px)",
                }}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            id="back-btn"
                            onClick={() => window.history.back()}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                            <ArrowLeft size={18} className="text-white/80" />
                        </button>

                        <div>
                            <p className="text-white/40 text-[11px] font-bold tracking-widest uppercase">My Portfolio</p>
                            <h1 className="text-white font-extrabold text-2xl leading-tight flex items-center gap-3">
                                Event Passes
                                {todayCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
                                        <Radio size={10} className="animate-pulse" />
                                        {todayCount} Today
                                    </span>
                                )}
                            </h1>
                        </div>
                    </div>

                    <button
                        id="refresh-btn"
                        onClick={() => void loadTickets()}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:bg-white/10"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                        <RefreshCw size={16} className={cn("text-white/60", loading && "animate-spin")} />
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <main className="px-5 lg:px-10 pt-8 pb-20 max-w-7xl mx-auto">

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 rounded-2xl p-4 text-sm mb-6 max-w-lg mx-auto"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold">Failed to load tickets</p>
                            <p className="text-xs mt-0.5 opacity-75">{error}</p>
                        </div>
                        <button onClick={() => void loadTickets()}
                            className="text-xs font-bold text-red-300 hover:text-red-200 flex items-center gap-1">
                            <RefreshCw size={11} /> Retry
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && tickets.length === 0 && <EmptyState />}

                {/* Ticket Grid */}
                {!error && (
                    <>
                        {tickets.length > 0 && (
                            <div className="mb-6 flex justify-between items-center text-white/40 font-bold uppercase tracking-widest text-[10px]">
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400" />
                                    {tickets.length} Confirmed {tickets.length !== 1 ? "Passes" : "Pass"}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {loading ? (
                                [1, 2, 3].map((i) => <TicketSkeleton key={i} />)
                            ) : (
                                tickets.map((ticket) => (
                                    <TicketCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        isFlipped={flippedTicketId === ticket.id}
                                        onFlip={() => setFlippedTicketId(flippedTicketId === ticket.id ? null : ticket.id)}
                                    />
                                ))
                            )}
                        </div>

                        {!loading && tickets.length > 0 && (
                            <p className="text-center text-[10px] uppercase tracking-[0.2em] font-bold text-white/20 mt-16 pb-8">
                                Present your QR pass at the entrance
                            </p>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

