"use client";

import React, { useMemo, useState } from "react";
import {
    BarChart3,
    Trophy,
    Users,
    CheckCircle2,
    FileText,
    Download,
    Award,
    Zap,
    Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, exportToCSV } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

interface ReportsTabProps {
    event: any;
    registrations: any[];
    submissions: any[];
    prizes: any[];
    subEvents?: any[];
    festDomains?: any[];
    loading?: boolean;
    readOnly?: boolean;
}

export function ReportsTab({ event, registrations = [], submissions = [], prizes = [], subEvents = [], festDomains = [], loading, readOnly }: ReportsTabProps) {
    const [showCertList, setShowCertList] = useState(false);
    const isUmbrella = event?.event_type === "umbrella";

    // 1. Calculations
    const totalRegs = registrations.length;
    const totalAttended = registrations.filter((r: any) => r.status === "attended").length;
    const conversionRate = totalRegs > 0 ? (totalAttended / totalRegs) * 100 : 0;
    const totalSubmissions = submissions.length;

    // 2. Department Breakdown
    const deptData = useMemo(() => {
        const depts: Record<string, number> = {};
        registrations.forEach((r: any) => {
            const deptName = r.student?.department?.name || "Other";
            depts[deptName] = (depts[deptName] || 0) + 1;
        });

        return Object.entries(depts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [registrations]);

    // 3. Karma Points Calculation
    const totalKarma = useMemo(() => {
        let karma = 0;
        registrations.forEach(r => {
            if (r.status === "attended") karma += 10;
        });
        submissions.forEach(s => {
            if (s.status === "graded") karma += 20;
        });
        prizes.forEach(p => {
            if (p.winner_id || p.winner_team_id) karma += 50;
        });
        return karma;
    }, [registrations, submissions, prizes]);

    // Registration vs Attendance Chart Data
    const attendanceData = useMemo(() => {
        if (isUmbrella) {
            return subEvents?.map(s => ({
                name: s.title?.substring(0, 15) + (s.title?.length > 15 ? '...' : ''),
                Registered: registrations.filter((r: any) => r.event_id === s.id).length,
                Attended: registrations.filter((r: any) => r.event_id === s.id && r.status === "attended").length
            })) || [];
        } else {
            return [{
                name: "This Event",
                Registered: totalRegs,
                Attended: totalAttended
            }];
        }
    }, [isUmbrella, subEvents, registrations, totalRegs, totalAttended]);

    const maxDeptCount = Math.max(...deptData.map(d => d.count), 1);

    const subEventMap = useMemo(() => {
        const mapping: Record<string, number> = {};
        registrations.forEach(r => {
            mapping[r.event_id] = (mapping[r.event_id] || 0) + 1;
        });
        return mapping;
    }, [registrations]);

    const winners = useMemo(() => {
        return submissions
            .filter(s => s.status === "graded")
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 3)
            .map((s, idx) => ({
                id: s.id,
                name: s.team?.name || s.student?.full_name || "Unknown",
                score: s.score,
                rank: idx + 1,
                prize: prizes[idx]?.title || (idx === 0 ? "First Prize" : idx === 1 ? "Second Prize" : "Third Prize")
            }));
    }, [submissions, prizes]);

    if (loading) return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Generating Impact Report...</div>;

    const exportReport = () => {
        const timestamp = new Date().toISOString().split('T')[0];
        const prefix = isUmbrella ? "MEGA_FEST_AUDIT" : "NAAC_EVENT_REPORT";
        const fileName = `${prefix}_${event?.title || 'Report'}_${timestamp}`;

        let exportData;
        if (isUmbrella) {
            exportData = subEvents.map(sub => ({
                'Sub-Event Title': sub.title,
                'Registrations': sub.registered_count || 0,
                'Status': sub.status,
                'Start Date': new Date(sub.start_time).toLocaleDateString()
            }));
        } else {
            exportData = registrations.map(r => ({
                'Student Name': r.student?.full_name || 'N/A',
                'Email': r.student?.email || 'N/A',
                'Department': r.student?.department?.name || 'N/A',
                'Status': r.status,
                'Check-in Time': r.updated_at ? new Date(r.updated_at).toLocaleString() : 'N/A',
                'Score': submissions.find(s => s.student_id === r.student_id)?.score || '—'
            }));
        }

        exportToCSV(exportData, fileName);
    };

    return (
        <div className="space-y-12 pb-24 font-sans">
            {/* ── Institutional Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4 border-l-4 border-white pl-10">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1 bg-white text-black text-[9px] font-black uppercase tracking-[0.3em] rounded-sm">Final Audit</div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Completion Code: CB-AUD-{event?.id?.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">
                        Institutional <br /> Impact Report
                    </h2>
                    <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-[0.4em] mt-6 max-w-xl leading-relaxed">
                        Formalized performance documentation for <span className="text-white">NAAC Accreditation (Criterion 5)</span> and <span className="text-white">NIRF Data Points</span>. 
                        Validated metrics for institutional reach and operational efficiency.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-4">
                    <button
                        onClick={exportReport}
                        disabled={readOnly}
                        className={cn(
                            "flex items-center gap-4 bg-indigo-600 text-white h-16 px-12 rounded-sm text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shrink-0 group transform",
                            readOnly ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-indigo-500 hover:scale-[1.02]"
                        )}
                    >
                        <FileText size={20} className="group-hover:rotate-12 transition-transform" />
                        Download NAAC/NIRF Report (PDF)
                    </button>
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mr-4 italic">Certified by CampusBuzz Ledger Protocol</p>
                </div>
            </div>

            {/* ── High-Contrast KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 overflow-hidden">
                {[
                    { label: "Institutional Reach", value: totalRegs, icon: <Users className="text-white" />, tagline: "Total Registrations", color: "bg-white", textColor: "text-black" },
                    { label: "Operational Success", value: `${conversionRate.toFixed(1)}%`, icon: <CheckCircle2 className="text-emerald-400" />, tagline: "Attendance Efficiency", color: "bg-zinc-950", textColor: "text-white" },
                    { label: "Karma Points Dist.", value: totalKarma, icon: <Zap className="text-amber-400" />, tagline: "Total Campus Karma", color: "bg-zinc-950", textColor: "text-white" },
                    { label: "Department Diversity", value: deptData.length, icon: <BarChart3 className="text-indigo-400" />, tagline: "Branches Involved", color: "bg-zinc-950", textColor: "text-white" },
                ].map((kpi, i) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={kpi.label}
                        className={cn(
                            "p-12 border border-white/5 shadow-2xl flex flex-col justify-between group h-80 relative overflow-hidden",
                            kpi.color,
                            kpi.textColor
                        )}
                    >
                        {i === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-black opacity-5 skew-x-12 translate-x-12" />}
                        <div className="flex items-center justify-between relative z-10">
                            <div className={cn(
                                "w-12 h-12 flex items-center justify-center rounded-sm border",
                                i === 0 ? "border-black/10 bg-black/5" : "border-white/10 bg-white/5"
                            )}>
                                {kpi.icon}
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-[0.4em] opacity-40")}>METRIC-{i+1}</span>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-70 group-hover:translate-x-2 transition-transform">{kpi.label}</p>
                            <h3 className="text-7xl font-black tracking-tighter leading-none mb-4 italic uppercase">{kpi.value}</h3>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 italic">{kpi.tagline}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Registrations by Sub-Event (Umbrella Only) */}
            {isUmbrella && subEvents.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <BarChart3 size={16} className="text-cyan-500" />
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Sub-Event Performance</h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>

                    <div className="bg-zinc-950 border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sub-Event Name</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Domain</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Total Registered</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Checked-In</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {[...subEvents].sort((a, b) => (subEventMap[b.id] || 0) - (subEventMap[a.id] || 0)).map((sub, i) => {
                                    const subRegCount = subEventMap[sub.id] || 0;
                                    const maxRegCount = Math.max(...subEvents.map(s => subEventMap[s.id] || 0), 1);

                                    return (
                                        <tr key={sub.id} className="hover:bg-white/[0.01] transition-all group">
                                            <td className="px-10 py-7">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                                        <Zap size={14} className="text-cyan-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{sub.title}</p>
                                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">ID: HUB-{sub.id.slice(0, 6).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-7">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                                                    {festDomains?.find(d => d.id === sub.fest_domain_id)?.name || "General"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-7 text-right">
                                                <span className="text-2xl font-black text-white tracking-tighter">{subRegCount}</span>
                                            </td>
                                            <td className="px-8 py-7">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="h-2 w-32 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                            style={{ width: `${Math.min((subRegCount / (maxRegCount || 1)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-black text-zinc-600">{sub.attended_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <span className={cn(
                                                    "px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest",
                                                    sub.status === 'live' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-zinc-500"
                                                )}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
                {/* ── Registration vs Attendance Bar Chart ── */}
                <div className="p-10 bg-zinc-950 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <span className="h-px w-10 bg-indigo-500" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.6em] text-zinc-500 italic">Participation Funnel</h4>
                    </div>
                    <div className="flex-1 min-h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff10', borderRadius: '16px', fontSize: '12px' }}
                                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase' }}
                                />
                                <Bar dataKey="Registered" fill="#3f3f46" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="Attended" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Departmental Donut Chart ── */}
                <div className="p-10 bg-zinc-950 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="flex items-center gap-4 mb-2 relative z-10">
                        <span className="h-px w-10 bg-emerald-500" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.6em] text-zinc-500 italic">Department Diversity</h4>
                    </div>
                    
                    <div className="flex-1 min-h-[300px] w-full flex items-center justify-center mt-4">
                        {deptData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deptData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                        stroke="none"
                                    >
                                        {deptData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff10', borderRadius: '16px', fontSize: '12px' }}
                                        itemStyle={{ fontWeight: 900, textTransform: 'uppercase' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center">
                                No department data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Winners Snapshot & Institutional Audit */}
            {!isUmbrella && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
                    <div className="lg:col-span-2 p-12 bg-zinc-950 border border-white/5 shadow-2xl space-y-10 relative overflow-hidden">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 flex items-center gap-3 italic">
                                    <Award size={18} /> Evaluation Hierarchy
                                </h4>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Top mission performers validated by faculty.</p>
                            </div>
                        </div>

                        <div className="space-y-5 relative z-10">
                            {winners.length > 0 ? (
                                winners.map((winner, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        key={winner.id}
                                        className="flex items-center gap-8 p-8 bg-zinc-900 border border-white/[0.04] hover:border-amber-500/30 transition-all group overflow-hidden relative shadow-inner"
                                    >
                                        <div className={cn(
                                            "w-16 h-16 rounded-sm flex items-center justify-center text-2xl font-black shrink-0 shadow-2xl z-10",
                                            idx === 0 ? "bg-amber-500 text-black" :
                                                idx === 1 ? "bg-zinc-200 text-zinc-900" :
                                                    "bg-orange-800 text-white"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0 z-10">
                                            <p className="text-[9px] font-black text-amber-500/70 uppercase tracking-[0.3em] mb-1">{winner.prize}</p>
                                            <h5 className="text-xl font-black text-white group-hover:text-amber-500 transition-colors uppercase tracking-tight truncate">{winner.name}</h5>
                                        </div>
                                        <div className="text-right z-10">
                                            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-1">Score Matrix</p>
                                            <p className="text-3xl font-black text-white tracking-tighter italic">{winner.score}<span className="text-[11px] text-zinc-600 ml-1">pts</span></p>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center gap-6 text-center border-4 border-dashed border-white/5 bg-zinc-900/40">
                                    <Trophy size={48} className="text-zinc-800 animate-pulse" />
                                    <div>
                                        <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em]">Evaluation Data Null</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-12 bg-indigo-600 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 group-hover:scale-125 transition-all duration-1000">
                            <Award size={180} />
                        </div>
                        <div className="space-y-10 relative z-10">
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60 italic">Audit verification</h4>
                                <h3 className="text-4xl font-black tracking-tight mt-1 uppercase italic leading-tight">Institutional Ledger</h3>
                            </div>
                            <div className="space-y-5">
                                <div className="p-8 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 block mb-2">Digital Assets Issued</span>
                                    <span className="text-5xl font-black tracking-tighter">{totalAttended}</span>
                                </div>
                                <div className="flex items-center justify-between p-6 bg-black/20 backdrop-blur-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Audit Policy</span>
                                    <span className="px-5 py-2 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-[0.2em]">Verified</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCertList(true)}
                            className="w-full h-16 bg-white text-indigo-600 text-[11px] font-black uppercase tracking-[0.2em] mt-12 hover:bg-black hover:text-white transition-all shadow-2xl relative z-10"
                        >
                            Review Digital Registry
                        </button>
                    </div>
                </div>
            )}

            {/* Certificate Review Modal */}
            <AnimatePresence>
                {showCertList && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-[30px] bg-black/60">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCertList(false)}
                            className="absolute inset-0"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="relative w-full max-w-5xl bg-zinc-950 border border-white/10 p-12 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]"
                        >
                            <header className="mb-12 flex items-center justify-between">
                                <div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                                        Digital Registry
                                        <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                                    </h3>
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-2">Real-time audit verification of institutional assets.</p>
                                </div>
                                <button onClick={() => setShowCertList(false)} className="w-14 h-14 bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition-all border border-white/5">
                                    <Search size={20} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Participant Identifier</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Lifecycle Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Hash / Auth ID</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] text-right">Encrypted Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {registrations.filter(r => r.status === 'attended').map((r, i) => (
                                            <tr key={r.id} className="hover:bg-white/[0.01] transition-all group">
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{r.student?.full_name}</p>
                                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1 opacity-50">{r.student?.email}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 size={10} /> Certified
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 font-mono text-[10px] text-zinc-600 tracking-tighter">
                                                    0x{event?.id.slice(0, 4).toUpperCase()}{r.id.slice(0, 8).toUpperCase()}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-[10px] font-black text-emerald-500/80 bg-emerald-500/5 px-3 py-1.5 border border-emerald-500/10 uppercase">Validated</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <footer className="mt-12 pt-10 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={() => setShowCertList(false)}
                                    className="px-12 h-16 bg-zinc-900 border border-white/5 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white hover:bg-zinc-800 transition-all shadow-2xl"
                                >
                                    Dismiss Registry
                                </button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
