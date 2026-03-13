"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
    Upload, Download, FileSpreadsheet, CheckCircle2,
    XCircle, AlertCircle, RefreshCw, Users, Building2,
    ChevronRight, Loader2, X, Eye, Shield, Globe, AlertTriangle, Key,
    UserPlus, Pencil, Trash2, Search, Filter, Mail, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import type { OnboardResult } from "@/app/api/admin/bulk-onboard/route";
import { onboardUserAction, updateUserAction, deleteUserAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RosterUser {
    id: string;
    full_name: string;
    email: string;
    role: string;
    department_id: string | null;
    department_name?: string;
    created_at: string;
}

interface ParsedRow {
    full_name: string;
    email: string;
    role: string;
    department_name: string;
    _errors: string[];
}

type Phase = "idle" | "preview" | "importing" | "done" | "roster";

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_COLS = ["full_name", "email", "role", "department_name"] as const;
const VALID_ROLES = ["student", "faculty", "hod", "admin"];

const TEMPLATE_CSV = `full_name,email,role,department_name
Aarav Sharma,aarav.sharma@college.edu,student,Computer Science
Priya Mehta,priya.mehta@college.edu,faculty,Electronics Engineering
Dr. Rajesh Kumar,rajesh.kumar@college.edu,hod,Mechanical Engineering
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseHeaders(raw: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
        const normalized = k
            .toLowerCase()
            .replace(/[\s-]+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
        result[normalized] = String(v ?? "").trim();
    }
    return result;
}

function validateRow(row: Record<string, string>): ParsedRow {
    const errors: string[] = [];
    const { full_name = "", email = "", role = "", department_name = "" } = row;

    if (!full_name) errors.push("Name missing");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email");
    if (!VALID_ROLES.includes(role.toLowerCase())) errors.push(`Role must be: ${VALID_ROLES.join(" | ")}`);
    if (!department_name) errors.push("Department missing");

    return {
        full_name: full_name,
        email: email.toLowerCase(),
        role: role.toLowerCase(),
        department_name: department_name,
        _errors: errors,
    };
}

function parseCSV(text: string): ParsedRow[] {
    const result = Papa.parse<Record<string, string>>(text, {
        header: true, skipEmptyLines: true,
    });
    return result.data.map((r) => validateRow(normaliseHeaders(r)));
}

function parseXLSX(buffer: ArrayBuffer): ParsedRow[] {
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
    return rows.map((r) => validateRow(normaliseHeaders(r)));
}

function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campusbuzz_users_template.csv";
    a.click();
    URL.revokeObjectURL(url);
}

function downloadReport(results: OnboardResult[]) {
    const csv = [
        "email,full_name,status,message",
        ...results.map(r =>
            `"${r.email}","${r.full_name}","${r.status}","${r.message ?? ""}"`
        ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onboard_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Institution context banner ───────────────────────────────────────────────

function InstitutionBanner({ institutionId }: { institutionId: string | null }) {
    const [info, setInfo] = useState<{ name: string; email_domain: string } | null>(null);

    useEffect(() => {
        if (!institutionId) return;
        supabase
            .from("institutions")
            .select("name, email_domain")
            .eq("id", institutionId)
            .single()
            .then(({ data }) => { if (data) setInfo(data); });
    }, [institutionId]);

    if (!info) return null;
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/8">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Building2 size={14} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Importing Into</p>
                <p className="text-sm font-bold text-white truncate">{info.name}</p>
            </div>
            {info.email_domain && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25">
                    <Globe size={11} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-300">@{info.email_domain}</span>
                </div>
            )}
        </div>
    );
}

// ─── Domain mismatch warning ───────────────────────────────────────────────────

function DomainWarningBanner({ rows, domain }: { rows: ParsedRow[]; domain: string }) {
    if (!domain) return null;
    const offDomain = rows.filter(r => r._errors.length === 0 && !r.email.endsWith(`@${domain}`));
    if (offDomain.length === 0) return null;

    return (
        <div className="flex items-start gap-3 px-4 py-4 rounded-2xl border border-amber-500/25 bg-amber-500/8">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-amber-300">
                    {offDomain.length} email{offDomain.length > 1 ? "s don't" : " doesn't"} match
                    the official institution domain <span className="font-black">@{domain}</span>
                </p>
                <p className="text-[10px] text-amber-500/70">
                    These users will still be created and tagged to your institution.
                    Their domain mismatch will be flagged in the results report.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                    {offDomain.slice(0, 5).map(r => (
                        <span key={r.email} className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                            {r.email}
                        </span>
                    ))}
                    {offDomain.length > 5 && (
                        <span className="text-[9px] text-amber-500/60">+{offDomain.length - 5} more</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Role badge ───────────────────────────────────────────────────────────────


// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status, message }: { status: OnboardResult["status"]; message?: string }) {
    const isWarning = status === "created" && message?.startsWith("⚠️");

    if (status === "created" && !isWarning) return (
        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
            <CheckCircle2 size={12} /> Created
        </span>
    );
    if (isWarning) return (
        <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold" title={message}>
            <AlertTriangle size={12} /> Created <span className="opacity-60">(domain ⚠️)</span>
        </span>
    );
    if (status === "skipped") return (
        <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold" title={message}>
            <AlertCircle size={12} /> Already exists
        </span>
    );
    return (
        <span className="flex items-center gap-1 text-rose-400 text-[10px] font-bold" title={message}>
            <XCircle size={12} /> Error
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RosterManagementPage() {
    const { user } = useUser();
    const institutionDomain = useRef<string>("");

    // ─── Phase & Bulk State ───
    const [phase, setPhase] = useState<Phase>("roster"); // Default to roster view
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [results, setResults] = useState<OnboardResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [defaultPassword, setDefaultPassword] = useState("Welcome@CampusBuzz2026");
    const [showPreviewErrors, setShowPreviewErrors] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const BATCH_SIZE = 10;

    // ─── Roster State ───
    const [roster, setRoster] = useState<RosterUser[]>([]);
    const [stats, setStats] = useState({ hods: 0, faculty: 0, students: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedDept, setSelectedDept] = useState<string>("all");
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

    // ─── Modal State ───
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<RosterUser | null>(null);
    const [deletingUser, setDeletingUser] = useState<RosterUser | null>(null);

    const fetchStats = useCallback(async (instId: string) => {
        const roles = ["hod", "faculty", "student"];
        const counts = { hods: 0, faculty: 0, students: 0 };

        const promises = roles.map(role =>
            supabase.from("users").select("id", { count: "exact", head: true })
                .eq("institution_id", instId)
                .eq("role", role)
        );

        const res = await Promise.all(promises);
        counts.hods = (res[0] as any).count ?? 0;
        counts.faculty = (res[1] as any).count ?? 0;
        counts.students = (res[2] as any).count ?? 0;
        setStats(counts);
    }, []);

    const loadRoster = useCallback(async (instId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select(`
                id, 
                full_name, 
                email, 
                role, 
                department_id, 
                created_at,
                departments(name)
            `)
            .eq("institution_id", instId)
            // ── Security Filter: Exclude current user from roster list ──
            .neq("id", user?.dbId || "")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setRoster(data.map((u: any) => ({
                ...u,
                department_name: u.departments?.name ?? "No Dept"
            })));
        }
        setLoading(false);
    }, [user?.dbId]);

    const fetchDepts = useCallback(async (instId: string) => {
        const { data } = await supabase.from("departments").select("id, name").eq("institution_id", instId);
        if (data) setDepartments(data);
    }, []);

    useEffect(() => {
        if (!user?.institution_id) return;

        // Fetch domain
        supabase.from("institutions").select("email_domain").eq("id", user.institution_id).single()
            .then(({ data }) => { if (data?.email_domain) institutionDomain.current = data.email_domain; });

        fetchStats(user.institution_id);
        loadRoster(user.institution_id);
        fetchDepts(user.institution_id);
    }, [user?.institution_id, fetchStats, loadRoster, fetchDepts]);

    const filteredRoster = roster.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        const matchesDept = selectedDept === "all" || u.department_id === selectedDept;
        return matchesSearch && matchesDept;
    });

    const handleFile = useCallback((file: File) => {
        setFileName(file.name);
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "csv") {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const rows = parseCSV(text);
                setParsedRows(rows);
                setPhase("preview");
            };
            reader.readAsText(file);
        } else if (ext === "xlsx" || ext === "xls") {
            const reader = new FileReader();
            reader.onload = (e) => {
                const buf = e.target?.result as ArrayBuffer;
                const rows = parseXLSX(buf);
                setParsedRows(rows);
                setPhase("preview");
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Unsupported format. Please upload a .csv or .xlsx file.");
        }
    }, []);

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }

    async function handleBulkUpload() {
        const adminInstId = user?.institution_id;
        if (!adminInstId) {
            alert("Administrative Context Missing: Institution ID not resolved.");
            return;
        }

        const valid = parsedRows.filter(r => r._errors.length === 0);
        if (valid.length === 0) {
            alert("Data Integrity Violation: No valid nodes identified for deployment.");
            return;
        }

        if (!defaultPassword) {
            alert("Security Protocol: Default passkey required for account generation.");
            return;
        }

        setPhase("importing");
        setTotalCount(valid.length);
        setProgress(0);

        // 2. Department Lookup Map
        const { data: depts } = await supabase
            .from("departments")
            .select("id, name")
            .eq("institution_id", adminInstId);
        
        const deptMap = new Map((depts || []).map(d => [d.name.toLowerCase(), d.id]));

        const allResults: OnboardResult[] = [];

        // 3. CSV Processing Loop
        for (let i = 0; i < valid.length; i++) {
            const row = valid[i];
            
            // Link Department (Case-insensitive match)
            const departmentId = deptMap.get(row.department_name.trim().toLowerCase()) || null;
            if (!departmentId) {
                console.warn(`⚠️ [Integrity] Department Mismatch: [${row.department_name}] not found in institutional registry.`);
            }

            // 4. Database Operations (Auth Creation & Profile Sync via Server Action)
            const res = await onboardUserAction({
                email: row.email.trim(),
                fullName: row.full_name.trim(),
                role: row.role.toLowerCase() as any,
                departmentId: departmentId,
                password: defaultPassword
            });

            if (res.success) {
                allResults.push({ 
                    email: row.email, 
                    full_name: row.full_name, 
                    status: "created" 
                });
            } else {
                allResults.push({ 
                    email: row.email, 
                    full_name: row.full_name, 
                    status: "error", 
                    message: res.error || "Execution failed" 
                });
            }

            setProgress(i + 1);
            // Non-blocking delay for UI smoothness
            await new Promise(r => setTimeout(r, 10));
        }

        setResults(allResults);
        setPhase("done");

        // 5. Refresh & Feedback
        loadRoster(adminInstId);
        fetchStats(adminInstId);
        const successCount = allResults.filter(r => r.status === "created").length;
        alert(`Institutional Infrastructure Deployed: ${successCount} users onboarded successfully.`);
    }

    function reset() {
        setPhase("roster");
        setParsedRows([]);
        setResults([]);
        setFileName(null);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const validRows = parsedRows.filter(r => r._errors.length === 0);
    const errorRows = parsedRows.filter(r => r._errors.length > 0);
    const progressPct = totalCount > 0 ? Math.round((progress / totalCount) * 100) : 0;

    const created = results.filter(r => r.status === "created").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
            {/* ── Page Header ── */}
            <div className="sticky top-0 z-30 px-6 md:px-10 py-5 flex items-center justify-between"
                style={{ background: "rgba(9,9,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Users size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Administrative Hub</p>
                        <h1 className="text-lg font-black text-white leading-none">Institutional Roster</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPhase(phase === "roster" ? "idle" : "roster")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            phase === "roster"
                                ? "bg-white/5 border-zinc-800 text-zinc-400 hover:text-white"
                                : "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                        )}
                    >
                        {phase === "roster" ? <><Upload size={14} /> Bulk Onboard</> : <><Users size={14} /> View Roster</>}
                    </button>
                    <button
                        onClick={downloadTemplate}
                        className="p-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                        title="Download Template"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10">

                {phase === "roster" && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {[
                                { label: "Department Heads", value: stats.hods, icon: Shield, color: "text-amber-400 bg-amber-500/5 border-amber-500/10" },
                                { label: "Active Faculty", value: stats.faculty, icon: Users, color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" },
                                { label: "Registered Students", value: stats.students, icon: Globe, color: "text-indigo-400 bg-indigo-500/5 border-indigo-500/10" },
                            ].map((s) => (
                                <div key={s.label} className={cn("p-6 rounded-[2rem] border flex items-center justify-between", s.color)}>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{s.label}</p>
                                        <h3 className="text-3xl font-black text-white">{s.value}</h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                        <s.icon size={20} className="opacity-80" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Master Toolbar */}
                        <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-96 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-indigo-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                                    />
                                </div>

                                {/* Department Filter Dropdown */}
                                <div className="relative w-full md:w-64 group">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none group-focus-within:text-indigo-400" size={14} />
                                    <select
                                        value={selectedDept}
                                        onChange={(e) => setSelectedDept(e.target.value)}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none font-medium transition-all"
                                    >
                                        <option value="all" className="bg-[#0c0c14] text-white">All Departments</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id} className="bg-[#0c0c14] text-white">
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <ChevronRight size={14} className="rotate-90" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => user?.institution_id && loadRoster(user.institution_id)}
                                    className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-all"
                                >
                                    <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
                                >
                                    <UserPlus size={14} /> Add User
                                </button>
                            </div>
                        </div>

                        {/* Master Table */}
                        <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                            {["User", "Role", "Department", "Joined", ""].map((h) => (
                                                <th key={h} className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {loading ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-full" /></td>
                                                </tr>
                                            ))
                                        ) : filteredRoster.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-30">
                                                        <Search size={40} />
                                                        <p className="text-sm font-bold">No users found match your search.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRoster.map((u) => (
                                                <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]">
                                                                {u.full_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors leading-none mb-1">{u.full_name}</p>
                                                                <p className="text-[11px] text-zinc-500 font-mono tracking-tighter">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5"><RoleBadge role={u.role} /></td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-xs font-medium text-zinc-400">{u.department_name}</span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-[10px] font-bold text-zinc-600 uppercase">
                                                            {new Date(u.created_at).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => setEditingUser(u)}
                                                                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (u.role === "admin") return;
                                                                    setDeletingUser(u);
                                                                }}
                                                                disabled={u.role === "admin"}
                                                                title={u.role === "admin" ? "System accounts can only be managed by the Platform Founder." : "Delete User"}
                                                                className={cn(
                                                                    "p-1.5 rounded-lg transition-all",
                                                                    u.role === "admin" 
                                                                        ? "opacity-20 cursor-not-allowed text-zinc-600" 
                                                                        : "hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400"
                                                                )}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    PHASE: BULK ONBOARDING
                ═══════════════════════════════════════════════════════ */}
                {phase !== "roster" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 max-w-5xl mx-auto">

                        <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                            <h2 className="text-2xl font-black italic tracking-tighter">Bulk Infrastructure Onboarding</h2>
                            <button onClick={reset} className="text-xs font-bold text-zinc-500 hover:text-white flex items-center gap-2">
                                <X size={14} /> Close
                            </button>
                        </div>

                        {phase === "idle" && (
                            <div className="space-y-8">
                                <InstitutionBanner institutionId={user?.institution_id ?? null} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/10 shadow-inner">
                                                    <Key size={20} className="text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-white leading-none mb-1">Passkey Protocol</p>
                                                    <p className="text-xs text-zinc-500 font-medium tracking-tight">Default password for new accounts</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Input
                                                    type="text"
                                                    value={defaultPassword}
                                                    onChange={(e) => setDefaultPassword(e.target.value)}
                                                    placeholder="e.g. Welcome@CAMPUS2026"
                                                    className="font-mono tracking-widest bg-zinc-950/50 text-white rounded-2xl h-14 border-zinc-800 focus:ring-orange-500/20"
                                                />
                                                <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                                                    * This password will be encrypted and set for all newly created Auth accounts.
                                                    Users will be prompted to change it after their first successful login.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-4">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Protocol Reference</p>
                                            <div className="space-y-3">
                                                {["full_name", "email", "role", "department_name"].map(col => (
                                                    <div key={col} className="flex items-center justify-between text-xs font-medium py-2 border-b border-zinc-800/10">
                                                        <span className="text-zinc-500 font-mono tracking-tighter">{col}</span>
                                                        <span className="text-zinc-300">Required</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        id="drop-zone"
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center gap-8 rounded-[3rem] border-2 border-dashed transition-all duration-500 cursor-pointer shadow-2xl overflow-hidden",
                                            dragOver
                                                ? "border-indigo-500 bg-indigo-500/10 scale-[0.98] shadow-[0_0_80px_rgba(99,102,241,0.1)]"
                                                : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/40"
                                        )}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleInputChange} />
                                        <div className={cn(
                                            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl",
                                            dragOver ? "bg-indigo-500 text-white scale-110" : "bg-white/5 text-zinc-600"
                                        )}>
                                            <Upload size={40} />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-xl font-black text-white italic tracking-tighter">Deploy Institutional Roster</p>
                                            <p className="text-sm text-zinc-600 font-medium">Drag CSV/Excel here or <span className="text-indigo-400 underline underline-offset-4 decoration-indigo-500/30">click to browse</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {phase === "preview" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/60">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <FileSpreadsheet size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-300 mb-0.5">{fileName}</p>
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">{validRows.length} Nodes Verified</Badge>
                                        </div>
                                    </div>
                                    <Button onClick={handleBulkUpload} disabled={validRows.length === 0} className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs">
                                        Execute Import
                                    </Button>
                                </div>

                                <DomainWarningBanner rows={parsedRows} domain={institutionDomain.current} />

                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                                    <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-widest">Name</th>
                                                    <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-widest">Email</th>
                                                    <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-widest">Role</th>
                                                    <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/40">
                                                {parsedRows.slice(0, 50).map((row, i) => (
                                                    <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-6 py-4 font-bold text-zinc-200">{row.full_name}</td>
                                                        <td className="px-6 py-4 text-zinc-500 font-mono tracking-tighter">{row.email}</td>
                                                        <td className="px-6 py-4"><RoleBadge role={row.role} /></td>
                                                        <td className="px-6 py-4">
                                                            {row._errors.length === 0
                                                                ? <span className="text-[10px] font-black text-emerald-500 tracking-widest">✓ READY</span>
                                                                : <span className="text-[10px] font-black text-rose-500 tracking-widest" title={row._errors.join(", ")}>INVALID</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {phase === "importing" && (
                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-12">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <div className="absolute inset-0 border-[12px] border-white/5 rounded-full shadow-inner" />
                                    <div className="absolute inset-0 border-[12px] border-indigo-500 rounded-full border-t-transparent animate-spin shadow-[0_0_40px_rgba(99,102,241,0.2)]" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-black text-white tracking-tighter">{progressPct}%</span>
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">Deploy</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-3xl font-black italic tracking-tighter text-white">
                                        Importing Cluster: {progress} / {totalCount}
                                    </p>
                                    <p className="text-sm text-zinc-500 max-w-sm mx-auto font-medium leading-relaxed">Syncing Roster Intelligence. Safeguarding identity metadata. <span className="text-indigo-400">Avoid interruption.</span></p>
                                </div>
                            </div>
                        )}

                        {phase === "done" && (
                            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
                                <div className="p-16 rounded-[4rem] bg-indigo-600 text-white text-center space-y-8 relative overflow-hidden shadow-2xl border border-indigo-400/20">
                                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150"><Shield size={160} /></div>
                                    <div className="absolute bottom-0 left-0 p-10 opacity-5 -rotate-12 scale-150"><Users size={160} /></div>

                                    <div className="mx-auto w-24 h-24 rounded-[2rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-2xl rotate-3">
                                        <CheckCircle2 size={48} className="text-white drop-shadow-md" />
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        <h2 className="text-5xl font-black italic tracking-tighter leading-tight">Deployment Complete</h2>
                                        <p className="text-indigo-100/70 max-w-xl mx-auto font-medium text-lg">
                                            Verified <span className="font-black text-white underline decoration-indigo-300 underline-offset-8">{created}</span> new intelligence nodes.
                                            Encrypted Passkey: <span className="font-mono bg-white/20 px-3 py-1 rounded-xl text-white font-black border border-white/10 shadow-lg">{defaultPassword}</span>
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-5 pt-8 relative z-10">
                                        <Button onClick={() => downloadReport(results)} className="bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-[1.5rem] h-14 px-10 text-sm font-bold backdrop-blur-md">Export Analytics Report</Button>
                                        <Button onClick={reset} className="bg-white text-indigo-600 hover:bg-zinc-100 rounded-[1.5rem] h-14 px-10 font-black uppercase tracking-widest text-sm shadow-2xl shadow-black/20">Back to Command Center</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            <UserActionModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => { if (user?.institution_id) { loadRoster(user.institution_id); fetchStats(user.institution_id); } }}
            />

            <UserActionModal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                onSuccess={() => { if (user?.institution_id) loadRoster(user.institution_id); }}
                existingUser={editingUser}
            />

            {deletingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-rose-500/20 rounded-[3rem] p-12 max-w-md w-full text-center space-y-10 shadow-[0_0_120px_rgba(239,68,68,0.15)] border-t border-rose-500/30">
                        <div className="mx-auto w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-inner">
                            <Trash2 size={40} className="text-rose-500" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black italic tracking-tighter text-white">Decommission Identity?</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                                You are about to permanently remove <span className="text-rose-400 font-bold">{deletingUser.full_name}</span> from the institutional directory. All associated access will be revoked <span className="text-white underline decoration-rose-500 decoration-2 underline-offset-4">immediately</span>.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={() => setDeletingUser(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl h-16 font-bold text-sm">Abort Operation</Button>
                            <Button
                                onClick={async () => {
                                    if (deletingUser.id === user?.dbId) {
                                        alert("Security Violation: You cannot delete your own administrative account.");
                                        setDeletingUser(null);
                                        return;
                                    }
                                    const res = await deleteUserAction(deletingUser.id);
                                    if (res.success) {
                                        setDeletingUser(null);
                                        if (user?.institution_id) {
                                            loadRoster(user.institution_id);
                                            fetchStats(user.institution_id);
                                        }
                                    } else {
                                        alert(res.error);
                                    }
                                }}
                                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl h-16 font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-600/20"
                            >
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Auxiliary Components ─────────────────────────────────────────────────────

function UserActionModal({ isOpen, onClose, onSuccess, existingUser }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingUser?: RosterUser | null;
}) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [deptsLoading, setDeptsLoading] = useState(false);
    const [localDepts, setLocalDepts] = useState<{ id: string; name: string }[]>([]);
    const [form, setForm] = useState({
        full_name: "", email: "", role: "student", department_id: "", password: ""
    });

    useEffect(() => {
        if (!isOpen || !user?.institution_id) return;

        async function fetchModalDepts() {
            setDeptsLoading(true);
            const { data } = await supabase
                .from("departments")
                .select("id, name")
                .eq("institution_id", user?.institution_id as string)
                .order("name", { ascending: true });

            if (data) setLocalDepts(data);
            setDeptsLoading(false);
        }

        void fetchModalDepts();

        if (existingUser) {
            setForm({
                full_name: existingUser.full_name,
                email: existingUser.email,
                role: existingUser.role,
                department_id: existingUser.department_id || "",
                password: ""
            });
        } else {
            setForm({ full_name: "", email: "", role: "student", department_id: "", password: "" });
        }
    }, [existingUser, isOpen, user?.institution_id]);

    if (!isOpen) return null;

    async function handleSubmit() {
        if (!form.full_name || !form.email) {
            alert("Legal identity and secure email are required node parameters.");
            return;
        }

        if (!form.department_id) {
            alert("A valid Institutional Cluster (Department) must be assigned.");
            return;
        }

        setLoading(true);
        try {
            if (existingUser) {
                const res = await updateUserAction({
                    userId: existingUser.id,
                    email: form.email,
                    fullName: form.full_name,
                    role: form.role as any,
                    departmentId: form.department_id || null
                });
                if (res.success) { onSuccess(); onClose(); }
                else alert(res.error);
            } else {
                const res = await onboardUserAction({
                    email: form.email,
                    fullName: form.full_name,
                    role: form.role as any,
                    departmentId: form.department_id,
                    password: form.password
                });
                if (res.success) { onSuccess(); onClose(); }
                else alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3.5rem] p-12 max-w-xl w-full space-y-10 relative overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.5)] border-t border-white/5">
                <div className="absolute -top-10 -right-10 p-8 opacity-5 rotate-12"><UserPlus size={200} /></div>

                <div className="flex items-center justify-between relative z-10 border-b border-zinc-800 pb-6">
                    <div>
                        <h3 className="text-4xl font-black italic tracking-tighter text-white leading-none">
                            {existingUser ? "Modify Identity" : "Deploy Identity"}
                        </h3>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Institutional Schema Configuration</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-zinc-800"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Legal Designation</label>
                        <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Vikram Seth" className="h-14 px-5 font-bold" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Secure Domain Email</label>
                        <Input value={form.email} disabled={!!existingUser} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vikram@college.edu" className="h-14 px-5 font-mono tracking-tighter" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Platform Permissions</label>
                        <Select
                            value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                            options={[
                                { value: "student", label: "STUDENT" },
                                { value: "faculty", label: "FACULTY" },
                                { value: "hod", label: "DEPT HEAD (HOD)" },
                                { value: "admin", label: "INSTITUTION ADMIN" },
                                { value: "founder", label: "PLATFORM FOUNDER" },
                            ]}
                            className="h-14 px-5 font-bold"
                        />
                    </div>
                    {form.role !== 'founder' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Institutional Cluster</label>
                            <Select
                                value={form.department_id}
                                onChange={e => setForm({ ...form, department_id: e.target.value })}
                                placeholder={deptsLoading ? "Loading clusters..." : "Select Department"}
                                options={localDepts.map(d => ({ value: d.id, label: d.name }))}
                                className="h-14 px-5 font-bold"
                            />
                        </div>
                    )}
                    {!existingUser && (
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Key size={10} /> Temporary Access Passkey
                            </label>
                            <Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Master Authentication Key" className="bg-zinc-950/50 border-zinc-800 rounded-2xl h-14 px-5 font-mono tracking-[0.2em] text-orange-400 focus:ring-orange-500/20" />
                        </div>
                    )}
                </div>

                <div className="flex gap-5 pt-6 relative z-10">
                    <Button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-[1.5rem] h-16 font-bold text-sm">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="flex-[2] bg-indigo-500 hover:bg-indigo-600 text-white rounded-[1.5rem] h-16 font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all text-xs border border-indigo-400/30">
                        {loading ? <Loader2 className="animate-spin" /> : existingUser ? "Commit Transformation" : "Initialize Identity"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const roles: Record<string, { label: string; color: string }> = {
        student: { label: "Student Cluster", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
        faculty: { label: "Faculty Intelligence", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
        hod: { label: "Dept Governance", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        admin: { label: "System Core", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
        founder: { label: "Platform Founder", color: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]" },
    };
    const r = roles[role?.toLowerCase()] || { label: role || "—", color: "bg-zinc-800 text-zinc-500 border-zinc-700" };
    return (
        <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm", r.color)}>
            {r.label}
        </span>
    );
}

