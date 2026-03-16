"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Ticket, Award, UserCircle2, Building2, LayoutDashboard, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

// ─── Bottom Nav items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { href: "/student/feed", icon: Home, label: "Discover" },
    { href: "/student/my-hub", icon: LayoutDashboard, label: "My Hub" },
    { href: "/student/my-tickets", icon: Ticket, label: "My Tickets" },
    { href: "/student/clubs", icon: Building2, label: "Clubs" },
    { href: "/student/achievements", icon: Award, label: "Achievements" },
    { href: "/student/profile", icon: UserCircle2, label: "Profile" },
] as const;

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────

function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const [logoError, setLogoError] = React.useState(false);
    const [regCount, setRegCount] = React.useState(0);

    React.useEffect(() => {
        if (!user?.dbId) return;
        const fetchCount = async () => {
            const { count } = await supabase
                .from("registrations")
                .select("id, event:events!inner(status)", { count: "exact" })
                .eq("student_id", user.dbId)
                .in("event.status", ["live", "approved", "pending"]);
            setRegCount(count || 0);
        };
        fetchCount();
        
        // Subscription for real-time updates
        const channel = supabase
            .channel("reg_count_sidebar")
            .on("postgres_changes", { event: "*", schema: "public", table: "registrations", filter: `student_id=eq.${user.dbId}` }, () => {
                fetchCount();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.dbId]);

    return (
        <aside
            className="fixed left-0 top-0 bottom-0 w-24 z-50 hidden lg:flex flex-col items-center py-10 gap-8 border-r border-white/5 bg-zinc-950/50 backdrop-blur-3xl"
        >
            <Link href="/student/feed" className="w-16 flex items-center justify-center mb-8 bg-transparent hover:scale-110 transition-transform">
                <div className="h-8 w-8 flex items-center justify-center overflow-visible">
                    {logoError ? (
                        <span className="text-white font-black text-xs">CB</span>
                    ) : (
                        <Image
                            src="/logo-full.png"
                            alt="CampusBuzz Logo"
                            width={728}
                            height={239}
                            className="object-contain h-8 w-auto min-w-[97px] object-left"
                            onError={() => {
                                setLogoError(true);
                                console.error("Logo failed to load");
                            }}
                        />
                    )}
                </div>
            </Link>

            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                const isHub = label === "My Hub";

                return (
                    <button
                        key={href}
                        onClick={() => router.push(href)}
                        className="group relative flex flex-col items-center gap-2 w-full"
                    >
                        <div
                            className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative",
                                active
                                    ? "bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                                    : "bg-zinc-900 group-hover:bg-zinc-800"
                            )}
                        >
                            <Icon
                                size={22}
                                className={cn(
                                    "transition-colors",
                                    active ? "text-white" : "text-white/30 group-hover:text-white"
                                )}
                            />
                            {isHub && regCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg">
                                    {regCount}
                                </span>
                            )}
                        </div>
                        <span
                            className={cn(
                                "text-[9px] font-black uppercase tracking-widest transition-colors",
                                active ? "text-indigo-400" : "text-white/20 group-hover:text-white/40"
                            )}
                        >
                            {label === "Achievements" ? "Portfolio" : label}
                        </span>

                        {active && (
                            <motion.div
                                layoutId="sidebar-active"
                                className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,1)]"
                            />
                        )}
                    </button>
                );
            })}
        </aside>
    );
}

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────

function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const [regCount, setRegCount] = React.useState(0);

    React.useEffect(() => {
        if (!user?.dbId) return;
        const fetchCount = async () => {
            const { count } = await supabase
                .from("registrations")
                .select("id, event:events!inner(status)", { count: "exact" })
                .eq("student_id", user.dbId)
                .in("event.status", ["live", "approved", "pending"]);
            setRegCount(count || 0);
        };
        fetchCount();
    }, [user?.dbId]);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch lg:hidden"
            style={{
                background: "rgba(9,9,15,0.97)",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(24px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                const isHub = label === "My Hub";

                return (
                    <button
                        key={href}
                        id={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={() => router.push(href)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
                    >
                        {/* Active indicator pill */}
                        {active && (
                            <span
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"
                            />
                        )}

                        {/* Icon bubble */}
                        <div
                            className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all relative",
                                active && "scale-110 bg-indigo-500/10"
                            )}
                        >
                            <Icon
                                size={18}
                                className={cn(
                                    "transition-all",
                                    active ? "text-indigo-400" : "text-white/30"
                                )}
                                strokeWidth={active ? 2.5 : 1.8}
                            />
                            {isHub && regCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-zinc-950">
                                    {regCount}
                                </span>
                            )}
                        </div>

                        {/* Label */}
                        <span
                            className={cn(
                                "text-[9px] font-black uppercase tracking-widest transition-all",
                                active ? "text-indigo-400" : "text-white/20"
                            )}
                        >
                            {label === "Achievements" ? "Portfolio" : label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}

// ─── Student Layout ───────────────────────────────────────────────────────────

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
            {/* Sidebar (Desktop) */}
            <Sidebar />

            {/* Page content */}
            <main
                className={cn(
                    "min-h-screen transition-all duration-300",
                    "lg:pl-24", // Space for sidebar on desktop
                    "pb-24 lg:pb-0" // Space for bottom nav on mobile
                )}
            >
                <div className="max-w-6xl mx-auto w-full min-h-screen">
                    {children}
                </div>
            </main>

            {/* Bottom Nav (Mobile) */}
            <BottomNav />
        </div>
    );
}
