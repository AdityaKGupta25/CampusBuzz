"use client";

import React, { useState } from "react";
import { 
    Shield, 
    Lock, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    RefreshCw,
    Mail,
    Building2,
    Key
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const BRAND = {
    gradient: "linear-gradient(135deg,#dc2626,#b91c1c)",
    border: "rgba(220,38,38,0.2)",
    bg: "rgba(220,38,38,0.05)",
    text: "text-rose-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
    const { user } = useUser();
    
    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    // Status state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const { error: authErr } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authErr) throw authErr;

            setSuccess(true);
            setNewPassword("");
            setConfirmPassword("");
            setCurrentPassword("");
        } catch (err: any) {
            setError(err.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
            
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }}>
                        <Shield size={20} className="text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">System Preferences</p>
                        <h1 className="text-3xl font-black text-white tracking-tight">Institutional Settings</h1>
                    </div>
                </div>
                <p className="text-zinc-500 text-sm max-w-xl">
                    Manage your administrative credentials and view institution-wide parameters. 
                    Your account is protected by hardware-grade institutional security.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Left Column: Context */}
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 pl-1">Identity Profile</h3>
                        <div className="rounded-3xl p-6 space-y-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white"
                                    style={{ background: BRAND.gradient }}>
                                    {user?.full_name?.slice(0,1).toUpperCase() || "A"}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <Building2 size={14} className="text-zinc-500" />
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Institution</p>
                                        <p className="text-[11px] font-semibold text-zinc-300 truncate">{user?.institution_name || "Assigned Institution"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <Shield size={14} className="text-rose-500/60" />
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Access Level</p>
                                        <p className="text-[11px] font-black text-rose-500/80 uppercase tracking-widest">Global Admin</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Key Actions */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Password Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 pl-1">
                            <Lock size={14} className="text-rose-500" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40">Credential Security</h3>
                        </div>
                        
                        <div className="rounded-[2rem] overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-4 flex items-center text-zinc-600">
                                                <Key size={14} />
                                            </div>
                                            <input 
                                                required
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full h-12 pl-11 pr-12 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-4 flex items-center text-zinc-600 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Confirm New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center text-zinc-600">
                                                <RefreshCw size={14} />
                                            </div>
                                            <input 
                                                required
                                                type={showPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                                        <AlertCircle size={16} />
                                        <p className="text-xs font-semibold">{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <CheckCircle2 size={16} />
                                        <p className="text-xs font-semibold">Password updated successfully. Use your new password on next login.</p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 px-8 h-12 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                                        style={{ background: BRAND.gradient, boxShadow: "0 8px 24px rgba(220,38,38,0.25)" }}
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : "Update Credentials"}
                                    </button>
                                </div>
                            </form>

                            <div className="bg-white/5 px-8 py-5 flex items-center gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                    <Shield size={14} className="text-zinc-500" />
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    Updating your password will immediately secure your administrative account and require the new 
                                    credentials for subsequent sessions.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
