"use client";

/**
 * Faculty QR Scanner — /faculty/scan
 *
 * Uses html5-qrcode (vanilla JS) wrapped in React.
 * States: idle → scanning → verifying → success | duplicate | denied | error
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    XCircle,
    ScanLine,
    RefreshCw,
    ArrowLeft,
    User,
    Calendar,
    Loader2,
    ShieldCheck,
    AlertCircle,
    Camera,
    Clock,
    Zap,
    Ban,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanPhase =
    | { phase: "idle" }
    | { phase: "scanning" }
    | { phase: "verifying"; code: string }
    | { phase: "success"; studentName: string; eventTitle: string; scanTime: string }
    | { phase: "duplicate"; studentName: string; eventTitle: string; checkedInAt: string }
    | { phase: "denied"; reason: string; code: string }
    | { phase: "error"; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_ID =
    typeof window !== "undefined"
        ? (localStorage.getItem("cb_device_id") ??
            (() => {
                const id = `web-${Math.random().toString(36).slice(2, 10)}`;
                localStorage.setItem("cb_device_id", id);
                return id;
            })())
        : "web-ssr";

const QR_ELEMENT_ID = "faculty-qr-reader";

// ─── Audio helpers ────────────────────────────────────────────────────────────

function playBeep(type: "success" | "denied" | "warning") {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
            osc.frequency.value = 1046; // C6 — bright positive
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } else if (type === "warning") {
            osc.frequency.value = 660;  // E5 — mid warning
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } else {
            // two quick low blips for denied
            osc.frequency.value = 220;
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 180;
            gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc2.start(ctx.currentTime + 0.2);
            osc2.stop(ctx.currentTime + 0.45);
        }
    } catch { /* audio blocked — silent */ }
}

// ─── Verification Logic ───────────────────────────────────────────────────────

interface VerifyResult {
    outcome: "success" | "duplicate" | "denied" | "error";
    studentName?: string;
    eventTitle?: string;
    reason?: string;
    checkedInAt?: string;
}

async function verifyAndRecord(registrationId: string): Promise<VerifyResult> {
    // CHECK 1: Registration exists & valid
    const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select(`
            id,
            status,
            event_id,
            student_id,
            student:users!registrations_student_id_fkey ( full_name ),
            event:events (
                id,
                title,
                status
            )
        `)
        .eq("id", registrationId)
        .single();

    if (regErr || !reg) {
        return { outcome: "denied", reason: "Registration not found. Invalid or expired QR code." };
    }

    if (!["confirmed", "attended"].includes(reg.status as string)) {
        return {
            outcome: "denied",
            reason: `Registration is '${reg.status}'. Only confirmed registrations can be checked in.`,
        };
    }

    const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
    if (!event) {
        return { outcome: "denied", reason: "Associated event not found in the system." };
    }
    if (!["approved", "live"].includes((event as any).status)) {
        return {
            outcome: "denied",
            reason: `Event is '${(event as any).status}' — check-in is only allowed for live/approved events.`,
        };
    }

    const student = Array.isArray(reg.student) ? reg.student[0] : reg.student;
    const studentName = (student as any)?.full_name ?? "Unknown Student";
    const eventTitle = (event as any).title ?? "Unknown Event";
    const studentId = reg.student_id as string;
    const eventId = reg.event_id as string;

    // CHECK 2: Already checked in?
    const { data: existing } = await supabase
        .from("attendance_logs")
        .select("id, scan_time")
        .eq("event_id", eventId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (existing) {
        const checkedInAt = new Date((existing as any).scan_time).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
        });
        return { outcome: "duplicate", studentName, eventTitle, checkedInAt };
    }

    // ACTION: Insert attendance log
    const { error: insertErr } = await supabase
        .from("attendance_logs")
        .insert({
            event_id: eventId,
            student_id: studentId,
            device_id: DEVICE_ID,
        });

    if (insertErr) {
        if (insertErr.code === "23505") {
            return { outcome: "duplicate", studentName, eventTitle, checkedInAt: "earlier (race condition)" };
        }
        return { outcome: "error", reason: insertErr.message };
    }

    // Mark registration as attended
    await supabase
        .from("registrations")
        .update({ status: "attended" })
        .eq("id", registrationId);

    return { outcome: "success", studentName, eventTitle };
}

// ─── Scanner View ─────────────────────────────────────────────────────────────

function ScannerView({ onScan }: { onScan: (code: string) => void }) {
    const scanned = useRef(false);
    const stopped = useRef(false);
    const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        scanned.current = false;
        stopped.current = false;

        async function safeStop() {
            if (stopped.current) return;
            stopped.current = true;
            try { await scannerRef.current?.stop(); } catch { /* ignore */ }
        }

        async function startScanner() {
            try {
                const { Html5Qrcode } = await import("html5-qrcode");
                const scanner = new Html5Qrcode(QR_ELEMENT_ID);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        if (scanned.current || !isMounted) return;
                        scanned.current = true;
                        safeStop().finally(() => {
                            if (isMounted) onScan(decodedText.trim());
                        });
                    },
                    () => { /* no QR — ignore */ }
                );
            } catch (err: unknown) {
                if (!isMounted) return;
                const msg = err instanceof Error ? err.message : "Camera unavailable";
                setCameraError(
                    msg.toLowerCase().includes("permission")
                        ? "Camera permission denied. Please allow camera access and reload the page."
                        : `Could not start camera: ${msg}`
                );
            }
        }

        void startScanner();
        return () => {
            isMounted = false;
            void safeStop();
        };
    }, [onScan]);

    if (cameraError) {
        return (
            <div
                className="flex flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center"
                style={{ width: 300, height: 300, background: "rgba(239,68,68,0.06)", border: "2px dashed rgba(239,68,68,0.3)" }}
            >
                <Camera size={40} className="text-red-400/60" />
                <p className="text-red-400 text-sm font-semibold leading-snug">{cameraError}</p>
            </div>
        );
    }

    return (
        <div className="relative" style={{ width: 300, height: 300 }}>
            <div
                id={QR_ELEMENT_ID}
                className="rounded-3xl overflow-hidden"
                style={{ width: 300, height: 300 }}
            />
            {/* Corner brackets */}
            {[
                "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
            ].map((cls, i) => (
                <div
                    key={i}
                    className={cn("absolute w-10 h-10 pointer-events-none", cls)}
                    style={{ borderColor: "#818cf8" }}
                />
            ))}
            {/* Scan bar */}
            <div
                className="absolute left-4 right-4 h-0.5 rounded-full pointer-events-none"
                style={{
                    background: "linear-gradient(90deg, transparent, #818cf8, transparent)",
                    animation: "scanBar 2s ease-in-out infinite",
                }}
            />
            <style>{`
                @keyframes scanBar {
                    0%, 100% { top: 20%; opacity: 0.7; }
                    50%       { top: 80%; opacity: 1; }
                }
                #${QR_ELEMENT_ID} video { object-fit: cover !important; }
                #${QR_ELEMENT_ID} img { display: none !important; }
            `}</style>
        </div>
    );
}

// ─── Full-screen Result Screens ───────────────────────────────────────────────

function SuccessScreen({
    studentName, eventTitle, scanTime, onNext,
}: { studentName: string; eventTitle: string; scanTime: string; onNext: () => void }) {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center z-50"
            style={{ background: "linear-gradient(180deg, #011a0e 0%, #03311c 100%)" }}
        >
            {/* Pulsing icon */}
            <div className="relative flex items-center justify-center">
                <div
                    className="absolute w-48 h-48 rounded-full animate-ping opacity-10"
                    style={{ background: "rgba(16,185,129,0.6)" }}
                />
                <div
                    className="w-36 h-36 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.15)", border: "3px solid rgba(16,185,129,0.5)" }}
                >
                    <CheckCircle2 size={64} className="text-emerald-400" strokeWidth={1.5} />
                </div>
            </div>

            <div>
                <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em] mb-3">
                    ✅ Access Granted
                </p>
                <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight">{studentName}</h2>
            </div>

            <div
                className="w-full max-w-sm rounded-2xl p-5 space-y-3 text-left"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
                <div className="flex items-center gap-3 text-sm text-white/70">
                    <Calendar size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="font-semibold text-white">{eventTitle}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                    <Clock size={12} className="text-emerald-500 flex-shrink-0" />
                    Checked in at {scanTime}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                    <ShieldCheck size={12} className="text-emerald-500 flex-shrink-0" />
                    Attendance log recorded
                </div>
            </div>

            <button
                id="success-scan-next"
                onClick={onNext}
                className="w-full max-w-sm h-14 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-base text-white transition-all active:scale-95"
                style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)" }}
            >
                <ScanLine size={20} /> Scan Next Student
            </button>
        </div>
    );
}

function DuplicateScreen({
    studentName, eventTitle, checkedInAt, onNext,
}: { studentName: string; eventTitle: string; checkedInAt: string; onNext: () => void }) {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center z-50"
            style={{ background: "linear-gradient(180deg, #1c1400 0%, #2d1f00 100%)" }}
        >
            <div className="relative flex items-center justify-center">
                <div
                    className="absolute w-48 h-48 rounded-full animate-ping opacity-10"
                    style={{ background: "rgba(245,158,11,0.6)" }}
                />
                <div
                    className="w-36 h-36 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.12)", border: "3px solid rgba(245,158,11,0.5)" }}
                >
                    <AlertCircle size={64} className="text-amber-400" strokeWidth={1.5} />
                </div>
            </div>

            <div>
                <p className="text-amber-400 text-xs font-black uppercase tracking-[0.3em] mb-3">
                    ⚠️ Duplicate Entry Detected
                </p>
                <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight">{studentName}</h2>
                <p className="text-amber-400/80 text-sm font-semibold mt-2">Already entered at {checkedInAt}</p>
            </div>

            <div
                className="w-full max-w-sm rounded-2xl p-5 space-y-3 text-left"
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
                <div className="flex items-center gap-3 text-sm text-white/70">
                    <Calendar size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="font-semibold text-white">{eventTitle}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                    <Ban size={12} className="text-amber-400 flex-shrink-0" />
                    Re-entry is not permitted. Contact organiser if needed.
                </div>
            </div>

            <button
                id="duplicate-scan-next"
                onClick={onNext}
                className="w-full max-w-sm h-14 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-base text-white transition-all active:scale-95"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)" }}
            >
                <ScanLine size={20} /> Scan Next Student
            </button>
        </div>
    );
}

function DeniedScreen({
    reason, code, onNext,
}: { reason: string; code: string; onNext: () => void }) {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center z-50"
            style={{ background: "linear-gradient(180deg, #1a0404 0%, #2e0808 100%)" }}
        >
            <div className="relative flex items-center justify-center">
                <div
                    className="absolute w-48 h-48 rounded-full animate-ping opacity-10"
                    style={{ background: "rgba(239,68,68,0.6)" }}
                />
                <div
                    className="w-36 h-36 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.12)", border: "3px solid rgba(239,68,68,0.5)" }}
                >
                    <XCircle size={64} className="text-red-400" strokeWidth={1.5} />
                </div>
            </div>

            <div>
                <p className="text-red-400 text-xs font-black uppercase tracking-[0.3em] mb-3">
                    ❌ Access Denied
                </p>
                <p className="text-white/80 text-lg leading-relaxed max-w-xs mx-auto font-semibold">{reason}</p>
            </div>

            <div
                className="w-full max-w-sm rounded-2xl px-5 py-4 text-left"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Scanned ID</p>
                <p className="text-xs text-white/50 font-mono break-all">{code}</p>
            </div>

            <button
                id="denied-scan-next"
                onClick={onNext}
                className="w-full max-w-sm h-14 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-base text-white transition-all active:scale-95"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}
            >
                <RefreshCw size={18} /> Try Again
            </button>
        </div>
    );
}

function VerifyingOverlay() {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center gap-5 z-50"
            style={{ background: "rgba(9,9,15,0.93)" }}
        >
            <div className="relative">
                <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.08)", border: "2px solid rgba(99,102,241,0.2)" }}
                >
                    <Loader2 size={40} className="text-indigo-400 animate-spin" strokeWidth={1.5} />
                </div>
            </div>
            <div className="text-center">
                <p className="text-white font-bold text-xl">Verifying…</p>
                <p className="text-white/40 text-sm mt-1">Checking registration database</p>
            </div>
        </div>
    );
}

// ─── Stats Counter ────────────────────────────────────────────────────────────

interface ScanStats { success: number; duplicate: number; denied: number }

function StatsBar({ stats }: { stats: ScanStats }) {
    const total = stats.success + stats.duplicate + stats.denied;
    if (total === 0) return null;
    return (
        <div
            className="w-full max-w-[320px] rounded-2xl p-4 flex items-center justify-around"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
            <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{stats.success}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Granted</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
                <p className="text-2xl font-extrabold text-amber-400">{stats.duplicate}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Duplicate</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
                <p className="text-2xl font-extrabold text-red-400">{stats.denied}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Denied</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
                <p className="text-2xl font-extrabold text-white">{total}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Total</p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacultyScanPage() {
    const router = useRouter();
    const [state, setState] = useState<ScanPhase>({ phase: "idle" });
    const [scannerKey, setScannerKey] = useState(0);
    const [stats, setStats] = useState<ScanStats>({ success: 0, duplicate: 0, denied: 0 });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) router.push("/login");
        });
    }, [router]);

    const handleScan = useCallback(async (code: string) => {
        setState({ phase: "verifying", code });
        try {
            const result = await verifyAndRecord(code);
            const now = new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
            });

            if (result.outcome === "success") {
                playBeep("success");
                setStats(s => ({ ...s, success: s.success + 1 }));
                setState({
                    phase: "success",
                    studentName: result.studentName!,
                    eventTitle: result.eventTitle!,
                    scanTime: now,
                });
            } else if (result.outcome === "duplicate") {
                playBeep("warning");
                setStats(s => ({ ...s, duplicate: s.duplicate + 1 }));
                setState({
                    phase: "duplicate",
                    studentName: result.studentName!,
                    eventTitle: result.eventTitle!,
                    checkedInAt: result.checkedInAt!,
                });
            } else if (result.outcome === "error") {
                playBeep("denied");
                setState({ phase: "error", message: result.reason ?? "Unknown error" });
            } else {
                playBeep("denied");
                setStats(s => ({ ...s, denied: s.denied + 1 }));
                setState({ phase: "denied", reason: result.reason!, code });
            }
        } catch (err: unknown) {
            playBeep("denied");
            setState({
                phase: "error",
                message: err instanceof Error ? err.message : "Unexpected error during verification.",
            });
        }
    }, []);

    function resetScanner() {
        setScannerKey(k => k + 1);
        setState({ phase: "scanning" });
    }

    const isFullscreen = ["success", "duplicate", "denied", "verifying"].includes(state.phase);

    return (
        <div
            className="relative min-h-screen font-sans flex flex-col overflow-hidden"
            style={{ background: "#09090f", color: "white" }}
        >
            {/* ── Full-screen overlays ── */}
            {state.phase === "verifying" && <VerifyingOverlay />}
            {state.phase === "success" && (
                <SuccessScreen
                    studentName={state.studentName}
                    eventTitle={state.eventTitle}
                    scanTime={state.scanTime}
                    onNext={resetScanner}
                />
            )}
            {state.phase === "duplicate" && (
                <DuplicateScreen
                    studentName={state.studentName}
                    eventTitle={state.eventTitle}
                    checkedInAt={state.checkedInAt}
                    onNext={resetScanner}
                />
            )}
            {state.phase === "denied" && (
                <DeniedScreen
                    reason={state.reason}
                    code={state.code}
                    onNext={resetScanner}
                />
            )}

            {/* ── Main UI (visible when not fullscreen) ── */}
            {!isFullscreen && (
                <>
                    {/* Header */}
                    <header
                        className="sticky top-0 z-40 px-5 pt-12 pb-4 flex items-center gap-4"
                        style={{
                            background: "rgba(9,9,15,0.95)",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                            <p className="text-white/40 text-xs font-medium">Faculty Tools</p>
                            <h1 className="text-white font-extrabold text-xl leading-tight flex items-center gap-2">
                                Live Attendance Scanner
                                <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}
                                >
                                    <Zap size={8} /> LIVE
                                </span>
                            </h1>
                        </div>
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
                        >
                            <BarChart3 size={11} />
                            {stats.success + stats.duplicate + stats.denied} scans
                        </div>
                    </header>

                    {/* Body */}
                    <main className="flex-1 flex flex-col items-center gap-6 px-5 pt-8 pb-16">

                        {/* Idle */}
                        {state.phase === "idle" && (
                            <>
                                <div
                                    className="w-[300px] h-[300px] rounded-3xl flex flex-col items-center justify-center gap-4"
                                    style={{ background: "rgba(99,102,241,0.05)", border: "2px dashed rgba(99,102,241,0.22)" }}
                                >
                                    <Camera size={60} className="text-indigo-400/30" strokeWidth={1} />
                                    <p className="text-white/25 text-sm text-center px-6">
                                        Press the button below to open the camera
                                    </p>
                                </div>

                                <StatsBar stats={stats} />
                                <InstructionsCard />

                                <button
                                    id="start-scanner-btn"
                                    onClick={() => setState({ phase: "scanning" })}
                                    className="w-full max-w-[300px] h-14 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-base text-white transition-all active:scale-95"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(124,58,237,0.5) 100%)",
                                        border: "1px solid rgba(99,102,241,0.5)",
                                        boxShadow: "0 0 30px rgba(99,102,241,0.2)",
                                    }}
                                >
                                    <Camera size={20} className="text-indigo-200" />
                                    Open Camera & Scan
                                </button>
                            </>
                        )}

                        {/* Scanning */}
                        {state.phase === "scanning" && (
                            <>
                                <p className="text-white/30 text-xs uppercase tracking-[0.2em] font-bold">
                                    Point at student QR code
                                </p>
                                <ScannerView key={scannerKey} onScan={code => void handleScan(code)} />

                                <div
                                    className="w-full max-w-[300px] rounded-2xl px-4 py-3.5 flex items-center gap-3"
                                    style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}
                                >
                                    <ScanLine size={16} className="text-indigo-400" />
                                    <div>
                                        <p className="text-white text-sm font-semibold">Waiting for QR code…</p>
                                        <p className="text-white/40 text-xs">Point camera at a student's ticket</p>
                                    </div>
                                </div>

                                <StatsBar stats={stats} />

                                <button
                                    onClick={() => setState({ phase: "idle" })}
                                    className="text-sm text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5"
                                >
                                    <XCircle size={14} /> Stop Camera
                                </button>
                            </>
                        )}

                        {/* Error */}
                        {state.phase === "error" && (
                            <div className="flex flex-col items-center gap-6 pt-10 text-center px-4">
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(245,158,11,0.08)", border: "2px solid rgba(245,158,11,0.3)" }}
                                >
                                    <AlertCircle size={44} className="text-amber-400" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xl">Unexpected Error</p>
                                    <p className="text-white/50 text-sm mt-2 max-w-xs">{state.message}</p>
                                </div>
                                <button
                                    onClick={resetScanner}
                                    className="px-8 h-12 rounded-2xl font-bold text-white text-sm"
                                    style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)" }}
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </main>
                </>
            )}
        </div>
    );
}

// ─── Instructions Card ────────────────────────────────────────────────────────

function InstructionsCard() {
    const steps = [
        { icon: Camera, color: "#818cf8", text: "Open the camera to start scanning" },
        { icon: ScanLine, color: "#818cf8", text: "Point at a student's QR ticket" },
        { icon: ShieldCheck, color: "#34d399", text: "Verification happens automatically" },
        { icon: User, color: "#34d399", text: "Green = Granted · Yellow = Duplicate · Red = Denied" },
    ];

    return (
        <div
            className="w-full max-w-[300px] rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <ShieldCheck size={10} /> How to scan
            </p>
            {steps.map(({ icon: Icon, color, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(99,102,241,0.08)" }}
                    >
                        <Icon size={13} style={{ color }} />
                    </div>
                    <p className="text-white/55 text-xs">{text}</p>
                </div>
            ))}
        </div>
    );
}
