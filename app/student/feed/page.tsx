"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    Bell,
    Search,
    Calendar,
    MapPin,
    Clock,
    Flame,
    Star,
    Users,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    Trophy,
    Music,
    Code2,
    FlaskConical,
    RefreshCw,
    AlertCircle,
    CalendarX,
    X,
    Zap,
    ChevronRight,
    Check,
    Globe,
    Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPublicEvents, type DbEvent, supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "tech" | "cultural" | "sports" | "workshop" | "competition";
const CATS = ["All", "Tech", "Cultural", "Sports", "Workshop", "Competition"] as const;
type CatFilter = typeof CATS[number];

interface CampusEvent {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: Category;
    organiser: string;
    seats: number;
    seatsLeft: number;
    registeredCount: number;
    isFeatured: boolean;
    tags: string[];
    gradientCss: string;
    accentHex: string;
    bannerUrl: string | null;
    status: "approved" | "live" | "completed";
    isTeam: boolean;
    registrationConfig?: any;
    parentEventTitle?: string | null;
    isGlobal: boolean;
    collegeName: string;
    institutionId: string;
}

interface Notification {
    id: string;
    message: string;
    created_at: string;
    is_read: boolean;
    type?: string;
}

// ─── Palette & mapping ────────────────────────────────────────────────────────

const PALETTES = [
    { gradientCss: "linear-gradient(135deg,#1e0050 0%,#3b0082 60%,#0d001f 100%)", accentHex: "#c084fc" },
    { gradientCss: "linear-gradient(135deg,#4a0010 0%,#8b1a3a 60%,#0a0010 100%)", accentHex: "#f9a8d4" },
    { gradientCss: "linear-gradient(135deg,#451a00 0%,#92400e 60%,#0a0500 100%)", accentHex: "#fcd34d" },
    { gradientCss: "linear-gradient(135deg,#003322 0%,#065f46 60%,#000d06 100%)", accentHex: "#6ee7b7" },
    { gradientCss: "linear-gradient(135deg,#001040 0%,#1e3a8a 60%,#000510 100%)", accentHex: "#93c5fd" },
    { gradientCss: "linear-gradient(135deg,#052e16 0%,#166534 60%,#010f06 100%)", accentHex: "#86efac" },
    { gradientCss: "linear-gradient(135deg,#001520 0%,#0c4a6e 60%,#000508 100%)", accentHex: "#7dd3fc" },
] as const;

function inferCategory(title: string, description: string | null): Category {
    const text = `${title} ${description ?? ""}`.toLowerCase();
    if (/sport|cricket|football|basketball|athletics|chess|badminton/.test(text)) return "sports";
    if (/cultural|music|dance|drama|art|spoken|film|fest/.test(text)) return "cultural";
    if (/workshop|bootcamp|training|hands.?on|tutorial/.test(text)) return "workshop";
    if (/hackathon|competition|olympiad|debate|quiz|contest/.test(text)) return "competition";
    return "tech";
}

function buildTags(row: DbEvent): string[] {
    const tags: string[] = [];
    if (row.status === "live") tags.push("🔴 Live");
    if (row.status === "completed") tags.push("✅ Completed");
    if (row.risk_level === "high") tags.push("High Stakes");
    tags.push(row.department?.name?.split(" ")[0] ?? "Event");
    return tags.slice(0, 3);
}

function mapDbEvent(row: DbEvent, index: number): CampusEvent {
    const palette = PALETTES[index % PALETTES.length];
    const dt = new Date(row.start_time);
    const dateStr = dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const capacity = row.venue?.capacity ?? 200;
    const seatsLeft = Math.max(0, capacity - (row.registered_count ?? 0));
    return {
        id: row.id,
        title: row.title,
        subtitle: row.description ?? `${row.department?.name ?? "Department"} event`,
        date: dateStr,
        time: timeStr,
        venue: row.venue?.name ?? "TBD",
        category: inferCategory(row.title, row.description),
        organiser: row.department?.name ?? row.creator?.full_name ?? "College",
        seats: capacity,
        seatsLeft,
        registeredCount: row.registered_count ?? 0,
        isFeatured: row.is_featured ?? false,
        tags: buildTags(row),
        gradientCss: palette.gradientCss,
        accentHex: palette.accentHex,
        bannerUrl: row.banner_url,
        status: row.status as "approved" | "live" | "completed",
        isTeam: (row as any).registration_config?.team_participation ?? false,
        registrationConfig: (row as any).registration_config,
        parentEventTitle: (row as any).parent_event_title ?? null,
        isGlobal: row.is_public,
        collegeName: row.institution?.name ?? "College",
        institutionId: row.institution_id,
    };
}

function getCategoryIcon(cat: Category) {
    const map: Record<Category, React.ElementType> = {
        tech: Code2, cultural: Music, sports: Trophy, workshop: FlaskConical, competition: Sparkles,
    };
    return map[cat] || Sparkles;
}
function getCategoryLabel(cat: Category) {
    return { tech: "Tech", cultural: "Cultural", sports: "Sports", workshop: "Workshop", competition: "Competition" }[cat];
}
function getCategoryPillClass(cat: Category) {
    if (cat === "tech") return "border-violet-500/40 text-violet-300 bg-violet-500/10";
    if (cat === "cultural") return "border-amber-500/40 text-amber-300 bg-amber-500/10";
    if (cat === "sports") return "border-sky-500/40 text-sky-300 bg-sky-500/10";
    if (cat === "workshop") return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
    if (cat === "competition") return "border-rose-500/40 text-rose-300 bg-rose-500/10";
    return "border-white/20 text-white/50 bg-white/5";
}
function seatsClass(left: number, total: number) {
    const pct = left / total;
    if (pct > 0.5) return "text-emerald-400";
    if (pct > 0.15) return "text-amber-400";
    return "text-red-400";
}

// ─── Greeting helper ──────────────────────────────────────────────────────────

function getGreeting() {
    const h = new Date().getHours();
    let time = "Evening";
    if (h >= 5 && h < 12) time = "Morning";
    else if (h >= 12 && h < 17) time = "Afternoon";

    return `Good ${time}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
    return (
        <div className="fixed z-[200] left-1/2 -translate-x-1/2 bottom-24 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ background: "linear-gradient(135deg,#059669,#065f46)", boxShadow: "0 0 40px rgba(5,150,105,0.35)" }}>
            <CheckCircle2 size={18} /> {message}
        </div>
    );
}

// ─── Notification Drawer ──────────────────────────────────────────────────────

function NotifDrawer({ open, onClose, notifications, loading }: {
    open: boolean; onClose: () => void;
    notifications: Notification[]; loading: boolean;
}) {
    return (
        <>
            {open && <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm" onClick={onClose} />}
            <div className={cn(
                "fixed top-0 right-0 bottom-0 z-[160] w-full max-w-sm flex flex-col transition-transform duration-300",
                open ? "translate-x-0" : "translate-x-full"
            )} style={{ background: "#0e0e1f", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 pt-14 pb-5 border-b border-white/5">
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Inbox</p>
                        <h2 className="text-lg font-black text-white tracking-tight">Notifications</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
                        ))
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-700">
                            <Bell size={36} strokeWidth={1} />
                            <p className="text-sm font-bold uppercase tracking-widest">All clear</p>
                        </div>
                    ) : notifications.map((n) => (
                        <div key={n.id}
                            className={cn("rounded-xl p-4 border transition-all",
                                !n.is_read
                                    ? "bg-indigo-500/8 border-indigo-500/20"
                                    : "bg-zinc-900 border-zinc-800"
                            )}>
                            <div className="flex items-start gap-3">
                                <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                    !n.is_read ? "bg-indigo-500/20" : "bg-white/5")}>
                                    <Bell size={12} className={!n.is_read ? "text-indigo-400" : "text-zinc-600"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm leading-snug", !n.is_read ? "text-white font-semibold" : "text-zinc-400 font-medium")}>
                                        {n.message}
                                    </p>
                                    <p className="text-[10px] text-zinc-600 font-medium mt-1">
                                        {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                {!n.is_read && <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1.5" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedCard({ event, onRegister, registered, forceWide }: { event: CampusEvent; onRegister: () => void; registered: boolean; forceWide?: boolean }) {
    const router = useRouter();
    const CatIcon = getCategoryIcon(event.category);

    return (
        <div
            onClick={() => router.push(`/student/event/${event.id}`)}
            className={cn(
                "w-full h-80 lg:h-96 relative rounded-xl overflow-hidden group border border-zinc-800 active:scale-[0.98] transition-all cursor-pointer shadow-2xl mx-auto flex-shrink-0",
                forceWide ? "max-w-full" : "max-w-[calc(100vw-3rem)] lg:max-w-5xl"
            )}
        >
            {event.bannerUrl ? (
                <img src={event.bannerUrl} alt={event.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { (e.target as any).style.display = "none"; }}
                />
            ) : (
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110" style={{ background: event.gradientCss }} />
            )}

            {/* Bottom Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

            {/* Top Row Badges */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                <div>
                    {event.status === "live" ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-white px-3 py-1.5 rounded-full bg-red-500 shadow-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                        </span>
                    ) : (
                        <span className="text-[9px] font-black text-white/90 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 uppercase tracking-widest">
                            Upcoming
                        </span>
                    )}
                </div>
                <span className={cn("flex items-center gap-1.5 text-[9px] font-black px-3 py-1.5 rounded-full border backdrop-blur-md uppercase tracking-widest", getCategoryPillClass(event.category))}>
                    <CatIcon size={10} /> {getCategoryLabel(event.category)}
                </span>
            </div>

            {/* Content Bottom Left */}
            <div className="absolute inset-x-6 bottom-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-amber-300 uppercase tracking-[0.2em] bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {event.isGlobal ? `🌐 ${event.collegeName}` : "🏠 My Campus"}
                    </span>
                    {event.parentEventTitle && (
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">
                            • {event.parentEventTitle}
                        </span>
                    )}
                </div>

                <h3 className="text-white font-black text-xl lg:text-3xl leading-tight tracking-tight mb-3">{event.title}</h3>

                <div className="flex items-center gap-4 mb-5">
                    <div className="flex items-center gap-1.5 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                        <Clock size={12} className="text-white/20" /> {event.time}
                    </div>
                    <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest", seatsClass(event.seatsLeft, event.seats))}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", event.seatsLeft > 50 ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                        {event.registeredCount > 0 ? `${event.registeredCount} / ${event.seats} SLOTS` : `${event.seatsLeft} SLOTS`}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRegister(); }}
                        className={cn(
                            "flex-1 h-12 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2",
                            registered
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-white text-black hover:bg-zinc-200 shadow-xl"
                        )}
                    >
                        {registered ? <><Check size={12} /> REGISTERED</> : "DIRECT REGISTER"}
                    </button>
                    <button className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Grid Event Card ──────────────────────────────────────────────────────────

function EventCard({ event, onRegister, registered }: { event: CampusEvent; onRegister: () => void; registered: boolean }) {
    const router = useRouter();
    const CatIcon = getCategoryIcon(event.category);

    return (
        <div
            className={cn("group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1", "bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/50")}
            onClick={() => router.push(`/student/event/${event.id}`)}
        >
            {/* 16:9 Banner */}
            <div className="w-full aspect-video relative overflow-hidden">
                {event.bannerUrl ? (
                    <img src={event.bannerUrl} alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { (e.target as any).style.display = "none"; }}
                    />
                ) : (
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ background: event.gradientCss }} />
                )}
                {/* Readability gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    {event.status === "live" && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-white px-2 py-0.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" /> LIVE
                        </span>
                    )}
                    {event.status === "completed" && (
                        <span className="text-[9px] font-black text-black px-2 py-0.5 rounded-full bg-amber-400/90">DONE</span>
                    )}
                    {event.status === "approved" && <span />}
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md", getCategoryPillClass(event.category))}>
                        {getCategoryLabel(event.category)}
                    </span>
                </div>

                {/* College Badge */}
                <div className="absolute top-10 left-2.5">
                    <span className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full border backdrop-blur-md shadow-lg uppercase tracking-widest",
                        event.isGlobal ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "bg-white/10 border-white/20 text-white/50"
                    )}>
                        {event.isGlobal ? `🌐 ${event.collegeName}` : "My Campus"}
                    </span>
                </div>

                {/* Date badge bottom-left */}
                <div className="absolute bottom-2.5 left-2.5">
                    <div className="flex flex-col items-center w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 justify-center">
                        <span className="text-[8px] font-black text-white/60 uppercase leading-none">{event.date.split(" ")[0]}</span>
                        <span className="text-sm font-extrabold text-white leading-none">{event.date.split(" ")[1]}</span>
                    </div>
                </div>

                {/* Fest tag */}
                {event.parentEventTitle && (
                    <div className="absolute bottom-2.5 right-2.5">
                        <span className="text-[8px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
                            ✨ Fest
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-4">
                <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest truncate mb-0.5">{event.organiser}</p>
                        <h4 className="text-white font-extrabold text-sm leading-snug line-clamp-2">{event.title}</h4>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-zinc-600 text-xs mb-3 mt-auto">
                    <span className="flex items-center gap-1"><Clock size={10} />{event.time}</span>
                    <span className="flex items-center gap-1 truncate"><MapPin size={10} />{event.venue.split(" ").slice(0, 2).join(" ")}</span>
                </div>

                {/* Social proof + seats */}
                <div className="flex items-center justify-between text-xs mb-3">
                    <span className={cn("flex items-center gap-1 font-semibold", seatsClass(event.seatsLeft, event.seats))}>
                        <Users size={10} />
                        {event.registeredCount > 0 ? `${event.registeredCount} going` : `${event.seatsLeft} left`}
                    </span>
                    {/* Dummy friends badge — UI ready */}
                    <span className="text-[9px] text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        👥 8 friends going
                    </span>
                </div>

                <div className="border-t border-white/5 pt-3">
                    {registered ? (
                        <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <Check size={12} /> Confirmed
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRegister(); }}
                            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-indigo-400 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {event.isTeam ? "Join Team" : "Register"} <ChevronRight size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function FeaturedSkel() {
    return <div className="flex-shrink-0 rounded-xl animate-pulse bg-zinc-900 border border-zinc-800 w-[280px] lg:w-[420px]" style={{ aspectRatio: "16/9" }} />;
}
function CardSkel() {
    return <div className="rounded-xl animate-pulse bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="w-full aspect-video bg-zinc-800" />
        <div className="p-4 space-y-2">
            <div className="h-3 bg-zinc-800 rounded-full w-1/2" />
            <div className="h-4 bg-zinc-800 rounded-full w-3/4" />
            <div className="h-8 bg-zinc-800 rounded-xl mt-4" />
        </div>
    </div>;
}

// ─── Register Bottom Sheet ────────────────────────────────────────────────────

function RegisterSheet({ event, onClose, onConfirm }: { event: CampusEvent; onClose: () => void; onConfirm: (id: string) => void }) {
    const CatIcon = getCategoryIcon(event.category);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-md rounded-t-xl border-t border-zinc-800 shadow-2xl overflow-hidden" style={{ background: "#09090b" }}>
                <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-zinc-800" /></div>

                <div className="mx-4 mt-3 mb-4 rounded-2xl overflow-hidden relative" style={{ aspectRatio: "16/9" }}>
                    {event.bannerUrl
                        ? <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        : <div className="absolute inset-0" style={{ background: event.gradientCss }} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5"><CatIcon size={9} />{getCategoryLabel(event.category)}</p>
                        <p className="text-white font-extrabold text-lg leading-snug">{event.title}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 px-4">
                    {[
                        { icon: Calendar, label: "Date", value: event.date },
                        { icon: Clock, label: "Time", value: event.time },
                        { icon: MapPin, label: "Venue", value: event.venue },
                        { icon: Users, label: "Seats Left", value: `${event.seatsLeft} / ${event.seats}` },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="rounded-xl p-3 bg-zinc-900 border border-zinc-800">
                            <div className="flex items-center gap-1.5 mb-1"><Icon size={11} className="text-zinc-500" /><span className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</span></div>
                            <p className="text-white text-xs font-semibold">{value}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mx-4 my-4">
                    <button onClick={onClose} className="h-12 rounded-xl text-sm font-semibold border border-zinc-800 text-zinc-500 hover:bg-zinc-900 transition-all">Cancel</button>
                    <button onClick={() => { onConfirm(event.id); onClose(); }}
                        className="h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
                        <CheckCircle2 size={16} /> Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentFeedPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const [activeCat, setActiveCat] = useState<CatFilter>("All");
    const [registered, setRegistered] = useState<Set<string>>(new Set());
    const [modalEvent, setModalEvent] = useState<CampusEvent | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"upcoming" | "live" | "past">("upcoming");
    const [feedFilter, setFeedFilter] = useState<"campus" | "marketplace">("campus");
    const [searchQuery, setSearchQuery] = useState("");
    const [allEvents, setAllEvents] = useState<CampusEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
    const [activeMissions, setActiveMissions] = useState<any[]>([]);

    // Header data
    const [karmaPoints, setKarmaPoints] = useState<number | null>(null);
    const [notifCount, setNotifCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Filter pills sticky ref
    const filterRef = useRef<HTMLDivElement>(null);

    const greeting = getGreeting();

    // ── Load events scoped to this student's institution ────────────────────────
    async function loadAll(institutionId: string) {
        setIsLoading(true);
        setFetchError(null);
        try {
            const [eventsResult, authResult] = await Promise.all([
                fetchPublicEvents(institutionId),   // ← tenant-scoped
                supabase.auth.getUser(),
            ]);
            setAllEvents(eventsResult.map((row, i) => mapDbEvent(row, i)));

            const authUser = authResult.data.user;
            if (authUser) {
                const { data: profile } = await supabase
                    .from("users")
                    .select("id, karma_points")
                    .eq("auth_uid", authUser.id)
                    .single();
                if (profile) {
                    setUserId(profile.id);
                    setKarmaPoints((profile as any).karma_points ?? 0);
                    // registrations are personal — no institution filter needed
                    const { data: regs } = await supabase
                        .from("registrations")
                        .select("event_id")
                    if (regs) setRegistered(new Set(regs.map((r: any) => r.event_id)));

                    // Load Active Missions for Blueprint Editing
                    const { data: missions } = await supabase
                        .from("event_staff")
                        .select(`
                            id,
                            role:role_name,
                            grant_edit_access,
                            event:events!inner (
                                id,
                                title,
                                status
                            )
                        `)
                        .eq("student_id", profile.id)
                        .eq("grant_edit_access", true);

                    if (missions) {
                        // Filter for non-live, non-completed drafts
                        const active = missions.filter((m: any) =>
                            ['draft', 'pending', 'revision_required', 'changes_requested'].includes(m.event.status)
                        );
                        setActiveMissions(active);
                    }
                }
            }
        } catch (err: any) {
            setFetchError(err.message || "Failed to load events.");
        } finally { setIsLoading(false); }
    }

    // ── Load notifications ──
    async function loadNotifications(uid: string) {
        setNotifLoading(true);
        try {
            const { data, count } = await supabase
                .from("notifications")
                .select("*", { count: "exact" })
                .eq("user_id", uid)
                .order("created_at", { ascending: false })
                .limit(30);
            if (data) {
                setNotifications(data as Notification[]);
                setNotifCount(data.filter((n: any) => !n.is_read).length);
            }
        } catch { /* silent */ } finally { setNotifLoading(false); }
    }

    useEffect(() => {
        // Wait for user context to load before fetching
        if (userLoading) return;
        if (!user?.institution_id) {
            setIsLoading(false);
            return;
        }
        void loadAll(user.institution_id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.institution_id, userLoading]);

    useEffect(() => {
        if (userId) void loadNotifications(userId);
    }, [userId]);

    const handleBellClick = async () => {
        setNotifOpen(true);
        // Mark as read
        if (userId && notifCount > 0) {
            await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
            setNotifCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    // ── Filtering ──
    const filteredEvents = allEvents.filter((e) => {
        // Tab Filter
        if (activeTab === "upcoming" && e.status !== "approved") return false;
        if (activeTab === "live" && e.status !== "live") return false;
        if (activeTab === "past" && e.status !== "completed") return false;

        // Marketplace vs Campus
        if (feedFilter === "campus") {
            if (e.institutionId !== user?.institution_id) return false;
        } else {
            if (e.institutionId === user?.institution_id || !e.isGlobal) return false;
        }

        // Category
        if (activeCat !== "All" && getCategoryLabel(e.category) !== activeCat) return false;

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matches = e.title.toLowerCase().includes(q) ||
                e.subtitle.toLowerCase().includes(q) ||
                e.collegeName.toLowerCase().includes(q);
            if (!matches) return false;
        }

        return true;
    });

    // ── Logic for Featured & Grid ──
    const featured = filteredEvents.filter(e => {
        if (activeTab === "past") return e.isFeatured && e.status === "completed";
        return e.isFeatured && (e.status === "approved" || e.status === "live");
    });

    const gridEvents = filteredEvents.filter(e => !featured.some(fe => fe.id === e.id));

    // ── Register ──
    async function handleConfirm(id: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login?next=/student/feed"); return; }
            const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).single();
            if (!profile) throw new Error("Profile not found");
            const { data, error } = await supabase.rpc("student_register_event_v2", { p_event_id: id, p_student_id: profile.id, p_action: "individual" });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error);
            setRegistered((prev) => new Set([...prev, id]));
            setToast("Registration Confirmed! Pass generated 🎟️");
            setTimeout(() => setToast(null), 3500);
        } catch (err: any) { alert(err.message || "Registration failed"); }
    }

    function openRegister(event: CampusEvent) {
        const needsSmartReg = event.isTeam || event.registrationConfig?.collect_resume || event.registrationConfig?.collect_github;
        if (needsSmartReg) router.push(`/student/event/${event.id}`);
        else setModalEvent(event);
    }

    return (
        <div className="font-sans min-h-screen" style={{ color: "white", background: "#09090f" }}>
            {/* ── Notification Drawer ── */}
            <NotifDrawer
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                notifications={notifications}
                loading={notifLoading}
            />

            <div className="w-full max-w-md lg:max-w-7xl mx-auto relative px-4">

                {/* ══ ULTRA-COMPACT HEADER ════════════════════════════════════════ */}
                <header className="sticky top-0 z-30 pt-6 pb-4 space-y-4"
                    style={{ background: "rgba(9,9,15,0.92)", backdropFilter: "blur(32px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>

                    {/* Row 1: Title + Karma + Bell */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-baseline gap-2.5">
                                <h1 className="text-white font-black text-2xl tracking-tight">Feed</h1>
                                <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-none translate-y-[-1px]">{greeting} 🌙</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-help pulse-badge">
                                <Star size={10} className="text-indigo-400 fill-indigo-400" />
                                <span className="text-[10px] font-black text-zinc-300 tracking-tighter">
                                    {karmaPoints !== null ? `${karmaPoints} PT` : "—"}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
                            </div>
                            <button onClick={handleBellClick} className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all">
                                <Bell size={16} />
                                {notifCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Search + Segmented Toggle */}
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 text-xs font-semibold placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-zinc-700 transition-all"
                            />
                        </div>

                        {/* iOS Style Segmented Control */}
                        <div className="flex p-0.5 bg-zinc-950 rounded-xl border border-zinc-800 h-10 w-[140px] shrink-0">
                            <button
                                onClick={() => setFeedFilter("campus")}
                                className={cn(
                                    "flex-1 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                    feedFilter === "campus" ? "bg-zinc-100 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <div className={cn("w-1 h-1 rounded-full", feedFilter === "campus" ? "bg-black" : "bg-emerald-500")} /> Campus
                            </button>
                            <button
                                onClick={() => setFeedFilter("marketplace")}
                                className={cn(
                                    "flex-1 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                    feedFilter === "marketplace" ? "bg-indigo-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-400"
                                )}
                            >
                                <Globe size={10} /> Global
                            </button>
                        </div>
                    </div>

                    {/* Row 3: Unified Hybrid Filter Row */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
                        {/* State Pills */}
                        {(["upcoming", "live", "past"] as const).map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={cn("flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                                        isActive
                                            ? "bg-white border-white text-black shadow-lg"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"
                                    )}>
                                    {tab === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                    {tab === 'past' ? 'Archives' : tab}
                                </button>
                            );
                        })}

                        <div className="w-px h-5 bg-white/10 self-center mx-1 shrink-0" />

                        {/* Category Pills */}
                        {CATS.map((cat) => {
                            const isActive = activeCat === cat;
                            return (
                                <button key={cat} onClick={() => setActiveCat(cat)}
                                    className={cn("flex-shrink-0 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                                        isActive
                                            ? "bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                                            : "bg-white/5 border-white/5 text-zinc-500 hover:text-white"
                                    )}>
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </header>

                <main className="pb-28">

                    {/* Sync Status / Error */}
                    {fetchError && (
                        <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-2"><AlertCircle size={14} /> Sync Interrupted</span>
                            <button onClick={() => user?.institution_id && void loadAll(user.institution_id)} className="hover:text-white transition-colors">Re-sync</button>
                        </div>
                    )}

                    {/* ── Active Blueprint Missions (Action Required) ── */}
                    {activeMissions.length > 0 && (
                        <section className="mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield size={12} className="text-indigo-400" />
                                <h2 className="text-white font-black text-xs uppercase tracking-widest underline decoration-indigo-500/20 underline-offset-8 decoration-2">Active Blueprint Missions</h2>
                                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse ml-2" />
                            </div>
                            <div className="space-y-3">
                                {activeMissions.map((mission) => (
                                    <div
                                        key={mission.id}
                                        onClick={() => router.push(`/faculty/event/${mission.event.id}/manage`)}
                                        className="w-full bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[2rem] p-6 cursor-pointer hover:border-indigo-500/40 transition-all group flex items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                <Sparkles size={20} className="text-indigo-300" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Organizer Mission</span>
                                                    <span className="w-1 h-1 rounded-full bg-indigo-500/40" />
                                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest capitalize">{mission.event.status.replace('_', ' ')}</span>
                                                </div>
                                                <h3 className="text-white font-bold text-base tracking-tight leading-tight group-hover:text-indigo-300 transition-colors uppercase italic">{mission.event.title}</h3>
                                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Designate Role: {mission.role}</p>
                                            </div>
                                        </div>
                                        <div className="h-10 px-4 rounded-xl bg-indigo-500 text-white flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                                            Edit Blueprint <ArrowRight size={14} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Featured / Hero Row ── */}
                    {featured.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center gap-2 mb-6">
                                <Zap size={13} className="text-amber-400" />
                                <h2 className="text-white font-black text-xs uppercase tracking-widest underline decoration-white/10 underline-offset-8 decoration-2">Featured</h2>
                                {!isLoading && <span className="text-[9px] font-black text-zinc-500/80 ml-2 uppercase tracking-widest">{featured.length} Spotlight</span>}
                            </div>
                            <div className="relative group/carousel">
                                <div
                                    onScroll={(e) => {
                                        const scrollLeft = e.currentTarget.scrollLeft;
                                        const width = e.currentTarget.offsetWidth;
                                        const idx = Math.round(scrollLeft / width);
                                        if (idx !== activeFeaturedIndex) setActiveFeaturedIndex(idx);
                                    }}
                                    className={cn(
                                        "flex gap-4 pb-4 no-scrollbar",
                                        featured.length > 1 ? "snap-x snap-mandatory overflow-x-auto scrollbar-hide" : "overflow-hidden"
                                    )}
                                >
                                    {isLoading ? (
                                        [1].map(i => <div key={i} className="w-full h-96 bg-white/5 rounded-[2.5rem] animate-pulse" />)
                                    ) : (
                                        featured.map((event) => (
                                            <div key={event.id} className={cn(
                                                "w-full flex-shrink-0 transition-opacity duration-500 snap-center",
                                                featured.length > 1 ? "px-0" : ""
                                            )}>
                                                <FeaturedCard
                                                    event={event}
                                                    registered={registered.has(event.id)}
                                                    onRegister={() => openRegister(event)}
                                                    forceWide={true}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Pagination Dots */}
                                {featured.length > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        {featured.map((_, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                    i === activeFeaturedIndex ? "w-6 bg-indigo-500" : "bg-white/20"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* ── Grid Section ── */}
                    {(activeTab !== "live" || gridEvents.length > 0) && (
                        <section className="mt-10 text-white">
                            {gridEvents.length > 0 && (
                                <div className="flex items-center gap-2 mb-6">
                                    <Sparkles size={13} className="text-indigo-400" />
                                    <h2 className="text-white font-black text-xs uppercase tracking-widest underline decoration-white/10 underline-offset-8 decoration-2">Latest Missions</h2>
                                    {!isLoading && <span className="text-[9px] font-black text-zinc-500/80 ml-2 uppercase tracking-widest">{gridEvents.length} Active Missions</span>}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5, 6].map(i => <CardSkel key={i} />)
                                ) : gridEvents.length > 0 ? (
                                    gridEvents.map((event) => (
                                        <EventCard key={event.id} event={event} registered={registered.has(event.id)} onRegister={() => openRegister(event)} />
                                    ))
                                ) : featured.length === 0 ? (
                                    <div className="col-span-full py-12 text-center bg-white/[0.03] rounded-3xl border border-white/5">
                                        <Search size={28} className="mx-auto mb-3 text-white/20" />
                                        <p className="text-sm font-semibold text-white/30">No {activeTab === 'past' ? 'Archives' : activeTab} right now</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* ── Modals / Toasts ── */}
            {modalEvent && <RegisterSheet event={modalEvent} onClose={() => setModalEvent(null)} onConfirm={handleConfirm} />}
            {toast && <Toast message={toast} />}

            {/* Global Styles & Animations */}
            <style>{`
                @keyframes shine {
                    0%   { transform: translateX(-100%); }
                    40%,100% { transform: translateX(300%); }
                }

                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes pulse-indigo {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); border-color: rgba(79, 70, 229, 0.2); }
                    50% { box-shadow: 0 0 15px 2px rgba(79, 70, 229, 0.4); border-color: rgba(79, 70, 229, 0.5); }
                }
                .pulse-badge {
                    animation: pulse-indigo 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
