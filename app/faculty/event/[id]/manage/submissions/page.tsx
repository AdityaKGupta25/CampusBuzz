"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ChevronLeft,
    LayoutDashboard,
    FileText,
    Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SubmissionsTab, type Submission } from "@/components/faculty/SubmissionsTab";

export default function FacultySubmissionsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [saving, setSaving] = useState(false);
    const [eventName, setEventName] = useState("");

    useEffect(() => {
        if (eventId) fetchData();
    }, [eventId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [submissionsRes, eventRes] = await Promise.all([
                supabase
                    .from("submissions")
                    .select("*, student:users!student_id(full_name, email), team:teams!team_id(name)")
                    .eq("event_id", eventId)
                    .order("submission_time", { ascending: false }),
                supabase
                    .from("events")
                    .select("title")
                    .eq("id", eventId)
                    .single()
            ]);

            if (submissionsRes.data) setSubmissions(submissionsRes.data as any);
            if (eventRes.data) setEventName(eventRes.data.title);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveScore = async (submissionId: string, score: number, feedback: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("submissions")
                .update({ score, feedback, status: "graded" })
                .eq("id", submissionId);

            if (error) throw error;

            setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, score, feedback, status: "graded" } : s));
        } catch (err: any) {
            console.error("Scoring error:", err);
            alert("Failed to save score: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 md:p-12">
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            <ChevronLeft size={14} />
                            Back to Manage
                        </button>
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black tracking-tighter">{eventName}</h1>
                            <div className="flex items-center gap-2 text-cyan-400">
                                <FileText size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Submissions & Scoring</span>
                            </div>
                        </div>
                    </div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl"
                >
                    <SubmissionsTab
                        submissions={submissions}
                        rounds={[]}
                        selectedRoundId={null}
                        onRoundSelect={() => { }}
                        onSaveScore={handleSaveScore}
                        saving={saving}
                    />
                </motion.div>
            </div>
        </div>
    );
}
