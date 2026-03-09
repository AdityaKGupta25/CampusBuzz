"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    Github,
    CheckCircle2,
    Clock,
    Lock,
    AlertCircle,
    FileArchive,
    Loader2,
    Send,
    Terminal,
    Trophy,
    ShieldCheck,
    Trash2,
    RefreshCw,
    X,
    Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SubmissionWorkspaceProps {
    event: {
        id: string;
        title: string;
        end_time: string;
        registration_config?: any;
    };
    round?: {
        id: string;
        title: string;
        end_time: string;
    };
    studentId: string;
    teamId?: string | null;
    isCaptain?: boolean;
    onSuccess?: (submission: any) => void;
    onCancel?: () => void;
}

// ── Simple toast state managed locally ──────────────────────────────────────
function useToast() {
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setToast({ message, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    return { toast, showToast };
}

export function SubmissionWorkspace({
    event,
    round,
    studentId,
    teamId,
    isCaptain = true,
    onSuccess,
    onCancel,
}: SubmissionWorkspaceProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [removingFile, setRemovingFile] = useState(false);
    const [submission, setSubmission] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [editMode, setEditMode] = useState(false);
    const { toast, showToast } = useToast();

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [projectLink, setProjectLink] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchSubmission();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, []);

    const updateCountdown = () => {
        const endTimeStr = round ? round.end_time : event.end_time;
        const end = new Date(endTimeStr).getTime();
        const now = new Date().getTime();
        const diff = end - now;

        if (diff <= 0) {
            setTimeLeft("SUBMISSION_CLOSED");
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };

    const fetchSubmission = async () => {
        try {
            let query = supabase
                .from("submissions")
                .select("*")
                .eq("event_id", event.id);

            if (teamId) {
                query = query.eq("team_id", teamId);
            } else {
                query = query.eq("student_id", studentId);
            }

            if (round) {
                query = query.eq("round_id", round.id);
            } else {
                query = query.is("round_id", null);
            }

            const { data } = await query.maybeSingle();

            if (data) {
                setSubmission(data);
                setTitle(data.title || "");
                setDescription(data.description || "");
                setProjectLink(data.project_link || "");
                setExistingFileUrl(data.file_url || null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async () => {
        if (!file) return null;
        const fileExt = file.name.split(".").pop();
        const fileName = `${event.id}_${studentId}_${Date.now()}.${fileExt}`;
        const filePath = `submissions/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("event-submissions")
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from("event-submissions")
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleRemoveFile = async () => {
        if (!existingFileUrl) {
            setFile(null);
            return;
        }

        setRemovingFile(true);
        try {
            // Extract the storage path from the full URL
            const urlParts = existingFileUrl.split("/event-submissions/");
            if (urlParts.length > 1) {
                await supabase.storage
                    .from("event-submissions")
                    .remove([urlParts[1]]);
            }

            // Clear the file_url from the DB record too
            if (submission?.id) {
                await supabase
                    .from("submissions")
                    .update({ file_url: null })
                    .eq("id", submission.id);
            }

            setExistingFileUrl(null);
            setFile(null);
            showToast("File removed. You can now upload a new version.", "success");
        } catch (err: any) {
            showToast("Could not remove file: " + err.message, "error");
        } finally {
            setRemovingFile(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCaptain) return;
        if (!title.trim() || !projectLink.trim()) return;

        setSubmitting(true);
        setError(null);

        try {
            let fileUrl = existingFileUrl || "";
            if (file) {
                fileUrl = await uploadFile() || "";
            }

            const payload: any = {
                event_id: event.id,
                round_id: round ? round.id : null,
                student_id: studentId,
                team_id: teamId || null,
                title,
                description,
                project_link: projectLink,
                file_url: fileUrl || null,
                submission_time: new Date().toISOString(),
                status: "pending",
            };

            // Include the ID so upsert targets the right row
            if (submission?.id) {
                payload.id = submission.id;
            }

            const { data, error: submitError } = await supabase
                .from("submissions")
                .upsert(payload, {
                    onConflict: submission?.id ? "id" : "round_id,student_id",
                    ignoreDuplicates: false,
                })
                .select()
                .single();

            if (submitError) throw submitError;

            setSubmission(data);
            setEditMode(false);
            if (onSuccess) onSuccess(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        // Restore form to saved submission state
        if (submission) {
            setTitle(submission.title || "");
            setDescription(submission.description || "");
            setProjectLink(submission.project_link || "");
            setExistingFileUrl(submission.file_url || null);
            setFile(null);
        }
        setEditMode(false);
        setError(null);
        if (onCancel) onCancel();
    };

    const isSubmitDisabled =
        submitting ||
        timeLeft === "SUBMISSION_CLOSED" ||
        !title.trim() ||
        !projectLink.trim();

    const isEditing = !submission || editMode;
    const isExistingSubmission = !!submission;

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic animate-pulse">
                    Syncing environment...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-12 relative">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                            "fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border text-[11px] font-black uppercase tracking-widest",
                            toast.type === "success"
                                ? "bg-emerald-500 text-black border-emerald-400"
                                : "bg-rose-500 text-white border-rose-400"
                        )}
                    >
                        {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header / Countdown */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest">
                        <Terminal size={10} /> Internal Workspace
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase whitespace-nowrap">
                        {isExistingSubmission && !editMode ? "MISSION_LOG" : "MISSION_SUBMISSION"}
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                        {isExistingSubmission && !editMode
                            ? "Submitted payload — awaiting grading"
                            : "Secure portal for event deliverables"}
                    </p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:px-8 flex items-center gap-6 min-w-[240px]">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        timeLeft === "SUBMISSION_CLOSED"
                            ? "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                            : "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                    )}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                            {timeLeft === "SUBMISSION_CLOSED" ? "Status" : "Time Remaining"}
                        </p>
                        <p className={cn(
                            "text-2xl font-black tabular-nums tracking-wider",
                            timeLeft === "SUBMISSION_CLOSED" ? "text-rose-500 text-base" : "text-white text-3xl"
                        )}>
                            {timeLeft === "SUBMISSION_CLOSED" ? "CLOSED" : timeLeft}
                        </p>
                    </div>
                </div>
            </div>

            {/* Success / Submitted State */}
            {isExistingSubmission && !editMode ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-10 md:p-14 bg-emerald-500/5 border border-emerald-500/10 rounded-[3rem] text-center space-y-8"
                >
                    <div className="relative">
                        <div className="w-20 h-20 bg-emerald-500 text-black rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 relative z-10">
                            <CheckCircle2 size={40} />
                        </div>
                        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                            Mission Log Saved
                        </h3>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                            Payload successfully transmitted at{" "}
                            {new Date(submission.submission_time).toLocaleTimeString()}.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6">
                        <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl text-left space-y-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Project Entity</p>
                            <p className="text-base font-black text-white italic truncate">
                                {submission.title || "UNTITLED_PROTOCOL"}
                            </p>
                        </div>
                        <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl text-left space-y-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Current Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">
                                    {submission.status}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl text-left space-y-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">File</p>
                            <p className="text-[10px] font-black text-zinc-400 truncate">
                                {submission.file_url ? "✓ Attached" : "— No file"}
                            </p>
                        </div>
                    </div>

                    {isCaptain && submission.status === "pending" && (
                        <button
                            onClick={() => setEditMode(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-[10px] font-black text-zinc-400 hover:text-white hover:border-white/20 uppercase tracking-widest transition-all"
                        >
                            <Pencil size={12} /> Edit Submission
                        </button>
                    )}
                </motion.div>
            ) : (
                /* ── Edit / New Submission Form ── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left: Form */}
                    <div className="lg:col-span-8">
                        {/* Error Banner */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500"
                                >
                                    <AlertCircle size={18} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="space-y-6">
                                {/* Project Title */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                                        Project Title <span className="text-rose-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CampusBuzz Interface v.2.4"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full h-16 bg-zinc-900/30 border border-white/5 rounded-2xl px-6 text-base font-black text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-800"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                                        System Pitch / Description
                                    </label>
                                    <textarea
                                        placeholder="Explain the core problem your mission solves..."
                                        rows={6}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-zinc-900/30 border border-white/5 rounded-[2rem] p-6 text-sm font-bold text-zinc-400 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-800 resize-none leading-relaxed"
                                    />
                                </div>

                                {/* GitHub Link + File Upload */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* GitHub */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                                            GitHub / Demo Link <span className="text-rose-500 ml-1">*</span>
                                        </label>
                                        <div className="relative">
                                            <Github size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700" />
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://github.com/..."
                                                value={projectLink}
                                                onChange={(e) => setProjectLink(e.target.value)}
                                                className="w-full h-14 bg-zinc-900/30 border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-800"
                                            />
                                        </div>
                                    </div>

                                    {/* File Upload */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                                            Pitch Deck / Codebase ZIP
                                        </label>

                                        {/* Show existing file if no new file selected */}
                                        {existingFileUrl && !file ? (
                                            <div className="w-full h-14 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center px-5 gap-3">
                                                <FileArchive size={18} className="text-emerald-400 shrink-0" />
                                                <a
                                                    href={existingFileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] font-black text-emerald-400 hover:underline truncate flex-1"
                                                >
                                                    {existingFileUrl.split("/").pop()?.split("?")[0] || "View File"}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    disabled={removingFile}
                                                    className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shrink-0 disabled:opacity-50"
                                                    title="Remove file"
                                                >
                                                    {removingFile ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className={cn(
                                                    "w-full h-14 rounded-2xl border border-dashed flex items-center px-5 gap-3 transition-all",
                                                    file
                                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                                        : "bg-zinc-900/30 border-white/5 group-hover:bg-zinc-900"
                                                )}>
                                                    {file ? (
                                                        <FileArchive size={18} className="text-emerald-400 shrink-0" />
                                                    ) : (
                                                        <Upload size={18} className="text-zinc-700 shrink-0" />
                                                    )}
                                                    <p className={cn(
                                                        "text-[11px] font-black truncate flex-1",
                                                        file ? "text-emerald-400" : "text-zinc-700 uppercase tracking-widest"
                                                    )}>
                                                        {file ? file.name : "Choose Deliverable"}
                                                    </p>
                                                    {file && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                                            className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shrink-0 z-20 relative"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Bar */}
                            <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                                        {isExistingSubmission ? "Updating Payload?" : "Ready for Transmission?"}
                                    </p>
                                    <p className="text-xs text-zinc-500 font-bold italic">
                                        {isExistingSubmission
                                            ? "This will overwrite your previous submission."
                                            : "Once submitted, the environment will be locked for grading."}
                                    </p>
                                </div>

                                {isCaptain ? (
                                    <div className="flex items-center gap-3">
                                        {/* Cancel Button (only when editing existing) */}
                                        {isExistingSubmission && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="h-14 px-6 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-white/5"
                                            >
                                                <X size={14} /> Cancel
                                            </button>
                                        )}

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isSubmitDisabled}
                                            className={cn(
                                                "h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100",
                                                isExistingSubmission
                                                    ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20"
                                                    : "bg-white text-black hover:bg-indigo-500 hover:text-white"
                                            )}
                                        >
                                            {submitting ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : isExistingSubmission ? (
                                                <RefreshCw size={16} />
                                            ) : (
                                                <Send size={16} />
                                            )}
                                            {submitting
                                                ? "Transmitting..."
                                                : isExistingSubmission
                                                    ? "Update Mission Deliverables"
                                                    : "Initialize Submission"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                        <Lock size={16} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                            Waiting for Captain to submit
                                        </p>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Right: Info Cards */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="p-8 rounded-[2.5rem] bg-zinc-900 border border-white/5 space-y-6">
                            <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] border-b border-white/5 pb-4">
                                Submission Ethics
                            </h4>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <ShieldCheck className="text-emerald-500 shrink-0" size={18} />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase">Proof of Work</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase tracking-widest italic">
                                            Ensure the GitHub repository matches the institutional guidelines.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase">One-way Flow</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase tracking-widest italic">
                                            Partial submissions are not allowed. Submit only when complete.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center text-center gap-4">
                            <Trophy className="text-indigo-400" size={32} />
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic leading-relaxed">
                                Top submissions will be featured on the Community Spotlight.
                            </p>
                        </div>

                        {/* Validation hint */}
                        {(!title.trim() || !projectLink.trim()) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3"
                            >
                                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-relaxed">
                                    Project Title and GitHub Link are required to submit.
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
