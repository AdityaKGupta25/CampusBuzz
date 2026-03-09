"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ChevronRight,
    ChevronLeft,
    Upload,
    Github,
    Linkedin,
    Users,
    User,
    CheckCircle2,
    Ticket,
    Copy,
    Share2,
    Loader2,
    ShieldCheck,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SmartRegistrationFormProps {
    isOpen: boolean;
    onClose: () => void;
    event: {
        id: string;
        title: string;
        registration_config?: {
            collect_resume?: boolean;
            collect_github?: boolean;
            collect_linkedin?: boolean;
            team_participation?: boolean;
            team_min_size?: number;
            team_max_size?: number;
        };
    };
    user: any;
    onSuccess: (data: any) => void;
}

type Step = "team_choice" | "team_create" | "team_join" | "details" | "review" | "success";

export function SmartRegistrationForm({ isOpen, onClose, event, user, onSuccess }: SmartRegistrationFormProps) {
    const [step, setStep] = useState<Step>("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<any>(null);

    // Form State
    const [teamName, setTeamName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeUrl, setResumeUrl] = useState("");
    const [isTeamAction, setIsTeamAction] = useState<"create" | "join" | "individual">("individual");

    const config = event.registration_config || {};
    const isTeamEvent = config.team_participation;

    useEffect(() => {
        if (isOpen) {
            if (isTeamEvent) {
                setStep("team_choice");
            } else {
                setStep("details");
                setIsTeamAction("individual");
            }
        }
    }, [isOpen, isTeamEvent]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== "application/pdf") {
                setError("Please upload a PDF file for your resume.");
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                setError("File size exceeds 2MB limit.");
                return;
            }
            setResumeFile(file);
            setError(null);
        }
    };

    const uploadResume = async () => {
        if (!resumeFile) return null;
        const fileExt = resumeFile.name.split(".").pop();
        const fileName = `${user.id}_${event.id}_${Date.now()}.${fileExt}`;
        const filePath = `resumes/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("student-resumes")
            .upload(filePath, resumeFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from("student-resumes")
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            let uploadedUrl = "";
            if (config.collect_resume && resumeFile) {
                uploadedUrl = await uploadResume() || "";
            }

            const { data, error: rpcError } = await supabase.rpc("student_register_event_v3", {
                p_event_id: event.id,
                p_student_id: user.id, // Internal UUID expected. If not, needs fetch.
                p_action: isTeamAction,
                p_team_name: isTeamAction === "create" ? teamName : null,
                p_join_code: isTeamAction === "join" ? joinCode : null,
                p_github_url: githubUrl || null,
                p_linkedin_url: linkedinUrl || null,
                p_resume_url: uploadedUrl || null
            });

            if (rpcError) throw rpcError;

            if (data?.success) {
                setSuccessData(data);
                setStep("success");
                onSuccess(data);
            } else {
                throw new Error(data?.error || "Registration failed");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === "team_choice") {
            // Handled by buttons
        } else if (step === "team_create" || step === "team_join") {
            setStep("details");
        } else if (step === "details") {
            setStep("review");
        }
    };

    const prevStep = () => {
        if (step === "details") {
            if (isTeamEvent) setStep("team_choice");
        } else if (step === "team_create" || step === "team_join") {
            setStep("team_choice");
        } else if (step === "review") {
            setStep("details");
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence mode="wait">
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 lg:p-10 pointer-events-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] shadow-4xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 md:p-10 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                        <div className="space-y-1">
                            <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase">
                                {step === "success" ? "Registration Success" : "Event Registration"}
                            </h3>
                            <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                {event.title} — {step === "success" ? "Entry confirmed" : "Drafting your ticket"}
                            </p>
                        </div>
                        {step !== "success" && (
                            <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/5 text-zinc-600 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="p-8 md:p-10 min-h-[400px] max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {error && (
                            <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* Step: Team Choice */}
                            {step === "team_choice" && (
                                <motion.div
                                    key="team_choice"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10 py-4"
                                >
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-6">
                                            <Users size={32} />
                                        </div>
                                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Choose Participation Mode</h4>
                                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                                            This event supports both team and individual <br />registration strategies.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button
                                            onClick={() => { setStep("team_create"); setIsTeamAction("create"); }}
                                            className="p-8 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900 text-left transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                                <Users size={24} />
                                            </div>
                                            <h5 className="text-lg font-black text-white italic mb-2 uppercase">Create Team</h5>
                                            <p className="text-[10px] text-zinc-600 font-medium leading-relaxed uppercase tracking-widest">Register as leader and invite your friends to your squad.</p>
                                        </button>

                                        <button
                                            onClick={() => { setStep("team_join"); setIsTeamAction("join"); }}
                                            className="p-8 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 hover:border-emerald-500/50 hover:bg-zinc-900 text-left transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                                <ArrowRight size={24} />
                                            </div>
                                            <h5 className="text-lg font-black text-white italic mb-2 uppercase">Join Team</h5>
                                            <p className="text-[10px] text-zinc-600 font-medium leading-relaxed uppercase tracking-widest">Already have a team? Enter the 6-digit join code to register.</p>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Create Team */}
                            {step === "team_create" && (
                                <motion.div
                                    key="team_create"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">Team Squad Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Cyber Ninjas, Tech Titans"
                                            value={teamName}
                                            onChange={(e) => setTeamName(e.target.value)}
                                            className="w-full h-16 bg-zinc-900/80 border border-white/10 rounded-2xl px-6 text-base font-bold text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-700"
                                        />
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest ml-2 italic">Minimum {config.team_min_size || 1} — Maximum {config.team_max_size || 4} members allowed.</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                            <CheckCircle2 size={14} />
                                            Mission Status: Leader Detected
                                        </div>
                                        <p className="text-[10px] leading-relaxed font-bold opacity-70">You will be assigned as the Squad Leader. A unique join code will be generated upon confirmation.</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Join Team */}
                            {step === "team_join" && (
                                <motion.div
                                    key="team_join"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">Secret Join Code</label>
                                        <input
                                            type="text"
                                            placeholder="XXXXXX"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            maxLength={6}
                                            className="w-full h-24 bg-zinc-900/80 border border-white/10 rounded-3xl px-6 text-4xl font-black text-center text-indigo-500 uppercase tracking-[0.4em] focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-800"
                                        />
                                        <p className="text-center text-[10px] text-zinc-500 font-black uppercase tracking-widest">Ask your Squad Leader for the 6-character identifier.</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Personal Details */}
                            {step === "details" && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    {config.collect_github && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                <Github size={12} className="text-white" /> Github Portfolio Link
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://github.com/username"
                                                value={githubUrl}
                                                onChange={(e) => setGithubUrl(e.target.value)}
                                                className="w-full h-14 bg-zinc-900/50 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    )}

                                    {config.collect_linkedin && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                <Linkedin size={12} className="text-sky-500" /> LinkedIn Profile
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://linkedin.com/in/username"
                                                value={linkedinUrl}
                                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                                className="w-full h-14 bg-zinc-900/50 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    )}

                                    {config.collect_resume && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Competency Dossier (Resume PDF)</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className={cn(
                                                    "w-full h-32 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                                                    resumeFile ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/30 border-white/10 hover:border-zinc-700"
                                                )}>
                                                    <Upload size={24} className={resumeFile ? "text-emerald-400" : "text-zinc-600"} />
                                                    <p className={cn("text-xs font-bold", resumeFile ? "text-emerald-400" : "text-zinc-500")}>
                                                        {resumeFile ? resumeFile.name : "Click or drag your PDF here"}
                                                    </p>
                                                    <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">Max Size: 2MB (PDF ONLY)</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!config.collect_github && !config.collect_linkedin && !config.collect_resume && (
                                        <div className="py-12 text-center space-y-4">
                                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                                                <User size={32} />
                                            </div>
                                            <p className="text-xl font-black text-white italic">BASIC_INTEGRATION_DETECTED</p>
                                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">No additional dossier required. <br />Proceed to final validation.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Step: Review */}
                            {step === "review" && (
                                <motion.div
                                    key="review"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="relative p-10 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/10 overflow-hidden">
                                        {/* Ticket Pattern */}
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <Ticket size={120} className="-rotate-12" />
                                        </div>

                                        <div className="relative z-10 space-y-8">
                                            <div className="flex items-center gap-5 pb-6 border-b border-white/5">
                                                <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-indigo-500/30 overflow-hidden flex items-center justify-center">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <User size={32} className="text-zinc-500" />
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Registrant Details</p>
                                                    <h4 className="text-2xl font-black text-white tracking-tighter uppercase italic">{user.full_name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{user.department?.name || "Member"}</span>
                                                        <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{user.college?.name || "CampusBuzz"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Competition Name</p>
                                                    <p className="text-sm font-black text-zinc-200">{event.title}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Entry Type</p>
                                                    <p className="text-sm font-black text-zinc-200 uppercase">{isTeamAction.replace("_", " ")}</p>
                                                </div>
                                                {isTeamAction === "create" && (
                                                    <div className="space-y-1 col-span-2">
                                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Team Name</p>
                                                        <p className="text-sm font-black text-zinc-200 uppercase">{teamName}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {(githubUrl || linkedinUrl || resumeFile) && (
                                                <div className="pt-6 border-t border-white/5 space-y-4">
                                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Attachments</p>
                                                    <div className="flex flex-wrap gap-4">
                                                        {githubUrl && <div className="flex items-center gap-2 text-[9px] font-black text-indigo-300 uppercase bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20"><Github size={10} /> GitHub</div>}
                                                        {linkedinUrl && <div className="flex items-center gap-2 text-[9px] font-black text-sky-400 uppercase bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20"><Linkedin size={10} /> LinkedIn</div>}
                                                        {resumeFile && <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20"><CheckCircle2 size={10} /> Resume</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-zinc-900 border border-white/5 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="confirm-registry"
                                                    className="w-5 h-5 rounded-lg border-2 border-white/10 bg-black/40 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                                    required
                                                />
                                            </div>
                                            <label htmlFor="confirm-registry" className="text-[11px] font-bold leading-relaxed text-zinc-400 uppercase tracking-widest cursor-pointer select-none">
                                                Final Confirmation: I have reviewed the entry details and agree to comply with the official participation rules and institutional protocols.
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Success */}
                            {step === "success" && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 text-center space-y-10"
                                >
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 relative z-10">
                                            <CheckCircle2 size={48} />
                                        </div>
                                        <div className="absolute inset-0 w-24 h-24 bg-emerald-500/30 blur-3xl mx-auto rounded-full" />
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter">Registration Successful</h4>
                                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Welcome to the roster. Your entry has been authorized.</p>
                                    </div>

                                    {successData?.join_code && isTeamAction === "create" && (
                                        <div className="max-w-xs mx-auto p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 space-y-4">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Squad Invitation Code</p>
                                            <div className="flex items-center justify-center gap-4">
                                                <span className="text-4xl font-black text-white tracking-[0.3em]">{successData.join_code}</span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successData.join_code)}
                                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-400 hover:text-white transition-all"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-zinc-600 font-bold leading-tight uppercase">Share this code with your squad members for them to integrate.</p>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-4 max-w-sm mx-auto">
                                        <button
                                            onClick={onClose}
                                            className="h-16 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                        >
                                            <Ticket size={20} /> View Digital Pass
                                        </button>
                                        <button
                                            onClick={() => {/* Share logic */ }}
                                            className="h-16 rounded-[2rem] bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                                        >
                                            <Share2 size={16} /> Broadcast Participation
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer / Navigation */}
                    {step !== "success" && (
                        <div className="p-8 md:p-10 border-t border-white/5 bg-zinc-900/40 flex items-center justify-between gap-4">
                            <button
                                onClick={prevStep}
                                disabled={step === "team_choice" || (step === "details" && !isTeamEvent)}
                                className="h-14 px-8 rounded-2xl bg-zinc-950 border border-white/5 text-zinc-500 hover:text-white disabled:opacity-0 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>

                            {step === "review" ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="h-14 px-10 rounded-2xl bg-white text-black hover:bg-indigo-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-white/5 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Authorizing...
                                        </>
                                    ) : (
                                        <>
                                            Confirm Registration <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            ) : step !== "team_choice" && (
                                <button
                                    onClick={nextStep}
                                    disabled={
                                        (step === "team_create" && !teamName.trim()) ||
                                        (step === "team_join" && joinCode.length < 6) ||
                                        (step === "details" && config.collect_resume && !resumeFile)
                                    }
                                    className="h-14 px-10 rounded-2xl bg-indigo-500 text-white hover:bg-indigo-400 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-30 disabled:grayscale"
                                >
                                    Continue <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
