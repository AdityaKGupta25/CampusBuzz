"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ChevronLeft,
    LayoutDashboard,
    FileBarChart,
    Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ReportsTab } from "@/components/faculty/ReportsTab";

export default function FacultyReportsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [prizes, setPrizes] = useState<any[]>([]);
    const [eventName, setEventName] = useState("");

    useEffect(() => {
        if (eventId) fetchData();
    }, [eventId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eventRes, regsRes, subsRes, prizesRes] = await Promise.all([
                supabase
                    .from("events")
                    .select("*, department:departments(name)")
                    .eq("id", eventId)
                    .single(),
                supabase
                    .from("registrations")
                    .select("*, student:users(full_name, email, department:departments(name))")
                    .eq("event_id", eventId),
                supabase
                    .from("submissions")
                    .select("*, student:users!student_id(full_name, email), team:teams!team_id(name)")
                    .eq("event_id", eventId)
                    .order("score", { ascending: false }),
                supabase
                    .from("event_prizes")
                    .select("*")
                    .eq("event_id", eventId)
                    .order("position")
            ]);

            if (eventRes.data) {
                setEvent(eventRes.data);
                setEventName(eventRes.data.title);
            }
            if (regsRes.data) setRegistrations(regsRes.data);
            if (subsRes.data) setSubmissions(subsRes.data as any);
            if (prizesRes.data) setPrizes(prizesRes.data);

        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-500" size={40} />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Compiling Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-zinc-400 p-8 md:p-12 lg:p-20 font-sans selection:bg-indigo-500/30">
            <div className="max-w-7xl mx-auto space-y-16">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-white/5 pb-16">
                    <div className="space-y-6">
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            </div>
                            Back to Event Management
                        </button>
                        <div className="space-y-2">
                            <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter uppercase italic leading-none">{eventName}</h1>
                            <div className="flex items-center gap-3 text-indigo-400">
                                <div className="p-1.5 rounded-lg bg-indigo-500/10">
                                    <FileBarChart size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Analytics & Institutional Audit</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="px-5 py-3 rounded-2xl bg-zinc-950 border border-white/5 flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Event Status</p>
                                <p className="text-xs font-black text-white uppercase tracking-wider">{event?.status}</p>
                            </div>
                            <div className={cn(
                                "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                event?.status === "completed" ? "bg-emerald-400 shadow-emerald-500/20" : "bg-amber-400 animate-pulse"
                            )} />
                        </div>
                    </div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                >
                    <ReportsTab
                        event={event}
                        registrations={registrations}
                        submissions={submissions}
                        prizes={prizes}
                    />
                </motion.div>
            </div>

            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
