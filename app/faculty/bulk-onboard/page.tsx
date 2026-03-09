"use client";

import React, { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
    Upload, Download, FileSpreadsheet, CheckCircle2,
    XCircle, AlertCircle, RefreshCw, Users, Building2,
    ChevronRight, Loader2, X, Eye, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardResult } from "@/app/api/admin/bulk-onboard/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
    full_name: string;
    email: string;
    role: string;
    department_name: string;
    _errors: string[];
}

type Phase = "idle" | "preview" | "importing" | "done";

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

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        student: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        faculty: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        hod: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        admin: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
    const s = styles[role?.toLowerCase()] ?? "bg-zinc-700/20 text-zinc-500 border-zinc-700/30";
    return (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border", s)}>
            {role || "—"}
        </span>
    );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status, message }: { status: OnboardResult["status"]; message?: string }) {
    if (status === "created") return (
        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
            <CheckCircle2 size={12} /> Created
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

export default function BulkOnboardPage() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [results, setResults] = useState<OnboardResult[]>([]);
    const [progress, setProgress] = useState(0); // index done
    const [totalCount, setTotalCount] = useState(0);
    const [showPreviewErrors, setShowPreviewErrors] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const BATCH_SIZE = 10;

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

    async function startImport() {
        const valid = parsedRows.filter(r => r._errors.length === 0);
        if (valid.length === 0) {
            alert("No valid rows to import. Fix the errors first.");
            return;
        }
        setPhase("importing");
        setTotalCount(valid.length);
        setProgress(0);
        const allResults: OnboardResult[] = [];

        for (let i = 0; i < valid.length; i += BATCH_SIZE) {
            const batch = valid.slice(i, i + BATCH_SIZE);
            const res = await fetch("/api/admin/bulk-onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows: batch }),
            });
            const json = await res.json();
            if (json.results) allResults.push(...json.results);
            setProgress(Math.min(i + BATCH_SIZE, valid.length));
            // small delay to show progress animation nicely
            await new Promise(r => setTimeout(r, 150));
        }

        setResults(allResults);
        setPhase("done");
    }

    function reset() {
        setPhase("idle");
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
    const failed = results.filter(r => r.status === "error").length;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* ── Page header ── */}
            <div className="sticky top-0 z-20 px-6 md:px-10 py-4 flex items-center justify-between"
                style={{ background: "rgba(9,9,15,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                        <Users size={17} className="text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Super Admin</p>
                        <h1 className="text-sm font-extrabold text-white leading-none">Bulk User Onboarding</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                    >
                        <Download size={13} /> Download Template
                    </button>
                    {phase !== "idle" && (
                        <button
                            onClick={reset}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/8 text-zinc-400 hover:text-white transition-all"
                        >
                            <RefreshCw size={12} /> Start Over
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">

                {/* ═══════════════════════════════════════════════════════
                    PHASE 1: IDLE — Drop Zone
                ═══════════════════════════════════════════════════════ */}
                {phase === "idle" && (
                    <div className="space-y-8 animate-in fade-in duration-500">

                        {/* Info pills */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { icon: Shield, text: "Admin Only", color: "text-rose-400 bg-rose-500/8 border-rose-500/15" },
                                { icon: FileSpreadsheet, text: "CSV or Excel", color: "text-indigo-400 bg-indigo-500/8 border-indigo-500/15" },
                                { icon: Building2, text: "Auto-creates Departments", color: "text-emerald-400 bg-emerald-500/8 border-emerald-500/15" },
                            ].map(({ icon: Icon, text, color }) => (
                                <div key={text} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold", color)}>
                                    <Icon size={11} /> {text}
                                </div>
                            ))}
                        </div>

                        {/* Drop zone */}
                        <div
                            id="drop-zone"
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-5 py-20 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300",
                                dragOver
                                    ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
                                    : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50"
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={handleInputChange}
                            />
                            <div className={cn(
                                "w-20 h-20 rounded-2xl flex items-center justify-center transition-all",
                                dragOver ? "bg-indigo-500/20 border border-indigo-500/40" : "bg-white/5 border border-white/8"
                            )}>
                                <Upload size={32} className={dragOver ? "text-indigo-400" : "text-zinc-600"} />
                            </div>
                            <div className="text-center space-y-1.5">
                                <p className="text-base font-bold text-white">
                                    {dragOver ? "Drop it here!" : "Drag & drop your file"}
                                </p>
                                <p className="text-sm text-zinc-600">or click to browse — CSV or Excel supported</p>
                            </div>
                            {dragOver && (
                                <div className="absolute inset-0 rounded-3xl pointer-events-none"
                                    style={{ boxShadow: "inset 0 0 40px rgba(99,102,241,0.12)" }} />
                            )}
                        </div>

                        {/* Column reference */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Required Columns</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { col: "full_name", desc: "Student / Faculty name", eg: "Aarav Sharma" },
                                    { col: "email", desc: "Institutional email", eg: "aarav@college.edu" },
                                    { col: "role", desc: "student | faculty | hod | admin", eg: "student" },
                                    { col: "department_name", desc: "Must match or will be created", eg: "Computer Science" },
                                ].map(({ col, desc, eg }) => (
                                    <div key={col} className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-800 space-y-1">
                                        <p className="text-xs font-black text-indigo-400 font-mono">{col}</p>
                                        <p className="text-[10px] text-zinc-500">{desc}</p>
                                        <p className="text-[10px] text-zinc-700 italic">e.g. {eg}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    PHASE 2: PREVIEW TABLE
                ═══════════════════════════════════════════════════════ */}
                {phase === "preview" && (
                    <div className="space-y-6 animate-in fade-in duration-400">
                        {/* Summary strip */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5">
                                <FileSpreadsheet size={14} className="text-indigo-400" />
                                <span className="text-xs font-semibold text-zinc-400 max-w-[200px] truncate">{fileName}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/8 border border-emerald-500/15 px-3 py-1.5 rounded-full">
                                    <CheckCircle2 size={11} /> {validRows.length} valid
                                </span>
                                {errorRows.length > 0 && (
                                    <button onClick={() => setShowPreviewErrors(!showPreviewErrors)}
                                        className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/8 border border-amber-500/15 px-3 py-1.5 rounded-full hover:bg-amber-500/15 transition-all">
                                        <AlertCircle size={11} /> {errorRows.length} errors
                                        <ChevronRight size={11} className={cn("transition-transform", showPreviewErrors && "rotate-90")} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Error rows (expandable) */}
                        {showPreviewErrors && errorRows.length > 0 && (
                            <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">Rows with errors (will be skipped)</p>
                                {errorRows.map((r, i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                        <XCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-zinc-300">{r.email || r.full_name || `Row ${i + 1}`}</p>
                                            <p className="text-[10px] text-amber-500/70 mt-0.5">{r._errors.join(" · ")}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Preview table */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Preview — first {Math.min(parsedRows.length, 50)} rows</p>
                                <Eye size={13} className="text-zinc-700" />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            {["#", "Full Name", "Email", "Role", "Department", "Status"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedRows.slice(0, 50).map((row, i) => (
                                            <tr key={i} className={cn(
                                                "border-b border-zinc-800/50 transition-colors",
                                                row._errors.length > 0 ? "bg-amber-500/[0.03]" : "hover:bg-white/[0.02]"
                                            )}>
                                                <td className="px-4 py-3 text-zinc-700 font-mono">{i + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-zinc-200 whitespace-nowrap">{row.full_name || <span className="text-zinc-700 italic">—</span>}</td>
                                                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{row.email || <span className="text-zinc-700 italic">—</span>}</td>
                                                <td className="px-4 py-3"><RoleBadge role={row.role} /></td>
                                                <td className="px-4 py-3 text-zinc-400 max-w-[140px] truncate">{row.department_name || <span className="text-zinc-700 italic">—</span>}</td>
                                                <td className="px-4 py-3">
                                                    {row._errors.length === 0
                                                        ? <span className="text-[9px] font-black text-emerald-400 uppercase">✓ Ready</span>
                                                        : <span className="text-[9px] font-black text-amber-400 uppercase" title={row._errors.join(", ")}>⚠ Skip</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedRows.length > 50 && (
                                    <p className="text-center py-4 text-xs text-zinc-700">
                                        ... and {parsedRows.length - 50} more rows
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="flex items-center gap-4 pt-2">
                            <button
                                onClick={startImport}
                                disabled={validRows.length === 0}
                                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-400 active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Users size={15} /> Import {validRows.length} Users
                            </button>
                            <p className="text-xs text-zinc-600">
                                {errorRows.length > 0 && `${errorRows.length} rows with errors will be skipped.`}
                            </p>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    PHASE 3: IMPORTING — Progress Bar
                ═══════════════════════════════════════════════════════ */}
                {phase === "importing" && (
                    <div className="flex flex-col items-center justify-center gap-10 py-20 animate-in fade-in duration-500">
                        {/* Animated ring */}
                        <div className="relative w-28 h-28">
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle
                                    cx="56" cy="56" r="48"
                                    fill="none" stroke="#6366f1" strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 48}`}
                                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - progressPct / 100)}`}
                                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 size={28} className="text-indigo-400 animate-spin" />
                            </div>
                        </div>

                        <div className="w-full max-w-md space-y-4 text-center">
                            <p className="text-white font-extrabold text-xl">
                                Importing {Math.min(progress, totalCount)} / {totalCount} users
                            </p>
                            <p className="text-zinc-600 text-sm">Please don't close this page</p>
                            {/* Bar */}
                            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${progressPct}%`,
                                        background: "linear-gradient(90deg, #6366f1, #a78bfa)",
                                    }}
                                />
                            </div>
                            <p className="text-xs text-zinc-600">{progressPct}% complete</p>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    PHASE 4: DONE — Results Report
                ═══════════════════════════════════════════════════════ */}
                {phase === "done" && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Summary cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "Created", value: created, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/20" },
                                { label: "Already Existed", value: skipped, icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/20" },
                                { label: "Failed", value: failed, icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/8 border-rose-500/20" },
                            ].map(({ label, value, icon: Icon, color, bg }) => (
                                <div key={label} className={cn("rounded-2xl border p-6 space-y-3", bg)}>
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
                                        <Icon size={18} className={color} />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-black text-white">{value}</p>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Download report CTA */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => downloadReport(results)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-zinc-800 text-sm font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <Download size={14} /> Download Report CSV
                            </button>
                            <button
                                onClick={reset}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/15"
                            >
                                <RefreshCw size={14} /> Import Another File
                            </button>
                        </div>

                        {/* Results table */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-zinc-800">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Detailed Results</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            {["Email", "Full Name", "Status", "Details"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r, i) => (
                                            <tr key={i} className="border-b border-zinc-800/50 hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">{r.email}</td>
                                                <td className="px-4 py-3 font-semibold text-zinc-200 whitespace-nowrap">{r.full_name}</td>
                                                <td className="px-4 py-3"><StatusChip status={r.status} message={r.message} /></td>
                                                <td className="px-4 py-3 text-zinc-600 text-[10px] max-w-[240px] truncate">{r.message ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
