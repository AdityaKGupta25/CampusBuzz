"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get("next");   // set by middleware on auth redirect

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSignIn(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError) {
                if (authError.message.toLowerCase().includes("invalid login")) {
                    throw new Error("Incorrect email or password. Please try again.");
                }
                if (authError.message.toLowerCase().includes("invalid api key") ||
                    authError.message.toLowerCase().includes("apikey")) {
                    throw new Error(
                        "Supabase API key is invalid. Check your .env.local file — " +
                        "NEXT_PUBLIC_SUPABASE_ANON_KEY must be the long 'eyJ...' JWT from the Supabase dashboard."
                    );
                }
                throw authError;
            }

            if (!data.session) {
                throw new Error("Login succeeded but no session was returned. Please try again.");
            }

            // ── Role-based redirect ───────────────────────────────────────────
            // Look up the user's role in the public users table
            // Resilient lookup: try auth_uid → id → email
            let profileData = null;
            console.log("Current Auth Session User ID:", data.session.user.id);
            console.log("Attempting role lookup...");

            const { data: p1, error: e1 } = await supabase.from("users").select("role").eq("auth_uid", data.session.user.id).single();
            if (p1) { console.log("Found by auth_uid:", p1.role); profileData = p1; }
            else if (e1) { console.warn("Lookup by auth_uid failed/empty:", e1.message); }

            if (!profileData) {
                const { data: p2, error: e2 } = await supabase.from("users").select("role").eq("id", data.session.user.id).single();
                if (p2) { console.log("Found by id:", p2.role); profileData = p2; }
                else if (e2) { console.warn("Lookup by id failed/empty:", e2.message); }
            }

            if (!profileData && email) {
                const { data: p3, error: e3 } = await supabase.from("users").select("role").eq("email", email.trim()).single();
                if (p3) { console.log("Found by email:", p3.role); profileData = p3; }
                else if (e3) { console.warn("Lookup by email failed/empty:", e3.message); }
            }

            if (!profileData) {
                console.error("CRITICAL: No profile found in public.users. Defaulting to student.");
            }

            const role = (profileData?.role ?? "student").toLowerCase();
            console.log("FINAL RESOLVED ROLE:", role);

            // ── Founder fast-path (email beats role) ──────────────────────────
            const FOUNDER_EMAIL = "adityakgpc2507@gmail.com";
            if (email.trim().toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
                await supabase.auth.getSession();
                await new Promise((resolve) => setTimeout(resolve, 400));
                window.location.href = "/founder";
                return;
            }

            const roleDefaults: Record<string, string> = {
                hod: "/hod/dashboard",
                faculty: "/faculty/my-events",
                admin: "/admin/dashboard",    // ← updated
                student: "/student/feed",
            };

            const rolePrefixes: Record<string, string[]> = {
                student: ["/student"],
                faculty: ["/faculty"],
                hod: ["/hod", "/faculty"],
                admin: ["/admin", "/faculty", "/hod"],  // super-admin can reach all portals
            };

            // Use ?next= if it belongs to the user's allowed role prefix
            const allowed = rolePrefixes[role] ?? [];
            const dest =
                nextPath && allowed.some((p) => nextPath.startsWith(p))
                    ? nextPath
                    : roleDefaults[role] ?? "/student/feed";

            // Ensure session is persisted to cookies before redirecting
            await supabase.auth.getSession();

            // Give the cookie listener a moment to write to the browser
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Hard redirect — clears Next.js router cache and triggers middleware
            window.location.href = dest;

        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Login failed. Check your credentials and try again."
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 relative overflow-hidden">
            {/* Ambient Glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-10"
                style={{
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)",
                    filter: "blur(120px)"
                }}
            />

            <div className="w-full max-w-md relative z-10">
                {/* Card */}
                <div className="bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/50 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">

                    {/* Hero Branding */}
                    <div className="flex flex-col items-center mb-12">
                        <Link href="/" className="group transition-transform duration-500 hover:scale-105">
                            <div className="h-20 flex items-center justify-center bg-transparent">
                                <Image
                                    src="/logo-full.png"
                                    alt="CampusBuzz Logo"
                                    width={728}
                                    height={239}
                                    className="object-contain h-20 w-auto"
                                    onError={() => console.error("Logo failed to load")}
                                    priority
                                />
                            </div>
                        </Link>
                        <div className="mt-6 flex flex-col items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
                                Institutional Single Sign-On
                            </span>
                        </div>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 text-xs text-red-400 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={(e) => void handleSignIn(e)} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="login-email" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                email identity
                            </label>
                            <div className="relative group">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    placeholder="your@institution.edu"
                                    className="w-full h-14 pl-12 pr-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-sm text-white placeholder:text-zinc-700 outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="login-password" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                access key
                            </label>
                            <div className="relative group">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    id="login-password"
                                    type={showPw ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-12 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-sm text-white placeholder:text-zinc-700 outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="sign-in-btn"
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full h-14 bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black text-sm rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 hover:scale-[1.02] mt-4 shadow-[0_20px_40px_rgba(251,191,36,0.15)]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    AUTHENTICATING...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    INITIALIZE SESSION
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 pt-8 border-t border-zinc-800/50 flex flex-col items-center gap-4 text-center">
                        <p className="text-[10px] text-zinc-500 font-medium max-w-[200px] leading-relaxed">
                            Access restricted to verified institutional users only.
                        </p>
                    </div>
                </div>

                {/* Outer Support Text */}
                <div className="mt-8 flex justify-center">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
                        CampusBuzz Security Protocol
                    </span>
                </div>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
