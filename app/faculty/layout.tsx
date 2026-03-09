"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Plus,
    ScanLine,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Zap,
    Shield,
    UserCircle2,
    Users,
    Globe,
    UploadCloud,
    Building2,
    BarChart3,
    BookOpen,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser, type AppRole } from "@/context/UserContext";
import Image from "next/image";
import Link from "next/link";

// ─── Role-scoped nav definitions ─────────────────────────────────────────────

type NavLink = { href: string; icon: LucideIcon; label: string };

const FACULTY_LINKS: NavLink[] = [
    { href: "/faculty/my-events", icon: LayoutDashboard, label: "My Events" },
    { href: "/faculty/create-event", icon: Plus, label: "Create Event" },
    { href: "/faculty/venues", icon: Building2, label: "Venue Registry" },
    { href: "/faculty/clubs", icon: Users, label: "Clubs Directory" },
    { href: "/faculty/explore", icon: Globe, label: "Explore Campus" },
    { href: "/faculty/scan", icon: ScanLine, label: "Scan QR" },
];

const ADMIN_LINKS: NavLink[] = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/faculty/venues", icon: Building2, label: "Venue Registry" },
    { href: "/admin/onboarding", icon: UploadCloud, label: "Bulk Onboard" },
    { href: "/admin/directory", icon: Building2, label: "Full Directory" },
    { href: "/admin/settings", icon: BookOpen, label: "Inst. Settings" },
];

function getNavLinks(role: AppRole | undefined): NavLink[] {
    if (role === "admin") return ADMIN_LINKS;
    return FACULTY_LINKS; // faculty + fallback
}

// ─── Portal brand config per role ────────────────────────────────────────────

type BrandConfig = {
    label: string;
    gradient: string;
    activeColor: string;
    activeBg: string;
    activeBorder: string;
    dotColor: string;
};

const BRAND: Partial<Record<AppRole, BrandConfig>> = {
    admin: {
        label: "Admin Command Center",
        gradient: "linear-gradient(135deg,#dc2626,#b91c1c)",
        activeColor: "text-rose-400",
        activeBg: "rgba(220,38,38,0.12)",
        activeBorder: "rgba(220,38,38,0.30)",
        dotColor: "bg-rose-400",
    },
    faculty: {
        label: "Faculty Portal",
        gradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
        activeColor: "text-indigo-400",
        activeBg: "rgba(99,102,241,0.15)",
        activeBorder: "rgba(99,102,241,0.30)",
        dotColor: "bg-indigo-400",
    },
};

function getBrand(role: AppRole | undefined): BrandConfig {
    return BRAND[role!] ?? BRAND.faculty!;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
    collapsed, onToggle, displayName, departmentName, role, onLogout,
}: {
    collapsed: boolean;
    onToggle: () => void;
    displayName: string;
    departmentName: string;
    role: AppRole | undefined;
    onLogout: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoError, setLogoError] = useState(false);
    const links = getNavLinks(role);
    const brand = getBrand(role);
    const isAdmin = role === "admin";

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-40",
                collapsed ? "w-[68px]" : "w-[220px]"
            )}
            style={{ background: "#0c0c14", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
            {/* Brand */}
            <div className="flex flex-col px-4 pt-6 pb-2 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Link href={isAdmin ? "/admin/dashboard" : "/faculty/my-events"} className="flex flex-col gap-0 group items-center">
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
                                {isAdmin ? "Admin Command" : "Faculty Portal"}
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Admin badge strip */}
            {isAdmin && !collapsed && (
                <div className="mx-3 mt-3 px-3 py-1.5 rounded-lg flex items-center gap-2"
                    style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                    <Shield size={10} className="text-rose-500 shrink-0" />
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Super Admin</span>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {links.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <button
                            key={href}
                            id={`nav-${label.replace(/\s+/g, "-").toLowerCase()}`}
                            onClick={() => router.push(href)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                                active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                            )}
                            style={
                                active
                                    ? { background: brand.activeBg, border: `1px solid ${brand.activeBorder}` }
                                    : { border: "1px solid transparent" }
                            }
                            title={collapsed ? label : undefined}
                        >
                            <Icon size={17} className={cn("flex-shrink-0", active ? brand.activeColor : "text-white/40")} />
                            {!collapsed && <span className="truncate">{label}</span>}
                            {!collapsed && active && (
                                <span className={cn("ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0", brand.dotColor)} />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User + logout */}
            <div
                className="px-2 py-4 space-y-1 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
                <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl", collapsed && "justify-center")}>
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-[10px] text-white"
                        style={{ background: brand.gradient }}
                    >
                        {displayName.slice(0, 1).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-bold text-xs truncate leading-none mb-0.5">{displayName}</p>
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-tighter truncate">{departmentName}</p>
                        </div>
                    )}
                </div>
                <button
                    id="sidebar-logout-btn"
                    onClick={onLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/35 hover:text-red-400 transition-all",
                        collapsed && "justify-center"
                    )}
                    style={{ border: "1px solid transparent" }}
                    title="Logout"
                >
                    <LogOut size={16} className="flex-shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            <button
                id="sidebar-collapse-btn"
                onClick={onToggle}
                className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center z-50 hover:scale-110 transition-transform"
                style={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
            >
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
        </aside>
    );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
    open, onClose, displayName, departmentName, role, onLogout,
}: {
    open: boolean;
    onClose: () => void;
    displayName: string;
    departmentName: string;
    role: AppRole | undefined;
    onLogout: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoError, setLogoError] = useState(false);
    const links = getNavLinks(role);
    const brand = getBrand(role);
    const isAdmin = role === "admin";

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-40 md:hidden"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                    onClick={onClose}
                />
            )}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-300",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
                style={{ background: "#0c0c14", borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
                <div className="flex items-center justify-between px-5 h-24 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                    <Link href={isAdmin ? "/admin/dashboard" : "/faculty/my-events"} className="flex flex-col gap-2 items-center">
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
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-2">
                            {isAdmin ? "Admin Command" : "Faculty Portal"}
                        </span>
                    </Link>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>

                {isAdmin && (
                    <div className="mx-4 mt-3 px-3 py-1.5 rounded-lg flex items-center gap-2"
                        style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                        <Shield size={10} className="text-rose-500 shrink-0" />
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Super Admin</span>
                    </div>
                )}

                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {links.map(({ href, icon: Icon, label }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <button
                                key={href}
                                onClick={() => { router.push(href); onClose(); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                                    active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                                )}
                                style={active
                                    ? { background: brand.activeBg, border: `1px solid ${brand.activeBorder}` }
                                    : { border: "1px solid transparent" }}
                            >
                                <Icon size={17} className={cn("flex-shrink-0", active ? brand.activeColor : "text-white/40")} />
                                {label}
                            </button>
                        );
                    })}
                </nav>

                <div className="px-3 py-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <UserCircle2 size={18} className="text-white/40" strokeWidth={2.5} />
                    <div className="min-w-0">
                        <p className="text-white font-bold text-xs truncate leading-none mb-0.5">{displayName}</p>
                        <p className="text-white/30 text-[9px] font-black uppercase tracking-tighter truncate">{departmentName}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/35 hover:text-red-400 transition-all"
                        style={{ border: "1px solid transparent" }}
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Mobile Top Bar ───────────────────────────────────────────────────────────

function TopBar({
    onMenuClick, onLogout,
}: {
    onMenuClick: () => void;
    onLogout: () => void;
}) {
    const [logoError, setLogoError] = useState(false);
    return (
        <header
            className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 flex-shrink-0"
            style={{
                background: "rgba(9,9,15,0.96)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(20px)",
            }}
        >
            <button
                id="mobile-menu-btn"
                onClick={onMenuClick}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
                <Menu size={18} className="text-white/70" />
            </button>
            <Link href="/" className="flex items-center gap-2">
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
                {!logoError && <span className="text-white font-bold text-sm tracking-tight text-left">Portal</span>}
            </Link>
            <button
                id="topbar-logout-btn"
                onClick={onLogout}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                title="Logout"
            >
                <LogOut size={16} className="text-red-400" />
            </button>
        </header>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useUser();

    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const rawName = user?.full_name ?? "Faculty";
    const deptName = user?.department_name ?? "Institutional General";
    const userName = user ? `${rawName} | ${deptName}` : rawName;
    const role = user?.role; // "faculty" | "admin" | etc.

    useEffect(() => {
        const saved = localStorage.getItem("cb_sidebar_collapsed");
        if (saved === "1") setCollapsed(true);
    }, []);

    function toggleCollapse() {
        setCollapsed((v) => {
            const next = !v;
            localStorage.setItem("cb_sidebar_collapsed", next ? "1" : "0");
            return next;
        });
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const pathname = usePathname();
    const isMissionInterface = role === 'student' && pathname.includes('/manage');

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ background: "#09090f", fontFamily: "var(--font-geist-sans, sans-serif)" }}
        >
            {!isMissionInterface && (
                <Sidebar
                    collapsed={collapsed}
                    onToggle={toggleCollapse}
                    displayName={rawName}
                    departmentName={deptName}
                    role={role}
                    onLogout={() => void handleLogout()}
                />
            )}
            {!isMissionInterface && (
                <MobileDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    displayName={rawName}
                    departmentName={deptName}
                    role={role}
                    onLogout={() => void handleLogout()}
                />
            )}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {!isMissionInterface && (
                    <TopBar
                        onMenuClick={() => setDrawerOpen(true)}
                        onLogout={() => void handleLogout()}
                    />
                )}
                <main className="flex-1 overflow-y-auto" style={{ color: "white" }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
