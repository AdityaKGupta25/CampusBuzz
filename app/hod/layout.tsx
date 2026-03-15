"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    ClipboardCheck,
    BarChart3,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Zap,
    UserCircle2,
    Users,
    Globe,
    Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
    { href: "/hod/dashboard", icon: ClipboardCheck, label: "Approvals" },
    { href: "/hod/venues", icon: Building2, label: "Venue Registry" },
    { href: "/hod/clubs", icon: Users, label: "Clubs" },
    { href: "/hod/explore", icon: Globe, label: "Explore Campus" },
    { href: "/hod/analytics", icon: BarChart3, label: "Analytics" },
] as const;

function Sidebar({
    collapsed, onToggle, displayName, departmentName, avatarUrl, onLogout,
}: { collapsed: boolean; onToggle: () => void; displayName: string; departmentName: string; avatarUrl: string | null; onLogout: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoError, setLogoError] = useState(false);

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-300 z-[100]",
                collapsed ? "w-[68px]" : "w-[220px]"
            )}
            style={{ background: "#0c0c14", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
            <div className="flex flex-col px-4 pt-6 pb-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Link href="/hod/dashboard" className="flex flex-col gap-0 group items-center">
                    <div className={cn(
                        "relative transition-all duration-300 ease-in-out overflow-visible flex items-center bg-transparent",
                        collapsed ? "w-8 h-8" : "w-[160px] h-16"
                    )}>
                        {logoError ? (
                            <span className="text-white font-black text-xl tracking-tighter">CB</span>
                        ) : (
                            <Image
                                src="/logo-full.png"
                                alt="CampusBuzz Logo"
                                width={200}
                                height={60}
                                className={cn(
                                    "object-contain transition-all duration-500",
                                    collapsed ? "h-8 w-auto min-w-[122px] object-left" : "h-16 w-auto object-left"
                                )}
                                onError={() => {
                                    setLogoError(true);
                                    console.error("Logo failed to load");
                                }}
                                priority
                            />
                        )}
                    </div>
                    {!collapsed && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-500 w-full text-center -mt-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500/80">
                                HOD Governance
                            </span>
                        </div>
                    )}
                </Link>
            </div>
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {NAV_LINKS.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <button
                            key={href}
                            id={`nav-${label.toLowerCase()}`}
                            onClick={() => router.push(href)}
                            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left", active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5")}
                            style={active ? { background: "rgba(8,145,178,0.15)", border: "1px solid rgba(8,145,178,0.3)" } : { border: "1px solid transparent" }}
                            title={collapsed ? label : undefined}
                        >
                            <Icon size={17} className={cn("flex-shrink-0", active ? "text-cyan-400" : "text-white/40")} />
                            {!collapsed && <span className="truncate">{label}</span>}
                            {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 bg-cyan-400" />}
                        </button>
                    );
                })}
            </nav>
            <div className="px-2 py-4 space-y-1 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Link
                    href="/hod/profile"
                    className={cn(
                        "flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all cursor-pointer",
                        collapsed && "justify-center",
                        pathname === "/hod/profile"
                            ? "bg-cyan-500/10 border border-cyan-500/25"
                            : "hover:bg-white/5 border border-transparent"
                    )}
                    title="Governance Profile"
                >
                    <div className={cn(
                        "w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden",
                        pathname === "/hod/profile" ? "ring-2 ring-cyan-500/40" : "border border-white/10"
                    )}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white" style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                                {displayName.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1 ml-1">
                            <p className={cn("font-bold text-xs truncate leading-none mb-0.5", pathname === "/hod/profile" ? "text-white" : "text-white/80")}>{displayName}</p>
                            <p className="text-cyan-500/60 text-[8px] font-black uppercase tracking-tighter truncate">{departmentName}</p>
                        </div>
                    )}
                    {!collapsed && pathname === "/hod/profile" && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 bg-cyan-400" />
                    )}
                </Link>
                <button
                    id="sidebar-logout-btn"
                    onClick={onLogout}
                    className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/35 hover:text-red-400 transition-all", collapsed && "justify-center")}
                    style={{ border: "1px solid transparent" }}
                    title="Logout"
                >
                    <LogOut size={16} className="flex-shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
            <button
                id="sidebar-collapse-btn"
                onClick={onToggle}
                className="absolute -right-3.5 top-[72px] w-7 h-7 rounded-full flex items-center justify-center z-[110] hover:scale-110 transition-transform shadow-2xl"
                style={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,1)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
                }}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
}

function MobileDrawer({
    open, onClose, displayName, departmentName, avatarUrl, onLogout,
}: { open: boolean; onClose: () => void; displayName: string; departmentName: string; avatarUrl: string | null; onLogout: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoError, setLogoError] = useState(false);

    return (
        <>
            {open && <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />}
            <div
                className={cn("fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-300", open ? "translate-x-0" : "-translate-x-full")}
                style={{ background: "#0c0c14", borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
                <div className="flex items-center justify-between px-5 h-24 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <Link href="/hod/dashboard" className="flex flex-col gap-2 items-center">
                        <div className="h-10 w-auto flex items-center overflow-hidden bg-transparent">
                            {logoError ? (
                                <span className="text-white font-black text-xl tracking-tighter">CampusBuzz</span>
                            ) : (
                                <Image
                                    src="/logo-full.png"
                                    alt="CampusBuzz Logo"
                                    width={728}
                                    height={239}
                                    className="object-contain h-10 w-auto"
                                    onError={() => {
                                        setLogoError(true);
                                        console.error("Logo failed to load");
                                    }}
                                    priority
                                />
                            )}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-2">HOD Governance</span>
                    </Link>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/5"><X size={20} /></button>
                </div>
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {NAV_LINKS.map(({ href, icon: Icon, label }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <button
                                key={href}
                                onClick={() => { router.push(href); onClose(); }}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all", active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5")}
                                style={active ? { background: "rgba(8,145,178,0.15)", border: "1px solid rgba(8,145,178,0.3)" } : { border: "1px solid transparent" }}
                            >
                                <Icon size={17} className={cn("flex-shrink-0", active ? "text-cyan-400" : "text-white/40")} />
                                {label}
                            </button>
                        );
                    })}
                </nav>
                <div className="px-3 py-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Link
                        href="/hod/profile"
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                    >
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden border border-white/10">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white" style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                                    {displayName.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-bold text-xs truncate leading-none mb-0.5">{displayName}</p>
                            <p className="text-cyan-500/60 text-[8px] font-black uppercase tracking-tighter truncate">{departmentName}</p>
                        </div>
                    </Link>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/35 hover:text-red-400 transition-all" style={{ border: "1px solid transparent" }}>
                        <LogOut size={16} /><span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}

function TopBar({ onMenuClick, onLogout }: { onMenuClick: () => void; onLogout: () => void }) {
    const [logoError, setLogoError] = useState(false);
    return (
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 flex-shrink-0" style={{ background: "rgba(9,9,15,0.96)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
            <button id="mobile-menu-btn" onClick={onMenuClick} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Menu size={18} className="text-white/70" />
            </button>
            <Link href="/hod/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-auto flex items-center justify-center overflow-hidden bg-transparent">
                    {logoError ? (
                        <span className="text-white font-black text-sm">CampusBuzz</span>
                    ) : (
                        <Image
                            src="/logo-full.png"
                            alt="CampusBuzz Logo"
                            width={728}
                            height={239}
                            className="object-contain h-8 w-auto"
                            onError={() => {
                                setLogoError(true);
                                console.error("Logo failed to load");
                            }}
                        />
                    )}
                </div>
                {!logoError && <span className="text-white font-bold text-sm tracking-tight text-left">HOD Console</span>}
            </Link>
            <button id="topbar-logout-btn" onClick={onLogout} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <LogOut size={16} className="text-red-400" />
            </button>
        </header>
    );
}

export default function HODLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useUser();

    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Derived from global context
    const rawName = user?.full_name ?? "HOD";
    const deptName = user?.department_name ?? "Institutional General";
    const userName = user ? `${rawName} | ${deptName}` : rawName;

    useEffect(() => {
        const saved = localStorage.getItem("cb_hod_sidebar_collapsed");
        if (saved === "1") setCollapsed(true);
    }, []);

    useEffect(() => {
        if (!user && !localStorage.getItem("supabase.auth.token")) return;
        if (user && user.role !== "hod") {
            router.replace(`/${user.role}/dashboard`);
        }
    }, [user, router]);

    function toggleCollapse() {
        setCollapsed((v) => {
            const next = !v;
            localStorage.setItem("cb_hod_sidebar_collapsed", next ? "1" : "0");
            return next;
        });
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: "#09090f", fontFamily: "var(--font-geist-sans, sans-serif)" }}>
            <Sidebar collapsed={collapsed} onToggle={toggleCollapse} displayName={rawName} departmentName={deptName} avatarUrl={user?.avatar_url ?? null} onLogout={() => void handleLogout()} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar onMenuClick={() => setDrawerOpen(true)} onLogout={() => void handleLogout()} />
                <main className="flex-1 overflow-y-auto" style={{ color: "white" }}>
                    {children}
                </main>
            </div>
            <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} displayName={rawName} departmentName={deptName} avatarUrl={user?.avatar_url ?? null} onLogout={() => void handleLogout()} />
        </div>
    );
}
