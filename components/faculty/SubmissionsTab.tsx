"use client";

import React, { useState } from "react";
import {
    Users,
    FileText,
    Link as LinkIcon,
    ExternalLink,
    ArrowRight,
    Save,
    Loader2,
    X,
    Zap,
    Github,
    FolderOpen,
    Clock,
    ArrowUpRight,
    ShieldCheck,
    CheckCircle2,
    Send,
    Eye,
    FileArchive,
    Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Submission {
    id: string;
    event_id: string;
    student_id: string;
    round_id: string | null;
    team_id: string | null;
    project_link: string;
    title: string | null;
    description: string | null;
    file_url: string | null;
    submission_time: string;
    score: number | null;
    feedback: string | null;
    status: "pending" | "graded";
    student?: { full_name: string; email: string };
    team?: { name: string };
}

export interface Round {
    id: string;
    title: string;
    type: string;
    description: string;
    round_number: number;
}

interface SubmissionsTabProps {
    submissions: Submission[];
    rounds: Round[];
    selectedRoundId: string | null;
    onRoundSelect: (id: string) => void;
    onSaveScore: (id: string, score: number, feedback: string) => Promise<void>;
    saving: boolean;
    readOnly?: boolean;
}

export function SubmissionsTab({
    submissions,
    rounds,
    selectedRoundId,
    onRoundSelect,
    onSaveScore,
    saving,
    readOnly
}: SubmissionsTabProps) {
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

    const digitalRounds = rounds.filter(r => r.type === "DIGITAL_SUBMISSION" || r.type === "submission");
    const activeRound = rounds.find(r => r.id === selectedRoundId);

    const gradedCount = submissions.filter(s => s.status === "graded").length;
    const totalCount = submissions.length;

    return (
        <div className="space-y-12">
            {/* Header / Stats View */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
                <div className="space-y-2 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                        <Terminal size={10} /> Evaluation Suite
                    </div>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">MISSION_DEBRIEF</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Analyze and grade student contributions</p>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-5 md:px-6 flex items-center gap-4 min-w-[160px]">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                            <FileText size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Total Submissions</p>
                            <p className="text-2xl font-black text-white tabular-nums">{totalCount}</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-5 md:px-6 flex items-center gap-4 min-w-[160px]">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Graded Entries</p>
                            <p className="text-2xl font-black text-emerald-400 tabular-nums">{gradedCount}</p>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
            </header>

            {/* Round Navigation */}
            {digitalRounds.length > 0 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {digitalRounds.map((round) => (
                        <button
                            key={round.id}
                            onClick={() => onRoundSelect(round.id)}
                            className={cn(
                                "flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all h-12 flex items-center gap-2 border",
                                selectedRoundId === round.id
                                    ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    : "bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/10 hover:text-white"
                            )}
                        >
                            <Zap size={12} className={cn(selectedRoundId === round.id ? "text-indigo-500" : "text-zinc-600")} />
                            Round {round.round_number}: {round.title}
                        </button>
                    ))}
                </div>
            )}

            {/* Evaluation Table */}
            <div className="bg-zinc-950/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Team / Participant</th>
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Project Intelligence</th>
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Artifacts</th>
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] text-center">Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] text-center">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {submissions.length > 0 ? (
                                submissions.map((sub) => (
                                    <tr
                                        key={sub.id}
                                        onClick={() => setSelectedSubmission(sub)}
                                        className="hover:bg-white/[0.04] cursor-pointer transition-all group"
                                    >
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all duration-300">
                                                    {sub.team ? <Users size={20} /> : <FileText size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-white italic tracking-tight">{sub.team?.name || sub.student?.full_name}</p>
                                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                                                        {sub.team ? "Mission Team" : "Individual Entry"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-zinc-300 italic group-hover:text-white transition-colors truncate max-w-[200px]">
                                                    {sub.title || "UNTITLED_MISSION"}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                                    <Clock size={10} />
                                                    {new Date(sub.submission_time).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-3">
                                                <ProjectArtifactLinks submission={sub} />
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-center">
                                            <span className={cn(
                                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-all",
                                                sub.status === "graded"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", sub.status === "graded" ? "bg-emerald-500" : "bg-amber-500")} />
                                                {sub.status === "graded" ? "Evaluated" : "Awaiting Review"}
                                            </span>
                                        </td>
                                        <td className="px-10 py-7 text-center">
                                            <div className="text-xl font-black text-white italic tracking-tighter">
                                                {sub.score !== null ? sub.score : <span className="text-zinc-800 opacity-20">---</span>}
                                                <span className="text-[10px] text-zinc-600 not-italic ml-1 tracking-widest uppercase">/ 100</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-800 mb-4 shadow-inner">
                                                <FileArchive size={40} />
                                            </div>
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">No Payloads Received</h3>
                                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest max-w-[300px] leading-relaxed">
                                                The mission grid is currently empty. Submissions will appear here once participants initialize transmission.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Grading Sheet Overlay */}
            <AnimatePresence>
                {selectedSubmission && (
                    <GradingSheet
                        submission={selectedSubmission}
                        round={activeRound}
                        onClose={() => setSelectedSubmission(null)}
                        onSave={onSaveScore}
                        saving={saving}
                        readOnly={readOnly}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ProjectArtifactLinks({ submission }: { submission: Submission }) {
    const hasGithub = submission.project_link && (submission.project_link.includes('github.com') || submission.project_link.includes('gitlab.com'));
    const hasZip = submission.file_url && submission.file_url.length > 0;

    return (
        <>
            {hasGithub && (
                <a
                    href={submission.project_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-indigo-500/50 transition-all"
                    title="Source Code"
                >
                    <Github size={16} />
                </a>
            )}
            {hasZip && (
                <a
                    href={submission.file_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:border-emerald-500/50 transition-all"
                    title="Pitch Deck / Project ZIP"
                >
                    <FileArchive size={16} />
                </a>
            )}
            {!hasGithub && !hasZip && submission.project_link && (
                <a
                    href={submission.project_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                    title="External Link"
                >
                    <ExternalLink size={16} />
                </a>
            )}
        </>
    );
}

function GradingSheet({
    submission,
    round,
    onClose,
    onSave,
    saving,
    readOnly
}: {
    submission: Submission;
    round?: Round;
    onClose: () => void;
    onSave: any;
    saving: boolean;
    readOnly?: boolean
}) {
    const [score, setScore] = useState(submission.score || 0);
    const [feedback, setFeedback] = useState(submission.feedback || "");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-end font-sans">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-2xl h-full bg-[#09090b] border-l border-white/5 shadow-2xl flex flex-col"
            >
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-12 space-y-16 scrollbar-hide pt-24">
                    {/* Header Info */}
                    <header className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck size={10} /> Evaluation Protocol
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-tight">
                            {submission.title || "UNTITLED_MISSION"}
                        </h2>

                        <div className="flex items-center gap-5 pt-2">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white font-black text-2xl italic tracking-tighter">
                                {(submission.team?.name || submission.student?.full_name || "?").charAt(0)}
                            </div>
                            <div>
                                <p className="text-xl font-black text-white tracking-tight italic">{submission.team?.name || submission.student?.full_name}</p>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{submission.student?.email}</p>
                            </div>
                        </div>
                    </header>

                    {/* Round Context */}
                    {round && (
                        <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <Zap size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{round.title}</p>
                                    <p className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-widest">Grading Context</p>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed italic border-l-2 border-indigo-500/20 pl-4">
                                {round.description || "No specific instructions provided for this round."}
                            </p>
                        </div>
                    )}

                    {/* Mission Data / Links Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 space-y-6">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-white/5 pb-4">Artifact Payload</p>

                            <div className="space-y-4">
                                {submission.project_link && (
                                    <ProjectLinkRow
                                        url={submission.project_link}
                                        label={submission.project_link.includes('github.com') ? "Source Code" : "Project Link"}
                                        icon={submission.project_link.includes('github.com') ? <Github size={16} /> : <ExternalLink size={16} />}
                                    />
                                )}
                                {submission.file_url && (
                                    <ProjectLinkRow
                                        url={submission.file_url}
                                        label="Project Deliverable"
                                        icon={<FileArchive size={16} />}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <ShieldCheck size={24} />
                            </div>
                            <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest italic leading-relaxed">Verified encryption protocol active for this session.</p>
                        </div>
                    </div>

                    {/* Mission Intelligence (Description) */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">Mission Pitch & Intel</label>
                        <div className="p-10 rounded-[3rem] bg-zinc-950 border border-white/5 text-zinc-400 text-sm font-medium leading-[1.8] italic">
                            {submission.description || "No mission debriefing provided by the agent."}
                        </div>
                    </div>

                    {/* Grading Form */}
                    <div className="space-y-12 pb-12">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Performance Score (0-100)</label>
                                <div className="text-5xl font-black text-white italic tracking-tighter">
                                    {score}
                                    <span className="text-xl text-zinc-800 not-italic ml-2 opacity-20">/ 100</span>
                                </div>
                            </div>
                            <input
                                disabled={readOnly}
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={score}
                                onChange={(e) => setScore(Number(e.target.value))}
                                className="w-full h-2 bg-zinc-900 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all disabled:opacity-50"
                            />
                            <div className="flex justify-between text-[9px] font-black text-zinc-700 uppercase tracking-widest px-2">
                                <span>POOR</span>
                                <span>STANDARD</span>
                                <span>EXCELLENCE</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2">HQ Evaluator Comments</label>
                            <textarea
                                readOnly={readOnly}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder={readOnly ? "No evaluation log available." : "Record your findings for the participant..."}
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-10 text-sm font-medium text-white focus:outline-none focus:border-indigo-500/50 min-h-[200px] resize-none shadow-inner placeholder:text-zinc-800 leading-relaxed italic"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-10 border-t border-white/5 bg-zinc-950 flex gap-5 items-center">
                    <button
                        onClick={onClose}
                        className="h-16 px-8 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {readOnly ? "Close Protocol" : "Abort Evaluation"}
                    </button>

                    {!readOnly && (
                        <button
                            disabled={saving}
                            onClick={() => onSave(submission.id, score, feedback).then(onClose)}
                            className="flex-1 h-16 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500 hover:text-white transition-all shadow-2xl disabled:opacity-50 active:scale-95 group"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            Publish Grade to student
                        </button>
                    )}
                </div>

                {/* Close Button UI */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-zinc-600 hover:text-white transition-all hover:bg-indigo-500/10 hover:border-indigo-500/30 group"
                >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </motion.div>
        </div>
    );
}

function ProjectLinkRow({ url, label, icon }: { url: string; label: string; icon: React.ReactNode }) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-zinc-950 border border-white/10 rounded-2xl hover:border-indigo-500/50 transition-all group/row"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover/row:text-indigo-400 group-hover/row:bg-indigo-500/10 transition-all">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{label}</p>
                    <p className="text-[9px] font-bold text-zinc-600 truncate max-w-[140px] italic">{url}</p>
                </div>
            </div>
            <ArrowUpRight size={14} className="text-zinc-800 group-hover/row:text-indigo-500 transition-all" />
        </a>
    );
}
