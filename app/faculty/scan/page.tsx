"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanPhase =
    | { phase: "idle" }
    | { phase: "scanning" }
    | { phase: "verifying"; code: string }
    | { phase: "success"; studentName: string; eventTitle: string; scanTime: string; photo?: string }
    | { phase: "duplicate"; studentName: string; eventTitle: string; checkedInAt: string }
    | { phase: "denied"; reason: string; code: string }
    | { phase: "error"; message: string };

interface ScanStats { success: number; duplicate: number; denied: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const QR_ELEMENT_ID = "faculty-qr-reader";

// ─── Audio Helpers ────────────────────────────────────────────────────────────

function playAudio(type: "success" | "error") {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        if (type === "success") {
            // High-pitched success beep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            // Low-pitched error buzzer
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(110, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    } catch (e) {
        console.warn("Audio Context failed", e);
    }
}

// ─── Verification Logic ───────────────────────────────────────────────────────

/**
 * Validates a scanned Registration UUID.
 */
async function verifyRegistration(
    registrationId: string,
    lockEventId: string | null,
    institutionId: string | undefined
): Promise<{ outcome: "success" | "duplicate" | "denied" | "error"; data?: any; reason?: string }> {
    try {
        // Step 1: Fetch Registration
        const { data: reg, error: regErr } = await supabase
            .from("registrations")
            .select(`
                id,
                status,
                event_id,
                student_id,
                student:users!registrations_student_id_fkey ( 
                    id, 
                    full_name, 
                    avatar_url,
                    institution_id
                ),
                event:events (
                    id,
                    title,
                    institution_id
                )
            `)
            .eq("id", registrationId)
            .single();

        if (regErr || !reg) {
            return { outcome: "denied", reason: "Invalid Ticket / Not Registered ❌" };
        }

        const student = reg.student as any;
        const event = reg.event as any;

        // Step 2: Institution Check
        if (institutionId && student.institution_id !== institutionId) {
            return { outcome: "denied", reason: "Security Violation: Not from this Institution 🛡️" };
        }

        // Step 3: Event Lock Check
        if (lockEventId && reg.event_id !== lockEventId) {
            return { outcome: "denied", reason: "Wrong Venue / Event ❌" };
        }

        // Step 4: Duplicate Check
        const { data: existing } = await supabase
            .from("attendance_logs")
            .select("scan_time")
            .eq("event_id", reg.event_id)
            .eq("student_id", reg.student_id)
            .maybeSingle();

        if (existing) {
            const time = new Date(existing.scan_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
                outcome: "duplicate",
                data: { studentName: student.full_name, eventTitle: event.title, checkedInAt: time }
            };
        }

        // Step 5: Log Attendance
        const { error: logErr } = await supabase
            .from("attendance_logs")
            .insert({
                event_id: reg.event_id,
                student_id: reg.student_id,
                device_id: `WEB-SCANNER-${navigator.userAgent.slice(0, 10)}`,
            });

        if (logErr) throw logErr;

        // Update registration status to 'attended'
        await supabase
            .from("registrations")
            .update({ status: "attended" })
            .eq("id", registrationId);

        return {
            outcome: "success",
            data: { studentName: student.full_name, eventTitle: event.title, photo: student.avatar_url }
        };

    } catch (err: any) {
        console.error("Verification error:", err);
        return { outcome: "error", reason: err.message };
    }
}

// ─── Components ───────────────────────────────────────────────────────────────

function ScannerView({ onScan }: { onScan: (code: string) => void }) {
    const scannerRef = useRef<any>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            try {
                const { Html5Qrcode } = await import("html5-qrcode");
                const scanner = new Html5Qrcode(QR_ELEMENT_ID);
                scannerRef.current = scanner;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (isMounted) {
                            scanner.stop().then(() => onScan(decodedText.trim()));
                        }
                    },
                    () => { }
                );
            } catch (err: any) {
                if (isMounted) setCameraError(err.message || "Camera blocked");
            }
        };

        startScanner();
        return () => {
            isMounted = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop();
            }
        };
    }, [onScan]);

    if (cameraError) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-red-500/30 rounded-3xl p-8 text-center bg-red-500/5 aspect-square w-full max-w-[320px]">
                <Camera size={40} className="text-red-400/50" />
                <p className="text-red-400 text-sm font-medium">{cameraError}</p>
                <button onClick={() => window.location.reload()} className="text-xs text-white underline">Grant Permission</button>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-[320px] aspect-square rounded-[3rem] overflow-hidden border-2 border-white/5 bg-black">
            <div id={QR_ELEMENT_ID} className="w-full h-full" />

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 h-64 border-2 border-indigo-500/50 rounded-3xl relative">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                    {/* Scan Line */}
                    <div className="absolute w-full h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-scan" style={{ top: '50%' }} />
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(-120px); opacity: 0; }
                    50% { transform: translateY(120px); opacity: 1; }
                }
                .animate-scan {
                    animation: scan 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacultyScanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUser();

    // Config
    const lockEventId = searchParams.get("eventId");
    const [state, setState] = useState<ScanPhase>({ phase: "idle" });
    const [stats, setStats] = useState<ScanStats>({ success: 0, duplicate: 0, denied: 0 });

    const handleScanComplete = useCallback(async (code: string) => {
        setState({ phase: "verifying", code });

        const result = await verifyRegistration(code, lockEventId, user?.institution_id);

        setTimeout(() => {
            if (result.outcome === "success") {
                playAudio("success");
                setStats(prev => ({ ...prev, success: prev.success + 1 }));
                setState({
                    phase: "success",
                    studentName: result.data.studentName,
                    eventTitle: result.data.eventTitle,
                    photo: result.data.photo,
                    scanTime: new Date().toLocaleTimeString()
                });
            } else if (result.outcome === "duplicate") {
                setStats(prev => ({ ...prev, duplicate: prev.duplicate + 1 }));
                setState({
                    phase: "duplicate",
                    studentName: result.data.studentName,
                    eventTitle: result.data.eventTitle,
                    checkedInAt: result.data.checkedInAt
                });
            } else {
                playAudio("error");
                setStats(prev => ({ ...prev, denied: prev.denied + 1 }));
                setState({ phase: "denied", reason: result.reason || "Verification Failed", code });
            }
        }, 600); // Slight delay for UX feel
    }, [lockEventId, user]);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between relative z-10">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="text-center">
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Attendance Engine</h1>
                    <div className="flex items-center gap-2 mt-0.5 justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-xs font-bold text-indigo-400">
                            {lockEventId ? "Restricted Venue" : "Universal Pass Mode"}
                        </span>
                    </div>
                </div>
                <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center opacity-0 pointer-events-none">
                    <History size={18} />
                </button>
            </div>

            {/* Main Interface */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative z-10">

                {state.phase === "idle" && (
                    <div className="flex flex-col items-center gap-10 animate-in fade-in zoom-in duration-500">
                        <div className="w-48 h-48 rounded-full bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping duration-[3s]" />
                            <ScanLine size={64} className="text-indigo-400" />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black tracking-tight">Scanner Terminal</h2>
                            <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed mx-auto">
                                Grant camera permissions to begin scanning student entry passes.
                            </p>
                        </div>

                        <button
                            onClick={() => setState({ phase: "scanning" })}
                            className="w-full max-w-[280px] h-16 bg-white text-black rounded-[2rem] font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                        >
                            Activate Camera
                        </button>
                    </div>
                )}

                {state.phase === "scanning" && (
                    <div className="flex flex-col items-center gap-8 w-full animate-in fade-in duration-300">
                        <ScannerView onScan={handleScanComplete} />
                        <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                            Align QR Ticket in Frame
                        </p>
                    </div>
                )}

                {/* Verification Loading */}
                {state.phase === "verifying" && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-white mb-2" size={32} />
                        <p className="text-xs font-black uppercase tracking-widest text-white/40">Syncing with Ledger...</p>
                    </div>
                )}
            </main>

            {/* Bottom Stats Footer */}
            <div className="p-8 pt-0 grid grid-cols-3 gap-4 relative z-10">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-400">{stats.success}</p>
                    <p className="text-[8px] font-black uppercase text-emerald-500/60 tracking-widest mt-1">Verified</p>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-amber-400">{stats.duplicate}</p>
                    <p className="text-[8px] font-black uppercase text-amber-500/60 tracking-widest mt-1">Re-Entry</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-red-400">{stats.denied}</p>
                    <p className="text-[8px] font-black uppercase text-red-500/60 tracking-widest mt-1">Denied</p>
                </div>
            </div>

            {/* FULL SCREEN SUCCESS OVERLAY */}
            {state.phase === "success" && (
                <div
                    className="fixed inset-0 z-[100] bg-emerald-600 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300"
                    onClick={() => setState({ phase: "scanning" })}
                >
                    <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center mb-8 shadow-2xl overflow-hidden bg-black">
                        {state.photo ? (
                            <img src={state.photo} className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="text-white/20" />
                        )}
                    </div>
                    <div className="space-y-2 mb-12">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-black/50">Access Granted ✅</p>
                        <h2 className="text-5xl font-black tracking-tighter leading-none">{state.studentName}</h2>
                        <p className="text-sm font-medium opacity-80 mt-4">{state.eventTitle}</p>
                    </div>
                    <div className="bg-black/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified On-Site @ {state.scanTime}</p>
                    </div>
                    <button className="mt-12 text-sm font-black uppercase tracking-widest underline decoration-2 underline-offset-8">Continue Scanning</button>

                    {/* Ripple Effect Animation */}
                    <div className="absolute inset-0 bg-white/10 animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '2s' }} />
                </div>
            )}

            {/* FULL SCREEN ERROR / DENIED OVERLAY */}
            {(state.phase === "denied" || state.phase === "duplicate") && (
                <div
                    className={cn(
                        "fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in slide-in-from-bottom duration-300",
                        state.phase === "duplicate" ? "bg-amber-500" : "bg-red-600"
                    )}
                    onClick={() => setState({ phase: "scanning" })}
                >
                    <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center mb-8 shadow-2xl">
                        {state.phase === "duplicate" ? <Ban size={40} /> : <XCircle size={40} />}
                    </div>

                    <div className="space-y-2 mb-12">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-black/50">
                            {state.phase === "duplicate" ? "Already Verified ⚠️" : "Entry Blocked ❌"}
                        </p>
                        <h2 className="text-3xl font-black tracking-tight leading-tight">
                            {state.phase === "duplicate" ? state.studentName : state.reason}
                        </h2>
                        {state.phase === "duplicate" && (
                            <p className="text-sm font-medium opacity-80 mt-2">First Entry at {state.checkedInAt}</p>
                        )}
                    </div>

                    <p className="text-xs opacity-60 max-w-[200px] leading-relaxed">
                        Refer this student to the helpdesk for manual resolution.
                    </p>

                    <button className="mt-12 text-sm font-black uppercase tracking-widest border-2 border-white px-8 py-4 rounded-full">
                        Scan Again
                    </button>
                </div>
            )}

            {/* Error UI */}
            {state.phase === "error" && (
                <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle size={48} className="text-red-500 mb-6" />
                    <h2 className="text-xl font-bold mb-4">Terminal Error</h2>
                    <p className="text-zinc-500 text-sm mb-8">{state.message}</p>
                    <button onClick={() => setState({ phase: "idle" })} className="underline text-sm font-bold opacity-60">Restart Terminal</button>
                </div>
            )}
        </div>
    );
}
