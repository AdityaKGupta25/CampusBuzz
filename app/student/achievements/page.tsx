"use client";

/**
 * Student Achievements — /student/achievements
 *
 * "Verified Activity Ledger" — portfolio of all certificates
 * issued to the student from the verified_ledger table.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Award,
    Shield,
    Download,
    Calendar,
    Star,
    CheckCircle2,
    ArrowLeft,
    RefreshCw,
    Sparkles,
    Trophy,
    BookOpen,
    Lock,
    Share2,
    Briefcase,
    ExternalLink,
    Users,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Certificate {
    id: string;               // verified_ledger.id
    certificate_hash: string; // "CB-2026-XXXXXXXXXX"
    issued_at: string;
    event: {
        id: string;
        title: string;
        description: string | null;
        start_time: string;
        end_time: string;
        department: { name: string } | null;
        venue: { name: string } | null;
    };
}
// Raw Supabase shape
interface RawLedgerRow {
    id: string;
    certificate_hash: string;
    issued_at: string;
    event: {
        id: string;
        title: string;
        description: string | null;
        start_time: string;
        end_time: string;
        department: { name: string } | { name: string }[] | null;
        venue: { name: string } | { name: string }[] | null;
    } | null;
}

interface StaffRecord {
    id: string;
    role: string;
    assigned_at: string;
    can_edit_event: boolean;
    grant_edit_access: boolean;
    event: {
        id: string;
        title: string;
        status: string;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
    });
}
function fmtYear(iso: string) {
    return new Date(iso).getFullYear();
}

// Card gradient palettes — cycles through so each cert looks distinct
const CARD_PALETTES = [
    { from: "rgba(234,179,8,0.18)", to: "rgba(202,138,4,0.06)", border: "rgba(234,179,8,0.4)", accent: "#fbbf24", glow: "rgba(234,179,8,0.15)" },
    { from: "rgba(168,85,247,0.18)", to: "rgba(124,58,237,0.06)", border: "rgba(168,85,247,0.4)", accent: "#c084fc", glow: "rgba(168,85,247,0.15)" },
    { from: "rgba(20,184,166,0.18)", to: "rgba(13,148,136,0.06)", border: "rgba(20,184,166,0.4)", accent: "#2dd4bf", glow: "rgba(20,184,166,0.15)" },
    { from: "rgba(239,68,68,0.15)", to: "rgba(185,28,28,0.06)", border: "rgba(239,68,68,0.35)", accent: "#f87171", glow: "rgba(239,68,68,0.12)" },
    { from: "rgba(59,130,246,0.18)", to: "rgba(37,99,235,0.06)", border: "rgba(59,130,246,0.4)", accent: "#60a5fa", glow: "rgba(59,130,246,0.15)" },
];

// ─── Copy to clipboard helper ──────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function CertSkeleton() {
    return (
        <div
            className="rounded-3xl p-5 space-y-4 animate-pulse"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
            <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                    <div className="h-3 bg-white/8 rounded-full w-20" />
                    <div className="h-5 bg-white/12 rounded-xl w-4/5" />
                    <div className="h-3 bg-white/5 rounded-full w-2/5" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/6 flex-shrink-0" />
            </div>
            <div className="h-px bg-white/6" />
            <div className="h-8 bg-white/5 rounded-xl w-full" />
        </div>
    );
}

// ─── SVG Radar Chart ─────────────────────────────────────────────────────────

function SkillsRadar() {
    // 5 axes: represent potential skills a student can acquire
    const data = [
        { label: "Technical", val: 0.8 },
        { label: "Management", val: 0.6 },
        { label: "Creative", val: 0.5 },
        { label: "Oratory", val: 0.75 },
        { label: "Sports", val: 0.65 },
    ];

    // Calculate coordinates for the SVG
    const size = 300;
    const center = size / 2;
    const radius = size * 0.35;

    const getCoordinatesForAngle = (angle: number, r: number) => {
        const x = center + r * Math.cos(angle - Math.PI / 2);
        const y = center + r * Math.sin(angle - Math.PI / 2);
        return { x, y };
    };

    const axes = data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / data.length;
        const { x, y } = getCoordinatesForAngle(angle, radius);
        const { x: lx, y: ly } = getCoordinatesForAngle(angle, radius + 25);
        return { ...d, x, y, lx, ly };
    });

    const polygonPoints = axes
        .map(a => getCoordinatesForAngle((Math.PI * 2 * axes.indexOf(a)) / axes.length, radius * a.val))
        .map(p => `${p.x},${p.y}`)
        .join(" ");

    return (
        <div className="relative w-full max-w-[320px] mx-auto aspect-square flex items-center justify-center">
            {/* Background Glow */}
            <div className="absolute inset-0 blur-[60px] opacity-10" style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 60%)" }} />

            <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                {/* Grid Polygons */}
                {[0.25, 0.5, 0.75, 1].map((level, levelIdx) => (
                    <polygon
                        key={levelIdx}
                        points={axes.map((a, i) => {
                            const p = getCoordinatesForAngle((Math.PI * 2 * i) / axes.length, radius * level);
                            return `${p.x},${p.y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1.5"
                    />
                ))}

                {/* Axis Spoke Lines */}
                {axes.map((a, i) => (
                    <line key={`axis-${i}`} x1={center} y1={center} x2={a.x} y2={a.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
                ))}

                {/* Data Polygon Shape */}
                <polygon
                    points={polygonPoints}
                    fill="rgba(234,179,8,0.18)"
                    stroke="rgba(234,179,8,0.8)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                />

                {/* Data Points on Polygon */}
                {axes.map((a, i) => {
                    const p = getCoordinatesForAngle((Math.PI * 2 * i) / axes.length, radius * a.val);
                    return (
                        <circle
                            key={`dot-${i}`}
                            cx={p.x} cy={p.y} r="4"
                            fill="#09090f"
                            stroke="#fbbf24"
                            strokeWidth="2"
                            className="drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]"
                        />
                    );
                })}

                {/* Outer Skill Labels */}
                {axes.map((a, i) => (
                    <text
                        key={`label-${i}`}
                        x={a.lx}
                        y={a.ly}
                        fill="rgba(255,255,255,0.6)"
                        fontSize="10"
                        fontWeight="900"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        className="uppercase tracking-[0.15em]"
                    >
                        {a.label}
                    </text>
                ))}
            </svg>
        </div>
    );
}

// ─── Future Portfolio Preview (Empty State) ────────────────────────────────────

function FuturePortfolio() {
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-10 px-4 text-center">

            {/* Ledger Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)" }}>
                <Shield size={12} className="text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 drop-shadow-sm">
                    0 Verified Ledger Entries
                </span>
            </div>

            {/* Title Block */}
            <div className="space-y-2 mt-2">
                <h2 className="text-white text-3xl font-black tracking-tighter italic">Future Portfolio</h2>
                <p className="text-white/40 text-[13px] leading-relaxed max-w-[280px] mx-auto font-medium">
                    This is a preview of your skills matrix. Participate in campus events to acquire verified credentials.
                </p>
            </div>

            {/* Spider Chart Preview */}
            <div className="w-full relative mt-4">
                <SkillsRadar />
            </div>

            {/* Action Cards */}
            <div className="w-full max-w-[320px] mx-auto mt-4 grid grid-cols-2 gap-4">
                <button
                    onClick={() => { window.location.href = "/student/feed"; }}
                    className="p-5 rounded-3xl text-left transition-all hover:bg-white/5 group"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                    <BookOpen size={18} className="text-white/30 mb-3 group-hover:text-indigo-400 transition-colors" />
                    <p className="text-white font-extrabold text-sm group-hover:text-indigo-300 transition-colors">Join Events</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black mt-1.5">Discover</p>
                </button>
                <div className="p-5 rounded-3xl text-left" style={{ background: "rgba(234,179,8,0.03)", border: "1px solid rgba(234,179,8,0.1)" }}>
                    <Trophy size={18} className="text-yellow-500/40 mb-3" />
                    <p className="text-white font-extrabold text-sm">Earn Badges</p>
                    <p className="text-[9px] text-yellow-400/40 uppercase tracking-[0.2em] font-black mt-1.5">Achieve</p>
                </div>
            </div>

            {/* Verified Badges Section (Locked) */}
            <div className="w-full max-w-[320px] mt-8 text-left">
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Shield size={14} className="text-white/30" />
                    <h3 className="text-white/40 text-[11px] font-black tracking-widest uppercase">Verified Badges</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {["Coding Pro", "Lead Organizer", "Stage King"].map((badge, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl"
                            style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                    <Star size={16} className="text-white/20" />
                                </div>
                                <div className="text-left">
                                    <p className="text-white/50 font-bold text-sm">{badge}</p>
                                    <p className="text-[9px] text-white/20 font-black tracking-widest uppercase mt-0.5">Not Acquired</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center border border-white/5">
                                <Lock size={12} className="text-white/20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Stats Header ─────────────────────────────────────────────────────────────

function StatsRow({ certs, studentName }: { certs: Certificate[]; studentName: string }) {
    // Count unique events to avoid double-counting (should always be 1:1)
    const uniqueEvents = new Set(certs.map((c) => c.event.id)).size;
    const latestYear = certs.length > 0 ? fmtYear(certs[0].issued_at) : new Date().getFullYear();

    return (
        <div
            className="mx-4 mt-6 rounded-3xl overflow-hidden"
            style={{
                background: "linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(202,138,4,0.04) 100%)",
                border: "1px solid rgba(234,179,8,0.25)",
            }}
        >
            {/* Top part — greeting & icon */}
            <div className="px-5 pt-5 pb-4 flex items-start gap-4">
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}
                >
                    <Trophy size={26} className="text-yellow-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-yellow-400/60 text-[10px] font-bold uppercase tracking-widest">Verified Portfolio</p>
                    <h2 className="text-white font-extrabold text-lg leading-tight truncate">{studentName}</h2>
                    <p className="text-white/40 text-xs mt-0.5">CampusBuzz · {latestYear}</p>
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(234,179,8,0.12)" }} />

            {/* Stats */}
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: "rgba(234,179,8,0.1)" }}>
                {[
                    { label: "Events Attended", value: uniqueEvents, icon: Star },
                    { label: "Certificates Earned", value: certs.length, icon: Award },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex flex-col items-center justify-center gap-1 py-4">
                        <Icon size={14} className="text-yellow-400/50 mb-0.5" />
                        <p className="text-yellow-300 font-black text-3xl leading-none">{value}</p>
                        <p className="text-white/35 text-[10px] font-medium text-center">{label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Certificate Card ─────────────────────────────────────────────────────────

function CertCard({ cert, idx, studentName }: { cert: Certificate; idx: number; studentName: string }) {
    const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
    const [copied, setCopied] = useState(false);
    const dept = Array.isArray(cert.event.department) ? cert.event.department[0] : cert.event.department;
    const venue = Array.isArray(cert.event.venue) ? cert.event.venue[0] : cert.event.venue;

    async function handleCopy() {
        const ok = await copyToClipboard(cert.certificate_hash);
        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }

    function handleDownload() {
        // Build a plain-text certificate and download it as a .txt
        const lines = [
            "═══════════════════════════════════════════════",
            "          CAMPUSBUZZ — VERIFIED CERTIFICATE",
            "═══════════════════════════════════════════════",
            "",
            `  Student   :  ${studentName}`,
            `  Event     :  ${cert.event.title}`,
            `  Date      :  ${fmtDate(cert.event.start_time)}`,
            dept ? `  Department:  ${dept.name}` : "",
            venue ? `  Venue     :  ${venue.name}` : "",
            "",
            `  Certificate ID : ${cert.certificate_hash}`,
            `  Issued on      : ${fmtDate(cert.issued_at)}`,
            "",
            "  Verified by    : CampusBuzz Platform",
            "",
            "═══════════════════════════════════════════════",
            "  This certificate is tamper-evident and stored",
            "  in the CampusBuzz Verified Activity Ledger.",
            "═══════════════════════════════════════════════",
        ].filter((l) => l !== null).join("\n");

        const blob = new Blob([lines], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cert.certificate_hash}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div
            className="rounded-3xl overflow-hidden relative"
            style={{
                background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
                border: `1px solid ${palette.border}`,
                boxShadow: `0 4px 32px ${palette.glow}`,
            }}
        >
            {/* Decorative shimmer line at top */}
            <div
                className="absolute top-0 left-6 right-6 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${palette.accent}55, transparent)` }}
            />

            <div className="p-5">
                {/* Top row — badge + icon */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        {/* Verified badge */}
                        <div className="flex items-center gap-1.5 mb-2">
                            <Shield size={10} style={{ color: palette.accent }} />
                            <span
                                className="text-[9px] font-black uppercase tracking-widest"
                                style={{ color: palette.accent }}
                            >
                                Verified by CampusBuzz
                            </span>
                        </div>
                        {/* Event title */}
                        <h3 className="text-white font-extrabold text-base leading-snug line-clamp-2 pr-2">
                            {cert.event.title}
                        </h3>
                    </div>

                    {/* Gold medal icon */}
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${palette.accent}18`, border: `1.5px solid ${palette.accent}40` }}
                    >
                        <Award size={26} style={{ color: palette.accent }} strokeWidth={1.5} />
                    </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
                    <span className="flex items-center gap-1.5 text-white/50 text-xs">
                        <Calendar size={10} style={{ color: palette.accent }} />
                        {fmtDate(cert.event.start_time)}
                    </span>
                    {dept && (
                        <span className="flex items-center gap-1.5 text-white/50 text-xs">
                            <BookOpen size={10} style={{ color: palette.accent }} />
                            {dept.name}
                        </span>
                    )}
                    {venue && (
                        <span className="flex items-center gap-1.5 text-white/50 text-xs">
                            <Sparkles size={10} style={{ color: palette.accent }} />
                            {venue.name}
                        </span>
                    )}
                </div>

                {/* Certificate ID chip */}
                <button
                    onClick={() => void handleCopy()}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-left transition-all active:scale-95"
                    style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${palette.accent}22` }}
                    title="Tap to copy certificate ID"
                >
                    <Lock size={10} style={{ color: palette.accent }} className="flex-shrink-0" />
                    <span className="flex-1 font-mono text-[11px] truncate" style={{ color: `${palette.accent}99` }}>
                        {cert.certificate_hash}
                    </span>
                    <span
                        className="text-[9px] font-bold flex-shrink-0 transition-all"
                        style={{ color: copied ? "#34d399" : palette.accent + "70" }}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </span>
                </button>

                {/* Issued date + action buttons */}
                <div className="flex items-center gap-3">
                    <p className="flex-1 text-white/30 text-[10px]">
                        Issued · {fmtDate(cert.issued_at)}
                    </p>
                    <button
                        id={`share-cert-${cert.id}`}
                        onClick={() => void copyToClipboard(`Certificate ID: ${cert.certificate_hash} | ${cert.event.title}`)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                        style={{ background: `${palette.accent}15`, border: `1px solid ${palette.accent}30` }}
                        title="Share"
                    >
                        <Share2 size={13} style={{ color: palette.accent }} />
                    </button>
                    <button
                        id={`download-cert-${cert.id}`}
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl font-bold text-[11px] transition-all active:scale-95"
                        style={{
                            background: `${palette.accent}22`,
                            border: `1px solid ${palette.accent}45`,
                            color: palette.accent,
                        }}
                    >
                        <Download size={11} />
                        Download
                    </button>
                </div>
            </div>

            {/* Perforation divider (ticket aesthetic) */}
            <div
                className="mx-4 mb-4 mt-0 h-px"
                style={{
                    background: `repeating-linear-gradient(90deg, ${palette.accent}30 0px, ${palette.accent}30 6px, transparent 6px, transparent 12px)`,
                }}
            />

            {/* Footer strip */}
            <div
                className="px-5 pb-4 flex items-center justify-between"
            >
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={11} style={{ color: palette.accent }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${palette.accent}70` }}>
                        Tamper-Evident · Blockchain Verified
                    </span>
                </div>
                <span className="text-[9px] font-mono" style={{ color: `${palette.accent}40` }}>
                    #{(idx + 1).toString().padStart(3, "0")}
                </span>
            </div>
        </div>
    );
}

function LeadershipBadge({ staff, idx }: { staff: StaffRecord; idx: number }) {
    const router = useRouter();
    const palettes = [
        { from: "indigo-500/10", to: "indigo-500/5", border: "indigo-500/20", text: "indigo-400" },
        { from: "emerald-500/10", to: "emerald-500/5", border: "emerald-500/20", text: "emerald-400" },
        { from: "cyan-500/10", to: "cyan-500/5", border: "cyan-500/20", text: "cyan-400" },
    ];
    const p = palettes[idx % palettes.length];

    const isBlueprintMission = (staff.grant_edit_access || staff.can_edit_event) && (staff.event.status === 'draft' || staff.event.status === 'pending' || staff.event.status === 'revision_required');

    return (
        <button
            onClick={() => router.push(isBlueprintMission ? `/faculty/event/${staff.event.id}/manage` : `/student/event/${staff.event.id}`)}
            className={cn(
                "w-full p-6 rounded-[2.5rem] border text-left transition-all hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden",
                isBlueprintMission
                    ? "bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                    : `bg-gradient-to-br from-${p.from} to-${p.to} border-${p.border}`
            )}
        >
            <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-5">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0", isBlueprintMission ? "bg-indigo-500/20 border-indigo-500/30" : `bg-zinc-950 border-${p.border}`)}>
                        {isBlueprintMission ? <Sparkles size={24} className="text-white" /> : <Users size={24} className={cn(`text-${p.text}`)} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isBlueprintMission ? <Shield size={10} className="text-indigo-300" /> : <Briefcase size={10} className={cn(`text-${p.text}`)} />}
                            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isBlueprintMission ? "text-indigo-300" : `text-${p.text}`)}>
                                {isBlueprintMission ? "Active Blueprint Mission" : "Verified Leadership"}
                            </span>
                        </div>
                        <h3 className="text-white font-black text-lg tracking-tight uppercase italic">{staff.role}</h3>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">@ {staff.event.title}</p>
                    </div>
                </div>
                {isBlueprintMission ? (
                    <div className="px-4 py-2 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-xl">
                        🚀 Complete Event Blueprint <ChevronRight size={12} />
                    </div>
                ) : (
                    <div className={cn("w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center transition-all group-hover:bg-white group-hover:text-black", `text-${p.text}`)}>
                        <ExternalLink size={16} />
                    </div>
                )}
            </div>

            {/* Background watermark */}
            {isBlueprintMission ? (
                <Sparkles size={80} className="absolute -bottom-6 -right-6 text-white/[0.04] -rotate-12 pointer-events-none" />
            ) : (
                <Users size={80} className="absolute -bottom-6 -right-6 text-white/[0.02] -rotate-12 pointer-events-none" />
            )}
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAchievementsPage() {
    const router = useRouter();

    const [certs, setCerts] = useState<Certificate[]>([]);
    const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studentName, setStudentName] = useState("Student");

    const loadCerts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Auth — getSession() reads localStorage cache (no network roundtrip)
            const { data: { session } } = await supabase.auth.getSession();
            let authUid = session?.user?.id;

            if (!authUid) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { window.location.href = "/login"; return; }
                authUid = user.id;
            }

            // Resolve profile
            const { data: profile, error: profErr } = await supabase
                .from("users")
                .select("id, full_name")
                .eq("auth_uid", authUid)
                .single();

            if (profErr || !profile) {
                setError("Could not load your profile. Please re-login.");
                return;
            }

            setStudentName((profile as { full_name?: string }).full_name ?? "Student");

            // Fetch from verified_ledger
            const { data, error: ldgErr } = await supabase
                .from("verified_ledger")
                .select(`
                    id,
                    certificate_hash,
                    issued_at,
                    event:events (
                        id,
                        title,
                        description,
                        start_time,
                        end_time,
                        department:departments ( name ),
                        venue:venues ( name )
                    )
                `)
                .eq("student_id", profile.id)
                .order("issued_at", { ascending: false });

            if (ldgErr) throw ldgErr;

            const mapped: Certificate[] = ((data ?? []) as unknown as RawLedgerRow[])
                .filter((r) => r.event !== null)
                .map((r) => ({
                    id: r.id,
                    certificate_hash: r.certificate_hash,
                    issued_at: r.issued_at,
                    event: {
                        id: r.event!.id,
                        title: r.event!.title,
                        description: r.event!.description,
                        start_time: r.event!.start_time,
                        end_time: r.event!.end_time,
                        department: Array.isArray(r.event!.department) ? r.event!.department[0] ?? null : r.event!.department,
                        venue: Array.isArray(r.event!.venue) ? r.event!.venue[0] ?? null : r.event!.venue,
                    },
                }));

            setCerts(mapped);

            // Fetch from event_staff (Leadership & Missions)
            // Fetch records where the student is staff.
            // If they have can_edit_event, it's an "Assigned Mission" (Blueprint)
            // If the event is completed, it's a "Verified Leadership" entry.
            const { data: staffData, error: staffErr } = await supabase
                .from("event_staff")
                .select(`
                    id,
                    role:role_name,
                    assigned_at,
                    grant_edit_access,
                    event:events!inner (
                        id,
                        title,
                        status
                    )
                `)
                .eq("student_id", profile.id)
                .order("assigned_at", { ascending: false });

            if (staffErr) throw staffErr;

            // Filter in-memory: Keep if event is completed OR if they have edit access (Mission)
            const filteredStaff = (staffData || []).filter((s: any) =>
                s.event.status === 'completed' || s.grant_edit_access === true
            );

            setStaffRecords(filteredStaff.map((s: any) => ({
                ...s,
                role: s.role || "Organizer"
            })) as unknown as StaffRecord[]);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load certificates.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadCerts(); }, [loadCerts]);

    return (
        <div className="min-h-screen font-sans pb-20" style={{ background: "#09090f", color: "white" }}>
            {/* ── Header ── */}
            <header
                className="sticky top-0 z-30 px-5 pt-12 pb-4 flex items-center gap-4"
                style={{
                    background: "rgba(9,9,15,0.94)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    backdropFilter: "blur(20px)",
                }}
            >
                <button
                    id="back-btn"
                    onClick={() => window.history.back()}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                    <ArrowLeft size={17} className="text-white/70" />
                </button>
                <div className="flex-1">
                    <p className="text-white/40 text-xs font-medium">Student Portfolio</p>
                    <h1 className="text-white font-extrabold text-xl leading-tight flex items-center gap-2">
                        Achievements
                        <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)", color: "#fbbf24" }}
                        >
                            <Award size={9} /> Ledger
                        </span>
                    </h1>
                </div>
                <button
                    id="refresh-btn"
                    onClick={() => void loadCerts()}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                    <RefreshCw size={15} className={cn("text-white/50", loading && "animate-spin")} />
                </button>
            </header>

            {/* ── Stats Card (only when loaded & has certs) ── */}
            {!loading && certs.length > 0 && (
                <StatsRow certs={certs} studentName={studentName} />
            )}

            {/* ── Body ── */}
            <main className="px-4 pt-5 space-y-4">

                {/* Error */}
                {error && (
                    <div
                        className="flex items-start gap-3 rounded-2xl p-4 text-sm"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
                    >
                        <Award size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Could not load certificates</p>
                            <p className="text-xs mt-0.5 opacity-70">{error}</p>
                        </div>
                        <button onClick={() => void loadCerts()} className="text-xs font-bold flex-shrink-0">
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading skeletons */}
                {loading && (
                    <>
                        <CertSkeleton />
                        <CertSkeleton />
                        <CertSkeleton />
                    </>
                )}

                {/* Empty state (Future Portfolio) */}
                {!loading && !error && certs.length === 0 && <FuturePortfolio />}

                {/* Certificate cards */}
                {!loading && certs.map((cert, i) => (
                    <CertCard
                        key={cert.id}
                        cert={cert}
                        idx={i}
                        studentName={studentName}
                    />
                ))}

                {/* Leadership & Missions section */}
                {!loading && staffRecords.length > 0 && (
                    <div className="space-y-6 pt-10">
                        <div className="flex items-center gap-4 px-2">
                            <div className="h-px flex-1 bg-white/5" />
                            <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] whitespace-nowrap">Assigned Missions & Leadership</h2>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {staffRecords.map((staff, i) => (
                                <LeadershipBadge key={staff.id} staff={staff} idx={i} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer note */}
                {!loading && certs.length > 0 && (
                    <div className="text-center pt-4 pb-2">
                        <div className="inline-flex items-center gap-1.5 text-[10px] text-white/20">
                            <Shield size={9} />
                            All certificates are tamper-evident and stored in the CampusBuzz Verified Activity Ledger
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
