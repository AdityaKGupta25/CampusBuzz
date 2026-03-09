"use client";

import React, { useState } from "react";
import {
    Trophy,
    Medal,
    Award,
    CheckCircle2,
    Users,
    User,
    Lock,
    Save,
    Loader2,
    AlertTriangle,
    ArrowRight,
    Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface Prize {
    id?: string;
    title: string;
    value: number;
    reward: string;
    goodie?: string;
    icon: string;
    position: number;
    winner_id?: string | null;
    winner_team_id?: string | null;
}

interface Registration {
    id: string;
    student_id: string;
    team_id: string | null;
    student?: { full_name: string; email: string };
    team?: { name: string };
}

interface ResultsTabProps {
    event: { id: string; status: string; title: string };
    registrations: Registration[];
    prizes: Prize[];
    onAssignWinner: (prizeId: string, winnerId: string | null, type: "individual" | "team") => Promise<void>;
    onCompleteEvent: () => Promise<void>;
    saving: boolean;
}

export function ResultsTab({
    event,
    registrations,
    prizes,
    onAssignWinner,
    onCompleteEvent,
    saving
}: ResultsTabProps) {
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [localSaving, setLocalSaving] = useState<string | null>(null);

    const isReadOnly = event.status === "completed";
    const isActive = event.status === "live" || event.status === "evaluation";

    // Deduplicate entries if it's a team event, or list students if individual
    // For results, we usually want to select from Teams if it's a team event, or Students if individual.
    // We can derive this from registrants who have a team_id vs those who don't.

    // Group registrations by team if team_id exists
    const teams = Array.from(new Map(
        registrations
            .filter(r => r.team_id && r.team)
            .map(r => [r.team_id, { id: r.team_id!, name: r.team!.name }])
    ).values());

    const individuals = registrations
        .filter(r => !r.team_id && r.student)
        .map(r => ({ id: r.student_id, name: r.student!.full_name }));

    const handleAssign = async (prizeId: string, value: string) => {
        setLocalSaving(prizeId);
        try {
            if (!value) {
                await onAssignWinner(prizeId, null, "individual");
            } else {
                const [type, id] = value.split(":");
                await onAssignWinner(prizeId, id, type as "individual" | "team");
            }
        } finally {
            setLocalSaving(null);
        }
    };

    return (
        <div className="space-y-12 pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter">Results & Merit Center</h2>
                    <p className="text-zinc-500 text-sm font-medium mt-1">Assign winners to prizes and finalize the event lifecycle.</p>
                </div>
                {!isReadOnly && (
                    <div className={cn(
                        "px-6 py-3 rounded-2xl border flex items-center gap-3",
                        isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-900 border-white/5 text-zinc-500"
                    )}>
                        <Zap size={16} className={isActive ? "animate-pulse" : ""} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? "System Active" : "Waiting for Live Phase"}</span>
                    </div>
                )}
            </header>

            {!isActive && !isReadOnly ? (
                <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={24} className="text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Results are currently locked</h3>
                    <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">
                        You can only assign winners and complete the event once it has reached the
                        <span className="text-emerald-400 mx-1">Live</span> or <span className="text-cyan-400 mx-1">Evaluation</span> phase.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Prize Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4">Prize Allocations</label>
                        {prizes.sort((a, b) => a.position - b.position).map((prize) => (
                            <div
                                key={prize.id}
                                className={cn(
                                    "bg-zinc-900/30 border border-white/5 rounded-3xl p-6 transition-all",
                                    prize.winner_id || prize.winner_team_id ? "border-emerald-500/20 bg-emerald-500/[0.02]" : ""
                                )}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl",
                                            prize.position === 1 ? "bg-amber-500/10 text-amber-500" :
                                                prize.position === 2 ? "bg-slate-300/10 text-slate-300" :
                                                    "bg-orange-800/10 text-orange-800"
                                        )}>
                                            {prize.icon === 'trophy' ? <Trophy size={28} /> :
                                                prize.icon === 'medal' ? <Medal size={28} /> :
                                                    <Award size={28} />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white tracking-tight">{prize.title}</h4>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                                                {prize.reward} • ₹{prize.value.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 max-w-xs">
                                        <select
                                            disabled={isReadOnly || (prize.id ? localSaving === prize.id : false)}
                                            value={prize.winner_team_id ? `team:${prize.winner_team_id}` : prize.winner_id ? `individual:${prize.winner_id}` : ""}
                                            onChange={(e) => prize.id && handleAssign(prize.id, e.target.value)}
                                            className={cn(
                                                "w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50 appearance-none disabled:opacity-50",
                                                (prize.winner_id || prize.winner_team_id) && !isReadOnly ? "text-emerald-400 border-emerald-500/30" : ""
                                            )}
                                        >
                                            <option value="">Select Winner...</option>
                                            {teams.length > 0 && (
                                                <optgroup label="Registered Teams">
                                                    {teams.map(t => (
                                                        <option key={t.id} value={`team:${t.id}`}>{t.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {individuals.length > 0 && (
                                                <optgroup label="Registered Students">
                                                    {individuals.map(s => (
                                                        <option key={s.id} value={`individual:${s.id}`}>{s.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Completion Card */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4">Finalization</label>
                        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 space-y-8 sticky top-24">
                            <div className="space-y-4">
                                <h3 className="text-xl font-black text-white tracking-tighter">Mission Closure</h3>
                                <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                                    Finalizing the event will freeze all records, generate participant certificates,
                                    and upload the winner data to the audit-ready Governance Ledger.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                    <span>Prizes Allocated</span>
                                    <span className="text-white">{prizes.filter(p => p.winner_id || p.winner_team_id).length} / {prizes.length}</span>
                                </div>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(prizes.filter(p => p.winner_id || p.winner_team_id).length / prizes.length) * 100}%` }}
                                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    />
                                </div>
                            </div>

                            {!isReadOnly ? (
                                <button
                                    onClick={() => setIsConfirmModalOpen(true)}
                                    className="w-full py-5 rounded-2xl bg-red-500 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                                >
                                    <Lock size={16} />
                                    Publish & Complete
                                </button>
                            ) : (
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-3 text-center">
                                    <CheckCircle2 className="text-emerald-400" size={32} />
                                    <div>
                                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">Event Completed</p>
                                        <p className="text-emerald-400/60 text-[10px] font-medium mt-1">Records are now immutable and pushed to ledger.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <AnimatePresence>
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConfirmModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />

                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-white tracking-tighter">Point of No Return</h3>
                                <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                                    You are about to complete <span className="text-white font-bold">"{event.title}"</span>.
                                    This will lock all event settings, generate digital certificates for all attendees,
                                    and commit the results to the institutional audit trail.
                                </p>
                            </div>

                            <div className="mt-10 space-y-4">
                                <Button
                                    id="confirm-complete-btn"
                                    onClick={() => {
                                        setIsConfirmModalOpen(false);
                                        onCompleteEvent();
                                    }}
                                    className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                    loading={saving}
                                >
                                    Confirm & Lock Permenantly
                                </Button>
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="w-full h-14 bg-zinc-800 border border-white/5 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
