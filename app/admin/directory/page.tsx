"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Users, Search, Building2, User, Globe, Loader2,
    Sparkles, CheckCircle2, ArrowRight, ShieldAlert,
    LayoutGrid, BookOpen, GraduationCap, RefreshCw,
    Calendar, Wallet, Shield, MapPin, Briefcase,
    TrendingUp, Star, MoreHorizontal, Filter,
    Download, Trash2, Edit3, Heart, Target,
    Activity, ChevronRight, Hash, AlertCircle, X, Menu, Share2, Briefcase as BriefcaseIcon, Clock, Zap
} from "lucide-react";
import { InstitutionalDossier } from "@/components/admin/InstitutionalDossier";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabID = "departments" | "clubs" | "staff" | "venues";

interface DeptMetric {
    id: string;
    name: string;
    faculty_count: number;
    active_events: number;
    budget_used: number;
    budget_cap: number;
}

interface ClubMetric {
    id: string;
    name: string;
    logo_url: string | null;
    faculty_name: string | null;
    member_count: number;
    event_count: number;
    department_name: string | null;
}

interface StaffMember {
    id: string;
    full_name: string;
    role: "faculty" | "hod" | "admin" | "founder";
    department_name: string | null;
    managed_unit: string | null;
    activity_score: number;
    email: string | null;
}

interface VenueMetric {
    id: string;
    name: string;
    capacity: number;
    venue_type: string;
    is_active: boolean;
    usage_count: number;
}

interface CommandStats {
    totalUnits: number;
    totalActiveEvents: number;
    budgetUtilization: number;
    securityScore: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(n);

function VerifiedBadge() {
    return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
            <CheckCircle2 size={8} /> Institutional Verified
        </span>
    );
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, subValue }: any) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${color}`}>
                <Icon size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", color.replace('text-', 'bg-').replace('text-', 'border-').replace(/-\d+/, '-500/10') + " " + color.replace('text-', 'border-').replace(/-\d+/, '-500/20'))}>
                    <Icon size={18} className={color} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</h4>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
                        {subValue && <p className="text-xs font-bold text-zinc-500">{subValue}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Command Center ──────────────────────────────────────────────────────

export default function InstitutionalCommandCenter() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<TabID>("departments");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Data States
    const [depts, setDepts] = useState<DeptMetric[]>([]);
    const [clubs, setClubs] = useState<ClubMetric[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [venues, setVenues] = useState<VenueMetric[]>([]);
    const [globalCounts, setGlobalCounts] = useState({
        faculty: 0,
        hods: 0,
        depts: 0,
        clubs: 0
    });
    const [stats, setStats] = useState<CommandStats>({
        totalUnits: 0,
        totalActiveEvents: 0,
        budgetUtilization: 0,
        securityScore: 98
    });
    const [selectedItem, setSelectedItem] = useState<{ type: 'dept' | 'club', data: any } | null>(null);

    const loadData = useCallback(async (institutionId: string) => {
        setLoading(true);
        console.log("🚀 [Admin Directory] Initializing Secure Data Fetch for Institution:", institutionId);
        
        try {
            // 1. Fetch Precise Counts (KPIs)
            console.log("📊 [Admin Directory] Fetching KPIs...");
            const [
                { count: facultyCount, error: fErr },
                { count: hodCount, error: hErr },
                { count: deptCount, error: dErr },
                { count: clubCount, error: cErr }
            ] = await Promise.all([
                supabase.from("users").select("*", { count: 'exact', head: true }).eq("institution_id", institutionId).eq("role", "faculty"),
                supabase.from("users").select("*", { count: 'exact', head: true }).eq("institution_id", institutionId).eq("role", "hod"),
                supabase.from("departments").select("*", { count: 'exact', head: true }).eq("institution_id", institutionId),
                supabase.from("clubs").select("*", { count: 'exact', head: true }).eq("institution_id", institutionId)
            ]);

            if (fErr || hErr || dErr || cErr) {
                console.error("❌ [Admin Directory] KPI Fetch Error:", { fErr, hErr, dErr, cErr });
            }

            setGlobalCounts({
                faculty: facultyCount || 0,
                hods: hodCount || 0,
                depts: deptCount || 0,
                clubs: clubCount || 0
            });

            // 2. Fetch Core Data Sets
            console.log("📂 [Admin Directory] Syncing Unit Data...");
            const [
                { data: deptData, error: deptErr },
                { data: clubData, error: clubErr },
                { data: staffData, error: staffErr },
                { data: venueData, error: venueErr }
            ] = await Promise.all([
                supabase.from("departments").select(`id, name, budget_cap, budget_used, users(count), events(count)`).eq("institution_id", institutionId).order("name"),
                supabase.from("clubs").select(`id, name, logo_url, faculty:users!leader_id(full_name), department:departments(name), events(count)`).eq("institution_id", institutionId).order("name"),
                supabase.from("users").select(`id, full_name, role, email, department:departments(name), created_events:events!creator_id(count), supervised_events:events!faculty_in_charge_id(count)`).eq("institution_id", institutionId).in("role", ["faculty", "hod"]).order("full_name"),
                supabase.from("venues").select(`id, name, capacity, venue_type, is_active, events(count)`).eq("institution_id", institutionId).order("name")
            ]);

            if (deptErr || clubErr || staffErr || venueErr) {
                console.error("❌ [Admin Directory] Core Data Sync Error Details:");
                if (deptErr) console.error(" - Dept Error:", deptErr);
                if (clubErr) console.error(" - Club Error:", clubErr);
                if (staffErr) console.error(" - Staff Error:", staffErr);
                if (venueErr) console.error(" - Venue Error:", venueErr);
            }

            const { data: liveEvents } = await supabase
                .from("events")
                .select("venue_id")
                .eq("status", "live")
                .eq("institution_id", institutionId);

            const liveVenueIds = new Set((liveEvents || []).map(e => e.venue_id).filter(Boolean));

            // 3. Transformation & Mapping
            console.log("⚙️ [Admin Directory] Processing and Mapping Data...");
            
            const mappedDepts: DeptMetric[] = (deptData || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                budget_used: d.budget_used || 0,
                budget_cap: d.budget_cap || 0,
                faculty_count: d.users?.[0]?.count || 0,
                active_events: d.events?.[0]?.count || 0
            }));

            const mappedClubs: ClubMetric[] = (clubData || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                logo_url: c.logo_url,
                faculty_name: c.faculty?.full_name || "Unassigned",
                department_name: c.department?.name || "Independent",
                event_count: c.events?.[0]?.count || 0,
                member_count: (c.events?.[0]?.count || 0) * 12
            }));

            const mappedStaff: StaffMember[] = (staffData || []).map((s: any) => {
                const totalEvents = (s.created_events?.[0]?.count || 0) + (s.supervised_events?.[0]?.count || 0);
                return {
                    id: s.id,
                    full_name: s.full_name,
                    role: s.role,
                    email: s.email,
                    department_name: s.department?.name || "Unassigned",
                    managed_unit: s.role === "hod" ? s.department?.name : (mappedClubs.find(c => c.faculty_name === s.full_name)?.name || null),
                    activity_score: Math.min(100, 60 + (totalEvents * 8))
                };
            });

            const mappedVenues: VenueMetric[] = (venueData || []).map((v: any) => ({
                id: v.id,
                name: v.name,
                capacity: v.capacity || 0,
                venue_type: v.venue_type || "Generic",
                is_active: liveVenueIds.has(v.id),
                usage_count: v.events?.[0]?.count || 0
            }));

            setDepts(mappedDepts);
            setClubs(mappedClubs);
            setStaff(mappedStaff);
            setVenues(mappedVenues);

            setStats({
                totalUnits: (deptCount || 0) + (clubCount || 0),
                totalActiveEvents: mappedDepts.reduce((acc, d) => acc + d.active_events, 0),
                budgetUtilization: Math.round((mappedDepts.reduce((acc, d) => acc + d.budget_used, 0) / (mappedDepts.reduce((acc, d) => acc + d.budget_cap, 0) || 1)) * 100),
                securityScore: 99
            });

            console.log("✅ [Admin Directory] Data Fetch Complete. Units Synchronized.");
        } catch (err) {
            console.error("🔥 [Admin Directory] Critical Load Failure:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.institution_id) loadData(user.institution_id);
    }, [user?.institution_id, loadData]);

    // ─── Search Filtering ────────────────────────────────────────────────────────

    const filteredData = useMemo(() => {
        const s = search.toLowerCase();
        switch (activeTab) {
            case "departments": return depts.filter(d => d.name.toLowerCase().includes(s));
            case "clubs": return clubs.filter(c => c.name.toLowerCase().includes(s));
            case "staff": return staff.filter(m => m.full_name.toLowerCase().includes(s) || m.department_name?.toLowerCase().includes(s));
            case "venues": return venues.filter(v => v.name.toLowerCase().includes(s));
            default: return [];
        }
    }, [activeTab, search, depts, clubs, staff, venues]);

    // Dynamic KPIs based on active tab
    const dynamicKPIs = useMemo(() => {
        switch (activeTab) {
            case "departments": return [
                { label: "Total Units", value: globalCounts.depts, icon: Building2, color: "text-blue-400" },
                { label: "Global Faculty", value: globalCounts.faculty, icon: Users, color: "text-indigo-400" },
                { label: "Budget Utilization", value: `${stats.budgetUtilization}%`, icon: Wallet, color: "text-emerald-400" },
                { label: "Active Nodes", value: depts.reduce((a, d) => a + d.active_events, 0), icon: Activity, color: "text-rose-400" },
            ];
            case "clubs": return [
                { label: "Total Clubs", value: clubs.length, icon: Shield, color: "text-blue-400" },
                { label: "Total Members", value: clubs.reduce((a, c) => a + c.member_count, 0), icon: GraduationCap, color: "text-amber-400" },
                { label: "Avg Events/Club", value: clubs.length > 0 ? Math.round(clubs.reduce((a, c) => a + c.event_count, 0) / clubs.length) : 0, icon: TrendingUp, color: "text-emerald-400" },
                { label: "Active Events", value: clubs.reduce((a, c) => a + c.event_count, 0), icon: Star, color: "text-rose-400" },
            ];
            case "staff": return [
                { label: "Global Staff", value: globalCounts.faculty + globalCounts.hods, icon: Users, color: "text-blue-400" },
                { label: "Institutional HODs", value: globalCounts.hods, icon: Shield, color: "text-indigo-400" },
                { label: "Avg Activity", value: staff.length > 0 ? Math.round(staff.reduce((a, m) => a + m.activity_score, 0) / staff.length) : 0, icon: Activity, color: "text-emerald-400" },
                { label: "Faculty Participation", value: globalCounts.faculty, icon: Hash, color: "text-rose-400" },
            ];
            case "venues": return [
                { label: "Total Facilities", value: venues.length, icon: MapPin, color: "text-blue-400" },
                { label: "Total Capacity", value: venues.reduce((a, v) => a + v.capacity, 0), icon: Users, color: "text-indigo-400" },
                { label: "Live Now", value: venues.filter(v => v.is_active).length, icon: CheckCircle2, color: "text-emerald-400" },
                { label: "Total Sessions", value: venues.reduce((a, v) => a + v.usage_count, 0), icon: TrendingUp, color: "text-rose-400" },
            ];
        }
    }, [activeTab, depts, clubs, staff, venues, stats]);

    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-blue-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-12">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-zinc-800">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Institutional High-Tech Ops</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase text-white">
                            Command Center
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium">
                            Real-time institutional oversight and unit management for <span className="text-white italic font-bold">CampusBuzz</span>.
                        </p>
                    </div>

                    {/* Search Component */}
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-all" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl h-14 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                        />
                    </div>
                </div>

                {/* ── Stats Strip ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {dynamicKPIs.map((kpi, i) => <StatCard key={i} {...kpi} />)}
                </div>

                {/* ── Tab Switcher ── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800 backdrop-blur-xl">
                    <div className="flex items-center gap-1 w-full md:w-auto">
                        {[
                            { id: "departments", label: "Departments", icon: Building2 },
                            { id: "clubs", label: "Clubs", icon: Shield },
                            { id: "staff", label: "Staff", icon: Users },
                            { id: "venues", label: "Venues", icon: MapPin },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => { setActiveTab(t.id as TabID); setSearch(""); }}
                                className={cn(
                                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeTab === t.id
                                        ? "bg-white text-black shadow-xl"
                                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                                )}
                            >
                                <t.icon size={14} /> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 px-4">
                        <button className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white">
                            <Download size={18} />
                        </button>
                        <button className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Content Area ── */}
                <div className="min-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Accessing secure nodes...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === "departments" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(filteredData as DeptMetric[]).map((dept, i) => (
                                            <DeptNode key={dept.id} dept={dept} idx={i} onClick={() => setSelectedItem({ type: 'dept', data: dept })} />
                                        ))}
                                    </div>
                                )}
                                {activeTab === "clubs" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(filteredData as ClubMetric[]).map((club, i) => (
                                            <ClubNode key={club.id} club={club} idx={i} onClick={() => setSelectedItem({ type: 'club', data: club })} />
                                        ))}
                                    </div>
                                )}
                                {activeTab === "staff" && <StaffTable staff={filteredData as StaffMember[]} onSelect={(m) => console.log("Identified Personnel:", m.id, m.full_name)} />}
                                {activeTab === "venues" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(filteredData as VenueMetric[]).map((venue, i) => (
                                            <VenueNode key={venue.id} venue={venue} idx={i} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

                <AnimatePresence>
                    {selectedItem && (
                        <InstitutionalDossier
                            type={selectedItem.type}
                            item={selectedItem.data}
                            onClose={() => setSelectedItem(null)}
                        />
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}

// ─── Node Sub-components ──────────────────────────────────────────────────────

function DeptNode({ dept, idx, onClick }: { dept: DeptMetric; idx: number; onClick: () => void }) {
    const usage = Math.round((dept.budget_used / (dept.budget_cap || 1)) * 100);
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={onClick}
            className="group bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Building2 size={60} />
            </div>
            <div className="space-y-6 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <VerifiedBadge />
                        <h3 className="text-2xl font-black text-white italic tracking-tight uppercase group-hover:text-blue-400 transition-colors uppercase">{dept.name}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Faculty</p>
                        <p className="text-xl font-black text-white">{dept.faculty_count}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Ops</p>
                        <p className="text-xl font-black text-white">{dept.active_events}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Risk</p>
                        <p className="text-xl font-black text-emerald-500">LOW</p>
                    </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-zinc-800">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Budget Utilization</span>
                        <span className={usage > 85 ? "text-rose-400" : "text-emerald-400"}>{usage}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(usage, 100)}%` }}
                            className={cn("h-full rounded-full transition-all", usage > 85 ? "bg-rose-500" : "bg-blue-500")}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function ClubNode({ club, idx, onClick }: { club: ClubMetric; idx: number; onClick: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={onClick}
            className="group bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Shield size={60} />
            </div>
            <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-cover" /> : <Shield size={24} className="text-zinc-700" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                        <VerifiedBadge />
                        <h3 className="text-xl font-black text-white tracking-tight leading-tight truncate uppercase italic">{club.name}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-2">Faculty Lead</p>
                        <p className="text-sm font-bold text-white truncate">{club.faculty_name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-2">Members</p>
                        <p className="text-sm font-bold text-white italic">{club.member_count} units</p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <div className="flex items-center gap-2">
                        <Building2 size={12} className="text-indigo-500" />
                        <span>{club.department_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <LayoutGrid size={12} className="text-blue-500" />
                        <span>{club.event_count} Ops</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StaffTable({ staff, onSelect }: { staff: StaffMember[]; onSelect: (m: StaffMember) => void }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-zinc-950 border-b border-zinc-800">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Profile</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Protocol Role</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Department</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Managed Unit</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Activity Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {staff.map((m) => (
                            <tr
                                key={m.id}
                                onClick={() => onSelect(m)}
                                className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                            >
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm uppercase">
                                            {m.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{m.full_name}</p>
                                            <p className="text-xs text-zinc-600 truncate max-w-[150px]">{m.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex justify-center">
                                        <span className={cn(
                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border",
                                            m.role === 'founder' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                m.role === 'hod' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                    m.role === 'faculty' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        )}>
                                            {m.role === 'founder' ? 'Platform Founder' : m.role}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-xs font-bold text-zinc-400">{m.department_name}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-40" />
                                        <p className="text-xs font-bold text-white">{m.managed_unit || "—"}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden max-w-[80px]">
                                            <div className="h-full bg-blue-500" style={{ width: `${m.activity_score}%` }} />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-400">{m.activity_score}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function VenueNode({ venue, idx }: { venue: VenueMetric; idx: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="group bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-emerald-500/30 transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-emerald-500">
                <MapPin size={60} />
            </div>
            <div className="space-y-6 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {venue.is_active ?
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                <CheckCircle2 size={8} /> Live Event Now
                            </span> :
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                Available
                            </span>
                        }
                    </div>
                    <h3 className="text-2xl font-black text-white italic tracking-tight uppercase group-hover:text-emerald-400 transition-colors uppercase truncate">{venue.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-2">Category</p>
                        <p className="text-sm font-bold text-white capitalize">{venue.venue_type}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-2">Max Personnel</p>
                        <p className="text-sm font-bold text-white italic">{venue.capacity} capacity</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Utilization Count</span>
                        <span className="text-white">{venue.usage_count} sessions</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
