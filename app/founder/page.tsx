"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Crown, Building2, Plus, X, Check, AlertTriangle,
    Mail, Loader2, Trash2, RefreshCw, Shield,
    Clock, ExternalLink, Copy, LogOut, Users,
    CalendarDays, Ban, Play, ChevronDown, Gem,
    BarChart3, Globe, Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

// ─── Founder gate ─────────────────────────────────────────────────────────────
const FOUNDER_EMAIL = "adityakgpc2507@gmail.com";

// ─── Gold design tokens ───────────────────────────────────────────────────────
const GOLD = {
    glow: "rgba(212,175,55,0.15)",
    glowStrong: "rgba(212,175,55,0.3)",
    border: "rgba(212,175,55,0.25)",
    borderStrong: "rgba(212,175,55,0.5)",
    text: "#D4AF37",
    gradient: "linear-gradient(135deg, #D4AF37 0%, #F5E27A 45%, #B8860B 100%)",
    gradientSubtle: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(184,134,11,0.06))",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Institution {
    id: string;
    name: string;
    subdomain: string;       // internal only, not shown in UI
    admin_email: string;
    email_domain?: string;  // e.g. piet.co.in
    campus_code?: string;   // e.g. PIET
    plan?: string;
    is_active?: boolean;
    welcome_sent?: boolean;
    onboarded_at?: string | null;
    created_at: string;
}

interface PlatformStats {
    total_institutions: number;
    total_users: number;
    events_this_month: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });
}


async function getBearerToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
    icon, label, value, sub, delay = 0,
}: { icon: React.ReactNode; label: string; value: number | string; sub?: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className="relative rounded-2xl border p-6 overflow-hidden"
            style={{
                background: GOLD.gradientSubtle,
                borderColor: GOLD.border,
                boxShadow: `0 0 40px ${GOLD.glow}`,
            }}
        >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: GOLD.text, transform: "translate(40%, -40%)" }} />
            <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
                    style={{ background: "rgba(212,175,55,0.1)", borderColor: GOLD.border }}>
                    {icon}
                </div>
                <p className="text-4xl font-black text-white tracking-tight">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-1" style={{ color: GOLD.text }}>{label}</p>
                {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ─── Campus Code Generator ────────────────────────────────────────────────────
function generateCampusCode(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "";
    // Take first letter of each word, uppercase, max 6 chars
    const code = words.map(w => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
    return code.length >= 2 ? code : name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "");
}

// ─── Initialize College Modal ─────────────────────────────────────────────
function InitModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (inst: Institution) => void }) {
    const [name, setName] = useState("");
    const [emailDomain, setEmailDomain] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [campusCode, setCampusCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // Auto-derive campus code from name
    useEffect(() => { setCampusCode(generateCampusCode(name)); }, [name]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const token = await getBearerToken();
            const res = await fetch("/api/founder/institutions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name,
                    email_domain: emailDomain,
                    admin_email: adminEmail,
                    campus_code: campusCode,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed");
            setDone(true);
            setTimeout(() => onSuccess(json.institution), 1400);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
                className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: "#0a0a0a", border: `1px solid ${GOLD.borderStrong}`, boxShadow: `0 0 80px ${GOLD.glow}` }}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${GOLD.border}` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD.border}` }}>
                            <Building2 size={16} style={{ color: GOLD.text }} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD.text }}>Founder Console</p>
                            <p className="text-sm font-bold text-white">Initialize New College</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                {done ? (
                    <div className="flex flex-col items-center gap-4 py-14 px-6">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }}
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD.border}` }}>
                            <Check size={28} style={{ color: GOLD.text }} />
                        </motion.div>
                        <p className="text-white font-bold">College Initialized!</p>
                        <p className="text-xs text-zinc-600">Welcome dispatch logged. Closing…</p>
                    </div>
                ) : (
                    <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
                        {error && (
                            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}

                        {/* College Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">College Full Name</label>
                            <input required value={name} onChange={e => setName(e.target.value)}
                                placeholder="Panipat Institute of Engineering & Technology"
                                className="w-full h-11 px-4 rounded-xl text-sm text-white placeholder:text-zinc-700 outline-none transition-all"
                                style={{ background: "#111", border: `1px solid rgba(212,175,55,0.2)` }}
                                onFocus={e => (e.target.style.borderColor = GOLD.borderStrong)}
                                onBlur={e => (e.target.style.borderColor = "rgba(212,175,55,0.2)")}
                            />
                        </div>

                        {/* Campus Code — read-only, auto-generated */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Campus Code</label>
                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.5)" }}>Auto-generated · Internal Reference</span>
                            </div>
                            <div className="relative">
                                <div className="w-full h-11 px-4 rounded-xl text-sm font-black flex items-center gap-2 select-all"
                                    style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD.border}`, color: GOLD.text, letterSpacing: "0.2em" }}>
                                    {campusCode || <span className="font-normal text-zinc-700 tracking-normal text-xs">Will appear as you type the name…</span>}
                                    {campusCode && (
                                        <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-zinc-600">Read-only</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Official Email Domain */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Official Email Domain</label>
                            <div className="relative">
                                <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                                <input required value={emailDomain} onChange={e => setEmailDomain(e.target.value.toLowerCase().replace(/ /g, ""))}
                                    placeholder="e.g. piet.co.in"
                                    className="w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-zinc-700 outline-none transition-all font-mono"
                                    style={{ background: "#111", border: `1px solid rgba(212,175,55,0.2)` }}
                                    onFocus={e => (e.target.style.borderColor = GOLD.borderStrong)}
                                    onBlur={e => (e.target.style.borderColor = "rgba(212,175,55,0.2)")}
                                />
                            </div>
                            <p className="text-[10px] text-zinc-600 pl-1">
                                Users with this email suffix will be automatically mapped to this institution.
                            </p>
                        </div>

                        {/* Admin Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Principal / Admin Email</label>
                            <div className="relative">
                                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                                <input required type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                                    placeholder="principal@piet.co.in"
                                    className="w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-zinc-700 outline-none transition-all"
                                    style={{ background: "#111", border: `1px solid rgba(212,175,55,0.2)` }}
                                    onFocus={e => (e.target.style.borderColor = GOLD.borderStrong)}
                                    onBlur={e => (e.target.style.borderColor = "rgba(212,175,55,0.2)")}
                                />
                            </div>
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                            style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD.border}` }}>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD.text }}>
                                Status: Ready for Global Onboarding
                            </p>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            className="w-full h-12 rounded-2xl text-sm font-bold text-black flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                            style={{ background: GOLD.gradient, boxShadow: `0 8px 32px ${GOLD.glowStrong}` }}>
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Initializing…</> : <><Plus size={15} /> Initialize College</>}
                        </button>
                    </form>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── College Table Row ────────────────────────────────────────────────────────
function CollegeRow({ inst, index, onToggle, onDelete }: {
    inst: Institution;
    index: number;
    onToggle: (id: string, newState: boolean) => void;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [toggling, setToggling] = useState(false);
    const isActive = inst.is_active !== false;

    async function handleToggle() {
        setToggling(true);
        try {
            const token = await getBearerToken();
            const res = await fetch("/api/founder/institutions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: inst.id, is_active: !isActive }),
            });
            if (res.ok) onToggle(inst.id, !isActive);
        } finally {
            setToggling(false);
        }
    }

    function copy() {
        const toCopy = inst.email_domain ?? inst.campus_code ?? inst.admin_email;
        void navigator.clipboard.writeText(toCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <motion.tr
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="group border-b transition-all"
            style={{ borderColor: "rgba(212,175,55,0.08)" }}
        >
            {/* College Name */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs"
                        style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD.border}`, color: GOLD.text }}>
                        {inst.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate max-w-[200px]">{inst.name}</p>
                        <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                                style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD.border}`, color: GOLD.text }}>
                                {inst.plan ?? "starter"}
                            </span>
                            {inst.welcome_sent && (
                                <span className="text-[9px] text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-1.5 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-0.5">
                                    <Check size={7} /> mailed
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>

            {/* Email Domain */}
            <td className="px-5 py-4">
                <div className="space-y-1">
                    <button onClick={copy} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors group/copy">
                        {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="opacity-0 group-hover/copy:opacity-100 transition-opacity" />}
                        {inst.email_domain ?? <span className="text-zinc-700">—</span>}
                    </button>
                    {inst.campus_code && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD.border}`, color: GOLD.text }}>
                            {inst.campus_code}
                        </span>
                    )}
                </div>
            </td>

            {/* Admin Email */}
            <td className="px-5 py-4">
                <span className="text-xs text-zinc-500 truncate max-w-[180px] block">{inst.admin_email}</span>
            </td>

            {/* Status */}
            <td className="px-5 py-4">
                <span className={cn(
                    "flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    isActive
                        ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20"
                        : "text-red-400 bg-red-500/8 border-red-500/20"
                )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-red-400")} />
                    {isActive ? "Active" : "Suspended"}
                </span>
            </td>

            {/* Date Joined */}
            <td className="px-5 py-4">
                <span className="text-xs text-zinc-600 flex items-center gap-1">
                    <Clock size={10} /> {fmtDate(inst.created_at)}
                </span>
            </td>

            {/* Actions */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {/* Login as Admin — single domain model */}
                    <button
                        onClick={() => router.push(`/login?institution_id=${inst.id}&hint=${encodeURIComponent(inst.admin_email)}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${GOLD.border}`, color: GOLD.text }}
                        title={`Login as admin for ${inst.name}`}>
                        <ExternalLink size={10} /> Admin Login
                    </button>

                    {/* Suspend / Activate */}
                    <button onClick={() => void handleToggle()} disabled={toggling}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-40",
                            isActive
                                ? "text-red-400 bg-red-500/8 border-red-500/20 hover:bg-red-500/15"
                                : "text-emerald-400 bg-emerald-500/8 border-emerald-500/20 hover:bg-emerald-500/15"
                        )}>
                        {toggling ? <Loader2 size={10} className="animate-spin" /> : isActive ? <><Ban size={10} /> Suspend</> : <><Play size={10} /> Activate</>}
                    </button>

                    {/* Delete */}
                    <button
                        onClick={() => { if (confirm(`Permanently delete "${inst.name}"? This action is irreversible.`)) onDelete(inst.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 transition-all"
                        title="Delete forever">
                        <Trash2 size={12} />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
}

// ─── Access Denied ────────────────────────────────────────────────────────────
function AccessDenied({ email }: { email: string }) {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="text-center space-y-6 max-w-sm">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border"
                    style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <Shield size={28} className="text-red-400" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-bold text-white">Classified Territory</h1>
                    <p className="text-sm text-zinc-500">
                        Signed in as <span className="text-zinc-300 font-mono text-xs">{email}</span>.
                        This console is reserved for the CampusBuzz Founder only.
                    </p>
                </div>
                <button onClick={() => router.back()}
                    className="mx-auto px-5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white transition-all flex items-center gap-2"
                    style={{ background: "#111", border: "1px solid #27272a" }}>
                    ← Go back
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FounderConsolePage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();

    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const isFounder = user?.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getBearerToken();
            const res = await fetch("/api/founder/institutions", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (res.ok) {
                setInstitutions(json.institutions ?? []);
                setStats(json.stats ?? null);
                setLastRefresh(new Date());
            }
        } catch (err) {
            console.error("[FounderConsole] load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!userLoading && isFounder) void loadData();
        if (!userLoading && !isFounder) setLoading(false);
    }, [userLoading, isFounder, loadData]);

    async function handleDelete(id: string) {
        try {
            const token = await getBearerToken();
            await fetch(`/api/founder/institutions?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setInstitutions(prev => prev.filter(i => i.id !== id));
            if (stats) setStats(prev => prev ? { ...prev, total_institutions: prev.total_institutions - 1 } : null);
        } catch { /* ignore */ }
    }

    function handleToggle(id: string, newState: boolean) {
        setInstitutions(prev => prev.map(i => i.id === id ? { ...i, is_active: newState } : i));
    }

    function handleAdded(inst: Institution) {
        setInstitutions(prev => [inst, ...prev]);
        setStats(prev => prev ? { ...prev, total_institutions: prev.total_institutions + 1 } : null);
        setShowModal(false);
    }

    // Loading
    if (userLoading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: GOLD.text }} />
        </div>
    );

    // Access gate
    if (!isFounder) return <AccessDenied email={user?.email ?? "unknown"} />;

    return (
        <>
            <div className="min-h-screen text-zinc-100" style={{ background: "#050505", fontFamily: "var(--font-geist-sans, sans-serif)" }}>

                {/* ── Ambient gold glow ── */}
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] pointer-events-none z-0"
                    style={{ background: `radial-gradient(ellipse at center top, ${GOLD.glow} 0%, transparent 70%)` }} />
                <div className="fixed bottom-0 right-0 w-[400px] h-[400px] pointer-events-none z-0 opacity-30"
                    style={{ background: `radial-gradient(ellipse at bottom right, rgba(184,134,11,0.1) 0%, transparent 60%)` }} />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">

                    {/* ═══════════════════════════════════════════════
                        HEADER
                    ═══════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start justify-between gap-6"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                                    style={{ background: "rgba(212,175,55,0.1)", borderColor: GOLD.border, boxShadow: `0 0 24px ${GOLD.glow}` }}>
                                    <Crown size={18} style={{ color: GOLD.text }} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: GOLD.text }}>
                                    Founder Master Console
                                </span>
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                                    style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD.border}`, color: GOLD.text }}>
                                    <Gem size={9} /> Diamond Tier
                                </span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-white">
                                Platform <span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", background: GOLD.gradient }}>Command</span>
                            </h1>
                            <p className="text-zinc-600 text-sm">
                                Sovereign oversight of all onboarded institutions &nbsp;·&nbsp; {user?.email}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 mt-2">
                            {lastRefresh && (
                                <p className="text-[10px] text-zinc-700 hidden md:block">
                                    Refreshed {lastRefresh.toLocaleTimeString()}
                                </p>
                            )}
                            <button onClick={() => void loadData()} disabled={loading}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                style={{ background: "#111", border: `1px solid ${GOLD.border}`, color: GOLD.text }}>
                                <RefreshCw size={11} className={cn(loading && "animate-spin")} /> Refresh
                            </button>
                            <button onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-black transition-all"
                                style={{ background: GOLD.gradient, boxShadow: `0 4px 20px ${GOLD.glowStrong}` }}>
                                <Plus size={13} /> Initialize College
                            </button>
                        </div>
                    </motion.div>

                    {/* ═══════════════════════════════════════════════
                        PLATFORM HEALTH — TOP ROW
                    ═══════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={<Building2 size={18} style={{ color: GOLD.text }} />}
                            label="Onboarded Colleges"
                            value={loading ? "—" : (stats?.total_institutions ?? 0)}
                            sub="Registered institutions"
                            delay={0}
                        />
                        <StatCard
                            icon={<Users size={18} style={{ color: GOLD.text }} />}
                            label="Total Users"
                            value={loading ? "—" : (stats?.total_users ?? 0)}
                            sub="Across all colleges"
                            delay={0.08}
                        />
                        <StatCard
                            icon={<CalendarDays size={18} style={{ color: GOLD.text }} />}
                            label="Events This Month"
                            value={loading ? "—" : (stats?.events_this_month ?? 0)}
                            sub={`March ${new Date().getFullYear()}`}
                            delay={0.16}
                        />
                    </div>

                    {/* ═══════════════════════════════════════════════
                        COLLEGE MANAGEMENT TABLE
                    ═══════════════════════════════════════════════ */}
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2" style={{ color: GOLD.text }}>
                                    <BarChart3 size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institution Registry</span>
                                </div>
                                <h2 className="text-xl font-bold text-white">College Management</h2>
                            </div>
                            <span className="text-xs text-zinc-700">{loading ? "—" : institutions.length} colleges</span>
                        </div>

                        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD.border}`, background: "#080808" }}>
                            {loading ? (
                                <div className="p-6 space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(212,175,55,0.04)" }} />
                                    ))}
                                </div>
                            ) : institutions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-4 py-20">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                                        style={{ background: "rgba(212,175,55,0.05)", borderColor: GOLD.border }}>
                                        <Building2 size={24} style={{ color: GOLD.text, opacity: 0.5 }} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-zinc-500">No institutions initialized yet</p>
                                        <p className="text-xs text-zinc-700 mt-0.5">Click "Initialize College" to onboard your first college</p>
                                    </div>
                                    <button onClick={() => setShowModal(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={{ color: GOLD.text, border: `1px solid ${GOLD.border}` }}>
                                        <Plus size={12} /> Initialize First College
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr style={{ borderBottom: `1px solid rgba(212,175,55,0.12)` }}>
                                                {["College Name", "Email Domain", "Admin Email", "Status", "Date Joined", "Actions"].map(h => (
                                                    <th key={h} className="px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-[0.25em]"
                                                        style={{ color: GOLD.text }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {institutions.map((inst, i) => (
                                                <CollegeRow
                                                    key={inst.id}
                                                    inst={inst}
                                                    index={i}
                                                    onToggle={handleToggle}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* ═══════════════════════════════════════════════
                        FOOTER
                    ═══════════════════════════════════════════════ */}
                    <div className="pt-6 flex items-center justify-between" style={{ borderTop: `1px solid rgba(212,175,55,0.08)` }}>
                        <p className="text-[10px] font-mono" style={{ color: "rgba(212,175,55,0.3)" }}>
                            CampusBuzz Founder Console · v2.0 · {new Date().getFullYear()}
                        </p>
                        <button
                            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                            className="flex items-center gap-1.5 text-[10px] text-zinc-700 hover:text-red-400 transition-colors"
                        >
                            <LogOut size={11} /> Sign out
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && <InitModal onClose={() => setShowModal(false)} onSuccess={handleAdded} />}
            </AnimatePresence>
        </>
    );
}
