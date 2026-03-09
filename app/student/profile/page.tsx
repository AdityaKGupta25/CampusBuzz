"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    UserCircle2,
    Award,
    Ticket,
    LogOut,
    Mail,
    Building2,
    GraduationCap,
    RefreshCw,
    ChevronRight,
    Shield,
    Sparkles,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser, getInitials, getAvatarGradient } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
    full_name: string;
    email: string;
    role: string;
    department: { name: string } | null;
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtJoined(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function initials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Gradient by name hash (deterministic but varied)
function avatarGradient(name: string) {
    const gradients = [
        "linear-gradient(135deg,#4f46e5,#7c3aed)",
        "linear-gradient(135deg,#0891b2,#0e7490)",
        "linear-gradient(135deg,#059669,#047857)",
        "linear-gradient(135deg,#d97706,#b45309)",
        "linear-gradient(135deg,#db2777,#be185d)",
    ];
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
    return gradients[Math.abs(hash) % gradients.length];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
    return (
        <div className="animate-pulse space-y-4 px-4 pt-8">
            <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-3xl bg-white/8" />
                <div className="h-5 bg-white/10 rounded-xl w-40" />
                <div className="h-3 bg-white/6 rounded-full w-28" />
            </div>
            <div className="mt-8 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-white/4 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, label, color }: {
    icon: React.ElementType;
    value: number | string;
    label: string;
    color: string;
}) {
    return (
        <div
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
            <Icon size={16} style={{ color }} />
            <p className="font-black text-xl leading-none" style={{ color }}>{value}</p>
            <p className="text-white/30 text-[10px] font-medium text-center">{label}</p>
        </div>
    );
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

function MenuRow({ icon: Icon, label, sub, onClick, danger }: {
    icon: React.ElementType;
    label: string;
    sub?: string;
    onClick?: () => void;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]",
                danger ? "hover:bg-red-500/8" : "hover:bg-white/4"
            )}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: danger ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${danger ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
                }}
            >
                <Icon size={17} className={danger ? "text-red-400" : "text-white/50"} />
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className={cn("text-sm font-semibold", danger ? "text-red-400" : "text-white/80")}>{label}</p>
                {sub && <p className="text-white/30 text-xs mt-0.5 truncate">{sub}</p>}
            </div>
            {!danger && <ChevronRight size={14} className="text-white/20 flex-shrink-0" />}
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
    const router = useRouter();
    const { user: profile, loading: userLoading, error: userError, refresh } = useUser();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [certCount, setCertCount] = useState(0);
    const [ticketCount, setTicketCount] = useState(0);

    const loadStats = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            // Cert count
            const { count: cc } = await supabase
                .from("verified_ledger")
                .select("id", { count: "exact", head: true })
                .eq("student_id", profile.dbId);
            setCertCount(cc ?? 0);

            // Ticket count
            const { count: tc } = await supabase
                .from("registrations")
                .select("id", { count: "exact", head: true })
                .eq("user_id", profile.dbId)
                .eq("status", "confirmed");
            setTicketCount(tc ?? 0);

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load stats.");
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        if (profile) void loadStats();
    }, [profile, loadStats]);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const isActuallyLoading = userLoading || (loading && !profile);
    const displayError = userError || error;


    return (
        <div className="font-sans" style={{ color: "white" }}>

            {/* ── Header ── */}
            <header
                className="sticky top-0 z-30 px-5 pt-12 pb-4 flex items-center justify-between"
                style={{
                    background: "rgba(9,9,15,0.94)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    backdropFilter: "blur(20px)",
                }}
            >
                <div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                        {profile?.full_name ?? "Student"} | {profile?.department_name ?? "Institutional General"}
                    </p>
                    <h1 className="text-white font-extrabold text-2xl tracking-tight">Identity Profile</h1>
                </div>
                <button
                    id="refresh-profile-btn"
                    onClick={() => { refresh(); loadStats(); }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                    <RefreshCw size={15} className={cn("text-white/50", isActuallyLoading && "animate-spin")} />
                </button>
            </header>

            {/* ── Content ── */}
            <main className="max-w-7xl mx-auto px-5 lg:px-10 pt-6 pb-20">

                {isActuallyLoading && <ProfileSkeleton />}

                {displayError && (
                    <div className="rounded-2xl p-4 text-sm text-red-300 max-w-lg mb-6" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                        {displayError}
                    </div>
                )}

                {!loading && profile && (
                    <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">

                        {/* ── Left Column: Identity ── */}
                        <div className="flex-shrink-0 w-full lg:w-80 flex flex-col items-center lg:items-start gap-6">

                            {/* Avatar */}
                            <div className="relative group">
                                <div className="absolute inset-0 blur-2xl opacity-20 transition-opacity group-hover:opacity-40" style={{ background: avatarGradient(profile.full_name) }} />
                                <div
                                    className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-[2.5rem] flex items-center justify-center font-black text-4xl lg:text-5xl text-white shadow-2xl transition-transform hover:scale-105"
                                    style={{ background: avatarGradient(profile.full_name) }}
                                >
                                    {getInitials(profile.full_name)}
                                </div>
                                <div
                                    className="absolute -bottom-2 -right-2 lg:-bottom-3 lg:-right-3 w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center shadow-xl"
                                    style={{ background: "#059669", border: "4px solid #09090f" }}
                                    title="Verified Institutional Account"
                                >
                                    <Shield size={18} className="text-white" strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Name & Role */}
                            <div className="text-center lg:text-left w-full">
                                <h2 className="text-white font-extrabold text-3xl tracking-tight mb-2">{profile.full_name}</h2>
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                                    <span
                                        className="text-[11px] font-black tracking-widest px-3 py-1 rounded-full uppercase"
                                        style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
                                    >
                                        {profile.role}
                                    </span>
                                </div>
                            </div>

                            {/* Bio / Meta Card */}
                            <div className="w-full rounded-[2rem] p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div>
                                    <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-4">Institutional Identity</p>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                <GraduationCap size={14} className="text-white/50" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Department</p>
                                                <p className="text-sm font-semibold text-white/90 truncate">{profile.department_name ?? "Independent"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                <Mail size={14} className="text-white/50" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">University Email</p>
                                                <p className="text-sm font-semibold text-white/90 truncate">{profile.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                <Clock size={14} className="text-white/50" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Joined</p>
                                                <p className="text-sm font-semibold text-white/90 truncate">{fmtJoined(profile.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Right Column: Command Center ── */}
                        <div className="flex-1 flex flex-col gap-8 lg:pt-2">

                            {/* Stats Grid */}
                            <div>
                                <h3 className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-4 pl-2">Performance Analytics</h3>
                                <div className="grid grid-cols-3 gap-4 lg:gap-6">
                                    <StatPill icon={Ticket} value={ticketCount} label="Event Passes" color="#818cf8" />
                                    <StatPill icon={Award} value={certCount} label="Certificates" color="#fbbf24" />
                                    <StatPill icon={Sparkles} value={certCount * 50} label="Karma Points" color="#34d399" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Navigation / Quick Links */}
                                <div className="space-y-3">
                                    <h3 className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-4 pl-2">Portfolio Management</h3>
                                    <MenuRow
                                        icon={Ticket}
                                        label="My Event Passes"
                                        sub="View your upcoming tickets"
                                        onClick={() => router.push("/student/my-tickets")}
                                    />
                                    <MenuRow
                                        icon={Award}
                                        label="Verified Ledger"
                                        sub={`${certCount} credential${certCount !== 1 ? "s" : ""} secured`}
                                        onClick={() => router.push("/student/achievements")}
                                    />
                                </div>

                                {/* Security / Danger Zone */}
                                <div className="space-y-3">
                                    <h3 className="text-[11px] font-black tracking-widest text-white/40 uppercase mb-4 pl-2">Account Security</h3>
                                    <MenuRow
                                        icon={LogOut}
                                        label="Secure Log Out"
                                        sub="End current session"
                                        danger
                                        onClick={() => void handleLogout()}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
